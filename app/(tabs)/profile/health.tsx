import { Host, Toggle } from '@expo/ui/swift-ui';
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
import { GlassActionButton } from '@/components/ui';
import { SettingsGroup } from '@/features/auth/components/SettingsGroup';
import { textStyles } from '@/theme/typography';
import { haptic } from '@/lib/haptics';
import { themeColor } from '@/theme/colors';

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
      haptic.aiDone();
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
        className="bg-bg flex-1"
        contentContainerClassName="px-4 pb-12 pt-4"
      >
        <Text className="text-label" style={textStyles.body}>
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
      className="bg-bg flex-1"
      contentContainerClassName="px-4 pb-12 pt-4"
    >
      <Text className="text-label" style={textStyles.body}>
        {t('health.settings.intro')}
      </Text>

      {!enabled ? (
        <View className="pt-5">
          <GlassActionButton
            label={t('health.settings.connect')}
            symbol="heart.fill"
            onPress={() => {
              if (!requesting) void handleConnect();
            }}
          />
        </View>
      ) : null}
      {authResult === 'denied' || authResult === 'unavailable' ? (
        <Text className="text-destructive pt-3 text-sm">
          {authResult === 'unavailable'
            ? t('health.settings.unavailable')
            : t('health.settings.denied')}
        </Text>
      ) : null}

      <SettingsGroup title={t('health.settings.sections.sync')}>
        <View className="px-4 py-2">
          <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
            <Toggle
              isOn={enabled}
              label={t('health.settings.enabled')}
              onIsOnChange={(v) => void handleToggleEnabled(v)}
            />
          </Host>
        </View>
        <View className="px-4 py-2">
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
          className="min-h-12 flex-row items-center justify-between px-4 py-3"
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
      </SettingsGroup>
      <Footnote>{lastSyncedLabel}</Footnote>
      <Footnote>{t('health.settings.writeNutritionHint')}</Footnote>

      <SettingsGroup title={t('health.settings.sections.data')}>
        <View className="gap-2 px-4 py-3">
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
            className="min-h-12 justify-center px-4 py-3"
          >
            <Text className="text-base" style={{ color: themeColor('accent') }}>
              {t('health.settings.reconnect')}
            </Text>
          </Pressable>
        ) : null}
      </SettingsGroup>
      <Footnote>{t('health.settings.permissionsHint')}</Footnote>
    </ScrollView>
  );
}
