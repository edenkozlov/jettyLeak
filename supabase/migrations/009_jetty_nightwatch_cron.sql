-- Schedule jetty-night-watch edge function via pg_cron + pg_net.
-- Reuses the same DB settings as migration 006:
--
--   ALTER DATABASE postgres SET app.edge_functions_url = 'https://tjlecozafghdktjzomtn.supabase.co/functions/v1';
--   ALTER DATABASE postgres SET app.service_role_key   = '<service-role-jwt>';
--
-- Runs every minute (pg_cron minimum). Sustained-leak detection needs ~45s,
-- so a leak typically fires on the 1st–2nd tick after threshold is crossed.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.invoke_jetty_night_watch()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
  v_request BIGINT;
BEGIN
  v_url := current_setting('app.edge_functions_url', true);
  v_key := current_setting('app.service_role_key', true);

  IF v_url IS NULL OR v_url = '' OR v_key IS NULL OR v_key = '' THEN
    RAISE WARNING 'invoke_jetty_night_watch: app.edge_functions_url / app.service_role_key not set — skipping';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := v_url || '/jetty-night-watch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) INTO v_request;

  RETURN v_request;
END;
$$;

-- Idempotent reschedule
DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'jetty-night-watch';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END;
$$;

SELECT cron.schedule(
  'jetty-night-watch',
  '* * * * *',
  $$SELECT public.invoke_jetty_night_watch();$$
);
