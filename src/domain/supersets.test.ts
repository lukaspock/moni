import {
  MAX_SUPERSET_GROUP,
  afterGroupSet,
  canLinkWithNext,
  isInGroup,
  linkWithNext,
  normalizeSupersetGroups,
  supersetBlocks,
  supersetKind,
  supersetRound,
  unlinkAt,
} from './supersets';

describe('supersetBlocks', () => {
  it('groups adjacent runs and treats singles as standalone', () => {
    expect(supersetBlocks([null, 3, 3, 3, 5, null])).toEqual([
      { start: 0, end: 0, group: null },
      { start: 1, end: 3, group: 3 },
      { start: 4, end: 4, group: null },
      { start: 5, end: 5, group: null },
    ]);
  });
  it('splits the same number when not adjacent', () => {
    expect(supersetBlocks([1, null, 1]).every((b) => b.group === null)).toBe(
      true,
    );
  });
  it('handles undefined and empty input', () => {
    expect(supersetBlocks([])).toEqual([]);
    expect(supersetBlocks([undefined, undefined])).toHaveLength(2);
  });
});

describe('normalizeSupersetGroups', () => {
  it('renumbers runs 1.. and drops singles', () => {
    expect(normalizeSupersetGroups([7, 7, 4, null, 9, 9, 9])).toEqual([
      1,
      1,
      null,
      null,
      2,
      2,
      2,
    ]);
  });
  it('never exceeds the max group number', () => {
    const many = Array.from({ length: 50 }, (_, i) => Math.floor(i / 2) + 1);
    const out = normalizeSupersetGroups(many);
    expect(Math.max(...out.map((g) => g ?? 0))).toBe(MAX_SUPERSET_GROUP);
    expect(out.slice(40)).toEqual(Array(10).fill(null));
  });
});

describe('link / unlink', () => {
  it('links two singles into a superset', () => {
    expect(linkWithNext([null, null, null], 0)).toEqual([1, 1, null]);
  });
  it('extends an existing group with the next exercise', () => {
    expect(linkWithNext([1, 1, null], 1)).toEqual([1, 1, 1]);
  });
  it('pulls the previous exercise into the following group', () => {
    expect(linkWithNext([null, 1, 1], 0)).toEqual([1, 1, 1]);
  });
  it('merges two groups', () => {
    expect(linkWithNext([1, 1, 2, 2], 1)).toEqual([1, 1, 1, 1]);
  });
  it('is a no-op for the last exercise or one already linked', () => {
    expect(linkWithNext([null, null], 1)).toEqual([null, null]);
    expect(canLinkWithNext([1, 1], 0)).toBe(false);
    expect(canLinkWithNext([null, null], 0)).toBe(true);
  });
  it('unlinking dissolves a pair', () => {
    expect(unlinkAt([1, 1, null], 0)).toEqual([null, null, null]);
  });
  it('unlinking the end of a circuit keeps the rest', () => {
    expect(unlinkAt([1, 1, 1], 2)).toEqual([1, 1, null]);
    expect(unlinkAt([1, 1, 1], 0)).toEqual([null, 1, 1]);
  });
  it('unlinking the middle splits both sides apart', () => {
    expect(unlinkAt([1, 1, 1, 1, 1], 2)).toEqual([1, 1, null, 2, 2]);
    expect(unlinkAt([1, 1, 1], 1)).toEqual([null, null, null]);
  });
  it('isInGroup ignores lone numbers', () => {
    expect(isInGroup([1, 1, 2], 1)).toBe(true);
    expect(isInGroup([1, 1, 2], 2)).toBe(false);
  });
  it('names superset vs circuit', () => {
    expect(supersetKind(2)).toBe('superset');
    expect(supersetKind(3)).toBe('circuit');
  });
});

describe('afterGroupSet (alternating A1 -> B1 -> rest -> A2 ...)', () => {
  it('goes to B without rest after A1', () => {
    expect(
      afterGroupSet(
        [
          { done: 1, total: 3 },
          { done: 0, total: 3 },
        ],
        0,
      ),
    ).toEqual({ next: 1, rest: false });
  });
  it('rests after B1 and comes back to A', () => {
    expect(
      afterGroupSet(
        [
          { done: 1, total: 3 },
          { done: 1, total: 3 },
        ],
        1,
      ),
    ).toEqual({ next: 0, rest: true });
  });
  it('walks a circuit A -> B -> C -> rest', () => {
    const p = (a: number, b: number, c: number) => [
      { done: a, total: 2 },
      { done: b, total: 2 },
      { done: c, total: 2 },
    ];
    expect(afterGroupSet(p(1, 0, 0), 0)).toEqual({ next: 1, rest: false });
    expect(afterGroupSet(p(1, 1, 0), 1)).toEqual({ next: 2, rest: false });
    expect(afterGroupSet(p(1, 1, 1), 2)).toEqual({ next: 0, rest: true });
  });
  it('wraps back to a member that still owes this round', () => {
    // B was done first: A still owes round 1, no rest yet.
    expect(
      afterGroupSet(
        [
          { done: 0, total: 3 },
          { done: 1, total: 3 },
        ],
        1,
      ),
    ).toEqual({ next: 0, rest: false });
  });
  it('skips members that are finished (uneven set counts)', () => {
    expect(
      afterGroupSet(
        [
          { done: 4, total: 4 },
          { done: 3, total: 3 },
        ],
        0,
      ),
    ).toEqual({ next: null, rest: true });
    expect(
      afterGroupSet(
        [
          { done: 3, total: 4 },
          { done: 3, total: 3 },
        ],
        0,
      ),
    ).toEqual({ next: 0, rest: true });
  });
  it('reports the group done after the last set', () => {
    expect(
      afterGroupSet(
        [
          { done: 3, total: 3 },
          { done: 3, total: 3 },
        ],
        1,
      ),
    ).toEqual({ next: null, rest: true });
  });
});

describe('supersetRound', () => {
  it('counts rounds from the slowest open member', () => {
    expect(
      supersetRound([
        { done: 1, total: 3 },
        { done: 0, total: 3 },
      ]),
    ).toEqual({ round: 1, total: 3 });
    expect(
      supersetRound([
        { done: 1, total: 3 },
        { done: 1, total: 3 },
      ]),
    ).toEqual({ round: 2, total: 3 });
  });
  it('stays on the last round when everything is done', () => {
    expect(
      supersetRound([
        { done: 3, total: 3 },
        { done: 2, total: 2 },
      ]),
    ).toEqual({ round: 3, total: 3 });
  });
});
