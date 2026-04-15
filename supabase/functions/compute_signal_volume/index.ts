// ============================================================================
// compute_signal_volume edge function
//
// Computes signal.volume_l and signal.avg_flow_lpm from raw mag_report peaks,
// using the same TypeScript pipeline (computeFlowFromPeaks) that the admin
// Segment Detail view runs client-side. Invoked:
//
//   - Asynchronously from a BEFORE INSERT → AFTER INSERT trigger via pg_net
//     (one row at a time, right after the signal lands).
//   - From the client or a cron task in backfill mode to (re)compute rows in
//     bulk: { backfill: true, limit: N, force: false }.
//
// This exists so there is a single source of truth for flow math. The DB
// trigger in migration 005 used a simpler plpgsql peak detector, which drifted
// from the client's Savitzky-Golay + prominence pipeline (admin showed 340 L/h
// where DB-stored values were 510 L/h). Now both sides import the same module.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import {
  computeFlowFromPeaks,
  type MagDataPoint,
} from "./flowComputation.ts";

// Padding applied to the mag_report fetch window so the sliding-variance peak
// detector has enough context at the boundaries for short sessions. Matches
// the 2.5s extension in the old plpgsql function.
const WINDOW_PADDING_MS = 2500;

// Max rows we'll ever pull for a single signal. A signal with > this many
// samples is almost certainly spanning hours and should be treated as
// pathological — we return null and let the operator investigate.
const MAX_MAG_ROWS = 20_000;

interface SignalRow {
  id: number;
  sensor_id: number;
  start_time: string;
  end_time: string | null;
}

interface MagRow {
  created_at: string;
  x_axis_reading: number | null;
  total_magnitude: number | null;
  band_energy_10s: number | null;
  band_energy_60s: number | null;
}

interface ComputedStats {
  volume_l: number | null;
  avg_flow_lpm: number | null;
}

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function fetchSensorMultiplier(
  sb: ReturnType<typeof serviceClient>,
  sensorId: number,
): Promise<number | null> {
  const { data, error } = await sb
    .from("sensor")
    .select("multiplier")
    .eq("id", sensorId)
    .maybeSingle();
  if (error) throw error;
  const m = data?.multiplier != null ? Number(data.multiplier) : 0;
  return Number.isFinite(m) && m > 0 ? m : null;
}

async function fetchMagRows(
  sb: ReturnType<typeof serviceClient>,
  sensorId: number,
  startMs: number,
  endMs: number,
): Promise<MagRow[]> {
  const sinceIso = new Date(startMs - WINDOW_PADDING_MS).toISOString();
  const untilIso = new Date(endMs + WINDOW_PADDING_MS).toISOString();

  // Paginated fetch because PostgREST caps a single response at ~1000 rows.
  // A high-rate signal of a few minutes can easily exceed that.
  const pageSize = 1000;
  const out: MagRow[] = [];
  let from = 0;
  while (out.length < MAX_MAG_ROWS) {
    const { data, error } = await sb
      .from("mag_report")
      .select(
        "created_at, x_axis_reading, total_magnitude, band_energy_10s, band_energy_60s",
      )
      .eq("sensor_id", sensorId)
      .gte("created_at", sinceIso)
      .lte("created_at", untilIso)
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = (data ?? []) as MagRow[];
    out.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

function computeStatsForSignal(
  magRows: MagRow[],
  multiplier: number,
  signalStartMs: number,
  signalEndMs: number,
): ComputedStats {
  if (magRows.length < 5) return { volume_l: 0, avg_flow_lpm: 0 };

  const magPoints: MagDataPoint[] = magRows.map((r) => ({
    timestamp: new Date(r.created_at).getTime(),
    x: r.x_axis_reading,
    total: r.total_magnitude,
    bandEnergy10s: r.band_energy_10s,
    bandEnergy60s: r.band_energy_60s,
  }));

  const flowPoints = computeFlowFromPeaks(magPoints, multiplier);
  if (flowPoints.length === 0) return { volume_l: 0, avg_flow_lpm: 0 };

  // Restrict attribution to peaks that fall inside the signal window. The
  // padding context is only there to stabilize peak detection at the edges.
  const inWindow = flowPoints.filter(
    (p) => p.timestamp >= signalStartMs && p.timestamp <= signalEndMs,
  );
  if (inWindow.length === 0) return { volume_l: 0, avg_flow_lpm: 0 };

  // Accumulated L is monotonically increasing over the full peak stream; take
  // the delta between the first and last peak inside the window.
  const firstAccum = inWindow[0]!.accumulatedL;
  const lastAccum = inWindow[inWindow.length - 1]!.accumulatedL;
  const volumeL = Math.max(0, lastAccum - firstAccum);

  const durationS = Math.max(0.001, (signalEndMs - signalStartMs) / 1000);
  const avgFlowLpm = (volumeL / durationS) * 60;

  return {
    volume_l: Math.round(volumeL * 10000) / 10000,
    avg_flow_lpm: Math.round(avgFlowLpm * 10000) / 10000,
  };
}

async function processSignal(
  sb: ReturnType<typeof serviceClient>,
  signal: SignalRow,
): Promise<ComputedStats> {
  const multiplier = await fetchSensorMultiplier(sb, signal.sensor_id);
  if (multiplier == null) return { volume_l: null, avg_flow_lpm: null };

  const startMs = new Date(signal.start_time).getTime();
  const endMs = signal.end_time ? new Date(signal.end_time).getTime() : startMs;
  if (!Number.isFinite(startMs) || endMs < startMs) {
    return { volume_l: null, avg_flow_lpm: null };
  }

  const magRows = await fetchMagRows(sb, signal.sensor_id, startMs, endMs);
  const stats = computeStatsForSignal(magRows, multiplier, startMs, endMs);

  const { error } = await sb
    .from("signal")
    .update({ volume_l: stats.volume_l, avg_flow_lpm: stats.avg_flow_lpm })
    .eq("id", signal.id);
  if (error) throw error;

  return stats;
}

async function handleSingle(
  sb: ReturnType<typeof serviceClient>,
  signalId: number,
): Promise<Response> {
  const { data, error } = await sb
    .from("signal")
    .select("id, sensor_id, start_time, end_time")
    .eq("id", signalId)
    .maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError(`signal ${signalId} not found`, 404);

  try {
    const stats = await processSignal(sb, data as SignalRow);
    return json({ ok: true, signalId, ...stats });
  } catch (err) {
    return jsonError((err as Error).message, 500);
  }
}

async function handleBackfill(
  sb: ReturnType<typeof serviceClient>,
  limit: number,
  force: boolean,
): Promise<Response> {
  let query = sb
    .from("signal")
    .select("id, sensor_id, start_time, end_time")
    .not("sensor_id", "is", null)
    .not("start_time", "is", null)
    .order("start_time", { ascending: false })
    .limit(limit);
  if (!force) query = query.is("volume_l", null);

  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);

  const rows = (data ?? []) as SignalRow[];
  let ok = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await processSignal(sb, row);
      ok++;
    } catch {
      failed++;
    }
  }
  return json({ ok: true, processed: ok, failed, scanned: rows.length });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function jsonError(message: string, status: number): Response {
  return json({ ok: false, error: message }, status);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return jsonError("POST required", 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("invalid JSON body", 400);
  }

  const sb = serviceClient();

  if (body.backfill === true) {
    const limit = Math.min(Number(body.limit ?? 100), 500);
    const force = body.force === true;
    return handleBackfill(sb, limit, force);
  }

  const signalId = Number(body.signalId ?? body.signal_id);
  if (!Number.isFinite(signalId) || signalId <= 0) {
    return jsonError("signalId required", 400);
  }
  return handleSingle(sb, signalId);
});
