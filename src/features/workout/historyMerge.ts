/**
 * Pure helpers that overlay not-yet-synced outbox mutations onto the workout
 * rows read from Supabase (no React / native imports, unit-tested).
 */

export interface WorkoutListRow {
  id: string;
  started_at: string;
  ended_at: string | null;
  category: string;
  kcal_burned: number | null;
  routine_id: string | null;
  healthkit_uuid: string | null;
}

const OVERLAY_KEYS = [
  'started_at',
  'ended_at',
  'category',
  'kcal_burned',
  'routine_id',
  'healthkit_uuid',
] as const;

/** Local calendar date (`YYYY-MM-DD`) of an ISO instant. */
export function localDateOf(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Server rows + pending outbox state of the same user:
 * - rows with a queued delete are hidden immediately (the server still has them until the delete syncs),
 * - queued upserts of an existing row override its fields (e.g. a Health merge changing kcal),
 * - queued upserts of unknown ids appear as new rows (offline-finished workouts),
 * - result sorted newest first by the real instant (`Date.parse`, not string order: the server
 *   returns `+00:00`, local payloads `Z`, and string comparison mixes the two up).
 */
export function mergeWorkoutRows(
  serverRows: readonly WorkoutListRow[],
  pendingUpserts: readonly Record<string, unknown>[],
  pendingDeleteIds: ReadonlySet<string>,
  userId: string,
): WorkoutListRow[] {
  const ownPending = pendingUpserts.filter(
    (p) => p.user_id === undefined || p.user_id === userId,
  );
  const pendingById = new Map<string, Record<string, unknown>>();
  for (const p of ownPending) pendingById.set(p.id as string, p);

  const byId = new Map<string, WorkoutListRow>();
  for (const row of serverRows) {
    if (pendingDeleteIds.has(row.id)) continue;
    const overlay = pendingById.get(row.id);
    const merged: WorkoutListRow = { ...row };
    if (overlay) {
      for (const key of OVERLAY_KEYS) {
        if (key in overlay && overlay[key] !== undefined)
          (merged as unknown as Record<string, unknown>)[key] = overlay[key];
      }
    }
    byId.set(row.id, merged);
  }

  for (const [id, p] of pendingById) {
    if (byId.has(id) || pendingDeleteIds.has(id)) continue;
    if (typeof p.started_at !== 'string' || typeof p.category !== 'string')
      continue; // incomplete partial patch for a row we can't see: nothing to show
    byId.set(id, {
      id,
      started_at: p.started_at,
      ended_at: (p.ended_at as string | null | undefined) ?? null,
      category: p.category,
      kcal_burned: (p.kcal_burned as number | null | undefined) ?? null,
      routine_id: (p.routine_id as string | null | undefined) ?? null,
      healthkit_uuid: (p.healthkit_uuid as string | null | undefined) ?? null,
    });
  }

  return [...byId.values()].sort((a, b) => {
    const diff = Date.parse(b.started_at) - Date.parse(a.started_at);
    if (diff !== 0 && !Number.isNaN(diff)) return diff;
    return a.id < b.id ? -1 : 1;
  });
}

/** Rows that started on the given local date, oldest first (for the day view). */
export function rowsForLocalDate(
  rows: readonly WorkoutListRow[],
  date: string,
): WorkoutListRow[] {
  return rows
    .filter((r) => localDateOf(r.started_at) === date)
    .slice()
    .reverse();
}
