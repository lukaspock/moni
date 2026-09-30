// CONTRACT (owner: `insights-ui`): weight logging + Insights data hooks.
// Other features import only from here.
export {
  useWeightEntries,
  useWeightTrend,
  useAddWeight,
  useUpdateWeight,
  useDeleteWeight,
  weightLogsKey,
  type WeightEntry,
} from './weight';
export {
  useDailySummaries,
  useExerciseTrends,
  SUMMARY_DAYS,
  type ExerciseTrend,
} from './summary';
export { useWeightInput, type WeightInput } from './weightInput';
