import { storage } from '@/lib/storage';

const KEY = 'workout:recentExercises';
const MAX = 5;

/** Most recently picked exercise ids (device-local, newest first, max 5). */
export function getRecentExerciseIds(): string[] {
  try {
    const raw = storage.getString(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX)
      : [];
  } catch {
    return [];
  }
}

export function rememberExercises(ids: string[]): void {
  if (ids.length === 0) return;
  const next = [
    ...ids.slice().reverse(),
    ...getRecentExerciseIds().filter((id) => !ids.includes(id)),
  ].slice(0, MAX);
  storage.set(KEY, JSON.stringify(next));
}
