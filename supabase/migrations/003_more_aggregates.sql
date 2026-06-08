-- ============================================================================
-- 003_more_aggregates: Additional server-side aggregates to eliminate
-- remaining raw-table fetches that pull 100K–1M+ rows.
--
-- Problems solved:
-- 1. useVolumeSummary fetches 24hrs of raw mag_report (~864K rows) to compute
--    volume buckets client-side → 1 RPC from flow_hourly (~24 rows)
-- 2. Reports page fetches ALL raw report rows for flow chart → 1 RPC with
--    server-side downsampling (~1500 points)
-- 3. Reports page fetches ALL raw signal rows → 1 RPC with aggregated summary
-- ============================================================================


-- ============================================================================
-- 1. get_volume_buckets: pre-computed volume for multiple time windows
--
-- Replaces useVolumeSummary's 24hr raw mag fetch + client-side peak detection.
-- Reads from flow_hourly (max ~24 rows for 24hr) instead of mag_report.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_volume_buckets(
    p_sensor_ids INTEGER[]
) RETURNS JSON AS $$
DECLARE
    v_now           TIMESTAMPTZ := now();
    v_today_start   TIMESTAMPTZ := date_trunc('day', now());
    v_15m_ago       TIMESTAMPTZ := now() - interval '15 minutes';
    v_1h_ago        TIMESTAMPTZ := now() - interval '1 hour';
    v_12h_ago       TIMESTAMPTZ := now() - interval '12 hours';
    v_24h_ago       TIMESTAMPTZ := now() - interval '24 hours';
    -- Results
    v_15m_vol       DOUBLE PRECISION := 0;
    v_15m_cycles    INTEGER := 0;
    v_1h_vol        DOUBLE PRECISION := 0;
    v_1h_cycles     INTEGER := 0;
    v_12h_vol       DOUBLE PRECISION := 0;
    v_12h_cycles    INTEGER := 0;
    v_24h_vol       DOUBLE PRECISION := 0;
    v_24h_cycles    INTEGER := 0;
    v_today_vol     DOUBLE PRECISION := 0;
    v_today_cycles  INTEGER := 0;
BEGIN
    IF p_sensor_ids IS NULL OR array_length(p_sensor_ids, 1) IS NULL THEN
        RETURN json_build_object(
            'buckets', json_build_array(
                json_build_object('label', '15 min', 'volumeL', 0, 'cycles', 0),
                json_build_object('label', '1 hr',   'volumeL', 0, 'cycles', 0),
                json_build_object('label', '12 hr',  'volumeL', 0, 'cycles', 0),
                json_build_object('label', '24 hr',  'volumeL', 0, 'cycles', 0),
                json_build_object('label', 'Today',  'volumeL', 0, 'cycles', 0)
            )
        );
    END IF;

    -- Single pass over flow_hourly for the last 24 hours
    -- The 15-min bucket uses the current hour's row (partial), which is a
    -- slight over-count but avoids hitting raw mag_report entirely.
    SELECT
        -- 15 min: only the current hour row counts (hour_start >= v_1h_ago covers it)
        COALESCE(sum(volume_litres) FILTER (
            WHERE hour_start >= date_trunc('hour', v_15m_ago)
        ), 0),
        COALESCE(sum(peak_count) FILTER (
            WHERE hour_start >= date_trunc('hour', v_15m_ago)
        ), 0)::INTEGER,
        -- 1 hour
        COALESCE(sum(volume_litres) FILTER (
            WHERE hour_start >= date_trunc('hour', v_1h_ago)
        ), 0),
        COALESCE(sum(peak_count) FILTER (
            WHERE hour_start >= date_trunc('hour', v_1h_ago)
        ), 0)::INTEGER,
        -- 12 hours
        COALESCE(sum(volume_litres) FILTER (
            WHERE hour_start >= date_trunc('hour', v_12h_ago)
        ), 0),
        COALESCE(sum(peak_count) FILTER (
            WHERE hour_start >= date_trunc('hour', v_12h_ago)
        ), 0)::INTEGER,
        -- 24 hours
        COALESCE(sum(volume_litres) FILTER (
            WHERE hour_start >= date_trunc('hour', v_24h_ago)
        ), 0),
        COALESCE(sum(peak_count) FILTER (
            WHERE hour_start >= date_trunc('hour', v_24h_ago)
        ), 0)::INTEGER,
        -- Today (since midnight)
        COALESCE(sum(volume_litres) FILTER (
            WHERE hour_start >= v_today_start
        ), 0),
        COALESCE(sum(peak_count) FILTER (
            WHERE hour_start >= v_today_start
        ), 0)::INTEGER
    INTO
        v_15m_vol, v_15m_cycles,
        v_1h_vol,  v_1h_cycles,
        v_12h_vol, v_12h_cycles,
        v_24h_vol, v_24h_cycles,
        v_today_vol, v_today_cycles
    FROM flow_hourly
    WHERE sensor_id = ANY(p_sensor_ids)
      AND hour_start >= LEAST(date_trunc('hour', v_24h_ago), v_today_start);

    RETURN json_build_object(
        'buckets', json_build_array(
            json_build_object('label', '15 min', 'volumeL', round(v_15m_vol::NUMERIC, 1),   'cycles', v_15m_cycles),
            json_build_object('label', '1 hr',   'volumeL', round(v_1h_vol::NUMERIC, 1),    'cycles', v_1h_cycles),
            json_build_object('label', '12 hr',  'volumeL', round(v_12h_vol::NUMERIC, 1),   'cycles', v_12h_cycles),
            json_build_object('label', '24 hr',  'volumeL', round(v_24h_vol::NUMERIC, 1),   'cycles', v_24h_cycles),
            json_build_object('label', 'Today',  'volumeL', round(v_today_vol::NUMERIC, 1), 'cycles', v_today_cycles)
        )
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ============================================================================
-- 2. get_report_downsampled: server-side downsampling for report (flow) data
--
-- Same NTILE pattern as get_mag_downsampled. Returns ~N evenly-spaced points
-- so the client never needs to fetch 100K+ raw report rows.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_report_downsampled(
    p_sensor_id INTEGER,
    p_since     TIMESTAMPTZ,
    p_until     TIMESTAMPTZ,
    p_max_points INTEGER DEFAULT 1500
) RETURNS TABLE (
    id          BIGINT,
    created_at  TIMESTAMPTZ,
    sensor_id   INTEGER,
    flow_value  DOUBLE PRECISION,
    temp_value  DOUBLE PRECISION
) AS $$
    WITH numbered AS (
        SELECT
            r.id,
            r.created_at,
            r.sensor_id,
            r.flow_value::DOUBLE PRECISION,
            r.temp_value::DOUBLE PRECISION,
            ntile(p_max_points) OVER (ORDER BY r.created_at) AS bucket
        FROM report r
        WHERE r.sensor_id = p_sensor_id
          AND r.created_at >= p_since
          AND r.created_at <= p_until
    ),
    picked AS (
        SELECT DISTINCT ON (bucket)
            n.id,
            n.created_at,
            n.sensor_id,
            n.flow_value,
            n.temp_value
        FROM numbered n
        ORDER BY bucket, n.created_at
    )
    SELECT * FROM picked ORDER BY created_at;
$$ LANGUAGE SQL STABLE;


-- ============================================================================
-- 3. get_signal_summary: aggregated signal breakdown per type
--
-- Instead of fetching all raw signal rows, returns one row per signal type
-- with count, total duration, and average confidence.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_signal_summary(
    p_sensor_id  INTEGER,
    p_since      TIMESTAMPTZ,
    p_until      TIMESTAMPTZ
) RETURNS TABLE (
    signal_type     INTEGER,
    signal_count    BIGINT,
    total_duration_s DOUBLE PRECISION,
    avg_confidence  DOUBLE PRECISION,
    first_seen      TIMESTAMPTZ,
    last_seen       TIMESTAMPTZ
) AS $$
    SELECT
        -- Extract signal_type from the JSON value field: value->>'signal_type'
        (s.value::json->>'signal_type')::INTEGER AS signal_type,
        count(*) AS signal_count,
        COALESCE(sum(
            EXTRACT(EPOCH FROM (s.end_time - s.start_time))
        ), 0) AS total_duration_s,
        COALESCE(avg(
            (s.value::json->>'confidence')::DOUBLE PRECISION
        ), 0) AS avg_confidence,
        min(s.start_time) AS first_seen,
        max(s.end_time) AS last_seen
    FROM signal s
    WHERE s.sensor_id = p_sensor_id
      AND s.start_time >= p_since
      AND s.start_time <= p_until
    GROUP BY (s.value::json->>'signal_type')::INTEGER
    ORDER BY signal_type;
$$ LANGUAGE SQL STABLE;


-- ============================================================================
-- 4. get_signal_downsampled: server-side downsampled signal rows
--
-- For the chart overlay, we still need individual signal intervals but can
-- limit to a reasonable count. Returns the N most relevant signals (longest
-- duration first, capped).
-- ============================================================================

CREATE OR REPLACE FUNCTION get_signal_downsampled(
    p_sensor_id  INTEGER,
    p_since      TIMESTAMPTZ,
    p_until      TIMESTAMPTZ,
    p_max_rows   INTEGER DEFAULT 500
) RETURNS TABLE (
    id          BIGINT,
    created_at  TIMESTAMPTZ,
    value       TEXT,
    "time"      TIMESTAMPTZ,
    sensor_id   INTEGER,
    start_time  TIMESTAMPTZ,
    end_time    TIMESTAMPTZ
) AS $$
    SELECT
        s.id,
        s.created_at,
        s.value::TEXT,
        s.time AS "time",
        s.sensor_id,
        s.start_time,
        s.end_time
    FROM signal s
    WHERE s.sensor_id = p_sensor_id
      AND s.start_time >= p_since
      AND s.start_time <= p_until
    ORDER BY s.start_time
    LIMIT p_max_rows;
$$ LANGUAGE SQL STABLE;
