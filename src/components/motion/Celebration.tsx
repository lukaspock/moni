import { useEffect, useRef, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { haptic, type HapticEvent } from '@/lib/haptics';
import { fixedColors } from '@/theme/colors';

import {
  celebrationPreset,
  type CelebrationKind,
  type CelebrationLevel,
} from './celebrationPresets';
import { Foam } from './Foam';

export type { CelebrationKind, CelebrationLevel };

export interface CelebrationProps {
  kind: CelebrationKind;
  /** Intensity (rhythm milestones), default 1. */
  level?: CelebrationLevel;
  /** Fires on every change to a truthy / higher value (counter or boolean). */
  trigger: number | boolean;
  origin: { x: number; y: number };
  /** Canvas size; default fills the parent. */
  size?: { width: number; height: number };
  /** Override the haptic; false = none. Default derived from `kind`. */
  haptic?: HapticEvent | false;
  onDone?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Orchestrates a signature moment: haptic + foam burst. Place it inside the
 * celebrating area (absolute, non-interactive). Texts/badges stay the
 * caller's job. The haptic fires even with Reduce Motion.
 */
export function Celebration({
  kind,
  level = 1,
  trigger,
  origin,
  size,
  haptic: hapticOverride,
  onDone,
  style,
}: CelebrationProps) {
  const n = typeof trigger === 'boolean' ? (trigger ? 1 : 0) : trigger;
  const last = useRef(0);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (n > 0 && n !== last.current) {
      const preset = celebrationPreset(kind, level);
      const event =
        hapticOverride === undefined ? preset.haptic : hapticOverride;
      if (event) haptic[event]();
      setBurst((b) => b + 1);
    }
    last.current = n;
    // fires on trigger changes only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  if (burst === 0) return null;
  const preset = celebrationPreset(kind, level);
  const colors =
    preset.palette === 'bonus'
      ? [fixedColors.emberHead, fixedColors.foam]
      : [fixedColors.foam, fixedColors.limeHead, fixedColors.lime];

  return (
    <Foam
      key={burst}
      origin={origin}
      size={size}
      count={preset.count}
      spread={preset.spread}
      riseMax={preset.riseMax}
      colors={colors}
      onDone={onDone}
      style={style}
    />
  );
}
