# Beluga Property Intelligence — Scoring Engine (v2)

This folder contains the **v2 deterministic scoring engine** powering the
`/property-intelligence` flow. It replaces the v1 engine at
`src/lib/intelligence/scoring.ts`.

> **Design principles.** Deterministic (same address → same score, always),
> no RNG, no AI-generated values, no backend round-trips. Pure, fast, and
> explainable. Every category score can be traced back to the signals that
> produced it.

---

## Audit of the v1 engine

### Current flow (what was shipping before v2)

- **Hero / entry** — `src/components/landing/LandingHero.tsx` has the
  address search. On selection it `navigate('/property-intelligence',
  { state: { feature } })`.
- **Route** — `/property-intelligence` lazy-loads `src/pages/PropertyIntelligence.tsx`
  which drives the split panel + Mapbox hero.
- **Mapbox** — token in `.env` (`VITE_MAPBOX_TOKEN`) surfaced via
  `src/globals/constants.ts` (`MAPBOX_TOKEN`). Geocoding wrapper at
  `src/lib/intelligence/geocoding.ts` (v5 `/mapbox.places`, US + CA, autocomplete).
  Map rendering at `src/components/intelligence/PropertyMap.tsx` with a
  `feature-state` building highlight (no z-fight).
- **CTA** — `/quote` links from nav, hero card, result panel, final CTA.
  Preserved 1:1 in v2.

### How v1 scores were computed

- FNV-1a hash of `feature.id + place_name` seeded a `mulberry32` PRNG.
- Per-category scorers blended:
  - a regional prior (`REGION_PRIORS`, keyed by US/CA short codes),
  - a small `rng() - 0.5` jitter,
  - an ad-hoc "urban core" list and `place_type` flag.
- Weights rolled into an integer 1–10 overall.

### Strengths (preserved in v2)

1. **Deterministic** — stable per address. Kept as hard requirement.
2. **Regional priors** mapped to real infrastructure reality
   (old NE/MTL combined-sewer cities, Sunbelt newer builds, Pacific climate).
3. **Fully explainable** via rationale keys → i18n.
4. **Pure frontend, no backend dependency** — instant scoring, easy swap later.
5. **Typed contract** that a real API can drop into.

### Weaknesses (fixed in v2)

1. **Integer 1–10 internal math** lost granularity and made ties common.
   → v2 computes on a **0–100 scale internally**, displays 1–10.
2. **Per-category PRNG noise** made scores feel arbitrary.
   → v2 has **zero randomness**. Deltas come only from concrete signals.
3. **Weak signal coverage** — only region short_code + `place_type` +
   a tiny urban-core word list.
   → v2 adds freeze / drought / coastal / combined-sewer / hard-water /
   flood-stormwater / build-era inference / geocode precision.
4. **Rationale selection was branchy and decoupled from score magnitude.**
   → v2 picks the rationale from the **dominant signal contribution** per
   category.
5. **Confidence was a soft mean**, not tied to actual signal availability.
   → v2 computes confidence from geocode precision + coverage + signal
   density.
6. **Categories oriented toward "risk" naming** — harder for end users.
   → v2 reframes as **health / resilience / stability / condition /
   reliability / efficiency** (higher = better).

### Best upgrade path — chosen

Replace `estimatePropertyScore` with a modular pipeline that's a drop-in
swap at the call site, keeping all UI, Mapbox, and CTA code untouched.
New category keys (`pipeCondition` etc.) added to i18n; old i18n tree
left in place to allow a fast rollback if needed.

---

## v2 architecture

```
src/lib/scoring/
├── scoreEngine.ts      // entry point: estimatePropertyScore(feature)
├── signalBuilder.ts    // MapboxFeature → deterministic Signals
├── weights.ts          // category weights + signal→category contributions
├── confidence.ts       // per-category + overall confidence
├── explanations.ts     // dominant-signal rationale keys
├── types.ts            // shared types
├── index.ts            // barrel export
└── README.md           // this file
```

### Pipeline

```
MapboxFeature
   │
   ▼   signalBuilder.ts
Signals  { geocodePrecision, countryCode, regionCode, postalCode,
           buildEra, addressType, isUrbanCore,
           freezeExposure, droughtExposure, coastalExposure,
           floodStormwaterExposure, combinedSewerLikelihood,
           hardWaterLikelihood, infrastructureAge,
           regionCoverage, signalCount }
   │
   ▼   weights.ts (applyContributions)
Category scores 0–100  (pipeCondition, leakResilience,
                        pressureStability, fixtureCondition,
                        drainReliability, waterEfficiency)
   │
   ▼   confidence.ts
Per-category confidence + overall confidence + scoreConfidence category
   │
   ▼   explanations.ts
Rationale i18n key per category (dominant signal)
   │
   ▼   scoreEngine.ts
PropertyScore  { overall (1–10), band, confidence (0–1),
                 categories[] (display 1–10, internal 0–100),
                 signalKeys[] }
```

### Internal 0–100 → display 1–10 mapping

```ts
display = clamp(Math.ceil(internal / 10), 1, 10)
```

Band thresholds on display score:

| Display | Band        | Label (EN) |
| ------- | ----------- | ---------- |
| 9–10    | `excellent` | Excellent  |
| 7–8     | `good`      | Good       |
| 5–6     | `watch`     | Average    |
| 1–4     | `action`    | Poor       |

(Band keys preserved for backward compat with i18n.)

### Categories (7)

| Key (internal)      | Title (EN)               | Weight | Direction       |
| ------------------- | ------------------------ | ------ | --------------- |
| `pipeCondition`     | Pipe Condition Health    | 0.22   | higher = better |
| `leakResilience`    | Leak Resilience          | 0.20   | higher = better |
| `drainReliability`  | Drain / Sewer Reliability| 0.17   | higher = better |
| `fixtureCondition`  | Fixture Condition        | 0.13   | higher = better |
| `pressureStability` | Pressure Stability       | 0.11   | higher = better |
| `waterEfficiency`   | Water Efficiency         | 0.09   | higher = better |
| `scoreConfidence`   | Score Confidence         | 0.08   | higher = better |

Weights sum to 1. `scoreConfidence` is shown as a category **and** folded
into the overall with a small weight — better-known addresses lift
slightly, unknown addresses don't get artificially inflated.

---

## What should be preserved

- `src/lib/intelligence/geocoding.ts` (Mapbox wrapper) — reused unchanged.
- `PropertyMap`, `AddressAutocomplete`, `LandingHero` flow — all unchanged.
- `/quote` CTAs, nav, footer — unchanged.
- i18n namespace + landing.json structure — extended, not replaced.
- Determinism guarantee and same `{ overall, band, categories[], confidence }`
  shape — so the page didn't need an overhaul.

## What was replaced

- `src/lib/intelligence/scoring.ts` — no longer used. Left in tree for easy
  rollback; flagged deprecated in `index.ts`.
- Category keys renamed; i18n tree extended (new + old keys both present).

---

## Data sources — prioritized upgrade roadmap

The engine is built so that `signalBuilder.ts` is the **only** place that
needs to change when real data lands. Each upgrade is a drop-in:

### Tier 1 — highest ROI, biggest jump in realism

| Source | Provides | Cost | Integration | Impact |
| --- | --- | --- | --- | --- |
| **Parcel / assessor data** (Regrid, ATTOM, CoreLogic, Estated, local open-data portals e.g. NYC PLUTO, Montréal parcel dataset) | Year-built, parcel type, square footage, owner-occupancy, heating fuel, sewer hookup type | Mixed — open-data is free; national commercial feeds are paid ($0.02–$0.10 / lookup) | Server-side cache by lat/lng → address resolves into a parcel row. 1–2 weeks. | **Huge.** Drops the heuristic era inference and feeds `buildEra` + `infrastructureAge` directly. Probably doubles confidence and cuts "watch/average" misses in half. |
| **Municipal permit feeds** (Socrata, NYC DOB, LA Permits, Chicago, Montréal CA plan permits, Open Data Toronto) | Plumbing / HVAC / sewer-line / re-pipe permits last 30 years | Free (open data) | One scheduled ETL job per city → Postgres. 2–3 weeks for top 10 metros. | **Huge.** Directly informs `pipeCondition`, `fixtureCondition`, `drainReliability`. Turns estimates into evidence for majors metros. |
| **FEMA National Flood Hazard Layer** | Flood zone (AE, VE, X) per point | Free (gov) | Tile service or REST. ~2 days. | **High.** Feeds `floodStormwaterExposure` precisely (today it's region-level). |

### Tier 2 — substantial accuracy lifts

| Source | Provides | Cost | Integration | Impact |
| --- | --- | --- | --- | --- |
| **EPA ECHO / SDWIS** | Public water system ID, violation history, lead-service-line disclosure | Free | REST API, keyed by ZIP / FIPS. ~3 days. | **High** for `pipeCondition` + `leakResilience` (lead pipe likelihood). |
| **NOAA climate normals** (precip, freeze days, drought index) | Per-lat/lng 30-yr climate | Free | REST, cache per 1° grid. ~2 days. | **Medium-high.** Replaces today's region buckets with point-accurate `freezeExposure` / `droughtExposure`. |
| **USGS StreamStats / NRCS soils** | Soil permeability, slope, hydrology | Free | REST. 3–4 days. | **Medium.** Refines `drainReliability` beyond combined-sewer heuristic. |
| **USPS / Canada Post address validation** | Canonical address, unit number, DPV confidence | Paid ($) or USPS API | Drop into geocoding pipeline. 1–2 days. | **Medium.** Raises `scoreConfidence` floor on weak matches. |

### Tier 3 — nice-to-have refinements

| Source | Provides | Cost | Integration | Impact |
| --- | --- | --- | --- | --- |
| **Mapbox Search Box API** (vs. legacy Geocoding v5) | Richer categories, POI metadata, better suggestion quality | Paid (MAU-tiered) | Swap 1 file. ~1 day. | **Low-medium.** Mostly UX. |
| **Local water utility pressure / main-break feeds** (where available, e.g. DC Water, NYC DEP) | Historical main breaks within N meters | Free / paid | ETL per utility. Weeks. | **Medium** for `pressureStability` in covered cities. |
| **Insurance claims aggregates** (ISO, Verisk) | Plumbing loss frequency by ZIP | Paid ($$$) | Direct feed. Weeks + legal. | **Medium.** Validation signal; not a primary input. |
| **Utility smart-meter panels** (eventually: Beluga's own fleet) | Real consumption / leak patterns | Internal | Internal API. | **Highest** — replaces the heuristic `waterEfficiency` wholesale. Long-term. |
| **Satellite rooftop age / condition** (Cape Analytics, Zesty.ai) | Roof age proxy for overall age | Paid ($$$) | REST. 3–5 days. | **Medium.** Cross-check for `buildEra`. |

### Integration pattern

Every Tier-1 / 2 / 3 source lands behind the same adapter shape:

```ts
// signalBuilder.ts pseudo
const realSignals = await Promise.allSettled([
  parcelAdapter(lat, lng),
  permitAdapter(lat, lng),
  femaAdapter(lat, lng),
])
const signals = mergeWithHeuristics(mapboxDerivedSignals, realSignals)
```

The weights table and explanations already understand every signal key,
so a source going from "heuristic 0.7" to "measured 0.95" lifts the
`scoreConfidence` automatically without touching the rest of the engine.

---

## Non-goals for v2

- Network calls in the scoring path. The v2 engine is synchronous and runs
  in under 1 ms for any address. All real-data adapters must stay behind
  an async boundary (not in `scoreEngine.ts`).
- Overall narrative generation. The page already has four handwritten
  band narratives in i18n; the engine only supplies numbers + keys.
- Backward compat with v1 rationale keys. v2 defines a clean new set;
  the v1 tree stays in the locale for a grace period.
