-- Link incidents to Jetty UI trajectories (passthrough chat/completions runs).

ALTER TABLE public.jetty_incident
  ADD COLUMN IF NOT EXISTS jetty_trajectory_id text,
  ADD COLUMN IF NOT EXISTS jetty_collection text,
  ADD COLUMN IF NOT EXISTS jetty_task text;
