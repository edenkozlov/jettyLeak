// ============================================================================
// jetty-night-watch — leak pattern detection + Jetty agent + SMS/email
//
// Detection uses flow *shape* (gradual creep vs flush spike), not a fixed L/min
// threshold. Jetty classifies the signature and decides whether to alert.
//
// Jetty UI: each analysis is recorded as a trajectory under task
// `beluga-night-watch` (override with JETTY_TASK). View runs at flows.jetty.io
// (NOT dock.jetty.io — that's API-only) → collection → beluga-night-watch.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const NIGHT_START = 23;
const NIGHT_END = 6;
const COOLDOWN_MS = 30 * 60_000;
const LOOKBACK_MS = 5 * 60_000;
const PATTERN_SUSTAINED_MS = 30_000;

const BASELINE_LPM = 0.05;
const ELEVATED_LPM = 0.07;
const FLUSH_PEAK_LPM = 0.35;

interface FlowSample {
  created_at: string;
  liters: number;
  lpm: number;
}

interface FlowPattern {
  pattern: "idle" | "flush_spike" | "leak_creep" | "unknown_elevated";
  confidence: number;
  peakLpm: number;
  earlyLpm: number;
  lateLpm: number;
  creepDelta: number;
  elevatedSec: number;
  spanSec: number;
  series: { t: string; lpm: number }[];
}

interface JettyDecision {
  pattern: string;
  should_alert: boolean;
  confidence: number;
  diagnosis: string;
  severity: string;
  estimated_cost_by_morning: string;
  wake_up_now: boolean;
  reasoning: string;
  sms: string;
  email_subject: string;
  email_body: string;
}

interface JettyCallResult {
  decision: JettyDecision;
  trajectoryId: string | null;
  collection: string | null;
  task: string | null;
}

interface JettyApiMetadata {
  trajectory_id?: string;
  collection?: string;
  mode?: string;
}

interface WatchState {
  sensor_id: number;
  anomaly_started_at: string | null;
  last_fired_at: string | null;
  total_liters_tonight: number;
  liters_reset_at: string;
}

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

function isNight(now: Date, forceNight: boolean): boolean {
  if (forceNight) return true;
  const h = now.getHours();
  return h >= NIGHT_START || h < NIGHT_END;
}

function todayDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function downsample(
  samples: FlowSample[],
  maxPoints: number,
): { t: string; lpm: number }[] {
  if (samples.length <= maxPoints) {
    return samples.map((s) => ({ t: s.created_at, lpm: Number(s.lpm) }));
  }
  const step = samples.length / maxPoints;
  const out: { t: string; lpm: number }[] = [];
  for (let i = 0; i < maxPoints; i++) {
    const s = samples[Math.floor(i * step)]!;
    out.push({ t: s.created_at, lpm: Math.round(Number(s.lpm) * 1000) / 1000 });
  }
  return out;
}

/** Classify flow shape: idle, short high spike (flush), or gradual creep (leak). */
function analyzeFlowPattern(samples: FlowSample[]): FlowPattern {
  const idle: FlowPattern = {
    pattern: "idle",
    confidence: 0.85,
    peakLpm: 0,
    earlyLpm: 0,
    lateLpm: 0,
    creepDelta: 0,
    elevatedSec: 0,
    spanSec: 0,
    series: [],
  };

  if (samples.length < 10) return idle;

  const lpms = samples.map((s) => Number(s.lpm) || 0);
  const peak = Math.max(...lpms);
  const firstTs = new Date(samples[0]!.created_at).getTime();
  const lastTs = new Date(samples[samples.length - 1]!.created_at).getTime();
  const spanSec = Math.max(0, (lastTs - firstTs) / 1000);

  const n = samples.length;
  const earlyLpm = avg(lpms.slice(0, Math.max(1, Math.floor(n / 4))));
  const lateLpm = avg(lpms.slice(-Math.max(1, Math.floor(n / 4))));
  const creepDelta = lateLpm - earlyLpm;

  const elevated = samples.filter((s) => Number(s.lpm) > ELEVATED_LPM);
  let elevatedSec = 0;
  if (elevated.length > 1) {
    elevatedSec = (new Date(elevated[elevated.length - 1]!.created_at).getTime() -
      new Date(elevated[0]!.created_at).getTime()) / 1000;
  }

  const series = downsample(samples, 24);
  const base = {
    peakLpm: peak,
    earlyLpm,
    lateLpm,
    creepDelta,
    elevatedSec,
    spanSec,
    series,
  };

  // Flush: brief high spike then drop (toilet ~6s, >>0.35 L/min peak in demo)
  if (peak > FLUSH_PEAK_LPM) {
    const high = samples.filter((s) => Number(s.lpm) > 0.25);
    const highSpan = high.length > 1
      ? (new Date(high[high.length - 1]!.created_at).getTime() -
        new Date(high[0]!.created_at).getTime()) / 1000
      : 0;
    if (highSpan < 25) {
      return { ...base, pattern: "flush_spike", confidence: 0.92 };
    }
  }

  const sustained = elevatedSec >= 25;
  const notFlushShaped = peak < FLUSH_PEAK_LPM;

  // Creep / plateau within elevated samples only (ignore post-leak zeros in window)
  if (sustained && notFlushShaped && elevated.length >= 6) {
    const elpms = elevated.map((s) => Number(s.lpm));
    const third = Math.max(1, Math.floor(elpms.length / 3));
    const eEarly = avg(elpms.slice(0, third));
    const eLate = avg(elpms.slice(-third));
    const eCreep = eLate - eEarly;
    const plateau = eLate >= 0.12 && eLate > ELEVATED_LPM;
    const creeping = eCreep >= 0.01 && eLate > eEarly;

    if (plateau || creeping) {
      const confidence = Math.min(
        0.97,
        0.6 + Math.max(eCreep, 0) * 3 + elevatedSec / 80,
      );
      return {
        ...base,
        pattern: "leak_creep",
        earlyLpm: eEarly,
        lateLpm: eLate,
        creepDelta: eCreep,
        confidence,
      };
    }
  }

  if (peak > ELEVATED_LPM && elevatedSec > 15 && notFlushShaped) {
    return { ...base, pattern: "unknown_elevated", confidence: 0.45 };
  }

  if (peak <= BASELINE_LPM + 0.02) return idle;

  return { ...base, pattern: "idle", confidence: 0.6 };
}

function isLeakPattern(p: FlowPattern): boolean {
  if (p.pattern === "leak_creep" && p.confidence >= 0.5) return true;
  // Fallback: sustained elevated flow without flush spike shape
  return (
    p.peakLpm >= 0.12 &&
    p.elevatedSec >= 35 &&
    p.peakLpm < FLUSH_PEAK_LPM
  );
}

async function fetchRecentFlow(
  sb: ReturnType<typeof serviceClient>,
  sensorId: number,
  sinceIso: string,
): Promise<FlowSample[]> {
  const { data, error } = await sb
    .from("jetty_flow_sample")
    .select("created_at, liters, lpm")
    .eq("sensor_id", sensorId)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FlowSample[];
}

function flowWindowStart(now: Date, forceNight: boolean): string {
  if (forceNight) {
    return new Date(now.getTime() - 6 * 60 * 60_000).toISOString();
  }
  const nightStart = new Date(now);
  if (now.getHours() < NIGHT_END) {
    nightStart.setDate(nightStart.getDate() - 1);
  }
  nightStart.setHours(NIGHT_START, 0, 0, 0);
  return nightStart.toISOString();
}

async function fetchTonightLiters(
  sb: ReturnType<typeof serviceClient>,
  sensorId: number,
  windowStartIso: string,
): Promise<number> {
  const { data, error } = await sb
    .from("jetty_flow_sample")
    .select("liters")
    .eq("sensor_id", sensorId)
    .gte("created_at", windowStartIso);
  if (error) throw error;
  let sum = 0;
  for (const row of data ?? []) sum += Number(row.liters) || 0;
  return Math.round(sum * 100) / 100;
}

async function loadState(
  sb: ReturnType<typeof serviceClient>,
  sensorId: number,
): Promise<WatchState> {
  const { data, error } = await sb
    .from("jetty_nightwatch_state")
    .select("*")
    .eq("sensor_id", sensorId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as WatchState;
  const { data: inserted, error: insErr } = await sb
    .from("jetty_nightwatch_state")
    .insert({ sensor_id: sensorId })
    .select("*")
    .single();
  if (insErr) throw insErr;
  return inserted as WatchState;
}

async function saveState(
  sb: ReturnType<typeof serviceClient>,
  state: WatchState,
): Promise<void> {
  const { error } = await sb
    .from("jetty_nightwatch_state")
    .upsert({ ...state, updated_at: new Date().toISOString() });
  if (error) throw error;
}

function parseJettyJson(content: string): JettyDecision {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fenced ? fenced[1]!.trim() : trimmed;
  return JSON.parse(jsonStr) as JettyDecision;
}

async function callJetty(ctx: {
  flowPattern: FlowPattern;
  totalLitersTonight: number;
  sustainedSeconds: number;
  timeDetected: string;
}): Promise<JettyCallResult> {
  const token = Deno.env.get("JETTY_API_TOKEN");
  if (!token) throw new Error("JETTY_API_TOKEN not set");
  const jettyTask = Deno.env.get("JETTY_TASK") ?? "beluga-night-watch";

  const building = Deno.env.get("BUILDING_NAME") ?? "4500 Rue Sherbrooke";
  const units = Deno.env.get("BUILDING_UNITS") ?? "42";
  const hour = new Date(ctx.timeDetected).getHours();
  const timeString = new Date(ctx.timeDetected).toLocaleTimeString("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const p = ctx.flowPattern;
  const seriesLines = p.series
    .map((s) => `  ${s.t}: ${s.lpm.toFixed(3)} L/min`)
    .join("\n");

  const prompt = `
You are an autonomous water intelligence agent for a commercial property.

BUILDING: ${building}
UNITS: ${units} residential units
TIME: ${timeString} (night — building should be near-zero flow)

FLOW SIGNATURE (last ${Math.round(p.spanSec)}s):
- Pattern detected: ${p.pattern} (confidence ${(p.confidence * 100).toFixed(0)}%)
- Early avg L/min: ${p.earlyLpm.toFixed(3)} → Late avg: ${p.lateLpm.toFixed(3)} (creep Δ ${p.creepDelta.toFixed(3)})
- Peak L/min: ${p.peakLpm.toFixed(3)}
- Elevated duration: ${Math.round(p.elevatedSec)}s
- Total flow in window: ${ctx.totalLitersTonight.toFixed(1)} L

TIME SERIES (L/min):
${seriesLines || "  (no samples)"}

SIGNATURE GUIDE:
- FLUSH: sharp 5–8s spike to high flow (~4–8 L total), then returns to zero. Do NOT alert.
- LEAK: gradual creep over 1–3+ minutes, low sustained flow, never a single sharp spike. ALERT.
- IDLE: near-zero throughout. Do NOT alert.

Your job:
1. Confirm or correct the pattern classification from the time series shape
2. Decide should_alert (true only for leak-like creep patterns during night)
3. Diagnose likely cause, severity, cost estimate, wake-up decision
4. Write SMS (max 160 chars) and email subject/body

Respond ONLY in this exact JSON format:
{
  "pattern": "idle | flush | leak | unknown",
  "should_alert": true | false,
  "confidence": 0.0,
  "diagnosis": "one sentence",
  "severity": "minor | moderate | urgent",
  "estimated_cost_by_morning": "$X.XX CAD",
  "wake_up_now": true | false,
  "reasoning": "2-3 sentences",
  "sms": "max 160 chars",
  "email_subject": "subject line",
  "email_body": "3-4 paragraphs"
}
  `.trim();

  const res = await fetch("https://flows-api.jetty.io/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      messages: [{ role: "user", content: prompt }],
      stream: false,
      jetty: { task: jettyTask },
    }),
  });

  if (!res.ok) {
    throw new Error(`Jetty API ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Jetty returned empty content");

  const meta = (data.jetty_metadata ?? {}) as JettyApiMetadata;
  return {
    decision: parseJettyJson(content),
    trajectoryId: meta.trajectory_id ?? null,
    collection: meta.collection ?? null,
    task: jettyTask,
  };
}

async function sendSms(message: string): Promise<boolean> {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const auth = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_FROM");
  const to = Deno.env.get("ALERT_PHONE");
  if (!sid || !auth || !from || !to) return false;

  const body = new URLSearchParams({ To: to, From: from, Body: message });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${auth}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );
  return res.ok;
}

async function sendEmail(subject: string, body: string): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("ALERT_EMAIL");
  const from = Deno.env.get("RESEND_FROM") ??
    "Beluga Water Intelligence <alerts@beluga.io>";
  if (!key || !to) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text: body }),
  });
  return res.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "POST required" }, 405);
  }

  let dryRun = false;
  try {
    const body = await req.json();
    dryRun = body?.dryRun === true;
  } catch {
    // empty body is fine
  }

  const sensorId = Number(Deno.env.get("JETTY_SENSOR_ID") ?? "1");
  const forceNight = Deno.env.get("JETTY_FORCE_NIGHT") === "true";
  const now = new Date();
  const nowMs = now.getTime();

  if (!isNight(now, forceNight)) {
    return json({ ok: true, status: "daytime", sensorId });
  }

  const sb = serviceClient();
  const sinceIso = new Date(nowMs - LOOKBACK_MS).toISOString();
  const samples = await fetchRecentFlow(sb, sensorId, sinceIso);
  const flowPattern = analyzeFlowPattern(samples);

  const windowStart = flowWindowStart(now, forceNight);
  const totalTonight = await fetchTonightLiters(sb, sensorId, windowStart);

  const state = await loadState(sb, sensorId);
  const today = todayDateStr(now);
  if (state.liters_reset_at !== today) {
    state.total_liters_tonight = 0;
    state.liters_reset_at = today;
  }
  state.total_liters_tonight = totalTonight;

  if (state.last_fired_at) {
    const lastFired = new Date(state.last_fired_at).getTime();
    if (nowMs - lastFired < COOLDOWN_MS) {
      await saveState(sb, state);
      return json({
        ok: true,
        status: "cooldown",
        flowPattern: flowPattern.pattern,
        sensorId,
      });
    }
  }

  let status = "clear";
  let sustainedSeconds = 0;

  if (isLeakPattern(flowPattern)) {
    if (!state.anomaly_started_at) {
      state.anomaly_started_at = now.toISOString();
    }
    sustainedSeconds = Math.floor(
      (nowMs - new Date(state.anomaly_started_at).getTime()) / 1000,
    );
    status = sustainedSeconds * 1000 >= PATTERN_SUSTAINED_MS
      ? "pattern_ready"
      : "pattern_building";
  } else if (flowPattern.pattern === "flush_spike") {
    state.anomaly_started_at = null;
    status = "flush_ignored";
  } else {
    state.anomaly_started_at = null;
  }

  const ready = status === "pattern_ready";

  if (ready) {
    const jetty = await callJetty({
      flowPattern,
      totalLitersTonight: totalTonight,
      sustainedSeconds,
      timeDetected: now.toISOString(),
    });
    const decision = jetty.decision;

    if (dryRun) {
      await saveState(sb, state);
      return json({
        ok: true,
        status: decision.should_alert
          ? "pattern_ready_dry_run"
          : "jetty_no_alert",
        flowPattern: flowPattern.pattern,
        jettyPattern: decision.pattern,
        shouldAlert: decision.should_alert,
        confidence: decision.confidence,
        diagnosis: decision.diagnosis,
        trajectoryId: jetty.trajectoryId,
        jettyCollection: jetty.collection,
        jettyTask: jetty.task,
        sustainedSeconds,
        totalLitersTonight: totalTonight,
        sensorId,
      });
    }

    if (decision.should_alert) {
      const smsSent = await sendSms(decision.sms);
      const emailSent = await sendEmail(
        decision.email_subject,
        decision.email_body,
      );

      const { error: insErr } = await sb.from("jetty_incident").insert({
        sensor_id: sensorId,
        liters_per_min: flowPattern.lateLpm,
        total_liters_tonight: totalTonight,
        sustained_seconds: sustainedSeconds,
        diagnosis: decision.diagnosis,
        severity: decision.severity,
        estimated_cost: decision.estimated_cost_by_morning,
        wake_up_now: decision.wake_up_now,
        reasoning: decision.reasoning,
        sms: decision.sms,
        email_subject: decision.email_subject,
        email_body: decision.email_body,
        jetty_raw: { ...decision, flowPattern, jetty },
        jetty_trajectory_id: jetty.trajectoryId,
        jetty_collection: jetty.collection,
        jetty_task: jetty.task,
        sms_sent: smsSent,
        email_sent: emailSent,
      });
      if (insErr) throw insErr;

      state.last_fired_at = now.toISOString();
      state.anomaly_started_at = null;
      status = "anomaly_fired";

      await saveState(sb, state);
      return json({
        ok: true,
        status,
        flowPattern: flowPattern.pattern,
        jettyPattern: decision.pattern,
        diagnosis: decision.diagnosis,
        trajectoryId: jetty.trajectoryId,
        jettyCollection: jetty.collection,
        jettyTask: jetty.task,
        smsSent,
        emailSent,
        sensorId,
      });
    }

    state.anomaly_started_at = null;
    status = "jetty_no_alert";
  }

  await saveState(sb, state);
  return json({
    ok: true,
    status: dryRun && ready ? "pattern_ready_dry_run" : status,
    flowPattern: flowPattern.pattern,
    patternConfidence: flowPattern.confidence,
    earlyLpm: flowPattern.earlyLpm,
    lateLpm: flowPattern.lateLpm,
    creepDelta: flowPattern.creepDelta,
    elevatedSec: flowPattern.elevatedSec,
    sustainedSeconds,
    totalLitersTonight: totalTonight,
    sensorId,
  });
});
