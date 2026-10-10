import { Host, Toggle } from '@expo/ui/swift-ui';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AppState,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { Chip } from '@/components/ui';
import { SettingsGroup } from '@/features/auth/components/SettingsGroup';
import {
  useMealReminders,
  useNudgeSettings,
  type ReminderPermission,
} from '@/features/notifications';
import { haptic } from '@/lib/haptics';
import { toISODate } from '@/lib/date';
import { themeColor } from '@/theme/colors';

import type { NudgeCategory } from '@/domain';

const CATEGORIES: NudgeCategory[] = [
  'meals',
  'training',
  'reviews',
  'rhythm',
  'weight',
];
const EARLIEST_OPTIONS = [8 * 60, 9 * 60, 10 * 60];
const LATEST_OPTIONS = [20 * 60, 21 * 60, 21 * 60 + 30];
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function fmt(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

function Footnote({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-secondary-label px-1 pt-2 text-xs">{children}</Text>
  );
}

function SwitchRow({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View className="px-4 py-2" style={disabled ? { opacity: 0.5 } : undefined}>
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        <Toggle isOn={value} label={label} onIsOnChange={onChange} />
      </Host>
      {hint ? (
        <Text className="text-secondary-label pb-1 text-xs">{hint}</Text>
      ) : null}
    </View>
  );
}

/** Profile > Notifications (docs/05 §6.3): master switch, categories, quiet mode/hours, meal reminders. */
export default function NotificationSettingsScreen() {
  const { t, i18n } = useTranslation();
  const api = useNudgeSettings();
  const meals = useMealReminders();
  const [permission, setPermission] =
    useState<ReminderPermission>('undetermined');
  const { getPermission } = api;

  const refreshPermission = useCallback(() => {
    void getPermission().then(setPermission);
  }, [getPermission]);
  useEffect(() => {
    refreshPermission();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refreshPermission();
    });
    return () => sub.remove();
  }, [refreshPermission]);

  const today = toISODate();
  const quietActive = api.quietUntil !== null && api.quietUntil >= today;
  const { prefs } = api;
  const off = !api.masterEnabled;
  const quietDaysOf = (days: number) => {
    if (!quietActive) return false;
    const [y, m, d] = today.split('-').map(Number);
    const target = new Date(y, m - 1, d + days);
    return toISODate(target) === api.quietUntil;
  };
  const weekdayName = (wd: number) =>
    // 2023-01-01 was a Sunday
    new Date(2023, 0, 1 + wd).toLocaleDateString(i18n.language, {
      weekday: 'short',
    });
  const quietUntilLabel = quietActive
    ? t('nudges.settings.quietUntil', {
        date: new Date(`${api.quietUntil}T00:00:00`).toLocaleDateString(
          i18n.language,
          { dateStyle: 'medium' },
        ),
      })
    : null;

  async function onMaster(v: boolean) {
    const ok = await api.setMasterEnabled(v);
    if (v && ok) haptic.toggle();
    refreshPermission();
  }
  async function onMeals(v: boolean) {
    await meals.setEnabled(v);
    refreshPermission();
  }

  return (
    <ScrollView
      className="bg-system-background flex-1"
      contentContainerClassName="px-4 pb-12 pt-4"
    >
      <Text className="text-label text-base">
        {t('nudges.settings.explainer')}
      </Text>

      {permission === 'denied' ? (
        <View className="gap-2 pt-4">
          <Text className="text-destructive text-sm">
            {t('nudges.settings.permissionOff')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void Linking.openSettings()}
            className="min-h-11 justify-center"
          >
            <Text className="text-base" style={{ color: themeColor('accent') }}>
              {t('nudges.settings.openSettings')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <SettingsGroup title={t('nudges.settings.sections.general')}>
        <SwitchRow
          label={t('nudges.settings.master')}
          value={api.masterEnabled}
          onChange={(v) => void onMaster(v)}
        />
      </SettingsGroup>
      <Footnote>{t('nudges.settings.masterHint')}</Footnote>

      <SettingsGroup title={t('nudges.settings.sections.categories')}>
        {CATEGORIES.map((c) => (
          <SwitchRow
            key={c}
            label={t(`nudges.categories.${c}`)}
            hint={t(`nudges.settings.categoryHint.${c}`)}
            value={prefs.categories[c]}
            disabled={off}
            onChange={(v) => api.setCategory(c, v)}
          />
        ))}
      </SettingsGroup>

      <SettingsGroup title={t('nudges.settings.sections.timing')}>
        <View className="gap-2 px-4 py-3">
          <Text className="text-label text-base">
            {t('nudges.settings.quietMode')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <Chip
              label={t('nudges.settings.quietOff')}
              selected={!quietActive}
              disabled={off}
              onPress={() => api.setQuietDays(0)}
            />
            {([3, 7, 14] as const).map((d) => (
              <Chip
                key={d}
                label={t(`nudges.settings.quietDays.d${d}`)}
                selected={quietDaysOf(d)}
                disabled={off}
                onPress={() => api.setQuietDays(d)}
              />
            ))}
          </View>
          {quietUntilLabel ? (
            <Text className="text-secondary-label text-xs">
              {quietUntilLabel}
            </Text>
          ) : (
            <Text className="text-secondary-label text-xs">
              {t('nudges.settings.quietModeHint')}
            </Text>
          )}
        </View>
        <View className="gap-2 px-4 py-3">
          <Text className="text-label text-base">
            {t('nudges.settings.quietHours')}
          </Text>
          <Text className="text-secondary-label text-xs">
            {t('nudges.settings.earliest')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {EARLIEST_OPTIONS.map((m) => (
              <Chip
                key={m}
                label={fmt(m)}
                selected={prefs.earliestMinutes === m}
                disabled={off}
                onPress={() => api.setQuietHours(m, prefs.latestMinutes)}
              />
            ))}
          </View>
          <Text className="text-secondary-label text-xs">
            {t('nudges.settings.latest')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {LATEST_OPTIONS.map((m) => (
              <Chip
                key={m}
                label={fmt(m)}
                selected={prefs.latestMinutes === m}
                disabled={off}
                onPress={() => api.setQuietHours(prefs.earliestMinutes, m)}
              />
            ))}
          </View>
          <Text className="text-secondary-label text-xs">
            {t('nudges.settings.quietHoursHint')}
          </Text>
        </View>
        {prefs.categories.weight ? (
          <View className="gap-2 px-4 py-3">
            <Text className="text-label text-base">
              {t('nudges.settings.weighInDay')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {WEEKDAY_ORDER.map((wd) => (
                <Chip
                  key={wd}
                  label={weekdayName(wd)}
                  selected={prefs.weighInWeekday === wd}
                  disabled={off}
                  onPress={() => api.setWeighInWeekday(wd)}
                />
              ))}
            </View>
          </View>
        ) : null}
      </SettingsGroup>

      <SettingsGroup title={t('nudges.settings.sections.reminders')}>
        <SwitchRow
          label={t('nudges.settings.mealReminders')}
          hint={t('nudges.settings.mealRemindersHint')}
          value={meals.enabled}
          onChange={(v) => void onMeals(v)}
        />
      </SettingsGroup>
      <Footnote>{t('nudges.settings.footer')}</Footnote>
    </ScrollView>
  );
}
