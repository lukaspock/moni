import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';

import { useHealthAutoSync } from '@/features/health';
import { useRecomputeTargetsIfDue } from '@/features/targets';
import { themeColor } from '@/theme/colors';

export default function TabsLayout() {
  const { t } = useTranslation();
  // Apple Health import on mount + foreground (throttled; no-op unless enabled & signed in).
  useHealthAutoSync();
  useRecomputeTargetsIfDue();

  return (
    <NativeTabs tintColor={themeColor('accent')}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t('tabs.today')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'sun.max', selected: 'sun.max.fill' }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="training">
        <NativeTabs.Trigger.Label>
          {t('tabs.training')}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'dumbbell', selected: 'dumbbell.fill' }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="insights">
        <NativeTabs.Trigger.Label>
          {t('tabs.insights')}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.line.uptrend.xyaxis" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>{t('tabs.profile')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{
            default: 'person.crop.circle',
            selected: 'person.crop.circle.fill',
          }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
