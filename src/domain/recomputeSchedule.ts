/** Minimum time between two client-triggered recompute-targets attempts (PLAN §6.7: weekly). */
export const RECOMPUTE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * True when the last recompute attempt is unknown or at least 7 days old.
 * `lastAttemptMs` is the newest of "latest tdee_estimates.created_at" and the local
 * "last attempt" timestamp. A timestamp in the future (clock change) counts as due.
 */
export function isRecomputeDue(
  lastAttemptMs: number | null | undefined,
  nowMs: number,
  intervalMs: number = RECOMPUTE_INTERVAL_MS,
): boolean {
  if (lastAttemptMs == null || !Number.isFinite(lastAttemptMs)) return true;
  if (lastAttemptMs > nowMs) return true;
  return nowMs - lastAttemptMs >= intervalMs;
}
