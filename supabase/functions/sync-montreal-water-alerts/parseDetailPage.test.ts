import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseDetailPage } from "./parseDetailPage.ts";

const SAMPLE_HTML = `
<html>
<body>
<div class="field--item">
<ul>
<li>Coupure d'eau - Rue Jean-Milot, entre la rue Quinlan et la rue D'Amour.</li>
<li>À partir de 16 h, le 26/03/2026</li>
<li>Raison : rupture de conduite</li>
<li>Retour à la normale prévu tard en soirée.</li>
</ul>
</div>
</body>
</html>
`;

Deno.test("parses affected area from bullet", () => {
  const result = parseDetailPage(SAMPLE_HTML);
  assertEquals(
    result.affectedArea,
    "Coupure d'eau - Rue Jean-Milot, entre la rue Quinlan et la rue D'Amour."
  );
});

Deno.test("parses reason from 'Raison :' bullet", () => {
  const result = parseDetailPage(SAMPLE_HTML);
  assertEquals(result.reason, "rupture de conduite");
});

Deno.test("parses start time from 'À partir de' bullet", () => {
  const result = parseDetailPage(SAMPLE_HTML);
  assertEquals(result.startTime, "À partir de 16 h, le 26/03/2026");
});

Deno.test("parses end time from 'Retour à la normale' bullet", () => {
  const result = parseDetailPage(SAMPLE_HTML);
  assertEquals(result.endTime, "Retour à la normale prévu tard en soirée.");
});

Deno.test("stores raw text", () => {
  const result = parseDetailPage(SAMPLE_HTML);
  assertEquals(result.rawText.includes("rupture de conduite"), true);
});

Deno.test("handles empty HTML gracefully", () => {
  const result = parseDetailPage("");
  assertEquals(result.affectedArea, null);
  assertEquals(result.reason, null);
  assertEquals(result.startTime, null);
  assertEquals(result.endTime, null);
  assertEquals(result.rawText, "");
});

Deno.test("handles page with no bullet list", () => {
  const html = `<html><body><p>No structured content here</p></body></html>`;
  const result = parseDetailPage(html);
  assertEquals(result.affectedArea, null);
  assertEquals(result.reason, null);
});
