import { Text, View } from 'react-native';

import { useThemeHex } from '@/theme/colors';
import { fontFamily, maxFontSizeMultiplier } from '@/theme/typography';

import { barHeightPx } from './charts.logic';
import { ChartBar } from './ChartBar';

const BAR_AREA_HEIGHT = 64;

/**
 * Small bar row for a per-week count (e.g. training days), oldest first.
 * Rounded bars in accent, today's bar gets a 2-pt ring and a bold label.
 * Single-hue chart (no Ember/Honey mixing).
 */
export function WeeklyBars({
  values,
  max = 7,
  labels,
  todayIndex,
}: {
  values: readonly number[];
  max?: number;
  labels: readonly string[];
  /** highlighted bar; defaults to the last one */
  todayIndex?: number;
}) {
  const top = Math.max(max, ...values, 1);
  const today = todayIndex ?? values.length - 1;
  const accent = useThemeHex('accent');
  const track = useThemeHex('surfaceRaised');
  const label = useThemeHex('label');
  const secondary = useThemeHex('labelSecondary');

  return (
    <View
      className="flex-row items-end gap-2"
      style={{ height: BAR_AREA_HEIGHT + 38 }}
    >
      {values.map((v, i) => {
        const isToday = i === today;
        return (
          <View key={i} className="flex-1 items-center gap-1">
            <Text
              style={{
                color: label,
                fontFamily: fontFamily.display,
                fontSize: 12,
                fontVariant: ['tabular-nums'],
              }}
              maxFontSizeMultiplier={maxFontSizeMultiplier.numeric}
            >
              {v}
            </Text>
            <ChartBar
              areaPx={BAR_AREA_HEIGHT}
              heightPx={barHeightPx(v, top, BAR_AREA_HEIGHT)}
              trackColor={track}
              fillColor={accent}
              ringColor={isToday ? accent : undefined}
              delay={i * 40}
            />
            <Text
              style={{
                color: isToday ? label : secondary,
                fontSize: 11,
                fontWeight: isToday ? '700' : '500',
              }}
            >
              {labels[i]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
