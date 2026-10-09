import { Text, View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { themeColor } from '@/theme/colors';

import { TONE_SOLID_BG, type Tone } from './tones';

/** Count badge: min 20 pt circle, accent fill + on-tint text, 2 pt cutout border in page color. */
export function CountBadge({
  count,
  max = 99,
}: {
  count: number;
  max?: number;
}) {
  const text = count > max ? `${max}+` : String(count);
  return (
    <View
      accessibilityLabel={text}
      className="bg-tint border-bg h-5 min-w-5 items-center justify-center rounded-full border-2 px-1"
    >
      <Text
        maxFontSizeMultiplier={1.15}
        className="text-on-tint text-xs"
        style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}
      >
        {text}
      </Text>
    </View>
  );
}

/** 8 pt status dot with 2 pt cutout border. */
export function StatusDot({ tone = 'accent' }: { tone?: Tone }) {
  return (
    <View
      accessible={false}
      className={`border-bg box-content h-2 w-2 rounded-full border-2 ${TONE_SOLID_BG[tone]}`}
    />
  );
}

/** Streak / day badge: 28 pt capsule, bonusSoft + bonus text, `bolt.fill` by default. */
export function StreakBadge({
  label,
  symbol = 'bolt.fill',
}: {
  label: string;
  symbol?: SymbolViewProps['name'];
}) {
  return (
    <View className="bg-bonus-soft h-7 flex-row items-center gap-1 self-start rounded-full px-3">
      <SymbolView
        name={symbol}
        size={13}
        weight="bold"
        tintColor={themeColor('bonus')}
      />
      <Text
        maxFontSizeMultiplier={1.3}
        className="text-bonus text-sm font-semibold"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {label}
      </Text>
    </View>
  );
}

/** "AI estimate" badge: accentSoft + accent, `sparkles` icon. Pass the localized label. */
export function AiBadge({ label }: { label: string }) {
  return (
    <View className="bg-tint-soft h-6 flex-row items-center gap-1 self-start rounded-full px-2.5">
      <SymbolView
        name="sparkles"
        size={12}
        weight="bold"
        tintColor={themeColor('accent')}
      />
      <Text
        maxFontSizeMultiplier={1.3}
        className="text-tint text-xs font-semibold"
      >
        {label}
      </Text>
    </View>
  );
}
