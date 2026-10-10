import { memo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

import { PressableScale } from '@/components/motion';
import { SectionHeader } from '@/components/ui';
import type { QuickLogEntry } from '@/features/food';
import { textStyles } from '@/theme/typography';

export interface QuickPoint {
  x: number;
  y: number;
}

const Chip = memo(function Chip({
  entry,
  disabled,
  onLog,
}: {
  entry: QuickLogEntry;
  disabled: boolean;
  onLog: (entry: QuickLogEntry, from?: QuickPoint) => void;
}) {
  const { t } = useTranslation();
  const ref = useRef<View>(null);
  const title = entry.title || t('food.dashboard.untitledMeal');
  const kcal = Math.round(entry.kcal);
  return (
    <PressableScale
      onPress={() => {
        const node = ref.current;
        if (!node) return onLog(entry);
        node.measureInWindow((x, y, w, h) =>
          onLog(entry, { x: x + w / 2, y: y + h / 2 }),
        );
      }}
      disabled={disabled}
      accessibilityLabel={`${title}, ${kcal} ${t('food.dashboard.kcalUnit')}, ${t('food.logFood.logNow')}`}
    >
      <View
        ref={ref}
        collapsable={false}
        className="bg-surface gap-0.5 px-4 py-2.5"
        style={{ borderRadius: 18, borderCurve: 'continuous', maxWidth: 200 }}
      >
        <Text
          className="text-label"
          style={textStyles.headline}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {title}
        </Text>
        <Text
          className="text-label-secondary"
          style={[textStyles.numericS, { fontSize: 15 }]}
          maxFontSizeMultiplier={1.15}
        >
          {kcal} {t('food.dashboard.kcalUnit')}
        </Text>
      </View>
    </PressableScale>
  );
});

/** Horizontal regulars (favorites first, then recents); one tap logs. */
export const QuickCarousel = memo(function QuickCarousel({
  entries,
  disabled,
  onLog,
}: {
  entries: QuickLogEntry[];
  disabled: boolean;
  onLog: (entry: QuickLogEntry, from?: QuickPoint) => void;
}) {
  const { t } = useTranslation();
  if (entries.length === 0) return null;
  return (
    <View className="gap-2">
      <SectionHeader title={t('food.logFood.favoritesRecent')} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-5"
        style={{ marginHorizontal: -20 }}
      >
        {entries.map((e) => (
          <Chip key={e.key} entry={e} disabled={disabled} onLog={onLog} />
        ))}
      </ScrollView>
    </View>
  );
});
