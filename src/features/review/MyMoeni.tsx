import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Host, Toggle } from '@expo/ui/swift-ui';

import { Chip, Pill } from '@/components/ui';
import { shiftIsoDate, type Goal } from '@/domain';
import { SettingsGroup } from '@/features/auth/components/SettingsGroup';
import { useRhythm } from '@/features/rhythm';
import { haptic } from '@/lib/haptics';
import { fixedColors } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

import { stageDescriptions, stageNames } from './copy';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ø';
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

/** Profile head: monogram, name, goal pill, member-since line (docs/02 §6.4). */
export function MyMoeniHeader({
  name,
  goal,
  rateKgPerWeek,
  memberSince,
}: {
  name: string | null;
  goal: Goal | null;
  rateKgPerWeek: number | null;
  memberSince: string | null;
}) {
  const { t } = useTranslation();
  const goalLabel =
    goal === 'lose'
      ? t('account.onboarding.goal.lose')
      : goal === 'gain'
        ? t('account.onboarding.goal.gain')
        : goal === 'maintain'
          ? t('account.onboarding.goal.maintain')
          : null;
  const pill =
    goalLabel == null
      ? null
      : goal !== 'maintain' && rateKgPerWeek
        ? `${goalLabel} · ${t('account.onboarding.rate.perWeek', {
            value: Math.abs(rateKgPerWeek),
          })}`
        : goalLabel;
  const display = name?.trim() ?? '';
  return (
    <View className="items-center gap-2 pb-2 pt-1">
      <View
        accessible
        accessibilityLabel={t('rhythm.profile.avatar', {
          name: display || 'møni',
        })}
        className="bg-tint-soft h-[72px] w-[72px] items-center justify-center rounded-full"
      >
        <Text
          maxFontSizeMultiplier={1.2}
          className="text-tint"
          style={[textStyles.title, { fontSize: 28 }]}
        >
          {initials(display)}
        </Text>
      </View>
      {display ? (
        <Text
          accessibilityRole="header"
          className="text-label"
          style={textStyles.title}
        >
          {display}
        </Text>
      ) : null}
      {pill ? <Pill label={pill} tone="accent" /> : null}
      {memberSince ? (
        <Text className="text-label-secondary" style={textStyles.caption}>
          {t('rhythm.profile.memberSince', { date: memberSince })}
        </Text>
      ) : null}
    </View>
  );
}

/** Stage with progress to the next stage, rhythm counter and best run. */
export function StageCard() {
  const { t } = useTranslation();
  const { stage, state, showRhythm, isReady } = useRhythm();
  if (!isReady) return null;
  const names = stageNames(t);
  const descs = stageDescriptions(t);
  const percent = Math.round(stage.progress * 100);
  return (
    <View
      accessible
      accessibilityLabel={`${names[stage.stage.key]}. ${
        stage.next
          ? t('rhythm.profile.stageProgressA11y', { percent })
          : t('rhythm.stage.top')
      }`}
      className="bg-surface gap-3 rounded-3xl p-5"
      style={{ borderCurve: 'continuous' }}
    >
      <View className="flex-row items-baseline justify-between">
        <Text className="text-label-secondary" style={textStyles.overline}>
          {t('rhythm.stage.title')}
        </Text>
        {showRhythm ? (
          <Text className="text-label-secondary" style={textStyles.caption}>
            {t('rhythm.counter', { count: state.current })}
          </Text>
        ) : null}
      </View>
      <Text className="text-label" style={textStyles.title}>
        {names[stage.stage.key]}
      </Text>
      <Text className="text-label-secondary" style={textStyles.callout}>
        {descs[stage.stage.key]}
      </Text>
      <View
        className="bg-surface-raised h-2 overflow-hidden rounded-full"
        accessible={false}
      >
        <View
          className="bg-tint h-2 rounded-full"
          style={{ width: `${Math.max(4, percent)}%` }}
        />
      </View>
      <Text className="text-label-secondary" style={textStyles.caption}>
        {stage.next && stage.weeksToNext != null
          ? t('rhythm.stage.toNext', {
              count: stage.weeksToNext,
              next: names[stage.next.key],
            })
          : t('rhythm.stage.top')}
      </Text>
      {showRhythm && state.best > 0 ? (
        <Text className="text-label-secondary" style={textStyles.caption}>
          {t('rhythm.best', { count: state.best })}
        </Text>
      ) : null}
    </View>
  );
}

const PAUSE_LENGTHS = [3, 7, 14, 21] as const;

/** Rhythm settings: display switch, grace tokens, pause mode. */
export function RhythmSettingsGroup() {
  const { t, i18n } = useTranslation();
  const r = useRhythm();
  const [length, setLength] = useState<number>(7);
  const [note, setNote] = useState<string | null>(null);
  const active = r.pauses.find((p) => r.today >= p.from && r.today <= p.to);
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(i18n.language, {
      day: 'numeric',
      month: 'short',
    });

  function startPause() {
    const res = r.addPause({
      from: r.today,
      to: shiftIsoDate(r.today, length - 1),
    });
    haptic.tap();
    setNote(
      res.added == null || res.limited
        ? t('rhythm.pause.maxLength')
        : t('rhythm.pause.saved'),
    );
  }

  return (
    <SettingsGroup title={t('rhythm.profile.sections.rhythm')}>
      <View className="gap-1 px-4 py-2">
        <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
          <Toggle
            isOn={r.showRhythm}
            label={t('rhythm.hideSetting')}
            onIsOnChange={(v) => {
              haptic.toggle();
              r.setShowRhythm(v);
            }}
          />
        </Host>
        <Text className="text-label-secondary" style={textStyles.caption}>
          {t('rhythm.hideSettingHint')}
        </Text>
      </View>
      <View className="gap-1 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-label" style={textStyles.body}>
            {t('rhythm.grace.title')}
          </Text>
          <Text className="text-label-secondary" style={textStyles.body}>
            {t('rhythm.profile.graceValue', { count: r.state.graceTokens })}
          </Text>
        </View>
        <Text className="text-label-secondary" style={textStyles.caption}>
          {t('rhythm.grace.explainer')}
        </Text>
      </View>
      <View className="gap-3 px-4 py-3">
        <Text className="text-label" style={textStyles.body}>
          {t('rhythm.pause.title')}
        </Text>
        {active ? (
          <>
            <Text className="text-label-secondary" style={textStyles.callout}>
              {t('rhythm.pause.activeUntil', { date: fmt(active.to) })}
            </Text>
            <Text className="text-label-secondary" style={textStyles.caption}>
              {t('rhythm.pause.active')}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                haptic.tapLight();
                r.removePause({ from: r.today, to: active.to });
                setNote(null);
              }}
              className="min-h-11 justify-center"
            >
              <Text className="text-tint" style={textStyles.button}>
                {t('rhythm.profile.pauseEnd')}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text className="text-label-secondary" style={textStyles.callout}>
              {t('rhythm.pause.intro')}
            </Text>
            <Text className="text-label-secondary" style={textStyles.overline}>
              {t('rhythm.profile.pauseLength')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {PAUSE_LENGTHS.map((n) => (
                <Chip
                  key={n}
                  label={t('rhythm.pause.days', { count: n })}
                  selected={n === length}
                  onPress={() => {
                    haptic.select();
                    setLength(n);
                  }}
                />
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={startPause}
              className="min-h-11 items-center justify-center rounded-full"
              style={{ backgroundColor: fixedColors.lime }}
            >
              <Text style={[textStyles.button, { color: fixedColors.ink }]}>
                {t('rhythm.pause.start')}
              </Text>
            </Pressable>
            <Text className="text-label-secondary" style={textStyles.caption}>
              {t('rhythm.pause.retroactive')}
            </Text>
          </>
        )}
        {note ? (
          <Text className="text-label-secondary" style={textStyles.caption}>
            {note}
          </Text>
        ) : null}
      </View>
    </SettingsGroup>
  );
}
