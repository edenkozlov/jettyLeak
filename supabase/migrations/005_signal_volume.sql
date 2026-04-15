-- ============================================================================
-- signal_volume: per-session volume computed from raw mag_report peaks
--
-- Adds volume_l and avg_flow_lpm columns to the signal table, a function that
-- counts mag_report peaks in a signal's time range (using the same algorithm
-- as flow_hourly) and divides by the sensor's multiplier to get actual litres,
-- and a BEFORE INSERT trigger so newly-emitted signals auto-populate these
-- fields. Existing signals can be backfilled via backfill_signal_volumes().
-- ============================================================================

ALTER TABLE signal ADD COLUMN IF NOT EXISTS volume_l DOUBLE PRECISION;
ALTER TABLE signal ADD COLUMN IF NOT EXISTS avg_flow_lpm DOUBLE PRECISION;

COMMENT ON COLUMN signal.volume_l IS
    'Total litres consumed during this session, computed from mag_report peak count / sensor.multiplier';
COMMENT ON COLUMN signal.avg_flow_lpm IS
    'Average flow rate during the session in L/min, computed from volume_l / duration';

CREATE INDEX IF NOT EXISTS idx_signal_sensor_start
    ON signal (sensor_id, start_time DESC);

-- ----------------------------------------------------------------------------
-- compute_signal_volume_value(sensor_id, start_time, end_time) -> volume in L
--
-- Counts mag_report peaks in the given time range on the given sensor and
-- divides by the sensor's multiplier. Uses the same peak detection as
-- flow_hourly: local maxima in total_magnitude with a rolling-variance
-- threshold and 500ms dedup.
--
-- The scan window is extended by 2.5s on each side so the rolling-variance
-- computation has enough context for short sessions; only peaks *within* the
-- requested range are counted.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION compute_signal_volume_value(
    p_sensor_id BIGINT,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ
) RETURNS DOUBLE PRECISION AS $$
DECLARE
    v_multiplier  DOUBLE PRECISION;
    v_peak_count  INTEGER := 0;
    v_end         TIMESTAMPTZ;
BEGIN
    IF p_sensor_id IS NULL OR p_start_time IS NULL THEN
        RETURN NULL;
    END IF;

    v_end := COALESCE(p_end_time, p_start_time);

    SELECT multiplier::DOUBLE PRECISION INTO v_multiplier
    FROM sensor
    WHERE id = p_sensor_id;

    IF v_multiplier IS NULL OR v_multiplier <= 0 THEN
        RETURN NULL;
    END IF;

    WITH numbered AS (
        SELECT
            created_at,
            total_magnitude,
            LAG(total_magnitude)  OVER w AS prev_val,
            LEAD(total_magnitude) OVER w AS next_val,
            stddev_pop(total_magnitude) OVER (
                ORDER BY created_at
                ROWS BETWEEN 50 PRECEDING AND 50 FOLLOWING
            ) AS local_std
        FROM mag_report
        WHERE sensor_id = p_sensor_id
          AND created_at >= p_start_time - INTERVAL '2500 milliseconds'
          AND created_at <= v_end + INTERVAL '2500 milliseconds'
          AND total_magnitude IS NOT NULL
        WINDOW w AS (ORDER BY created_at)
    ),
    raw_peaks AS (
        SELECT created_at
        FROM numbered
        WHERE total_magnitude > prev_val
          AND total_magnitude > next_val
          AND local_std > 4.5
          AND (total_magnitude - LEAST(prev_val, next_val)) > 0.5
          AND created_at >= p_start_time
          AND created_at <= v_end
    ),
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

    RETURN v_peak_count::DOUBLE PRECISION / v_multiplier;
END;
$$ LANGUAGE plpgsql STABLE;

-- ----------------------------------------------------------------------------
-- BEFORE INSERT trigger — fills volume_l + avg_flow_lpm on new signal rows.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_signal_compute_volume()
RETURNS trigger AS $$
DECLARE
    v_duration_s DOUBLE PRECISION;
BEGIN
    IF NEW.sensor_id IS NULL OR NEW.start_time IS NULL THEN
        RETURN NEW;
    END IF;

    -- Only compute when not already set (lets backfills and manual inserts
    -- specify their own values without the trigger overwriting them).
    IF NEW.volume_l IS NULL THEN
        NEW.volume_l := compute_signal_volume_value(
            NEW.sensor_id, NEW.start_time, NEW.end_time
        );
    END IF;

    IF NEW.volume_l IS NOT NULL AND NEW.avg_flow_lpm IS NULL THEN
        v_duration_s := GREATEST(
            EXTRACT(EPOCH FROM (COALESCE(NEW.end_time, NEW.start_time) - NEW.start_time)),
            0.001
        );
        IF v_duration_s > 0 THEN
            NEW.avg_flow_lpm := (NEW.volume_l / v_duration_s) * 60.0;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS signal_compute_volume_before_insert ON signal;
CREATE TRIGGER signal_compute_volume_before_insert
    BEFORE INSERT ON signal
    FOR EACH ROW
    EXECUTE FUNCTION trg_signal_compute_volume();

-- ----------------------------------------------------------------------------
-- Backfill for existing rows — call repeatedly until it returns 0.
-- Processes newest N signals first so recent data becomes accurate quickly.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION backfill_signal_volumes(p_limit INTEGER DEFAULT 5000)
RETURNS INTEGER AS $$
DECLARE
    r       RECORD;
    v_vol   DOUBLE PRECISION;
    v_dur   DOUBLE PRECISION;
    v_count INTEGER := 0;
BEGIN
    FOR r IN
        SELECT id, sensor_id, start_time, end_time
        FROM signal
        WHERE volume_l IS NULL
          AND start_time IS NOT NULL
          AND sensor_id IS NOT NULL
        ORDER BY start_time DESC
        LIMIT p_limit
    LOOP
        BEGIN
            v_vol := compute_signal_volume_value(r.sensor_id, r.start_time, r.end_time);
            v_dur := GREATEST(
                EXTRACT(EPOCH FROM (COALESCE(r.end_time, r.start_time) - r.start_time)),
                0.001
            );
            UPDATE signal
            SET volume_l = v_vol,
                avg_flow_lpm = CASE
                    WHEN v_vol IS NOT NULL AND v_dur > 0 THEN (v_vol / v_dur) * 60.0
                    ELSE NULL
                END
            WHERE id = r.id;
            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            -- Skip rows that error out (broken data, missing sensor, etc.)
            CONTINUE;
        END;
    END LOOP;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;
