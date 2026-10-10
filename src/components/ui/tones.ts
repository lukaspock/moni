import type { ThemeColorName } from '@/theme/colors';

/** Meaning colors shared by IconTile, Pill, Badge, Chip. */
export type Tone =
  | 'accent'
  | 'bonus'
  | 'danger'
  | 'success'
  | 'warning'
  | 'protein'
  | 'carbs'
  | 'fat'
  | 'neutral';

export const TONE_SOFT_BG: Record<Tone, string> = {
  accent: 'bg-tint-soft',
  bonus: 'bg-bonus-soft',
  danger: 'bg-destructive-soft',
  success: 'bg-surface-raised',
  warning: 'bg-surface-raised',
  protein: 'bg-protein-soft',
  carbs: 'bg-carbs-soft',
  fat: 'bg-fat-soft',
  neutral: 'bg-surface-raised',
};

export const TONE_TEXT: Record<Tone, string> = {
  accent: 'text-tint',
  bonus: 'text-bonus',
  danger: 'text-destructive',
  success: 'text-success',
  warning: 'text-warning',
  protein: 'text-protein',
  carbs: 'text-carbs',
  fat: 'text-fat',
  neutral: 'text-label-secondary',
};

export const TONE_SOLID_BG: Record<Tone, string> = {
  accent: 'bg-tint',
  bonus: 'bg-bonus',
  danger: 'bg-destructive',
  success: 'bg-success',
  warning: 'bg-warning',
  protein: 'bg-protein',
  carbs: 'bg-carbs',
  fat: 'bg-fat',
  neutral: 'bg-surface-high',
};

/** For SF Symbol / PlatformColor tints. */
export const TONE_COLOR: Record<Tone, ThemeColorName> = {
  accent: 'accent',
  bonus: 'bonus',
  danger: 'danger',
  success: 'success',
  warning: 'warning',
  protein: 'protein',
  carbs: 'carbs',
  fat: 'fat',
  neutral: 'labelSecondary',
};
