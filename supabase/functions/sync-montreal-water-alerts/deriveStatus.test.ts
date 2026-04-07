import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { deriveStatus } from "./deriveStatus.ts";

const FIXED_NOW = new Date("2026-04-07T12:00:00Z");

Deno.test("returns 'active' for alert published 1 hour ago", () => {
  assertEquals(
    deriveStatus({
      alertStartAt: "2026-04-07T11:00:00Z",
      alertEndAt: null,
      publishedAt: "2026-04-07T11:00:00Z",
      title: "Coupure d'eau – Rue X",
      now: FIXED_NOW,
    }),
    "active"
  );
});

Deno.test("returns 'expired' for water cut older than 48 hours", () => {
  assertEquals(
    deriveStatus({
      alertStartAt: "2026-04-04T10:00:00Z",
      alertEndAt: null,
      publishedAt: "2026-04-04T10:00:00Z",
      title: "Coupure d'eau – Rue X",
      now: FIXED_NOW,
    }),
    "expired"
  );
});

Deno.test("returns 'active' for boil advisory 3 days old (within 7-day TTL)", () => {
  assertEquals(
    deriveStatus({
      alertStartAt: "2026-04-04T12:00:00Z",
      alertEndAt: null,
      publishedAt: "2026-04-04T12:00:00Z",
      title: "Avis préventif d'ébullition d'eau – Rue X",
      now: FIXED_NOW,
    }),
    "active"
  );
});

Deno.test("returns 'expired' for boil advisory older than 7 days", () => {
  assertEquals(
    deriveStatus({
      alertStartAt: "2026-03-30T10:00:00Z",
      alertEndAt: null,
      publishedAt: "2026-03-30T10:00:00Z",
      title: "Avis préventif d'ébullition d'eau – Rue X",
      now: FIXED_NOW,
    }),
    "expired"
  );
});

Deno.test("returns 'upcoming' for future start", () => {
  assertEquals(
    deriveStatus({
      alertStartAt: "2026-04-08T10:00:00Z",
      alertEndAt: null,
      publishedAt: "2026-04-07T10:00:00Z",
      title: "Coupure d'eau prévue – Rue X",
      now: FIXED_NOW,
    }),
    "upcoming"
  );
});

Deno.test("returns 'expired' when explicit alertEndAt is in the past", () => {
  assertEquals(
    deriveStatus({
      alertStartAt: "2026-04-07T08:00:00Z",
      alertEndAt: "2026-04-07T10:00:00Z",
      publishedAt: "2026-04-07T08:00:00Z",
      title: "Coupure d'eau – Rue X",
      now: FIXED_NOW,
    }),
    "expired"
  );
});

Deno.test("returns 'expired' for 'Fin de' title prefix regardless of age", () => {
  assertEquals(
    deriveStatus({
      alertStartAt: "2026-04-07T11:00:00Z",
      alertEndAt: null,
      publishedAt: "2026-04-07T11:00:00Z",
      title: "Fin de l'avis préventif d'ébullition de l'eau – Rue X",
      now: FIXED_NOW,
    }),
    "expired"
  );
});

Deno.test("returns 'expired' for 'ANNULÉ' title prefix", () => {
  assertEquals(
    deriveStatus({
      alertStartAt: "2026-04-07T11:00:00Z",
      alertEndAt: null,
      publishedAt: "2026-04-07T11:00:00Z",
      title: "ANNULÉ - Coupure d'eau – Rue X",
      now: FIXED_NOW,
    }),
    "expired"
  );
});

Deno.test("returns 'unknown' when no dates available", () => {
  assertEquals(
    deriveStatus({
      alertStartAt: null,
      alertEndAt: null,
      publishedAt: null,
      title: "Something",
      now: FIXED_NOW,
    }),
    "unknown"
  );
});
