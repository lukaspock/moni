/**
 * Supersets / circuits (pure, no RN imports). A group is a run of adjacent
 * exercises sharing the same non-null `supersetGroup` number; a run of one is
 * a normal exercise. Numbers are per routine and get renumbered 1..20.
 *
 * Live session: members are trained alternately (A1 -> B1 -> rest -> A2 -> B2 ...).
 */

export const MAX_SUPERSET_GROUP = 20;

export type GroupId = number | null | undefined;

export interface GroupBlock {
  /** First index of the block (inclusive). */
  start: number;
  /** Last index of the block (inclusive). */
  end: number;
  /** Group number, or null for a standalone exercise. */
  group: number | null;
}

/** Splits a list into blocks: grouped runs (2+) and standalone exercises. */
export function supersetBlocks(groups: readonly GroupId[]): GroupBlock[] {
  const out: GroupBlock[] = [];
  let i = 0;
  while (i < groups.length) {
    const g = groups[i] ?? null;
    let j = i;
    if (g !== null) while (j + 1 < groups.length && groups[j + 1] === g) j++;
    if (g !== null && j > i) {
      out.push({ start: i, end: j, group: g });
    } else {
      for (let k = i; k <= j; k++) out.push({ start: k, end: k, group: null });
    }
    i = j + 1;
  }
  return out;
}

/** Singles -> null, grouped runs -> 1, 2, 3 … (runs beyond 20 are dropped). */
export function normalizeSupersetGroups(
  groups: readonly GroupId[],
): (number | null)[] {
  const out: (number | null)[] = groups.map(() => null);
  let next = 1;
  for (const b of supersetBlocks(groups)) {
    if (b.group === null || next > MAX_SUPERSET_GROUP) continue;
    for (let k = b.start; k <= b.end; k++) out[k] = next;
    next++;
  }
  return out;
}

export function isInGroup(groups: readonly GroupId[], index: number): boolean {
  return supersetBlocks(groups).some(
    (b) => b.group !== null && index >= b.start && index <= b.end,
  );
}

/** Linking is possible when there is a next exercise that is not already in the same group. */
export function canLinkWithNext(
  groups: readonly GroupId[],
  index: number,
): boolean {
  if (index < 0 || index >= groups.length - 1) return false;
  const norm = normalizeSupersetGroups(groups);
  const a = norm[index] ?? null;
  if (a !== null && a === norm[index + 1]) return false;
  // A brand-new group needs a free number.
  if (a === null && norm[index + 1] === null) {
    const used = new Set(norm.filter((g) => g !== null));
    return used.size < MAX_SUPERSET_GROUP;
  }
  return true;
}

/** Couples exercise `index` with the next one (joining/merging existing groups). */
export function linkWithNext(
  groups: readonly GroupId[],
  index: number,
): (number | null)[] {
  const g = normalizeSupersetGroups(groups);
  if (!canLinkWithNext(g, index)) return g;
  const a = g[index] ?? null;
  const b = g[index + 1] ?? null;
  const id = a ?? b ?? MAX_SUPERSET_GROUP + 1; // temp id, renumbered below
  g[index] = id;
  if (b === null) g[index + 1] = id;
  else for (let j = index + 1; j < g.length && g[j] === b; j++) g[j] = id;
  return normalizeSupersetGroups(g);
}

/** Takes exercise `index` out of its group (a group left with one exercise dissolves). */
export function unlinkAt(
  groups: readonly GroupId[],
  index: number,
): (number | null)[] {
  const g = normalizeSupersetGroups(groups);
  if (index < 0 || index >= g.length || g[index] === null) return g;
  const own = g[index];
  // Split the run so the part before and the part after stay separate groups.
  for (let j = index + 1; j < g.length && g[j] === own; j++)
    g[j] = MAX_SUPERSET_GROUP + 1;
  g[index] = null;
  return normalizeSupersetGroups(g);
}

/** 2 exercises = superset, 3+ = circuit. */
export function supersetKind(size: number): 'superset' | 'circuit' {
  return size >= 3 ? 'circuit' : 'superset';
}

// ---------------------------------------------------------------------------
// Live session
// ---------------------------------------------------------------------------

export interface MemberProgress {
  done: number;
  total: number;
}

const isOpen = (m: MemberProgress) => m.done < m.total;

/**
 * Called right after a set of member `k` was checked (its `done` already
 * counts it). `next` = member to focus (null = whole group done), `rest` =
 * the round is complete, so the rest timer should start now.
 *
 * Rule: someone else still owes a set in this round (fewer done than `k`,
 * with sets left) -> go there without rest, preferring members after `k`.
 * Otherwise the round is over -> rest, then the first member with open sets.
 */
export function afterGroupSet(
  members: readonly MemberProgress[],
  k: number,
): { next: number | null; rest: boolean } {
  const self = members[k];
  if (!self) return { next: null, rest: true };
  const n = members.length;
  for (let step = 1; step < n; step++) {
    const j = (k + step) % n;
    const m = members[j]!;
    if (isOpen(m) && m.done < self.done) return { next: j, rest: false };
  }
  const first = members.findIndex(isOpen);
  return { next: first === -1 ? null : first, rest: true };
}

/** Current round (1-based) and total rounds of a group, for "Round 2 of 3". */
export function supersetRound(members: readonly MemberProgress[]): {
  round: number;
  total: number;
} {
  const total = members.reduce((max, m) => Math.max(max, m.total), 0);
  const open = members.filter(isOpen);
  if (open.length === 0) return { round: total, total };
  const round = Math.min(...open.map((m) => m.done)) + 1;
  return { round: Math.min(round, total), total };
}
