/**
 * Attempts to extract the borough (arrondissement) name from a Montreal alert title.
 *
 * Titles typically end with patterns like:
 *   "…, arrondissement de LaSalle"
 *   "…, arr. de Ville-Marie"
 *   "…– Arrondissement de Côte-des-Neiges–Notre-Dame-de-Grâce"
 *   "…, Rivière-des-Prairies-Pointe-aux-Trembles"  (no explicit "arrondissement")
 *
 * Also handles patterns like:
 *   "…– Saint-Léonard"
 *   "…, arr. CDN/NDG"
 */

const BOROUGH_PATTERN =
  /(?:arrondissement\s+(?:de\s+|d['''])?|arr\.?\s+(?:de\s+|d['''])?)([\w\u00C0-\u024F][\w\u00C0-\u024F/–\-\s]*)/i;

const TRAILING_BOROUGH =
  /[–\-]\s+([\w\u00C0-\u024F][\w\u00C0-\u024F–\-/\s]{2,})$/;

const KNOWN_BOROUGHS = [
  "Ahuntsic-Cartierville",
  "Anjou",
  "Côte-des-Neiges–Notre-Dame-de-Grâce",
  "CDN/NDG",
  "Lachine",
  "LaSalle",
  "Le Plateau-Mont-Royal",
  "Le Sud-Ouest",
  "L'Île-Bizard–Sainte-Geneviève",
  "Mercier–Hochelaga-Maisonneuve",
  "Montréal-Nord",
  "Outremont",
  "Pierrefonds-Roxboro",
  "Rivière-des-Prairies–Pointe-aux-Trembles",
  "Rosemont–La Petite-Patrie",
  "Saint-Laurent",
  "Saint-Léonard",
  "Verdun",
  "Ville-Marie",
  "Villeray–Saint-Michel–Parc-Extension",
];

export function extractBorough(title: string): string | null {
  const match = BOROUGH_PATTERN.exec(title);
  if (match) {
    return cleanBorough(match[1].trim());
  }

  const trailing = TRAILING_BOROUGH.exec(title);
  if (trailing) {
    const candidate = trailing[1].trim();
    const matched = KNOWN_BOROUGHS.find(
      (b) => b.toLowerCase() === candidate.toLowerCase()
    );
    if (matched) return matched;
  }

  for (const borough of KNOWN_BOROUGHS) {
    if (title.includes(borough)) return borough;
  }

  return null;
}

function cleanBorough(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/,.*$/, "")
    .trim();
}
