/**
 * Derives the alert status from available timestamps and title signals.
 *
 * The feed's `date_fin` is a 120-day retention window and NOT the actual
 * alert end time. Instead we use TTL heuristics:
 *   - Water cuts (coupure d'eau) resolve in hours → 48 h TTL
 *   - Boil advisories (ébullition) can last days  → 7 d TTL
 *   - "Fin de" / "ANNULÉ" / "Réouverture" titles → immediately expired
 */
export type AlertStatus = "active" | "upcoming" | "expired" | "unknown";

const DEFAULT_TTL_MS = 48 * 60 * 60 * 1000;            // 48 hours
const BOIL_ADVISORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;  // 7 days

const RESOLVED_PREFIXES = [
  "fin de ",
  "réouverture",
  "annulé",
  "annulation",
  "annule ",
];

const BOIL_KEYWORDS = ["ébullition", "ebullition", "boil"];

export function deriveStatus(opts: {
  alertStartAt: string | null;
  alertEndAt: string | null;
  publishedAt: string | null;
  title: string;
  now?: Date;
}): AlertStatus {
  const now = opts.now ?? new Date();
  const nowMs = now.getTime();

  // Title-based resolution detection
  const lowerTitle = opts.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (RESOLVED_PREFIXES.some((p) =>
    lowerTitle.startsWith(p.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
  )) {
    return "expired";
  }

  // Explicit end date (from enrichment) takes priority
  if (opts.alertEndAt) {
    const end = new Date(opts.alertEndAt);
    if (end.getTime() < nowMs) return "expired";
  }

  // Age-based TTL
  const refDate = opts.alertStartAt ?? opts.publishedAt;
  if (refDate) {
    const start = new Date(refDate);
    if (start.getTime() > nowMs) return "upcoming";

    const age = nowMs - start.getTime();
    const isBoil = BOIL_KEYWORDS.some((kw) => lowerTitle.includes(kw));
    const ttl = isBoil ? BOIL_ADVISORY_TTL_MS : DEFAULT_TTL_MS;

    if (age > ttl) return "expired";
    return "active";
  }

  return "unknown";
}
