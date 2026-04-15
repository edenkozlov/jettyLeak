-- ============================================================================
-- signal_volume v2: compute via edge function (single source of truth)
--
-- Migration 005 populated signal.volume_l / avg_flow_lpm with a plpgsql peak
-- detector. That detector drifted from the client's Savitzky-Golay +
-- prominence pipeline that admin's Segment Detail view uses, so stored values
-- disagreed with what operators saw on-screen (~1.5x high on real sessions).
--
-- This migration hands the computation to the compute_signal_volume edge
-- function, which imports the exact same TypeScript module the client uses.
-- The trigger fires AFTER INSERT asynchronously via pg_net, so it never
-- blocks the insert. The plpgsql fallback is retired — values start as NULL
-- on insert and are filled in by the edge function within a second.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Settings needed by the trigger. Must be set before the migration runs (or
-- immediately after). The edge function URL is the project's functions base
-- + /compute_signal_volume. The service role key authorizes pg_net's call.
--
--   ALTER DATABASE postgres SET app.edge_functions_url = 'https://<proj>.supabase.co/functions/v1';
--   ALTER DATABASE postgres SET app.service_role_key   = '<service-role-jwt>';
--
-- We read them via current_setting(..., true) so the trigger degrades to a
-- no-op (leaving volume_l NULL) if the settings are missing, rather than
-- failing the insert.
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop the old BEFORE INSERT trigger + its plpgsql compute function. The
-- columns stay (we still write to them, just from the edge function).
DROP TRIGGER IF EXISTS signal_compute_volume_before_insert ON signal;
DROP FUNCTION IF EXISTS trg_signal_compute_volume();
DROP FUNCTION IF EXISTS compute_signal_volume_value(BIGINT, TIMESTAMPTZ, TIMESTAMPTZ);

-- ---------------------------------------------------------------------------
-- AFTER INSERT trigger — fires an async HTTP POST to the edge function with
-- the new signal id. The edge function fetches mag_report, runs the shared
-- flow pipeline, and UPDATEs volume_l / avg_flow_lpm on this row.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_signal_enqueue_volume()
RETURNS trigger AS $$
DECLARE
    v_url  TEXT;
    v_key  TEXT;
BEGIN
    IF NEW.sensor_id IS NULL OR NEW.start_time IS NULL THEN
        RETURN NEW;
    END IF;

    v_url := current_setting('app.edge_functions_url', true);
    v_key := current_setting('app.service_role_key', true);

    -- Degrade gracefully if the settings aren't configured yet. Values will
    -- simply stay NULL until a backfill runs.
    IF v_url IS NULL OR v_url = '' OR v_key IS NULL OR v_key = '' THEN
        RETURN NEW;
    END IF;

    PERFORM net.http_post(
        url     := v_url || '/compute_signal_volume',
        headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || v_key
        ),
        body    := jsonb_build_object('signalId', NEW.id),
        timeout_milliseconds := 5000
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS signal_enqueue_volume_after_insert ON signal;
CREATE TRIGGER signal_enqueue_volume_after_insert
    AFTER INSERT ON signal
    FOR EACH ROW
    EXECUTE FUNCTION trg_signal_enqueue_volume();

-- ---------------------------------------------------------------------------
-- Backfill RPC — asks the edge function to reprocess a batch of rows. Call
-- repeatedly until `processed` returns 0.
--
--   SELECT backfill_signal_volumes_edge(p_limit => 100, p_force => false);
--
-- `p_force = true` recomputes even rows that already have non-NULL volumes,
-- which is what we want after this migration lands: the values from 005 are
-- all wrong and need to be overwritten.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION backfill_signal_volumes_edge(
    p_limit INTEGER DEFAULT 100,
    p_force BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
DECLARE
    v_url      TEXT;
    v_key      TEXT;
    v_request  BIGINT;
BEGIN
    v_url := current_setting('app.edge_functions_url', true);
    v_key := current_setting('app.service_role_key', true);

    IF v_url IS NULL OR v_url = '' OR v_key IS NULL OR v_key = '' THEN
        RAISE EXCEPTION 'app.edge_functions_url / app.service_role_key are not set';
    END IF;

    SELECT net.http_post(
        url     := v_url || '/compute_signal_volume',
        headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || v_key
        ),
        body    := jsonb_build_object(
            'backfill', true,
            'limit',    p_limit,
            'force',    p_force
        ),
        timeout_milliseconds := 60000
    ) INTO v_request;

    RETURN jsonb_build_object('request_id', v_request);
END;
$$ LANGUAGE plpgsql;

-- Drop the old synchronous backfill from migration 005 — it computes via the
-- stale plpgsql path and should no longer be used.
DROP FUNCTION IF EXISTS backfill_signal_volumes(INTEGER);

-- ---------------------------------------------------------------------------
-- Invalidate existing (wrong) values so consumers that read signal.volume_l
-- see NULL until the edge function re-populates them via backfill. This is a
-- one-shot wipe as part of the migration.
-- ---------------------------------------------------------------------------

UPDATE signal SET volume_l = NULL, avg_flow_lpm = NULL
WHERE volume_l IS NOT NULL OR avg_flow_lpm IS NOT NULL;
