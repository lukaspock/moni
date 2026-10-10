import { Text, View } from 'react-native';

import { useThemeHex } from '@/theme/colors';

import {
  barHeightPx,
  bonusCapStart,
  dailyBarRatio,
  isOverTarget,
  withAlpha,
} from './charts.logic';
import { ChartBar } from './ChartBar';

export interface DailyKcalBar {
  key: string;
  /** short label under the bar (weekday initial etc.) */
  label: string;
  eatenKcal: number;
  targetKcal: number | null;
  logged: boolean;
  /** workout bonus included in `targetKcal` — shown as an ember cap */
  bonusKcal?: number;
}

const BAR_AREA_HEIGHT = 96;
const CAP = 1.3;

/**
 * Bars of eaten kcal relative to each day's target (top of the area = 130 % of
 * target; the dashed line marks 100 %). Over-target days: soft danger fill with
 * a 3-pt danger top edge. The workout bonus is an ember cap. Unlogged days
 * show an empty slot. Palette: accent + ember + danger (never Honey).
 */
export function DailyKcalBars({
  bars,
  todayKey,
}: {
  bars: readonly DailyKcalBar[];
  /** highlighted day; defaults to the last bar */
  todayKey?: string;
}) {
  const accent = useThemeHex('accent');
  const ember = useThemeHex('bonus');
  const danger = useThemeHex('danger');
  const track = useThemeHex('surfaceRaised');
  const label = useThemeHex('label');
  const secondary = useThemeHex('labelSecondary');
  const tertiary = useThemeHex('labelTertiary');
  const today = todayKey ?? bars[bars.length - 1]?.key;

  return (
    <View
      className="flex-row items-end gap-1.5"
      style={{ height: BAR_AREA_HEIGHT + 20 }}
    >
      {bars.map((b, i) => {
        const ratio = b.logged
          ? dailyBarRatio(b.eatenKcal, b.targetKcal, CAP)
          : 0;
        const over = b.logged && isOverTarget(b.eatenKcal, b.targetKcal);
        const capStart = over
          ? null
          : bonusCapStart(b.eatenKcal, b.targetKcal, b.bonusKcal, CAP);
        const isToday = b.key === today;
        return (
          <View key={b.key} className="flex-1 items-center gap-1">
            <View style={{ width: '100%', alignItems: 'center' }}>
              <ChartBar
                areaPx={BAR_AREA_HEIGHT}
                heightPx={
                  b.logged ? barHeightPx(ratio, 1, BAR_AREA_HEIGHT, 3) : 0
                }
                trackColor={track}
                fillColor={over ? withAlpha(danger, 0.35) : accent}
                edgeColor={over ? danger : undefined}
                capColor={capStart != null ? ember : undefined}
                capFromPx={
                  capStart != null ? capStart * BAR_AREA_HEIGHT : undefined
                }
                ringColor={isToday ? accent : undefined}
                delay={i * 35}
                maxWidth={40}
              />
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  width: '100%',
                  bottom: BAR_AREA_HEIGHT / CAP,
                  borderTopWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: tertiary,
                }}
              />
            </View>
            <Text
              style={{
                color: isToday ? label : secondary,
                fontSize: 11,
                fontWeight: isToday ? '700' : '500',
              }}
            >
              {b.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
