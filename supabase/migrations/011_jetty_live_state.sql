-- Live simulator mode for Jetty GET /sensor-state (Routine pulls this).

ALTER TABLE public.jetty_nightwatch_state
  ADD COLUMN IF NOT EXISTS sim_mode text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS force_night boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.insert_jetty_demo_batch(
  p_sensor_id bigint,
  p_mag_reports jsonb,
  p_flow_samples jsonb DEFAULT '[]'::jsonb,
  p_sim_mode text DEFAULT NULL,
  p_force_night boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_mag_count integer := 0;
  v_flow_count integer := 0;
BEGIN
  SELECT u.role::text INTO v_role
  FROM public.users u
  WHERE u.id = auth.uid();

  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'insert_jetty_demo_batch: admin only';
  END IF;

  IF p_mag_reports IS NOT NULL AND jsonb_array_length(p_mag_reports) > 0 THEN
    INSERT INTO public.mag_report (
      created_at,
      x_axis_reading,
      y_axis_reading,
      z_axis_reading,
      total_magnitude,
      sensor_id,
      band_energy_10s,
      band_energy_60s,
      band_energy_5m,
      dominant_freq_hz,
      vibration_rpm
    )
    SELECT
      (r->>'created_at')::timestamptz,
      NULLIF(r->>'x_axis_reading', '')::real,
      NULLIF(r->>'y_axis_reading', '')::real,
      NULLIF(r->>'z_axis_reading', '')::real,
      NULLIF(r->>'total_magnitude', '')::real,
      p_sensor_id,
      NULLIF(r->>'band_energy_10s', '')::double precision,
      NULLIF(r->>'band_energy_60s', '')::double precision,
      NULLIF(r->>'band_energy_5m', '')::double precision,
      NULLIF(r->>'dominant_freq_hz', '')::double precision,
      NULLIF(r->>'vibration_rpm', '')::double precision
    FROM jsonb_array_elements(p_mag_reports) AS r;

    GET DIAGNOSTICS v_mag_count = ROW_COUNT;
  END IF;

  IF p_flow_samples IS NOT NULL AND jsonb_array_length(p_flow_samples) > 0 THEN
    INSERT INTO public.jetty_flow_sample (created_at, sensor_id, liters, lpm)
    SELECT
      (s->>'created_at')::timestamptz,
      p_sensor_id,
      COALESCE((s->>'liters')::double precision, 0),
      COALESCE((s->>'lpm')::double precision, 0)
    FROM jsonb_array_elements(p_flow_samples) AS s;

    GET DIAGNOSTICS v_flow_count = ROW_COUNT;
  END IF;

  IF p_sim_mode IS NOT NULL OR p_force_night IS NOT NULL THEN
    INSERT INTO public.jetty_nightwatch_state (sensor_id, sim_mode, force_night, updated_at)
    VALUES (p_sensor_id, COALESCE(p_sim_mode, 'idle'), COALESCE(p_force_night, false), now())
    ON CONFLICT (sensor_id) DO UPDATE SET
      sim_mode = CASE
        WHEN p_sim_mode IS NOT NULL THEN p_sim_mode
        ELSE jetty_nightwatch_state.sim_mode
      END,
      force_night = CASE
        WHEN p_force_night IS NOT NULL THEN p_force_night
        ELSE jetty_nightwatch_state.force_night
      END,
      updated_at = now();
  END IF;

  RETURN jsonb_build_object(
    'mag_inserted', v_mag_count,
    'flow_inserted', v_flow_count
  );
END;
$$;
