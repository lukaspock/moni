import { useTranslation } from 'react-i18next';
import { Text, TextInput } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useOnboardingStore } from '@/features/auth';
import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';
import { useOnboardingNavigation } from '@/features/auth/useOnboardingNavigation';

export default function NameScreen() {
  const { t } = useTranslation();
  const displayName = useOnboardingStore((s) => s.draft.displayName);
  const update = useOnboardingStore((s) => s.update);
  const { goNext } = useOnboardingNavigation('name');

  const trimmed = displayName.trim();

  function submit() {
    update({ displayName: trimmed });
    goNext();
  }

  function skip() {
    update({ displayName: '' });
    goNext();
  }

  return (
    <OnboardingScreen
      title={t('account.onboarding.name.title')}
      subtitle={t('account.onboarding.name.subtitle')}
      continueLabel={t('account.common.continue')}
      continueDisabled={!trimmed}
      onContinue={submit}
      secondaryLabel={t('account.common.skip')}
      onSecondary={skip}
    >
      <TextInput
        value={displayName}
        onChangeText={(text) => update({ displayName: text })}
        placeholder={t('account.onboarding.name.placeholder')}
        autoFocus
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        autoCorrect={false}
        maxLength={40}
        returnKeyType="next"
        enablesReturnKeyAutomatically
        submitBehavior="blurAndSubmit"
        onSubmitEditing={() => trimmed && submit()}
        className="border-line text-label h-16 rounded-2xl border-2 px-5 text-2xl font-semibold"
      />
      {trimmed ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
        >
          <Text className="text-tint text-lg">
            {t('account.onboarding.name.greeting', { name: trimmed })}
          </Text>
        </Animated.View>
      ) : null}
    </OnboardingScreen>
  );
}
