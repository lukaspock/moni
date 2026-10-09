// CONTRACT (owner: `rhythm`, domain B4). Other features import only from here.
// Client-side ledger + rhythm + stamps, derived from `food_logs`, `workouts` and `weight_logs`
// (docs/identity/05-experience-gamification.md §2; IDENTITY-PLAN D4/D10/D11). No migration, no UI.
//
//   useLedger()          compact per-day records, MMKV-cached, incremental + paginated sync
//   useRhythm()          rhythm replay (grace, pause), stage, care signal, pause/rest-day actions
//   useWeekTally(ws?)    weekly triad rings + the seven day glyphs
//   useAchievements()    stamps (release-1 set), seen/unlocked persistence, celebration throttle
//   useWeeklyReview(ws?) "Gezeitentafel" cards for a week
//   useCareSignal()      care signal on its own
export {
  useLedger,
  useToday,
  invalidateLedger,
  rhythmKeys,
  type LedgerResult,
} from './useLedger';
export {
  useRhythm,
  useWeekTally,
  useCareSignal,
  type RhythmResult,
  type WeekTallyDay,
  type WeekTallyResult,
} from './useRhythm';
export {
  useAchievements,
  useWeeklyReview,
  type AchievementsResult,
} from './useAchievements';
export { clearLedgerCache } from './cacheStore';
export type { GoalOverrides } from './derive';
export type { UserRhythmLocal } from './localStore';
