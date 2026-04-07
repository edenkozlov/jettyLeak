import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractBorough } from "./extractBorough.ts";

Deno.test("extracts borough with 'arrondissement de'", () => {
  assertEquals(
    extractBorough(
      "Coupure d'eau – Rue Jean-Milot, entre les rue Quinlan et D'Amour, arrondissement de LaSalle"
    ),
    "LaSalle"
  );
});

Deno.test("extracts borough with 'arr. de'", () => {
  assertEquals(
    extractBorough(
      "Fermeture de la circulation – Rue X, arr. de Ville-Marie"
    ),
    "Ville-Marie"
  );
});

Deno.test("extracts borough with 'arrondissement d'", () => {
  assertEquals(
    extractBorough(
      "Coupure d'eau – Boulevard des Galeries-d'Anjou, arrondissement d'Anjou"
    ),
    "Anjou"
  );
});

Deno.test("extracts long borough name", () => {
  assertEquals(
    extractBorough(
      "Coupure d'eau – Rue X, arrondissement de Côte-des-Neiges–Notre-Dame-de-Grâce"
    ),
    "Côte-des-Neiges–Notre-Dame-de-Grâce"
  );
});

Deno.test("extracts CDN/NDG abbreviation", () => {
  const result = extractBorough(
    "Fermeture de trottoir – Chemin X, CDN/NDG"
  );
  assertEquals(result, "CDN/NDG");
});

Deno.test("extracts borough from arr. CDN/NDG", () => {
  const result = extractBorough(
    "Entrave – Boulevard Décarie, arr. CDN/NDG"
  );
  assertEquals(result, "CDN/NDG");
});

Deno.test("returns null when no borough found", () => {
  assertEquals(
    extractBorough("Consultation publique sur la mobilité locale"),
    null
  );
});

Deno.test("extracts Montréal-Nord", () => {
  assertEquals(
    extractBorough(
      "Avis préventif d'ébullition d'eau – Avenue X, arrondissement de Montréal-Nord"
    ),
    "Montréal-Nord"
  );
});

Deno.test("extracts Saint-Léonard trailing dash pattern", () => {
  const result = extractBorough(
    "MISE À JOUR – Coupure d'eau – Rue X – Arrondissement Saint-Léonard"
  );
  assertEquals(result, "Saint-Léonard");
});

Deno.test("extracts Pierrefonds-Roxboro", () => {
  assertEquals(
    extractBorough(
      "PROLONGATION - Coupure d'eau – Boulevard de Pierrefonds, arrondissement de Pierrefonds-Roxboro"
    ),
    "Pierrefonds-Roxboro"
  );
});
