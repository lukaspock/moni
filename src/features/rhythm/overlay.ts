/**
 * Pure helpers for the ledger data source (no React / native imports, unit-tested):
 * PostgREST pagination and the overlay of not-yet-synced outbox workouts.
 */

import type { LedgerWorkoutRow } from '../../domain/ledger';

/** PostgREST returns at most 1000 rows per request. */
export const PAGE_SIZE = 1000;
/** Hard stop against runaway loops (50 000 rows per query). */
const MAX_PAGES = 50;

/**
 * Collects all pages of a ranged query. `fetchPage(from, to)` must return the rows of the
 * inclusive range and throw on errors. Stops at the first short page.
 */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<readonly T[]>,
  pageSize: number = PAGE_SIZE,
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * pageSize;
    const rows = await fetchPage(from, from + pageSize - 1);
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

export interface WorkoutLedgerRow extends LedgerWorkoutRow {
  id: string;
}

/**
 * Server rows + pending outbox mutations of the same user (same semantics as the workout
 * history merge): queued deletes hide rows, queued upserts patch existing rows or add
 * offline-finished workouts. Rows from other users in the queue are ignored.
 */
export function overlayWorkoutRows(
  serverRows: readonly WorkoutLedgerRow[],
  pendingUpserts: readonly Record<string, unknown>[],
  pendingDeleteIds: ReadonlySet<string>,
  userId: string,
): WorkoutLedgerRow[] {
  const pending = new Map<string, Record<string, unknown>>();
  for (const p of pendingUpserts) {
    if (p.user_id !== undefined && p.user_id !== userId) continue;
    if (typeof p.id === 'string') pending.set(p.id, p);
  }

  const byId = new Map<string, WorkoutLedgerRow>();
  for (const row of serverRows) {
    if (pendingDeleteIds.has(row.id)) continue;
    const patch = pending.get(row.id);
    byId.set(row.id, {
      ...row,
      ...(patch && typeof patch.started_at === 'string'
        ? { started_at: patch.started_at }
        : {}),
      ...(patch && 'ended_at' in patch
        ? { ended_at: (patch.ended_at as string | null) ?? null }
        : {}),
      ...(patch && typeof patch.category === 'string'
        ? { category: patch.category }
        : {}),
      ...(patch && 'kcal_burned' in patch
        ? { kcal_burned: (patch.kcal_burned as number | null) ?? null }
        : {}),
    });
  }
  for (const [id, p] of pending) {
    if (byId.has(id) || pendingDeleteIds.has(id)) continue;
    if (typeof p.started_at !== 'string' || typeof p.category !== 'string')
      continue;
    byId.set(id, {
      id,
      started_at: p.started_at,
      ended_at: (p.ended_at as string | null | undefined) ?? null,
      category: p.category,
      kcal_burned: (p.kcal_burned as number | null | undefined) ?? null,
    });
  }
  return [...byId.values()];
}
