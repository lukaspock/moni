/** Pure geometry/number model for the Today kcal ring (no RN imports). */

export interface KcalRingModelInput {
  eatenKcal: number;
  baseKcal: number;
  bonusKcal: number;
}

export interface KcalRingModel {
  /** base + bonus, never negative. */
  limitKcal: number;
  /** limit - eaten, rounded; negative when over. */
  remainingKcal: number;
  isOver: boolean;
  /** kcal above the limit (0 when not over), rounded. */
  overKcal: number;
  /** Share (0..1) of the ring where the base allowance ends = start of the bonus segment. */
  baseShare: number;
  /** Share (0..1) of the ring taken by the bonus segment (0 without bonus). */
  bonusShare: number;
  /** Filled share of the ring (0..1), clamped; 1 when at/over the limit. */
  fillShare: number;
}

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);
const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

export function computeKcalRingModel({
  eatenKcal,
  baseKcal,
  bonusKcal,
}: KcalRingModelInput): KcalRingModel {
  const eaten = safe(eatenKcal);
  const base = safe(baseKcal);
  const bonus = safe(bonusKcal);
  const limit = base + bonus;
  const isOver = limit > 0 ? eaten > limit : eaten > 0;
  const baseShare = limit > 0 ? clamp01(base / limit) : 1;
  const bonusShare = limit > 0 ? 1 - baseShare : 0;
  const fillShare = limit > 0 ? clamp01(eaten / limit) : eaten > 0 ? 1 : 0;
  return {
    limitKcal: limit,
    remainingKcal: Math.round(limit - eaten),
    isOver,
    overKcal: isOver ? Math.round(eaten - limit) : 0,
    baseShare,
    bonusShare,
    fillShare,
  };
}
