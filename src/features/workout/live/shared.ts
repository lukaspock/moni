/** Small helpers shared by the live-session components (`app/workout/active.tsx`). */
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { TFunction } from 'i18next';

import {
  setInputUnit,
  storedToDisplay,
  type SetField,
  type SetInputUnit,
  type UnitSystem,
} from '@/domain';
import type { PrefillValues } from '@/domain/workoutPrefill';
import i18n from '@/i18n';
import type { TrackingType } from '../types';

/** Which editable columns a tracking type shows, in display order. */
export const FIELDS_BY_TRACKING: Record<TrackingType, SetField[]> = {
  weight_reps: ['weightKg', 'reps'],
  reps: ['reps'],
  duration: ['durationS'],
  distance_duration: ['distanceM', 'durationS'],
};

export interface Column {
  field: SetField;
  unit: SetInputUnit;
}

export function columnsFor(
  trackingType: TrackingType,
  unitSystem: UnitSystem,
): Column[] {
  return FIELDS_BY_TRACKING[trackingType].map((field) => ({
    field,
    unit: setInputUnit(field, trackingType, unitSystem),
  }));
}

export function unitLabel(t: TFunction, unit: SetInputUnit): string {
  switch (unit) {
    case 'kg':
      return t('workout.unit.kg');
    case 'lb':
      return t('workout.unit.lb');
    case 'reps':
      return t('workout.unit.reps');
    case 'sec':
      return t('workout.unit.sec');
    case 'min':
      return t('workout.unit.min');
    case 'km':
      return t('workout.unit.km');
    case 'mi':
      return t('workout.unit.mi');
  }
}

export function fieldLabel(t: TFunction, field: SetField): string {
  switch (field) {
    case 'weightKg':
      return t('workoutLive.field.weight');
    case 'reps':
      return t('workoutLive.field.reps');
    case 'durationS':
      return t('workoutLive.field.duration');
    case 'distanceM':
      return t('workoutLive.field.distance');
  }
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(i18n.language, {
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(value);
}

/** Stored (metric) value as shown in the user's unit, or null. */
export function displayText(
  stored: number | null,
  unit: SetInputUnit,
): string | null {
  return stored === null ? null : formatNumber(storedToDisplay(stored, unit));
}

/** "80 kg × 8", "12 reps", "5 km · 25 min" for the "last time" line. */
export function formatSetSummary(
  t: TFunction,
  values: PrefillValues,
  columns: Column[],
): string | null {
  const weight = columns.find((c) => c.field === 'weightKg');
  if (weight && values.weightKg !== null && values.reps !== null) {
    return t('workoutLive.exercise.weightReps', {
      weight: displayText(values.weightKg, weight.unit),
      unit: unitLabel(t, weight.unit),
      reps: values.reps,
    });
  }
  const parts = columns
    .filter((c) => values[c.field] !== null)
    .map((c) =>
      t('workoutLive.exercise.valueUnit', {
        value: displayText(values[c.field], c.unit),
        unit: unitLabel(t, c.unit),
      }),
    );
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** Re-renders its caller every `intervalMs` while `enabled`. */
export function useNow(intervalMs: number, enabled: boolean = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    // Catch up immediately after the app was suspended.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setNow(Date.now());
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [intervalMs, enabled]);
  return now;
}
