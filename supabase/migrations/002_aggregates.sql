-- ============================================================================
-- 002_aggregates: Server-side aggregate RPCs to eliminate N+1 query patterns
--
-- Problems solved:
-- 1. Dashboard makes 4 separate COUNT queries → 1 RPC
-- 2. Buildings list fires N live-flow polls (2-3 requests per building) → 1 RPC
-- 3. Buildings list fetches buildings + sensor counts in 2 queries → 1 RPC
-- 4. Building detail recomputes daily/weekly/monthly from hourly rows → 1 RPC
-- ============================================================================


-- ============================================================================
-- 1. get_dashboard_counts: single RPC replacing 4 count(*) queries
-- ============================================================================

CREATE OR REPLACE FUNCTION get_dashboard_counts(
    p_client_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_client_count  BIGINT := 0;
    v_building_count BIGINT := 0;
    v_sensor_count  BIGINT := 0;
    v_report_count  BIGINT := 0;
    v_building_ids  INTEGER[];
BEGIN
    IF p_client_id IS NULL THEN
        -- Admin: count everything
        SELECT count(*) INTO v_client_count FROM client;
        SELECT count(*) INTO v_building_count FROM building;
        SELECT count(*) INTO v_sensor_count FROM sensor;
        SELECT count(*) INTO v_report_count FROM report;
    ELSE
        -- Client-scoped
        SELECT array_agg(id) INTO v_building_ids
        FROM building WHERE client_id = p_client_id;

        v_building_count := COALESCE(array_length(v_building_ids, 1), 0);

        IF v_building_ids IS NOT NULL THEN
            SELECT count(*) INTO v_sensor_count
            FROM sensor WHERE building_id = ANY(v_building_ids);

            SELECT count(*) INTO v_report_count
            FROM report r
            JOIN sensor s ON s.id = r.sensor_id
            WHERE s.building_id = ANY(v_building_ids);
        END IF;
    END IF;

    RETURN json_build_object(
        'client_count',   v_client_count,
        'building_count', v_building_count,
        'sensor_count',   v_sensor_count,
        'report_count',   v_report_count
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ============================================================================
-- 2. get_buildings_overview: single query returning buildings + sensor count
--    + today's volume + last activity time — replaces buildings list N+1
-- ============================================================================

CREATE OR REPLACE FUNCTION get_buildings_overview(
    p_client_id UUID DEFAULT NULL
) RETURNS TABLE (
    id              INTEGER,
    created_at      TIMESTAMPTZ,
    name            TEXT,
    full_address    TEXT,
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    client_id       UUID,
    number_of_floors INTEGER,
    bhi             DOUBLE PRECISION,
    bhi_label       TEXT,
    client_first_name TEXT,
    client_last_name  TEXT,
    sensor_count    BIGINT,
    today_volume_litres DOUBLE PRECISION,
    last_activity_at    TIMESTAMPTZ
) AS $$
    SELECT
        b.id,
        b.created_at,
        b.name,
        b.full_address,
        b.latitude,
        b.longitude,
        b.client_id,
        b.number_of_floors,
        b.bhi,
        b.bhi_label,
        c.first_name AS client_first_name,
        c.last_name  AS client_last_name,
        COALESCE(sc.cnt, 0) AS sensor_count,
        COALESCE(fv.today_vol, 0) AS today_volume_litres,
        la.last_at AS last_activity_at
    FROM building b
    LEFT JOIN client c ON c.id = b.client_id
    -- Sensor count per building
    LEFT JOIN LATERAL (
        SELECT count(*) AS cnt FROM sensor s WHERE s.building_id = b.id
    ) sc ON true
    -- Today's volume: sum flow_hourly for all mag sensors linked to this building
    LEFT JOIN LATERAL (
        SELECT COALESCE(sum(fh.volume_litres), 0) AS today_vol
        FROM flow_hourly fh
        JOIN mag_to_building mtb ON mtb.mag_id = fh.sensor_id AND mtb.building_id = b.id
        WHERE fh.hour_start >= date_trunc('hour', now() - interval '24 hours')
    ) fv ON true
    -- Last activity: most recent mag_report timestamp for any linked sensor
    LEFT JOIN LATERAL (
        SELECT max(mr.created_at) AS last_at
        FROM mag_report mr
        JOIN mag_to_building mtb ON mtb.mag_id = mr.sensor_id AND mtb.building_id = b.id
        WHERE mr.created_at >= now() - interval '1 hour'
    ) la ON true
    WHERE (p_client_id IS NULL OR b.client_id = p_client_id)
    ORDER BY b.created_at DESC;
$$ LANGUAGE SQL STABLE;


-- ============================================================================
-- 3. get_bulk_flow_status: batch live flow check for multiple buildings
--
-- For each building, checks the last 30s of mag data and returns:
-- - whether flow is detected (has recent high-variance readings)
-- - the latest flow rate estimate
-- - last reading timestamp
-- - sensor multiplier
--
-- This replaces N individual polling loops (each doing 2-3 requests).
-- ============================================================================

CREATE OR REPLACE FUNCTION get_bulk_flow_status(
    p_building_ids INTEGER[]
) RETURNS TABLE (
    building_id       INTEGER,
    mag_sensor_id     INTEGER,
    multiplier        DOUBLE PRECISION,
    recent_row_count  INTEGER,
    has_activity      BOOLEAN,
    avg_band_energy   DOUBLE PRECISION,
    last_reading_at   TIMESTAMPTZ
) AS $$
    WITH building_sensors AS (
        -- Resolve mag sensor + multiplier for each building (one per building)
        SELECT DISTINCT ON (mtb.building_id)
            mtb.building_id,
            mtb.mag_id,
            s.multiplier
        FROM mag_to_building mtb
        JOIN sensor s ON s.id = mtb.mag_id
        WHERE mtb.building_id = ANY(p_building_ids)
          AND s.multiplier IS NOT NULL
          AND s.multiplier > 0
        ORDER BY mtb.building_id, mtb.mag_id
    ),
    recent_data AS (
        -- Get last 30s of mag data for each resolved sensor
        SELECT
            bs.building_id,
            bs.mag_id,
            bs.multiplier,
            count(mr.id)::INTEGER AS row_count,
            COALESCE(avg(mr.band_energy_10s), 0) AS avg_be,
            max(mr.created_at) AS last_at
        FROM building_sensors bs
        LEFT JOIN mag_report mr
            ON mr.sensor_id = bs.mag_id
           AND mr.created_at >= now() - interval '30 seconds'
        GROUP BY bs.building_id, bs.mag_id, bs.multiplier
    )
    SELECT
        rd.building_id,
        rd.mag_id AS mag_sensor_id,
        rd.multiplier,
        rd.row_count AS recent_row_count,
        (rd.row_count >= 5 AND rd.avg_be > 5) AS has_activity,
        rd.avg_be AS avg_band_energy,
        rd.last_at AS last_reading_at
    FROM recent_data rd

    UNION ALL

    -- Buildings with no sensor mapping get a null row
    SELECT
        bid AS building_id,
        NULL::INTEGER,
        NULL::DOUBLE PRECISION,
        0,
        false,
        0,
        NULL::TIMESTAMPTZ
    FROM unnest(p_building_ids) AS bid
    WHERE bid NOT IN (SELECT building_id FROM building_sensors);
$$ LANGUAGE SQL STABLE;


-- ============================================================================
-- 4. get_building_analytics_summary: pre-computed analytics for a building
--
-- Returns today, yesterday, this week, last week, this month volumes +
-- active seconds, session counts, and peak hours — all from flow_hourly.
-- One RPC instead of fetching 672 rows and computing client-side.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_building_analytics_summary(
    p_building_id INTEGER
) RETURNS JSON AS $$
DECLARE
    v_now           TIMESTAMPTZ := now();
    v_today_start   TIMESTAMPTZ := date_trunc('day', now());
    v_yesterday_start TIMESTAMPTZ := date_trunc('day', now()) - interval '1 day';
    v_week_start    TIMESTAMPTZ := date_trunc('week', now());
    v_last_week_start TIMESTAMPTZ := date_trunc('week', now()) - interval '1 week';
    v_month_start   TIMESTAMPTZ := date_trunc('month', now());
    v_28d_ago       TIMESTAMPTZ := date_trunc('day', now()) - interval '28 days';
    v_mag_ids       INTEGER[];
    -- Volume buckets
    v_today         DOUBLE PRECISION := 0;
    v_yesterday     DOUBLE PRECISION := 0;
    v_this_week     DOUBLE PRECISION := 0;
    v_last_week     DOUBLE PRECISION := 0;
    v_this_month    DOUBLE PRECISION := 0;
    -- Activity buckets
    v_today_active  INTEGER := 0;
    v_today_sessions INTEGER := 0;
    -- Peak hours (7-day)
    v_peak_hours    JSON;
BEGIN
    -- Resolve mag sensor IDs for this building
    SELECT array_agg(mag_id) INTO v_mag_ids
    FROM mag_to_building
    WHERE building_id = p_building_id;

    IF v_mag_ids IS NULL THEN
        RETURN json_build_object(
            'today', 0, 'yesterday', 0,
            'this_week', 0, 'last_week', 0, 'this_month', 0,
            'today_active_seconds', 0, 'today_sessions', 0,
            'peak_hours', '[]'::json
        );
    END IF;

    -- All volume/activity sums in a single pass over flow_hourly
    SELECT
        COALESCE(sum(volume_litres) FILTER (
            WHERE hour_start >= v_today_start
        ), 0),
        COALESCE(sum(volume_litres) FILTER (
            WHERE hour_start >= v_yesterday_start AND hour_start < v_today_start
        ), 0),
        COALESCE(sum(volume_litres) FILTER (
            WHERE hour_start >= v_week_start
        ), 0),
        COALESCE(sum(volume_litres) FILTER (
            WHERE hour_start >= v_last_week_start AND hour_start < v_week_start
        ), 0),
        COALESCE(sum(volume_litres) FILTER (
            WHERE hour_start >= v_month_start
        ), 0),
        COALESCE(sum(active_seconds) FILTER (
            WHERE hour_start >= v_today_start
        ), 0)::INTEGER,
        COALESCE(sum(session_count) FILTER (
            WHERE hour_start >= v_today_start
        ), 0)::INTEGER
    INTO v_today, v_yesterday, v_this_week, v_last_week, v_this_month,
         v_today_active, v_today_sessions
    FROM flow_hourly
    WHERE sensor_id = ANY(v_mag_ids)
      AND hour_start >= LEAST(v_28d_ago, v_last_week_start, v_month_start);

    -- Peak hours: total volume per hour-of-day over last 7 days
    SELECT json_agg(hourly_vol ORDER BY h)
    INTO v_peak_hours
    FROM (
        SELECT
            extract(hour FROM hour_start)::INTEGER AS h,
            round(COALESCE(sum(volume_litres), 0)::NUMERIC, 1) AS hourly_vol
        FROM generate_series(0, 23) AS h
        LEFT JOIN flow_hourly fh
            ON extract(hour FROM fh.hour_start)::INTEGER = h
           AND fh.sensor_id = ANY(v_mag_ids)
           AND fh.hour_start >= v_now - interval '7 days'
        GROUP BY h
    ) sub;

    RETURN json_build_object(
        'today',                round(v_today::NUMERIC, 1),
        'yesterday',            round(v_yesterday::NUMERIC, 1),
        'this_week',            round(v_this_week::NUMERIC, 1),
        'last_week',            round(v_last_week::NUMERIC, 1),
        'this_month',           round(v_this_month::NUMERIC, 1),
        'today_active_seconds', v_today_active,
        'today_sessions',       v_today_sessions,
        'peak_hours',           COALESCE(v_peak_hours, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql STABLE;
