import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { Card, ListRow, ScreenTitle } from '@/components/ui';
import type { Goal } from '@/domain';
import { useAchievements, useRhythm } from '@/features/rhythm';
import { ProfileIdentityCard } from '@/features/review';
import { useProfile } from '@/features/targets';
import { textStyles } from '@/theme/typography';

/** Short text hint on the right of a navigation row (before the chevron). */
function RowHint({ label }: { label: string }) {
  return (
    <Text
      maxFontSizeMultiplier={1.4}
      numberOfLines={1}
      className="text-label-secondary max-w-[45%]"
      style={textStyles.callout}
    >
      {label}
    </Text>
  );
}

/**
 * Profile tab root: one identity card + a short list of navigation rows into
 * focused sub-screens (iOS-Settings-like). No inline editors here — pickers,
 * sliders and toggles live in `goals`, `body`, `rhythm` and `settings`.
 */
export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { profile, isLoading } = useProfile();
  const achievements = useAchievements();
  const rhythm = useRhythm();

  if (isLoading || !profile) {
    return (
      <View className="bg-bg flex-1">
        <ScreenTitle title={t('profile.title')} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <Text className="text-label-secondary mt-3" style={textStyles.body}>
            {t('account.profile.loading')}
          </Text>
        </View>
      </View>
    );
  }

  const goal = (profile.goal ?? null) as Goal | null;
  const goalLabel =
    goal === 'lose'
      ? t('account.onboarding.goal.lose')
      : goal === 'gain'
        ? t('account.onboarding.goal.gain')
        : goal === 'maintain'
          ? t('account.onboarding.goal.maintain')
          : null;
  const pauseActive = rhythm.pauses.some(
    (p) => rhythm.today >= p.from && rhythm.today <= p.to,
  );

  return (
    <View className="bg-bg flex-1">
      <ScreenTitle title={t('profile.title')} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-4 pb-12 pt-4"
      >
        <ProfileIdentityCard
          name={profile.display_name}
          goal={goal}
          rateKgPerWeek={profile.goal_rate_kg_per_week ?? null}
          memberSince={
            profile.created_at
              ? new Date(profile.created_at).toLocaleDateString(i18n.language, {
                  month: 'long',
                  year: 'numeric',
                })
              : null
          }
        />

        <Card className="gap-0 overflow-hidden p-0">
          <ListRow
            title={t('account.profile.rows.goals')}
            symbol="target"
            trailing={goalLabel ? <RowHint label={goalLabel} /> : undefined}
            onPress={() => router.push('/profile/goals')}
            separator
          />
          <ListRow
            title={t('account.profile.rows.body')}
            symbol="figure.stand"
            onPress={() => router.push('/profile/body')}
          />
        </Card>

        <Card className="gap-0 overflow-hidden p-0">
          <ListRow
            title={t('rhythm.title')}
            symbol="metronome"
            trailing={
              pauseActive ? (
                <RowHint label={t('rhythm.pause.title')} />
              ) : undefined
            }
            onPress={() => router.push('/profile/rhythm')}
            separator
          />
          <ListRow
            title={t('rhythm.profile.achievementsRow')}
            symbol="seal.fill"
            trailing={
              achievements.isReady ? (
                <RowHint
                  label={t('achievements.shelf.count', {
                    unlocked: achievements.unlockedCount,
                    total: achievements.total,
                  })}
                />
              ) : undefined
            }
            onPress={() => router.push('/profile/achievements')}
          />
        </Card>

        <Card className="gap-0 overflow-hidden p-0">
          <ListRow
            title={t('account.profile.rows.settings')}
            symbol="gearshape.fill"
            iconTone="neutral"
            onPress={() => router.push('/profile/settings')}
          />
        </Card>
      </ScrollView>
    </View>
  );
}
