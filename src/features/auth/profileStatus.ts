import type { Database } from '../../types/database';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

/**
 * A server-side profile counts as "complete" once every field the calorie
 * math needs is set (the v2 personalization columns are optional). Used by
 * the auth gate to decide tabs vs. onboarding for a signed-in user, and by
 * `applyOnboardingDraftToProfile` to never overwrite an existing profile.
 */
export function isProfileComplete(
  profile:
    | Pick<
        ProfileRow,
        'sex' | 'birth_date' | 'height_cm' | 'activity_level' | 'goal'
      >
    | null
    | undefined,
): boolean {
  return !!(
    profile &&
    profile.sex &&
    profile.birth_date &&
    profile.height_cm &&
    profile.activity_level &&
    profile.goal
  );
}
