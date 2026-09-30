import { Host, Picker, Text as UIText } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, View } from 'react-native';

import {
  cmToFeetInches,
  feetInchesToCm,
  isPlausibleHeightCm,
  isPlausibleWeightKg,
  kgToLb,
  lbToKg,
  roundTo,
  type UnitSystem,
} from '@/domain';
import { useOnboardingStore } from '@/features/auth';
import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';
import { useOnboardingNavigation } from '@/features/auth/useOnboardingNavigation';

export default function BodyScreen() {
  const { t } = useTranslation();
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const { goNext } = useOnboardingNavigation('body');

  const [heightImperialText, setHeightImperialText] = useState(() => {
    if (!draft.heightCm) return { feet: '', inches: '' };
    const fi = cmToFeetInches(draft.heightCm);
    return { feet: String(fi.feet), inches: String(fi.inches) };
  });
  const [weightImperialText, setWeightImperialText] = useState(() =>
    draft.weightKg ? String(roundTo(kgToLb(draft.weightKg), 1)) : '',
  );

  const isImperial = draft.unitSystem === 'imperial';

  // The imperial fields are local text state (so feet/inches can be edited
  // as two separate boxes), which otherwise goes stale the moment the user
  // switches units after already entering metric values — resync from the
  // draft right when the toggle switches to imperial (a plain event handler,
  // not an effect, so this is a legitimate direct setState rather than one
  // that fights React's render cycle).
  function setUnitSystem(unitSystem: UnitSystem) {
    update({ unitSystem });
    if (unitSystem === 'imperial') {
      setHeightImperialText(
        draft.heightCm
          ? (() => {
              const fi = cmToFeetInches(draft.heightCm);
              return { feet: String(fi.feet), inches: String(fi.inches) };
            })()
          : { feet: '', inches: '' },
      );
      setWeightImperialText(
        draft.weightKg ? String(roundTo(kgToLb(draft.weightKg), 1)) : '',
      );
    }
  }

  function onHeightCmChange(text: string) {
    const value = Number(text.replace(',', '.'));
    update({
      heightCm: text.trim() === '' || Number.isNaN(value) ? null : value,
    });
  }

  function onHeightImperialChange(feetText: string, inchesText: string) {
    setHeightImperialText({ feet: feetText, inches: inchesText });
    const feet = Number(feetText);
    const inches = Number(inchesText || '0');
    if (feetText.trim() === '' || Number.isNaN(feet) || Number.isNaN(inches)) {
      update({ heightCm: null });
      return;
    }
    update({ heightCm: roundTo(feetInchesToCm(feet, inches), 1) });
  }

  function onWeightKgChange(text: string) {
    const value = Number(text.replace(',', '.'));
    update({
      weightKg: text.trim() === '' || Number.isNaN(value) ? null : value,
    });
  }

  function onWeightImperialChange(text: string) {
    setWeightImperialText(text);
    const lb = Number(text.replace(',', '.'));
    update({
      weightKg:
        text.trim() === '' || Number.isNaN(lb) ? null : roundTo(lbToKg(lb), 1),
    });
  }

  return (
    <OnboardingScreen
      title={t('account.onboarding.body.title')}
      subtitle={t('account.onboarding.body.subtitle')}
      continueLabel={t('account.common.continue')}
      continueDisabled={
        !isPlausibleHeightCm(draft.heightCm) ||
        !isPlausibleWeightKg(draft.weightKg)
      }
      onContinue={() => goNext()}
    >
      <Host matchContents>
        <Picker
          selection={draft.unitSystem}
          onSelectionChange={(v) => setUnitSystem(v as UnitSystem)}
          modifiers={[pickerStyle('segmented')]}
        >
          <UIText modifiers={[tag('metric')]}>
            {t('account.onboarding.body.unitMetric')}
          </UIText>
          <UIText modifiers={[tag('imperial')]}>
            {t('account.onboarding.body.unitImperial')}
          </UIText>
        </Picker>
      </Host>

      <View className="gap-2">
        <Text className="text-secondary-label text-sm font-medium">
          {t('account.onboarding.body.heightLabel')}
        </Text>
        {isImperial ? (
          <View className="flex-row gap-3">
            <TextInput
              value={heightImperialText.feet}
              onChangeText={(txt) =>
                onHeightImperialChange(txt, heightImperialText.inches)
              }
              keyboardType="number-pad"
              placeholder="ft"
              className="border-separator text-label h-14 flex-1 rounded-xl border px-4 text-lg"
            />
            <TextInput
              value={heightImperialText.inches}
              onChangeText={(txt) =>
                onHeightImperialChange(heightImperialText.feet, txt)
              }
              keyboardType="number-pad"
              placeholder="in"
              className="border-separator text-label h-14 flex-1 rounded-xl border px-4 text-lg"
            />
          </View>
        ) : (
          <TextInput
            value={draft.heightCm != null ? String(draft.heightCm) : ''}
            onChangeText={onHeightCmChange}
            keyboardType="decimal-pad"
            placeholder="cm"
            className="border-separator text-label h-14 rounded-xl border px-4 text-lg"
          />
        )}
      </View>

      <View className="gap-2">
        <Text className="text-secondary-label text-sm font-medium">
          {t('account.onboarding.body.weightLabel')}
        </Text>
        <TextInput
          value={
            isImperial
              ? weightImperialText
              : draft.weightKg != null
                ? String(draft.weightKg)
                : ''
          }
          onChangeText={isImperial ? onWeightImperialChange : onWeightKgChange}
          keyboardType="decimal-pad"
          placeholder={isImperial ? 'lb' : 'kg'}
          className="border-separator text-label h-14 rounded-xl border px-4 text-lg"
        />
      </View>
    </OnboardingScreen>
  );
}
