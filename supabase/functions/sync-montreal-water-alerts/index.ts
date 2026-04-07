import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { extractSlug } from "./extractSlug.ts";
import { extractBorough } from "./extractBorough.ts";
import { deriveStatus } from "./deriveStatus.ts";
import { parseDetailPage } from "./parseDetailPage.ts";

const GEOJSON_URL =
  "https://donnees.montreal.ca/dataset/556c84af-aebf-4ca9-9a9c-2f246601674c/resource/d249e452-46f5-422f-91ae-898c98eea6cc/download/avis-alertes.geojson";

const WATER_TYPES = ["Eau et aqueduc"];
const WATER_KEYWORDS = ["eau", "ébullition", "ebullition", "aqueduc", "water"];

interface GeoJSONFeature {
  type: "Feature";
  properties: {
    titre: string;
    date_debut: string;
    date_fin: string;
    type: string;
    service_publieur: string;
    lien: string;
  };
  geometry: {
    type: string;
    coordinates: unknown;
  };
}

interface GeoJSONCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

function isWaterRelated(feature: GeoJSONFeature): boolean {
  const { type, titre } = feature.properties;
  if (WATER_TYPES.includes(type)) return true;
  if (type === "Urgence") {
    const lower = titre.toLowerCase();
    return WATER_KEYWORDS.some((kw) => lower.includes(kw));
  }
  return false;
}

function isValidGeometry(geom: GeoJSONFeature["geometry"]): boolean {
  if (!geom?.coordinates) return false;
  if (geom.type === "Point") {
    const [lng, lat] = geom.coordinates as number[];
    return !(lng === 0 && lat === 0);
  }
  return true;
}

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

async function fetchWithRetry(
  url: string,
  init?: RequestInit
): Promise<Response> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(url, init);
      if (resp.ok || resp.status === 304) return resp;
      if (resp.status >= 500 && attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_BASE_MS * 2 ** attempt);
        continue;
      }
      return resp;
    } catch (err) {
      if (attempt === MAX_RETRIES - 1) throw err;
      await sleep(RETRY_BASE_MS * 2 ** attempt);
    }
  }
  throw new Error("fetchWithRetry: exhausted retries");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

Deno.serve(async (_req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── 1. Fetch GeoJSON feed (1 HTTP request) ────────────────────────
    const feedResp = await fetchWithRetry(GEOJSON_URL, {
      headers: { Accept: "application/json" },
    });

    if (!feedResp.ok) {
      return jsonResponse(
        { error: "Failed to fetch GeoJSON feed", status: feedResp.status },
        502
      );
    }

    const feed: GeoJSONCollection = await feedResp.json();
    const waterFeatures = feed.features.filter(isWaterRelated);
    const now = new Date().toISOString();

    // ── 2. Build rows and bulk upsert (1 DB call) ─────────────────────
    const rows = waterFeatures.map((feature) => {
      const props = feature.properties;
      const slug = extractSlug(props.lien);
      const borough = extractBorough(props.titre);
      const geometry = isValidGeometry(feature.geometry)
        ? feature.geometry
        : null;

      const status = deriveStatus({
        alertStartAt: props.date_debut,
        alertEndAt: null,
        publishedAt: props.date_debut,
        title: props.titre,
      });

      return {
        source_slug: slug,
        source_url: props.lien,
        title: props.titre,
        category: props.type,
        borough,
        status,
        published_at: props.date_debut,
        alert_start_at: props.date_debut,
        geometry_json: geometry,
        geometry_type: geometry?.type ?? null,
        last_seen_at: now,
        last_synced_at: now,
        source_payload_json: props,
        updated_at: now,
      };
    });

    // Single upsert — dedupes on source_slug, merges on conflict
    const { error: upsertError } = await supabase
      .from("montreal_water_alerts")
      .upsert(rows, {
        onConflict: "source_slug",
        ignoreDuplicates: false,
      });

    if (upsertError) {
      return jsonResponse({ error: "Upsert failed", detail: upsertError.message }, 500);
    }

    // ── 3. Enrich pending notices (max 10 per run, throttled) ─────────
    const { data: pendingAlerts } = await supabase
      .from("montreal_water_alerts")
      .select("id, source_url")
      .eq("enrichment_status", "pending")
      .limit(10);

    let enrichedCount = 0;
    const enrichUpdates: { id: number; patch: Record<string, unknown> }[] = [];

    for (const alert of pendingAlerts ?? []) {
      try {
        await sleep(500);
        const pageResp = await fetchWithRetry(alert.source_url, {
          headers: { Accept: "text/html" },
        });

        if (!pageResp.ok) {
          enrichUpdates.push({
            id: alert.id,
            patch: { enrichment_status: "failed", updated_at: now },
          });
          continue;
        }

        const html = await pageResp.text();
        const parsed = parseDetailPage(html);

        enrichUpdates.push({
          id: alert.id,
          patch: {
            affected_area_text: parsed.affectedArea,
            reason_text: parsed.reason,
            detail_text_raw: parsed.rawText,
            enrichment_status: "enriched",
            updated_at: now,
          },
        });
        enrichedCount++;
      } catch {
        enrichUpdates.push({
          id: alert.id,
          patch: { enrichment_status: "failed", updated_at: now },
        });
      }
    }

    // Batch enrichment updates (1 call per row, but max 10 total)
    for (const { id, patch } of enrichUpdates) {
      await supabase
        .from("montreal_water_alerts")
        .update(patch)
        .eq("id", id);
    }

    // ── 4. Bulk status reconciliation (2 DB calls) ────────────────────
    // Fetch all non-expired alerts and re-derive status
    const { data: activeAlerts } = await supabase
      .from("montreal_water_alerts")
      .select("id, title, alert_start_at, alert_end_at, published_at, status")
      .neq("status", "expired");

    const statusPatches: Record<string, number[]> = {};

    for (const alert of activeAlerts ?? []) {
      const newStatus = deriveStatus({
        alertStartAt: alert.alert_start_at,
        alertEndAt: alert.alert_end_at,
        publishedAt: alert.published_at,
        title: alert.title,
      });

      if (newStatus !== alert.status) {
        (statusPatches[newStatus] ??= []).push(alert.id);
      }
    }

    // One UPDATE per status value (max 4 calls: active, upcoming, expired, unknown)
    for (const [status, ids] of Object.entries(statusPatches)) {
      await supabase
        .from("montreal_water_alerts")
        .update({ status, updated_at: now })
        .in("id", ids);
    }

    return jsonResponse({
      ok: true,
      feed_total: feed.features.length,
      water_count: waterFeatures.length,
      upserted: rows.length,
      enriched: enrichedCount,
      status_changes: Object.values(statusPatches).reduce((s, a) => s + a.length, 0),
      synced_at: now,
    });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
