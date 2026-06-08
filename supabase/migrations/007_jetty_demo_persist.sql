-- Jetty LARP demo: persist simulated mag_report + flow samples for history.

CREATE TABLE IF NOT EXISTS public.jetty_flow_sample (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamptz NOT NULL,
  sensor_id bigint NOT NULL,
  liters double precision NOT NULL DEFAULT 0,
  lpm double precision NOT NULL DEFAULT 0,
  CONSTRAINT jetty_flow_sample_pkey PRIMARY KEY (id),
  CONSTRAINT jetty_flow_sample_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensor(id)
);

CREATE INDEX IF NOT EXISTS jetty_flow_sample_sensor_time_idx
  ON public.jetty_flow_sample (sensor_id, created_at DESC);

ALTER TABLE public.jetty_flow_sample ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jetty_flow_sample_admin_select ON public.jetty_flow_sample;
CREATE POLICY jetty_flow_sample_admin_select ON public.jetty_flow_sample
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Admin-only batch insert for demo telemetry (mag waveform + flow attribution).
CREATE OR REPLACE FUNCTION public.insert_jetty_demo_batch(
  p_sensor_id bigint,
  p_mag_reports jsonb,
  p_flow_samples jsonb DEFAULT '[]'::jsonb
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

  RETURN jsonb_build_object(
    'mag_inserted', v_mag_count,
    'flow_inserted', v_flow_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.insert_jetty_demo_batch(bigint, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_jetty_demo_batch(bigint, jsonb, jsonb) TO authenticated;
