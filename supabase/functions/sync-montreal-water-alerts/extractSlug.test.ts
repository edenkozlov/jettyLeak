import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractSlug } from "./extractSlug.ts";

Deno.test("extracts slug from standard alert URL", () => {
  assertEquals(
    extractSlug(
      "https://montreal.ca/alertes/coupure-deau-rue-jeanmilot-entre-les-rue-quinlan-et-damour-arrondissement-de-lasalle-20260326162150"
    ),
    "coupure-deau-rue-jeanmilot-entre-les-rue-quinlan-et-damour-arrondissement-de-lasalle-20260326162150"
  );
});

Deno.test("extracts slug from URL with trailing slash", () => {
  assertEquals(
    extractSlug("https://montreal.ca/alertes/some-slug-20260101120000/"),
    "some-slug-20260101120000"
  );
});

Deno.test("handles URL with query parameters", () => {
  assertEquals(
    extractSlug("https://montreal.ca/alertes/some-slug-20260101?lang=en"),
    "some-slug-20260101"
  );
});

Deno.test("handles plain string fallback when not a valid URL", () => {
  assertEquals(extractSlug("not-a-url/some-slug"), "some-slug");
});

Deno.test("handles URL with no path segments", () => {
  assertEquals(extractSlug("https://montreal.ca"), "montreal.ca");
});

Deno.test("handles empty string", () => {
  assertEquals(extractSlug(""), "");
});
