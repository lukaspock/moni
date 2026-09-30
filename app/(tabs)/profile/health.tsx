import { Host, Toggle } from '@expo/ui/swift-ui';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import {
  isHealthAvailable,
  requestHealthAuthorization,
  useHealthSettings,
  useHealthSync,
  type HealthAuthorizationResult,
} from '@/features/health';
import { themeColor } from '@/theme/colors';

function SectionHeader({ label }: { label: string }) {
  return (
    <Text className="text-secondary-label px-1 pb-1 pt-5 text-sm font-semibold uppercase">
      {label}
    </Text>
  );
}

function SectionBody({ children }: { children: React.ReactNode }) {
  return (
    <View className="bg-secondary-system-background gap-px overflow-hidden rounded-xl">
      {children}
    </View>
  );
}

function Footnote({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-secondary-label px-1 pt-2 text-xs">{children}</Text>
  );
}

/** Apple Health settings (PLAN §7.5): connect, enable, nutrition write-back, manual sync. */
export default function HealthSettingsScreen() {
  const { t, i18n } = useTranslation();
  const { enabled, writeNutrition, setEnabled, setWriteNutrition } =
    useHealthSettings();
  const { syncNow, isSyncing, lastSyncedAt } = useHealthSync();
  const [available] = useState(() => isHealthAvailable());
  const [authResult, setAuthResult] =
    useState<HealthAuthorizationResult | null>(null);
  const [requesting, setRequesting] = useState(false);

  async function handleConnect() {
    setRequesting(true);
    const result = await requestHealthAuthorization();
    setRequesting(false);
    setAuthResult(result);
    if (result === 'granted') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEnabled(true); // useHealthAutoSync picks this up and runs the first import
    }
  }

  async function handleToggleEnabled(next: boolean) {
    if (next) {
      // Turning it on always goes through the permission sheet (HealthKit only
      // shows it for types not asked about yet, so this is cheap afterwards).
      await handleConnect();
      return;
    }
    setEnabled(false);
  }

  const lastSyncedLabel = lastSyncedAt
    ? t('health.settings.lastSynced', {
        time: new Date(lastSyncedAt).toLocaleString(i18n.language, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
      })
    : t('health.settings.neverSynced');

  if (!available) {
    return (
      <ScrollView
        className="bg-system-background flex-1"
        contentContainerClassName="px-4 pb-12 pt-4"
      >
        <Text className="text-label text-base">
          {t('health.settings.intro')}
        </Text>
        <Text className="text-secondary-label pt-4 text-base">
          {t('health.settings.unavailable')}
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="bg-system-background flex-1"
      contentContainerClassName="px-4 pb-12 pt-4"
    >
      <Text className="text-label text-base">{t('health.settings.intro')}</Text>

      {!enabled ? (
        <Pressable
          accessibilityRole="button"
          disabled={requesting}
          onPress={handleConnect}
          className={`bg-tint mt-5 h-14 flex-row items-center justify-center rounded-full ${requesting ? 'opacity-40' : ''}`}
        >
          {requesting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-lg font-semibold text-white">
              {t('health.settings.connect')}
            </Text>
          )}
        </Pressable>
      ) : null}
      {authResult === 'denied' || authResult === 'unavailable' ? (
        <Text className="text-destructive pt-3 text-sm">
          {authResult === 'unavailable'
            ? t('health.settings.unavailable')
            : t('health.settings.denied')}
        </Text>
      ) : null}

      <SectionHeader label={t('health.settings.sections.sync')} />
      <SectionBody>
        <View className="bg-secondary-system-background px-4 py-2">
          <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
            <Toggle
              isOn={enabled}
              label={t('health.settings.enabled')}
              onIsOnChange={(v) => void handleToggleEnabled(v)}
            />
          </Host>
        </View>
        <View className="bg-secondary-system-background px-4 py-2">
          <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
            <Toggle
              isOn={writeNutrition}
              label={t('health.settings.writeNutrition')}
              onIsOnChange={(v) => setWriteNutrition(v)}
            />
          </Host>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={!enabled || isSyncing}
          onPress={() => void syncNow()}
          className="bg-secondary-system-background min-h-12 flex-row items-center justify-between px-4 py-3"
        >
          <Text
            className={enabled ? 'text-base' : 'text-secondary-label text-base'}
            style={enabled ? { color: themeColor('accent') } : undefined}
          >
            {isSyncing
              ? t('health.settings.syncing')
              : t('health.settings.syncNow')}
          </Text>
          {isSyncing ? <ActivityIndicator /> : null}
        </Pressable>
      </SectionBody>
      <Footnote>{lastSyncedLabel}</Footnote>
      <Footnote>{t('health.settings.writeNutritionHint')}</Footnote>

      <SectionHeader label={t('health.settings.sections.data')} />
      <SectionBody>
        <View className="bg-secondary-system-background gap-2 px-4 py-3">
          <Text className="text-label text-sm">
            {t('health.settings.reads')}
          </Text>
          <Text className="text-label text-sm">
            {t('health.settings.writes')}
          </Text>
          <Text className="text-secondary-label text-sm">
            {t('health.settings.bonusHint')}
          </Text>
        </View>
        {enabled ? (
          <Pressable
            accessibilityRole="button"
            disabled={requesting}
            onPress={handleConnect}
            className="bg-secondary-system-background min-h-12 justify-center px-4 py-3"
          >
            <Text className="text-base" style={{ color: themeColor('accent') }}>
              {t('health.settings.reconnect')}
            </Text>
          </Pressable>
        ) : null}
      </SectionBody>
      <Footnote>{t('health.settings.permissionsHint')}</Footnote>
    </ScrollView>
  );
}
