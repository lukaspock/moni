import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { MacroMarker, type MacroKind } from '@/components/ui';

export interface MacroLineProps {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** P / K / F with the letter marker; color is never the only carrier. */
export function MacroLine({ proteinG, carbsG, fatG }: MacroLineProps) {
  const { t } = useTranslation();
  const cells: { kind: MacroKind; letter: string; name: string; g: number }[] =
    [
      {
        kind: 'protein',
        letter: t('food.macroLetter.protein'),
        name: t('food.dashboard.protein'),
        g: proteinG,
      },
      {
        kind: 'carbs',
        letter: t('food.macroLetter.carbs'),
        name: t('food.dashboard.carbs'),
        g: carbsG,
      },
      {
        kind: 'fat',
        letter: t('food.macroLetter.fat'),
        name: t('food.dashboard.fat'),
        g: fatG,
      },
    ];
  return (
    <View className="flex-row gap-5">
      {cells.map((c) => (
        <View
          key={c.kind}
          className="flex-row items-center gap-1.5"
          accessible
          accessibilityLabel={t('food.review.macroA11y', {
            name: c.name,
            value: Math.round(c.g),
          })}
        >
          <MacroMarker kind={c.kind} letter={c.letter} />
          <Text
            className="text-label font-display"
            maxFontSizeMultiplier={1.3}
            style={{ fontSize: 17, fontVariant: ['tabular-nums'] }}
          >
            {Math.round(c.g)}
            <Text className="text-label-secondary text-[13px]"> g</Text>
          </Text>
        </View>
      ))}
    </View>
  );
}
