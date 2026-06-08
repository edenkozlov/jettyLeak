// ============================================================================
// sensor-state — public GET endpoint for Jetty Routine / Runbook
//
// Jetty's hourly workflow fetches this URL (SENSOR_ENDPOINT) to read live
// flow, anomaly state, and recent XYZ history before running WATER_ANOMALY.md.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const NIGHT_START = 23;
const NIGHT_END = 6;
const ANOMALY_LPM = 0.15;
const SUSTAINED_SEC = 45;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

interface FlowRow {
  created_at: string;
  liters: number;
  lpm: number;
}

interface MagRow {
  created_at: string;
  x_axis_reading: number | null;
  y_axis_reading: number | null;
  z_axis_reading: number | null;
}

interface WatchRow {
  anomaly_started_at: string | null;
  last_fired_at: string | null;
  total_liters_tonight: number;
  sim_mode: string | null;
  force_night: boolean | null;
  last_lpm: number | null;
  last_flow_at: string | null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

function isNight(now: Date, forceNight: boolean): boolean {
  if (forceNight) return true;
  const h = now.getHours();
  return h >= NIGHT_START || h < NIGHT_END;
}

function nightWindowStart(now: Date, forceNight: boolean): string {
  if (forceNight) {
    return new Date(now.getTime() - 6 * 60 * 60_000).toISOString();
  }
  const start = new Date(now);
  if (now.getHours() < NIGHT_END) start.setDate(start.getDate() - 1);
  start.setHours(NIGHT_START, 0, 0, 0);
  return start.toISOString();
}

function toSpecMode(simMode: string | null): string {
  if (!simMode) return "idle";
  if (simMode === "leak_pending") return "leak_pending";
  if (simMode === "flush_pending") return "flush_pending";
  if (simMode === "leak" || simMode === "flush" || simMode === "idle") {
    return simMode;
  }
  if (simMode.includes("flush")) return "flush";
  if (simMode.includes("leak")) return "leak";
  return "idle";
}

function nearestMag(mags: MagRow[], ts: number): MagRow | null {
  if (!mags.length) return null;
  let best = mags[0]!;
  let bestDiff = Math.abs(new Date(best.created_at).getTime() - ts);
  for (const m of mags) {
    const diff = Math.abs(new Date(m.created_at).getTime() - ts);
    if (diff < bestDiff) {
      best = m;
      bestDiff = diff;
    }
  }
  return bestDiff <= 5_000 ? best : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return json({ error: "GET required" }, 405);
  }

  const url = new URL(req.url);
  const sensorId = Number(
    url.searchParams.get("sensor_id") ??
      Deno.env.get("JETTY_SENSOR_ID") ??
      "1",
  );

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const now = new Date();
  const sinceFlow = new Date(now.getTime() - 5 * 60_000).toISOString();
  const sinceMag = new Date(now.getTime() - 90_000).toISOString();

  const [flowRes, magRes, watchRes, incidentRes] = await Promise.all([
    sb
      .from("jetty_flow_sample")
      .select("created_at, liters, lpm")
      .eq("sensor_id", sensorId)
      .gte("created_at", sinceFlow)
      .order("created_at", { ascending: true })
      .limit(120),
    sb
      .from("mag_report")
      .select("created_at, x_axis_reading, y_axis_reading, z_axis_reading")
      .eq("sensor_id", sensorId)
      .gte("created_at", sinceMag)
      .order("created_at", { ascending: true })
      .limit(120),
    sb
      .from("jetty_nightwatch_state")
      .select(
        "anomaly_started_at, last_fired_at, total_liters_tonight, sim_mode, force_night, last_lpm, last_flow_at",
      )
      .eq("sensor_id", sensorId)
      .maybeSingle(),
    sb
      .from("jetty_incident")
      .select("created_at")
      .eq("sensor_id", sensorId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (flowRes.error) return json({ error: flowRes.error.message }, 500);
  if (magRes.error) return json({ error: magRes.error.message }, 500);

  const flows = (flowRes.data ?? []) as FlowRow[];
  const mags = (magRes.data ?? []) as MagRow[];
  const watch = (watchRes.data ?? null) as WatchRow | null;

  const forceNight =
    watch?.force_night === true ||
    Deno.env.get("JETTY_FORCE_NIGHT") === "true";
  const isNightNow = isNight(now, forceNight);

  /** One sample per 2s tick (simulator writes 4 sub-samples per tick — raw rows look like artifacts). */
  function bucketFlows(samples: FlowSample[], bucketMs = 2_000): FlowSample[] {
    const byBucket = new Map<number, FlowSample>();
    for (const s of samples) {
      const key = Math.floor(new Date(s.created_at).getTime() / bucketMs);
      const prev = byBucket.get(key);
      if (!prev || Number(s.lpm) > Number(prev.lpm)) byBucket.set(key, s);
    }
    return [...byBucket.values()].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }

  const bucketed = bucketFlows(flows);
  const recentBucketed = bucketed.slice(-10);
  const last60s = bucketed.filter(
    (s) => new Date(s.created_at).getTime() >= now.getTime() - 60_000,
  );
  let currentLpm = recentBucketed.length
    ? Math.max(...recentBucketed.slice(-3).map((s) => Number(s.lpm) || 0))
    : 0;
  const peakLpm60s = last60s.length
    ? Math.max(...last60s.map((s) => Number(s.lpm) || 0))
    : 0;

  const lastFlowAt = watch?.last_flow_at
    ? new Date(watch.last_flow_at).getTime()
    : null;
  const lastLpmFresh = lastFlowAt != null &&
    now.getTime() - lastFlowAt < 15_000;
  if (lastLpmFresh && Number(watch?.last_lpm) > currentLpm) {
    currentLpm = Number(watch!.last_lpm) || 0;
  }

  const windowStart = nightWindowStart(now, forceNight);
  const tonightRes = await sb
    .from("jetty_flow_sample")
    .select("liters")
    .eq("sensor_id", sensorId)
    .gte("created_at", windowStart);

  let totalLitersTonight = 0;
  if (!tonightRes.error) {
    for (const row of tonightRes.data ?? []) {
      totalLitersTonight += Number(row.liters) || 0;
    }
  }
  totalLitersTonight = Math.round(totalLitersTonight * 10) / 10;

  let anomalySustainedSeconds = 0;
  let anomalyActive = false;
  const elevatedBuckets = bucketed.filter((s) => Number(s.lpm) > ANOMALY_LPM);
  if (isNightNow && elevatedBuckets.length >= 2) {
    const first = new Date(elevatedBuckets[0]!.created_at).getTime();
    const last = new Date(elevatedBuckets[elevatedBuckets.length - 1]!.created_at).getTime();
    anomalySustainedSeconds = Math.floor((last - first) / 1000);
    if (watch?.anomaly_started_at) {
      const since = Math.floor(
        (now.getTime() - new Date(watch.anomaly_started_at).getTime()) / 1000,
      );
      anomalySustainedSeconds = Math.max(anomalySustainedSeconds, since);
    }
    anomalyActive = anomalySustainedSeconds >= SUSTAINED_SEC && currentLpm > ANOMALY_LPM;
  }

  const recent = recentBucketed;
  const recentHistory = recent.map((f, i) => {
    const ts = new Date(f.created_at).getTime();
    const mag = nearestMag(mags, ts);
    const ageSec = recent.length > 1
      ? (ts - new Date(recent[0]!.created_at).getTime()) / 1000
      : 0;
    return {
      t_minus_seconds: Math.round(
        (new Date(recent[recent.length - 1]!.created_at).getTime() - ts) / 100,
      ) / 10,
      age_seconds: Math.round(ageSec * 10) / 10,
      lpm: Math.round(Number(f.lpm) * 1000) / 1000,
      x: mag?.x_axis_reading != null
        ? Math.round(mag.x_axis_reading * 1000) / 1000
        : null,
      y: mag?.y_axis_reading != null
        ? Math.round(mag.y_axis_reading * 1000) / 1000
        : null,
      z: mag?.z_axis_reading != null
        ? Math.round(mag.z_axis_reading * 1000) / 1000
        : null,
    };
  });

  const lastJettyReportAt = incidentRes.data?.created_at ??
    watch?.last_fired_at ??
    null;

  const building = Deno.env.get("BUILDING_NAME") ?? "4500 Rue Sherbrooke";
  const units = Deno.env.get("BUILDING_UNITS") ?? "42";
  const rateCadPerL = 0.004;
  const litersPerHour = currentLpm * 60;
  const costPerHour = Math.round(litersPerHour * rateCadPerL * 100) / 100;
  const costPerDay = Math.round(costPerHour * 24 * 100) / 100;
  const costPerYear = Math.round(costPerDay * 365 * 100) / 100;

  return json({
    building,
    units,
    sensor_id: sensorId,
    timestamp: now.toISOString(),
    is_night: isNightNow,
    current_lpm: Math.round(currentLpm * 1000) / 1000,
    peak_lpm_60s: Math.round(peakLpm60s * 1000) / 1000,
    total_liters_tonight: totalLitersTonight,
    anomaly_active: anomalyActive,
    anomaly_sustained_seconds: anomalySustainedSeconds,
    nighttime_baseline_lpm: 0.04,
    anomaly_threshold_lpm: ANOMALY_LPM,
    water_rate_cad_per_liter: rateCadPerL,
    cost_per_hour_cad: currentLpm > 0 ? costPerHour : 0,
    cost_per_day_cad: currentLpm > 0 ? costPerDay : 0,
    cost_per_year_cad: currentLpm > 0 ? costPerYear : 0,
    sensor_mode: toSpecMode(watch?.sim_mode ?? null),
    sim_mode_raw: watch?.sim_mode ?? "idle",
    last_jetty_report_at: lastJettyReportAt,
    recent_history: recentHistory,
    sample_count: flows.length,
    last_flow_at: watch?.last_flow_at ?? null,
    last_lpm_stored: watch?.last_lpm ?? null,
    data_fresh: lastLpmFresh || (flows.length > 0 &&
      now.getTime() - new Date(flows[flows.length - 1]!.created_at).getTime() <
        10_000),
    demo_hint: (() => {
      if (lastLpmFresh && currentLpm > ANOMALY_LPM) return null;
      if (flows.length === 0) {
        return "No flow samples in last 5 min — open /dashboard/jetty as admin, press N then L, keep tab open until DB shows live.";
      }
      if (watch?.sim_mode === "leak_pending") {
        return "Leak starting — wait ~3s then curl again.";
      }
      if (watch?.sim_mode === "leak" && currentLpm <= 0) {
        return "sim_mode is leak but lpm is 0 — tab may be closed or DB persist failed (need admin login).";
      }
      return null;
    })(),
  });
});
