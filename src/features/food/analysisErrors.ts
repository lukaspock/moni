// Pure helpers for analyze-food error codes (no RN/Expo imports, tested).

/** Server code (503) when Gemini throttles the shared quota: temporary, "try again in a minute". */
export const AI_RATE_LIMITED = 'ai_rate_limited';

/**
 * True for a draft `errorCode` (see `describeAnalysisError`, e.g. `503 ai_rate_limited`)
 * caused by AI throttling. The review screen derives it from the code, so every entry
 * point (text, photo, voice, camera) gets the dedicated message without passing a kind along.
 */
export function isRateLimitedErrorCode(
  code: string | null | undefined,
): boolean {
  return code != null && code.split(' ').includes(AI_RATE_LIMITED);
}
