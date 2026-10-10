import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Illustration } from '@/components/brand';
import { Card, ListRow, SectionHeader } from '@/components/ui';
import { useThemeHex } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

import type { StartStep } from './model';

/** First-run: calm invitation + the three-step start list (hidden once done / after 7 days). */
export function FirstRunCard({
  steps,
  showSteps,
}: {
  steps: StartStep[];
  showSteps: boolean;
}) {
  const { t } = useTranslation();
  const accent = useThemeHex('accent');
  const tertiary = useThemeHex('labelTertiary');
  const label: Record<StartStep['id'], string> = {
    meal: t('identity.today.startMeal'),
    weight: t('identity.today.startWeight'),
    training: t('identity.today.startTraining'),
  };
  return (
    <View className="gap-4">
      <Card className="items-center gap-3">
        <Illustration name="emptyMeals" size={170} />
        <Text
          className="text-label text-center"
          style={textStyles.title}
          maxFontSizeMultiplier={1.3}
        >
          {t('identity.empty.firstRunTitle')}
        </Text>
        <Text
          className="text-label-secondary text-center"
          style={textStyles.callout}
          maxFontSizeMultiplier={1.4}
        >
          {t('identity.empty.firstRunBody')}
        </Text>
      </Card>
      {showSteps ? (
        <View className="gap-2">
          <SectionHeader title={t('identity.today.startTitle')} />
          <Card className="gap-0 overflow-hidden p-0">
            {steps.map((s, i) => (
              <ListRow
                key={s.id}
                title={label[s.id]}
                accessibilityLabel={`${label[s.id]}, ${
                  s.done
                    ? t('identity.today.stepDone')
                    : t('identity.today.stepOpen')
                }`}
                trailing={
                  <SymbolView
                    name={s.done ? 'checkmark.circle.fill' : 'circle'}
                    size={22}
                    tintColor={s.done ? accent : tertiary}
                  />
                }
                separator={i < steps.length - 1}
              />
            ))}
          </Card>
        </View>
      ) : null}
    </View>
  );
}
