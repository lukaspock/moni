import { Host, Picker, Toggle, Text as UIText } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';

import { ListRow } from '@/components/ui';
import type { UnitSystem } from '@/domain';
import { signOut } from '@/features/auth';
import { SettingsGroup } from '@/features/auth/components/SettingsGroup';
import { useUpdateProfile } from '@/features/auth/components/useUpdateProfile';
import { useHealthSettings } from '@/features/health';
import { useMealReminders, useNudgeSettings } from '@/features/notifications';
import { useProfile } from '@/features/targets';
import { useHapticsSetting } from '@/lib/haptics';
import { fallbackLanguage, supportedLanguages } from '@/i18n';
import { textStyles } from '@/theme/typography';

/** Settings: units, language, haptics, notifications, Apple Health, sign out. */
export default function ProfileSettingsScreen() {
  const { t, i18n } = useTranslation();
  const { profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { enabled: healthEnabled } = useHealthSettings();
  const { enabled: hapticsOn, setEnabled: setHapticsOn } = useHapticsSetting();

  function handleSignOut() {
    Alert.alert(
      t('account.profile.signOutConfirmTitle'),
      t('account.profile.signOutConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('account.profile.signOut'),
          style: 'destructive',
          onPress: () => void signOut(),
        },
      ],
    );
  }

  if (isLoading || !profile) {
    return (
      <View className="bg-bg flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      className="bg-bg flex-1"
      contentContainerClassName="px-4 pb-32 pt-1"
    >
      <SettingsGroup title={t('account.profile.sections.general')}>
        <View className="gap-2 px-4 py-3">
          <Text className="text-label-secondary" style={textStyles.caption}>
            {t('account.profile.unitSystem')}
          </Text>
          <Host matchContents>
            <Picker
              selection={profile.unit_system}
              onSelectionChange={(v) =>
                updateProfile({ unit_system: v as UnitSystem })
              }
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
        </View>
        <View className="gap-2 px-4 py-3">
          <Text className="text-label-secondary" style={textStyles.caption}>
            {t('account.profile.language')}
          </Text>
          <Host matchContents>
            <Picker
              selection={profile.locale ?? fallbackLanguage}
              onSelectionChange={(v) => {
                void i18n.changeLanguage(v);
                void updateProfile({ locale: v });
              }}
              modifiers={[pickerStyle('segmented')]}
            >
              {supportedLanguages.map((lang) => (
                <UIText key={lang} modifiers={[tag(lang)]}>
                  {lang.toUpperCase()}
                </UIText>
              ))}
            </Picker>
          </Host>
        </View>
      </SettingsGroup>

      <SettingsGroup title={t('rhythm.profile.sections.app')}>
        <View className="gap-1 px-4 py-2">
          <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
            <Toggle
              isOn={hapticsOn}
              label={t('rhythm.profile.hapticsTitle')}
              onIsOnChange={(v) => setHapticsOn(v)}
            />
          </Host>
          <Text className="text-label-secondary" style={textStyles.caption}>
            {t('rhythm.profile.hapticsHint')}
          </Text>
        </View>
        <NotificationsRow />
        <ListRow
          title={t('health.settings.rowLabel')}
          symbol="heart.fill"
          iconTone="danger"
          trailing={
            <Text className="text-label-secondary" style={textStyles.callout}>
              {healthEnabled
                ? t('health.settings.statusOn')
                : t('health.settings.statusOff')}
            </Text>
          }
          onPress={() => router.push('/profile/health')}
        />
      </SettingsGroup>

      <SettingsGroup title={t('account.profile.sections.account')}>
        <ListRow
          title={t('account.profile.signOut')}
          symbol="rectangle.portrait.and.arrow.right"
          iconTone="neutral"
          destructive
          chevron={false}
          onPress={handleSignOut}
        />
      </SettingsGroup>
    </ScrollView>
  );
}

/** Row into the notifications screen with an on/off hint (nudges or meal reminders). */
function NotificationsRow() {
  const { t } = useTranslation();
  const nudges = useNudgeSettings();
  const meals = useMealReminders();
  const on = nudges.masterEnabled || meals.enabled;
  return (
    <ListRow
      title={t('rhythm.profile.notificationsRow')}
      symbol="bell.fill"
      trailing={
        <Text className="text-label-secondary" style={textStyles.callout}>
          {on ? t('account.profile.statusOn') : t('account.profile.statusOff')}
        </Text>
      }
      onPress={() => router.push('/profile/notifications')}
    />
  );
}
