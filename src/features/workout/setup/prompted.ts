/**
 * Per-user MMKV flag: has the training setup flow been shown once
 * automatically? (`training:setupPrompted:<uid>`, docs/identity/06 §1). After
 * that, the Training tab only offers it via the hero CTA.
 */
import { storage } from '@/lib/storage';

const promptedKey = (userId: string) => `training:setupPrompted:${userId}`;

export function hasPromptedTrainingSetup(userId: string): boolean {
  try {
    return storage.getBoolean(promptedKey(userId)) ?? false;
  } catch {
    return false;
  }
}

export function markTrainingSetupPrompted(userId: string): void {
  try {
    storage.set(promptedKey(userId), true);
  } catch {
    // a missing flag only means the flow may open once more
  }
}
