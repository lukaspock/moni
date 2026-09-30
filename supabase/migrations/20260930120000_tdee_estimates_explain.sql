-- møni · Phase 6: explainability columns for the adaptive TDEE (PLAN §6.7).
-- recompute-targets writes one row per (user, week_start); the UI explains the adjustment
-- ("Dein Verbrauch ist höher als geschätzt") from reason_code + weekly_change_kcal.
-- RLS is unchanged (policies are table-level; client stays able to read only its own rows).

alter table public.tdee_estimates
  add column reason_code text
    check (reason_code in (
      'observed_higher_than_formula',
      'observed_lower_than_formula',
      'aligned_with_formula',
      'clamped_by_weekly_limit'
    )),
  add column weekly_change_kcal numeric,
  add column weight_trend_kg numeric;

comment on column public.tdee_estimates.reason_code is 'Why blended_tdee differs from formula_tdee (src/domain/adaptive.ts AdaptiveReasonCode). Rows are only written when enough data exists.';
comment on column public.tdee_estimates.weekly_change_kcal is 'blended_tdee minus the previous blended (or formula) TDEE, after the ±150 kcal weekly clamp.';
comment on column public.tdee_estimates.weight_trend_kg is 'EMA-smoothed weight change over the observation window (kg).';
