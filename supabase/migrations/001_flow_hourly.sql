-- ============================================================================
-- flow_hourly: pre-aggregated hourly flow statistics per sensor
--
-- Replaces fetching millions of raw mag_report rows on the client.
-- The client queries this table (max ~672 rows for 28 days) instead of
-- scanning 24M+ raw rows.
-- ============================================================================

CREATE TABLE IF NOT EXISTS flow_hourly (
    sensor_id   INTEGER      NOT NULL,
    hour_start  TIMESTAMPTZ  NOT NULL,
    -- Peak detection results
    peak_count  INTEGER      NOT NULL DEFAULT 0,
    -- Volume in litres (peak_count / multiplier at compute time)
    volume_litres DOUBLE PRECISION NOT NULL DEFAULT 0,
    -- Seconds within this hour where flow was detected
    active_seconds INTEGER   NOT NULL DEFAULT 0,
    -- Number of distinct flow sessions (gap > 2 min between activity)
    session_count INTEGER    NOT NULL DEFAULT 0,
    -- Mag data summary for charts (avoids fetching raw data)
    avg_total   DOUBLE PRECISION,
    min_total   DOUBLE PRECISION,
    max_total   DOUBLE PRECISION,
    stddev_total DOUBLE PRECISION,
    avg_x       DOUBLE PRECISION,
    avg_y       DOUBLE PRECISION,
    avg_z       DOUBLE PRECISION,
    row_count   INTEGER      NOT NULL DEFAULT 0,
    -- Multiplier used at compute time (so we can recompute if it changes)
    multiplier_used DOUBLE PRECISION,
    computed_at TIMESTAMPTZ  NOT NULL DEFAULT now(),

    PRIMARY KEY (sensor_id, hour_start)
);

-- Index for range queries the client will make
CREATE INDEX IF NOT EXISTS idx_flow_hourly_sensor_time
    ON flow_hourly (sensor_id, hour_start DESC);

-- Enable RLS but allow read access via anon key
ALTER TABLE flow_hourly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flow_hourly_read" ON flow_hourly FOR SELECT USING (true);

-- ============================================================================
-- compute_flow_hour: computes flow stats for one sensor + one hour
--
-- Uses SQL window functions for peak detection (simplified but effective):
-- 1. Compute variance over 10s windows — skip low-variance (no flow)
-- 2. Detect local maxima in total_magnitude
-- 3. Deduplicate peaks within 500ms
-- 4. Count peaks → volume = peak_count / multiplier
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_flow_hour(
    p_sensor_id INTEGER,
    p_hour_start TIMESTAMPTZ,
    p_multiplier DOUBLE PRECISION DEFAULT 1.0
) RETURNS void AS $$
DECLARE
    v_hour_end   TIMESTAMPTZ := p_hour_start + INTERVAL '1 hour';
    v_peak_count INTEGER := 0;
    v_volume     DOUBLE PRECISION := 0;
    v_active_s   INTEGER := 0;
    v_sessions   INTEGER := 0;
    v_row_count  INTEGER := 0;
    v_avg_total  DOUBLE PRECISION;
    v_min_total  DOUBLE PRECISION;
    v_max_total  DOUBLE PRECISION;
    v_std_total  DOUBLE PRECISION;
    v_avg_x      DOUBLE PRECISION;
    v_avg_y      DOUBLE PRECISION;
    v_avg_z      DOUBLE PRECISION;
BEGIN
    -- Basic aggregates (always computed, very fast with index)
    SELECT
        count(*)::INTEGER,
        avg(total_magnitude),
        min(total_magnitude),
        max(total_magnitude),
        stddev_pop(total_magnitude),
        avg(x_axis_reading),
        avg(y_axis_reading),
        avg(z_axis_reading)
    INTO v_row_count, v_avg_total, v_min_total, v_max_total, v_std_total,
         v_avg_x, v_avg_y, v_avg_z
    FROM mag_report
    WHERE sensor_id = p_sensor_id
      AND created_at >= p_hour_start
      AND created_at < v_hour_end;

    IF v_row_count < 5 THEN
        -- Not enough data — store zeros
        INSERT INTO flow_hourly (
            sensor_id, hour_start, peak_count, volume_litres, active_seconds,
            session_count, avg_total, min_total, max_total, stddev_total,
            avg_x, avg_y, avg_z, row_count, multiplier_used
        ) VALUES (
            p_sensor_id, p_hour_start, 0, 0, 0, 0,
            v_avg_total, v_min_total, v_max_total, v_std_total,
            v_avg_x, v_avg_y, v_avg_z, v_row_count, p_multiplier
        )
        ON CONFLICT (sensor_id, hour_start) DO UPDATE SET
            peak_count = EXCLUDED.peak_count,
            volume_litres = EXCLUDED.volume_litres,
            active_seconds = EXCLUDED.active_seconds,
            session_count = EXCLUDED.session_count,
            avg_total = EXCLUDED.avg_total,
            min_total = EXCLUDED.min_total,
            max_total = EXCLUDED.max_total,
            stddev_total = EXCLUDED.stddev_total,
            avg_x = EXCLUDED.avg_x,
            avg_y = EXCLUDED.avg_y,
            avg_z = EXCLUDED.avg_z,
            row_count = EXCLUDED.row_count,
            multiplier_used = EXCLUDED.multiplier_used,
            computed_at = now();
        RETURN;
    END IF;

    -- Peak detection using window functions:
    -- A point is a local maximum if total_magnitude > both neighbors
    -- and the local variance (computed over a 10s window) > 20
    WITH numbered AS (
        SELECT
            created_at,
            total_magnitude,
            x_axis_reading,
            LAG(total_magnitude)  OVER w AS prev_val,
            LEAD(total_magnitude) OVER w AS next_val,
            -- Rolling variance over ~100 surrounding rows (approx 10s at 10Hz)
            stddev_pop(total_magnitude) OVER (
                ORDER BY created_at
                ROWS BETWEEN 50 PRECEDING AND 50 FOLLOWING
            ) AS local_std
        FROM mag_report
        WHERE sensor_id = p_sensor_id
          AND created_at >= p_hour_start
          AND created_at < v_hour_end
          AND total_magnitude IS NOT NULL
        WINDOW w AS (ORDER BY created_at)
    ),
    raw_peaks AS (
        SELECT created_at
        FROM numbered
        WHERE total_magnitude > prev_val
          AND total_magnitude > next_val
          AND local_std > 4.5  -- sqrt(20) ≈ 4.5, equivalent to variance > 20
          AND (total_magnitude - LEAST(prev_val, next_val)) > 0.5  -- min prominence
    ),
    -- Deduplicate: keep only peaks that are > 500ms apart
    deduped AS (
        SELECT created_at,
               LAG(created_at) OVER (ORDER BY created_at) AS prev_peak
        FROM raw_peaks
    ),
    final_peaks AS (
        SELECT created_at
        FROM deduped
        WHERE prev_peak IS NULL
           OR EXTRACT(EPOCH FROM (created_at - prev_peak)) > 0.5
    )
    SELECT count(*)::INTEGER INTO v_peak_count FROM final_peaks;

    -- Volume = peak_count cycles / multiplier (cycles per litre)
    IF p_multiplier > 0 THEN
        v_volume := v_peak_count::DOUBLE PRECISION / p_multiplier;
    END IF;

    -- Active seconds: count distinct seconds that have high variance
    SELECT count(DISTINCT date_trunc('second', created_at))::INTEGER
    INTO v_active_s
    FROM (
        SELECT created_at,
               stddev_pop(x_axis_reading) OVER (
                   ORDER BY created_at
                   ROWS BETWEEN 25 PRECEDING AND 25 FOLLOWING
               ) AS local_x_std
        FROM mag_report
        WHERE sensor_id = p_sensor_id
          AND created_at >= p_hour_start
          AND created_at < v_hour_end
          AND x_axis_reading IS NOT NULL
    ) sub
    WHERE local_x_std > 5;  -- vibration threshold

    -- Session count: gaps > 2 minutes between active seconds
    WITH active_secs AS (
        SELECT DISTINCT date_trunc('second', created_at) AS sec
        FROM (
            SELECT created_at,
                   stddev_pop(x_axis_reading) OVER (
                       ORDER BY created_at
                       ROWS BETWEEN 25 PRECEDING AND 25 FOLLOWING
                   ) AS local_x_std
            FROM mag_report
            WHERE sensor_id = p_sensor_id
              AND created_at >= p_hour_start
              AND created_at < v_hour_end
              AND x_axis_reading IS NOT NULL
        ) sub
        WHERE local_x_std > 5
    ),
    gaps AS (
        SELECT sec,
               EXTRACT(EPOCH FROM (sec - LAG(sec) OVER (ORDER BY sec))) AS gap_s
        FROM active_secs
    )
    SELECT COALESCE(count(*) FILTER (WHERE gap_s IS NULL OR gap_s > 120), 0)::INTEGER
    INTO v_sessions
    FROM gaps;

    -- Upsert the result
    INSERT INTO flow_hourly (
        sensor_id, hour_start, peak_count, volume_litres, active_seconds,
        session_count, avg_total, min_total, max_total, stddev_total,
        avg_x, avg_y, avg_z, row_count, multiplier_used
    ) VALUES (
        p_sensor_id, p_hour_start, v_peak_count, v_volume, v_active_s,
        v_sessions, v_avg_total, v_min_total, v_max_total, v_std_total,
        v_avg_x, v_avg_y, v_avg_z, v_row_count, p_multiplier
    )
    ON CONFLICT (sensor_id, hour_start) DO UPDATE SET
        peak_count = EXCLUDED.peak_count,
        volume_litres = EXCLUDED.volume_litres,
        active_seconds = EXCLUDED.active_seconds,
        session_count = EXCLUDED.session_count,
        avg_total = EXCLUDED.avg_total,
        min_total = EXCLUDED.min_total,
        max_total = EXCLUDED.max_total,
        stddev_total = EXCLUDED.stddev_total,
        avg_x = EXCLUDED.avg_x,
        avg_y = EXCLUDED.avg_y,
        avg_z = EXCLUDED.avg_z,
        row_count = EXCLUDED.row_count,
        multiplier_used = EXCLUDED.multiplier_used,
        computed_at = now();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- backfill_flow_hourly: process all historical data for a sensor
-- Call once per sensor to populate the table. Processes one hour at a time
-- to avoid memory issues.
-- ============================================================================

CREATE OR REPLACE FUNCTION backfill_flow_hourly(
    p_sensor_id INTEGER,
    p_multiplier DOUBLE PRECISION DEFAULT 1.0,
    p_since TIMESTAMPTZ DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_start TIMESTAMPTZ;
    v_current TIMESTAMPTZ;
    v_end TIMESTAMPTZ;
    v_count INTEGER := 0;
BEGIN
    -- Find the earliest data for this sensor
    IF p_since IS NOT NULL THEN
        v_start := date_trunc('hour', p_since);
    ELSE
        SELECT date_trunc('hour', min(created_at))
        INTO v_start
        FROM mag_report
        WHERE sensor_id = p_sensor_id;
    END IF;

    IF v_start IS NULL THEN RETURN 0; END IF;

    v_end := date_trunc('hour', now());
    v_current := v_start;

    WHILE v_current <= v_end LOOP
        PERFORM compute_flow_hour(p_sensor_id, v_current, p_multiplier);
        v_current := v_current + INTERVAL '1 hour';
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- get_flow_analytics: the main RPC the client calls instead of fetching raw data
-- Returns one row per hour with all pre-computed stats.
-- 28 days = max 672 rows. One HTTP request.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_flow_analytics(
    p_sensor_ids INTEGER[],
    p_since TIMESTAMPTZ,
    p_until TIMESTAMPTZ
) RETURNS TABLE (
    sensor_id    INTEGER,
    hour_start   TIMESTAMPTZ,
    peak_count   INTEGER,
    volume_litres DOUBLE PRECISION,
    active_seconds INTEGER,
    session_count INTEGER,
    avg_total    DOUBLE PRECISION,
    min_total    DOUBLE PRECISION,
    max_total    DOUBLE PRECISION,
    stddev_total DOUBLE PRECISION,
    avg_x        DOUBLE PRECISION,
    avg_y        DOUBLE PRECISION,
    avg_z        DOUBLE PRECISION,
    row_count    INTEGER
) AS $$
    SELECT
        fh.sensor_id,
        fh.hour_start,
        fh.peak_count,
        fh.volume_litres,
        fh.active_seconds,
        fh.session_count,
        fh.avg_total,
        fh.min_total,
        fh.max_total,
        fh.stddev_total,
        fh.avg_x,
        fh.avg_y,
        fh.avg_z,
        fh.row_count
    FROM flow_hourly fh
    WHERE fh.sensor_id = ANY(p_sensor_ids)
      AND fh.hour_start >= date_trunc('hour', p_since)
      AND fh.hour_start < p_until
    ORDER BY fh.hour_start;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- Downsampled mag data for charts: returns ~N evenly-spaced points
-- Uses NTILE to bucket rows and picks the median from each bucket.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_mag_downsampled(
    p_sensor_ids INTEGER[],
    p_since TIMESTAMPTZ,
    p_until TIMESTAMPTZ,
    p_max_points INTEGER DEFAULT 1500
) RETURNS TABLE (
    created_at        TIMESTAMPTZ,
    sensor_id         INTEGER,
    x_axis_reading    DOUBLE PRECISION,
    y_axis_reading    DOUBLE PRECISION,
    z_axis_reading    DOUBLE PRECISION,
    total_magnitude   DOUBLE PRECISION,
    band_energy_10s   DOUBLE PRECISION,
    band_energy_60s   DOUBLE PRECISION,
    band_energy_5m    DOUBLE PRECISION,
    dominant_freq_hz  DOUBLE PRECISION,
    vibration_rpm     DOUBLE PRECISION
) AS $$
    WITH numbered AS (
        SELECT
            m.*,
            ntile(p_max_points) OVER (ORDER BY m.created_at) AS bucket
        FROM mag_report m
        WHERE m.sensor_id = ANY(p_sensor_ids)
          AND m.created_at >= p_since
          AND m.created_at <= p_until
    ),
    picked AS (
        SELECT DISTINCT ON (bucket)
            n.created_at,
            n.sensor_id,
            n.x_axis_reading::DOUBLE PRECISION,
            n.y_axis_reading::DOUBLE PRECISION,
            n.z_axis_reading::DOUBLE PRECISION,
            n.total_magnitude::DOUBLE PRECISION,
            n.band_energy_10s::DOUBLE PRECISION,
            n.band_energy_60s::DOUBLE PRECISION,
            n.band_energy_5m::DOUBLE PRECISION,
            n.dominant_freq_hz::DOUBLE PRECISION,
            n.vibration_rpm::DOUBLE PRECISION
        FROM numbered n
        ORDER BY bucket, n.created_at
    )
    SELECT * FROM picked ORDER BY created_at;
$$ LANGUAGE SQL STABLE;
