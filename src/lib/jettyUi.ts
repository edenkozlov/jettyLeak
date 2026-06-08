/** Jetty web dashboard — NOT dock.jetty.io (that's API-only, returns JSON 404). */
const UI_BASE = import.meta.env.VITE_JETTY_UI_URL ?? 'https://flows.jetty.io'
const DEFAULT_TASK = import.meta.env.VITE_JETTY_TASK ?? 'beluga-night-watch'

/** Task runs list in the Jetty dashboard. */
export function jettyTaskUrl(collection?: string | null, task?: string | null): string {
  const t = task ?? DEFAULT_TASK
  if (collection) {
    return `${UI_BASE}/collections/${encodeURIComponent(collection)}/tasks/${encodeURIComponent(t)}`
  }
  return UI_BASE
}

/**
 * Best-effort link to a specific run. Jetty UI paths vary; task page is the reliable target.
 * Trajectory id is shown in Beluga so you can find the run in the list.
 */
export function jettyTrajectoryUrl(
  trajectoryId: string,
  collection?: string | null,
  task?: string | null,
): string {
  const t = task ?? DEFAULT_TASK
  if (collection) {
    return `${UI_BASE}/collections/${encodeURIComponent(collection)}/tasks/${encodeURIComponent(t)}?trajectory=${encodeURIComponent(trajectoryId)}`
  }
  return UI_BASE
}

export function jettyDashboardUrl(): string {
  return UI_BASE
}
