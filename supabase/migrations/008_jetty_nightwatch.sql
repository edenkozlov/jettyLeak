-- Jetty autonomous night watch: state + incident audit log.

CREATE TABLE IF NOT EXISTS public.jetty_nightwatch_state (
  sensor_id bigint NOT NULL,
  anomaly_started_at timestamptz,
  last_fired_at timestamptz,
  total_liters_tonight double precision NOT NULL DEFAULT 0,
  liters_reset_at date NOT NULL DEFAULT CURRENT_DATE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jetty_nightwatch_state_pkey PRIMARY KEY (sensor_id),
  CONSTRAINT jetty_nightwatch_state_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensor(id)
);

CREATE TABLE IF NOT EXISTS public.jetty_incident (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  sensor_id bigint NOT NULL,
  liters_per_min double precision NOT NULL,
  total_liters_tonight double precision NOT NULL DEFAULT 0,
  sustained_seconds integer NOT NULL DEFAULT 0,
  diagnosis text,
  severity text,
  estimated_cost text,
  wake_up_now boolean,
  reasoning text,
  sms text,
  email_subject text,
  email_body text,
  jetty_raw jsonb,
  sms_sent boolean NOT NULL DEFAULT false,
  email_sent boolean NOT NULL DEFAULT false,
  CONSTRAINT jetty_incident_pkey PRIMARY KEY (id),
  CONSTRAINT jetty_incident_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensor(id)
);

CREATE INDEX IF NOT EXISTS jetty_incident_sensor_time_idx
  ON public.jetty_incident (sensor_id, created_at DESC);

ALTER TABLE public.jetty_nightwatch_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jetty_incident ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jetty_incident_admin_select ON public.jetty_incident;
CREATE POLICY jetty_incident_admin_select ON public.jetty_incident
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Edge function uses service role; no client writes to state table.
