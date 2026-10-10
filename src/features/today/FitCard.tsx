import { memo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { PressableScale } from '@/components/motion';
import { Card, SectionHeader } from '@/components/ui';
import type { FitMacro, FitSuggestion } from '@/domain';
import type { QuickLogEntry } from '@/features/food';
import { themeColor } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

import type { QuickPoint } from './QuickCarousel';
import type { FitSuggestionsResult } from './useFitSuggestions';

const Row = memo(function Row({
  suggestion,
  separator,
  disabled,
  onLog,
}: {
  suggestion: FitSuggestion<QuickLogEntry>;
  separator: boolean;
  disabled: boolean;
  onLog: (entry: QuickLogEntry, from?: QuickPoint) => void;
}) {
  const { t, i18n } = useTranslation();
  const ref = useRef<View>(null);
  const entry = suggestion.candidate.ref;
  const title = entry.title || t('food.dashboard.untitledMeal');
  const kcal = Math.round(suggestion.candidate.kcal).toLocaleString(
    i18n.language,
  );
  const macroName: Record<FitMacro, string> = {
    protein: t('identity.fits.macro.protein'),
    carbs: t('identity.fits.macro.carbs'),
    fat: t('identity.fits.macro.fat'),
  };
  const detail = suggestion.focus
    ? t('identity.fits.detail', {
        kcal,
        grams: Math.round(suggestion.focusGrams),
        macro: macroName[suggestion.focus],
      })
    : t('identity.fits.detailKcal', { kcal });
  const after = t('identity.fits.after', {
    kcal: Math.round(suggestion.kcalAfter).toLocaleString(i18n.language),
  });

  return (
    <PressableScale
      preset="subtle"
      haptic={false}
      disabled={disabled}
      onPress={() => {
        const node = ref.current;
        if (!node) return onLog(entry);
        node.measureInWindow((x, y, w, h) =>
          onLog(entry, { x: x + w / 2, y: y + h / 2 }),
        );
      }}
      accessibilityRole="button"
      accessibilityLabel={`${t('identity.fits.log', { name: title })}. ${detail}. ${after}`}
    >
      <View
        className={`min-h-[60px] flex-row items-center gap-3 px-5 py-3 ${
          separator ? 'border-line border-b' : ''
        }`}
      >
        <View className="flex-1 gap-0.5">
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
            style={textStyles.caption}
            maxFontSizeMultiplier={1.4}
          >
            {detail} · {after}
          </Text>
        </View>
        <View ref={ref} collapsable={false}>
          <SymbolView
            name="plus.circle.fill"
            size={26}
            tintColor={themeColor('accent')}
          />
        </View>
      </View>
    </PressableScale>
  );
});

/** "Still fits": up to three regulars that close today's largest macro gap; one tap logs. */
export function FitCard({
  result,
  disabled,
  onLog,
}: {
  result: FitSuggestionsResult;
  disabled: boolean;
  onLog: (entry: QuickLogEntry, from?: QuickPoint) => void;
}) {
  const { t, i18n } = useTranslation();
  if (!result.visible) return null;
  const kcal = Math.round(result.remainingKcal).toLocaleString(i18n.language);
  const grams = Math.round(result.gap?.missingG ?? 0);
  const subtitle =
    result.gap?.macro === 'protein'
      ? t('identity.fits.subtitle.protein', { grams, kcal })
      : result.gap?.macro === 'carbs'
        ? t('identity.fits.subtitle.carbs', { grams, kcal })
        : result.gap?.macro === 'fat'
          ? t('identity.fits.subtitle.fat', { grams, kcal })
          : t('identity.fits.subtitle.none', { kcal });

  return (
    <View className="gap-2">
      <SectionHeader title={t('identity.fits.title')} />
      <Text
        className="text-label-secondary px-1"
        style={textStyles.callout}
        maxFontSizeMultiplier={1.4}
      >
        {subtitle}
      </Text>
      <Card className="gap-0 overflow-hidden p-0">
        {result.suggestions.map((s, i) => (
          <Row
            key={s.candidate.key}
            suggestion={s}
            separator={i < result.suggestions.length - 1}
            disabled={disabled}
            onLog={onLog}
          />
        ))}
      </Card>
    </View>
  );
}
