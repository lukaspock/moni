import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { ListRow } from '@/components/ui';
import { cmToFeetInches } from '@/domain';
import { PersonalSection } from '@/features/auth/components/PersonalSection';
import { SettingsGroup } from '@/features/auth/components/SettingsGroup';
import { useProfile } from '@/features/targets';
import { textStyles } from '@/theme/typography';

/** Body & data: personal onboarding answers (name, motivation, diet, experience) and body values. */
export default function ProfileBodyScreen() {
  const { t } = useTranslation();
  const { profile, isLoading } = useProfile();

  if (isLoading || !profile) {
    return (
      <View className="bg-bg flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  const isImperial = profile.unit_system === 'imperial';
  const height = !profile.height_cm
    ? '—'
    : isImperial
      ? `${cmToFeetInches(profile.height_cm).feet}' ${cmToFeetInches(profile.height_cm).inches}"`
      : `${profile.height_cm} cm`;

  return (
    <ScrollView
      className="bg-bg flex-1"
      contentContainerClassName="px-4 pb-12 pt-1"
      keyboardShouldPersistTaps="handled"
    >
      <PersonalSection key={profile.id} profile={profile} />

      <SettingsGroup title={t('account.profile.sections.body')}>
        <View className="min-h-12 flex-row items-center justify-between px-4 py-3">
          <Text className="text-label" style={textStyles.body}>
            {t('account.profile.height')}
          </Text>
          <Text className="text-label-secondary" style={textStyles.body}>
            {height}
          </Text>
        </View>
        <ListRow
          title={t('account.profile.logWeight')}
          symbol="scalemass.fill"
          onPress={() => router.push('/insights/weight-entry')}
        />
      </SettingsGroup>
    </ScrollView>
  );
}
