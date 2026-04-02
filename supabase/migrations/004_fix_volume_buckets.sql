-- ============================================================================
-- Fix get_volume_buckets: accurate volume for all time windows
--
-- - 15min & 1hr: peak detection on raw mag_report for exact time windows
-- - 12hr, 24hr, Today: flow_hourly for completed hours + raw peaks for the
--   current partial hour
-- - Accepts timezone parameter so "Today" means midnight in the user's
--   local timezone, not UTC
-- ============================================================================

-- Helper: count peaks for one sensor in an arbitrary time range
CREATE OR REPLACE FUNCTION count_peaks_in_range(
    p_sensor_id INTEGER,
    p_start     TIMESTAMPTZ,
    p_end       TIMESTAMPTZ
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
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
          AND created_at >= p_start
          AND created_at < p_end
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
    SELECT count(*)::INTEGER INTO v_count FROM final_peaks;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


CREATE OR REPLACE FUNCTION get_volume_buckets(
    p_sensor_ids INTEGER[],
    p_timezone   TEXT DEFAULT 'UTC'
) RETURNS JSON AS $$
DECLARE
    v_now            TIMESTAMPTZ := now();
    v_today_start    TIMESTAMPTZ := date_trunc('day', v_now AT TIME ZONE p_timezone) AT TIME ZONE p_timezone;
    v_current_hour   TIMESTAMPTZ := date_trunc('hour', v_now);
    v_15m_ago        TIMESTAMPTZ := v_now - interval '15 minutes';
    v_1h_ago         TIMESTAMPTZ := v_now - interval '1 hour';
    v_12h_ago        TIMESTAMPTZ := v_now - interval '12 hours';
    v_24h_ago        TIMESTAMPTZ := v_now - interval '24 hours';
    v_range_start    TIMESTAMPTZ;
    v_15m_peaks      INTEGER := 0;
    v_1h_peaks       INTEGER := 0;
    v_partial_peaks  INTEGER := 0;
    v_12h_vol        DOUBLE PRECISION := 0;
    v_12h_cycles     INTEGER := 0;
    v_24h_vol        DOUBLE PRECISION := 0;
    v_24h_cycles     INTEGER := 0;
    v_today_vol      DOUBLE PRECISION := 0;
    v_today_cycles   INTEGER := 0;
    v_sid            INTEGER;
    v_mult           DOUBLE PRECISION;
    v_15m_vol        DOUBLE PRECISION := 0;
    v_1h_vol         DOUBLE PRECISION := 0;
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

    v_range_start := LEAST(date_trunc('hour', v_24h_ago), v_today_start);

    FOR v_sid IN SELECT unnest(p_sensor_ids) LOOP
        SELECT COALESCE(s.multiplier, 1.0)
        INTO v_mult
        FROM sensor s
        WHERE s.id = v_sid;

        IF v_mult IS NULL OR v_mult <= 0 THEN
            v_mult := 1.0;
        END IF;

        PERFORM compute_flow_hour(v_sid, v_current_hour, v_mult);

        v_15m_peaks := v_15m_peaks + count_peaks_in_range(v_sid, v_15m_ago, v_now);
        v_1h_peaks  := v_1h_peaks  + count_peaks_in_range(v_sid, v_1h_ago, v_now);
        v_partial_peaks := v_partial_peaks + count_peaks_in_range(v_sid, v_current_hour, v_now);

        v_15m_vol := v_15m_vol + (v_15m_peaks::DOUBLE PRECISION / v_mult);
        v_1h_vol  := v_1h_vol  + (v_1h_peaks::DOUBLE PRECISION / v_mult);
    END LOOP;

    SELECT
        COALESCE(sum(volume_litres) FILTER (
            WHERE hour_start >= date_trunc('hour', v_12h_ago) AND hour_start < v_current_hour
        ), 0),
        COALESCE(sum(peak_count) FILTER (
            WHERE hour_start >= date_trunc('hour', v_12h_ago) AND hour_start < v_current_hour
        ), 0)::INTEGER,
        COALESCE(sum(volume_litres) FILTER (
            WHERE hour_start >= date_trunc('hour', v_24h_ago) AND hour_start < v_current_hour
        ), 0),
        COALESCE(sum(peak_count) FILTER (
            WHERE hour_start >= date_trunc('hour', v_24h_ago) AND hour_start < v_current_hour
        ), 0)::INTEGER,
        COALESCE(sum(volume_litres) FILTER (
            WHERE hour_start >= v_today_start AND hour_start < v_current_hour
        ), 0),
        COALESCE(sum(peak_count) FILTER (
            WHERE hour_start >= v_today_start AND hour_start < v_current_hour
        ), 0)::INTEGER
    INTO
        v_12h_vol, v_12h_cycles,
        v_24h_vol, v_24h_cycles,
        v_today_vol, v_today_cycles
    FROM flow_hourly
    WHERE sensor_id = ANY(p_sensor_ids)
      AND hour_start >= v_range_start
      AND hour_start < v_current_hour;

    SELECT COALESCE(s.multiplier, 1.0) INTO v_mult FROM sensor s WHERE s.id = p_sensor_ids[1];
    IF v_mult IS NULL OR v_mult <= 0 THEN v_mult := 1.0; END IF;

    v_12h_vol    := v_12h_vol   + (v_partial_peaks::DOUBLE PRECISION / v_mult);
    v_12h_cycles := v_12h_cycles + v_partial_peaks;
    v_24h_vol    := v_24h_vol   + (v_partial_peaks::DOUBLE PRECISION / v_mult);
    v_24h_cycles := v_24h_cycles + v_partial_peaks;
    v_today_vol  := v_today_vol + (v_partial_peaks::DOUBLE PRECISION / v_mult);
    v_today_cycles := v_today_cycles + v_partial_peaks;

    RETURN json_build_object(
        'buckets', json_build_array(
            json_build_object('label', '15 min', 'volumeL', round(v_15m_vol::NUMERIC, 1),   'cycles', v_15m_peaks),
            json_build_object('label', '1 hr',   'volumeL', round(v_1h_vol::NUMERIC, 1),    'cycles', v_1h_peaks),
            json_build_object('label', '12 hr',  'volumeL', round(v_12h_vol::NUMERIC, 1),   'cycles', v_12h_cycles),
            json_build_object('label', '24 hr',  'volumeL', round(v_24h_vol::NUMERIC, 1),   'cycles', v_24h_cycles),
            json_build_object('label', 'Today',  'volumeL', round(v_today_vol::NUMERIC, 1), 'cycles', v_today_cycles)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
