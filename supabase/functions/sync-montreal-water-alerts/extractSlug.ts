/**
 * Extracts a stable slug from a montreal.ca alert URL for deduplication.
 *
 * Example input:
 *   https://montreal.ca/alertes/coupure-deau-rue-jeanmilot-...-20260326162150
 * Output:
 *   coupure-deau-rue-jeanmilot-...-20260326162150
 */
export function extractSlug(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] ?? url;
  } catch {
    // Fallback: take everything after the last slash
    const idx = url.lastIndexOf("/");
    return idx >= 0 ? url.slice(idx + 1) : url;
  }
}
