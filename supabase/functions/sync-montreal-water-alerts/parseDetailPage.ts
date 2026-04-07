/**
 * Parses structured details from a Montreal alert detail page.
 *
 * The pages render a simple bullet list with information like:
 *   • Coupure d'eau - Rue Jean-Milot, entre la rue Quinlan et la rue D'Amour.
 *   • À partir de 16 h, le 26/03/2026
 *   • Raison : rupture de conduite
 *   • Retour à la normale prévu tard en soirée.
 */

export interface ParsedDetails {
  affectedArea: string | null;
  reason: string | null;
  startTime: string | null;
  endTime: string | null;
  rawText: string;
}

export function parseDetailPage(html: string): ParsedDetails {
  // Strip HTML tags to get plain text
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const bullets = text
    .split(/\n/)
    .map((l) => l.replace(/^[\s•·\-–]+/, "").trim())
    .filter((l) => l.length > 3);

  let affectedArea: string | null = null;
  let reason: string | null = null;
  let startTime: string | null = null;
  let endTime: string | null = null;

  for (const bullet of bullets) {
    const lower = bullet.toLowerCase();

    if (lower.startsWith("raison") || lower.includes("raison :") || lower.includes("raison:")) {
      reason = bullet.replace(/^raison\s*:\s*/i, "").trim();
      continue;
    }

    if (
      lower.includes("à partir de") ||
      lower.includes("a partir de") ||
      lower.includes("dès ") ||
      lower.includes("des ") ||
      /^\d{1,2}\s*h/.test(lower)
    ) {
      startTime = bullet;
      continue;
    }

    if (
      lower.includes("retour à la normale") ||
      lower.includes("retour a la normale") ||
      lower.includes("fin prévue") ||
      lower.includes("fin prevue") ||
      lower.includes("jusqu'à") ||
      lower.includes("jusqu'a")
    ) {
      endTime = bullet;
      continue;
    }

    if (
      (lower.includes("rue ") ||
        lower.includes("avenue ") ||
        lower.includes("boulevard ") ||
        lower.includes("entre ") ||
        lower.includes("chemin ")) &&
      !affectedArea
    ) {
      affectedArea = bullet;
      continue;
    }
  }

  return {
    affectedArea,
    reason,
    startTime,
    endTime,
    rawText: text.slice(0, 5000),
  };
}
