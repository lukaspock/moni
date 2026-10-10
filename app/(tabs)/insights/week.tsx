import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Card, GlassActionButton } from '@/components/ui';
import { buildShareCardModel, type WeekShareSource } from '@/domain';
import { useWeightInput } from '@/features/insights';
import {
  useAchievements,
  useLedger,
  useRhythm,
  useWeekTally,
  useWeeklyReview,
} from '@/features/rhythm';
import {
  DayGlyphIcon,
  StoryCard,
  buildShareText,
  stageNames,
  weekTitles,
} from '@/features/review';
import { useProfile } from '@/features/targets';
import { exerciseDisplayName, useExerciseCatalog } from '@/features/workout';
import { haptic } from '@/lib/haptics';
import { storage } from '@/lib/storage';
import { fixedColors } from '@/theme/colors';
import { textStyles } from '@/theme/typography';
import { useReduceMotion } from '@/lib/motionPrefs';

const SHARE_PREF_KEY = 'review:sharePrefs';

function readPrefs(): { showName: boolean; showDetails: boolean } {
  try {
    const raw = storage.getString(SHARE_PREF_KEY);
    if (raw) return { showName: false, showDetails: false, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return { showName: false, showDetails: false };
}

/** "Gezeitentafel": full-screen story cards for one week (docs/05 §4.4). */
export default function WeekReviewScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ weekStart?: string }>();
  const { review, weekStart, isReady } = useWeeklyReview(params.weekStart);
  const tally = useWeekTally(weekStart);
  const ledger = useLedger();
  const rhythm = useRhythm();
  const achievements = useAchievements();
  const { profile } = useProfile();
  const { exercises } = useExerciseCatalog();
  const { isImperial, toDisplay, unitLabelKey } = useWeightInput();
  const reduceMotion = useReduceMotion();
  const [index, setIndex] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [prefs, setPrefs] = useState(readPrefs);

  const cards = review?.cards ?? [];
  const last = cards.length - 1;
  const unit = t(unitLabelKey);
  const locale = i18n.language;

  useEffect(() => {
    if (cards.length > 0 && index === last) {
      achievements.recordReviewViewed(weekStart);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, last, weekStart, cards.length]);

  const fmtDay = (iso: string, style: 'long' | 'narrow') =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(locale, { weekday: style });

  const ctx = useMemo(
    () => ({
      exerciseName: (id: string) => {
        const ex = exercises.find((e) => e.id === id);
        return ex
          ? exerciseDisplayName(ex, t)
          : t('insights.strength.exerciseFallback');
      },
      toDisplay,
      unit,
      showRhythm: rhythm.showRhythm,
      dayLabel: (iso: string) => fmtDay(iso, 'long'),
      weekdayInitial: (iso: string) => fmtDay(iso, 'narrow'),
      onSetTrainingGoal: rhythm.setGoalOverrides,
      weekStart,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      exercises,
      isImperial,
      unit,
      rhythm.showRhythm,
      rhythm.setGoalOverrides,
      weekStart,
      locale,
      t,
    ],
  );

  const intro = cards.find((c) => c.kind === 'intro');
  const rhythmCard = cards.find((c) => c.kind === 'rhythm');
  const weekCard = cards.find((c) => c.kind === 'week');
  const bodyCard = cards.find((c) => c.kind === 'body');
  const sharable = !!intro && !!weekCard && !rhythm.careFlagged;

  const shareText = useMemo(() => {
    if (
      !intro ||
      intro.kind !== 'intro' ||
      !weekCard ||
      weekCard.kind !== 'week'
    ) {
      return null;
    }
    const weekDays = ledger.days.filter((d) => weekCard.dates.includes(d.date));
    const proteinLogged = weekDays.filter((d) => d.proteinG > 0);
    const source: WeekShareSource = {
      name: profile?.display_name ?? null,
      weekStart,
      titleKey: intro.titleKey,
      days: weekCard.glyphs,
      foodDays: weekCard.foodDays,
      trainingDays: weekCard.trainingDays,
      proteinDays: tally.rings.protein.done,
      avgProteinG:
        proteinLogged.length > 0
          ? proteinLogged.reduce((s, d) => s + d.proteinG, 0) /
            proteinLogged.length
          : null,
      rhythm:
        rhythmCard && rhythmCard.kind === 'rhythm' && rhythm.showRhythm
          ? { current: rhythmCard.current, stageKey: rhythmCard.stageKey }
          : null,
      weightTrendDeltaKg:
        bodyCard && bodyCard.kind === 'body'
          ? toDisplay(bodyCard.trendDeltaKg)
          : null,
    };
    const model = buildShareCardModel(
      'week',
      source,
      prefs,
      rhythm.careFlagged,
    );
    if (!model) return null;
    const stage = model.stageKey ? stageNames(t)[model.stageKey] : null;
    return buildShareText(t, model, weekTitles(t)[intro.titleKey], stage, unit);
  }, [
    intro,
    weekCard,
    rhythmCard,
    bodyCard,
    ledger.days,
    profile?.display_name,
    weekStart,
    tally.rings.protein.done,
    rhythm.showRhythm,
    rhythm.careFlagged,
    prefs,
    toDisplay,
    unit,
    t,
  ]);

  function setPref(key: 'showName' | 'showDetails', v: boolean) {
    haptic.toggle();
    const next = { ...prefs, [key]: v };
    setPrefs(next);
    try {
      storage.set(SHARE_PREF_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  async function doShare() {
    if (!shareText) return;
    try {
      const res = await Share.share({ message: shareText });
      if (res.action === Share.sharedAction) achievements.recordShared();
    } catch {
      // user cancelled / unavailable
    }
  }

  function go(delta: number) {
    const next = index + delta;
    if (next < 0) return;
    if (next > last) {
      router.back();
      return;
    }
    haptic.select();
    setIndex(next);
  }

  const background = (
    <LinearGradient
      colors={[fixedColors.forestTop, fixedColors.forestBot]}
      style={StyleSheet.absoluteFill}
    />
  );

  const closeButton = (
    <Pressable
      onPress={() => router.back()}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={t('insights.review.close')}
      className="h-11 w-11 items-center justify-center rounded-full"
      style={{ backgroundColor: fixedColors.heroTrack }}
    >
      <SymbolView
        name="xmark"
        size={16}
        weight="semibold"
        tintColor={fixedColors.heroLabel}
      />
    </Pressable>
  );

  // Quiet week (pause / no data): a single calm line, no stories.
  if (review && review.quiet) {
    return (
      <View className="flex-1" style={{ paddingTop: insets.top + 12 }}>
        {background}
        <View className="items-end px-5">{closeButton}</View>
        <View className="flex-1 justify-center gap-4 px-8">
          <Text
            accessibilityRole="header"
            style={[textStyles.title, { color: fixedColors.heroLabel }]}
          >
            {t('rhythm.tideTable.title')}
          </Text>
          <Text style={[textStyles.body, { color: fixedColors.heroLabel2 }]}>
            {review.quiet === 'paused'
              ? t('insights.review.quiet.paused')
              : t('insights.review.quiet.noData')}
          </Text>
        </View>
      </View>
    );
  }

  if (!isReady || !review || cards.length === 0) {
    return (
      <View className="flex-1" style={{ paddingTop: insets.top + 12 }}>
        {background}
        <View className="items-end px-5">{closeButton}</View>
      </View>
    );
  }

  const card = cards[index];
  const showIncomplete = !tally.rings.isComplete && index === 0;

  return (
    <View className="flex-1" style={{ paddingTop: insets.top + 8 }}>
      {background}
      <View
        className="flex-row gap-1.5 px-5"
        accessible
        accessibilityLabel={t('insights.review.cardOf', {
          current: index + 1,
          total: cards.length,
        })}
      >
        {cards.map((_, i) => (
          <View
            key={i}
            className="h-1 flex-1 rounded-full"
            style={{
              backgroundColor:
                i <= index ? fixedColors.lime : fixedColors.heroTrack,
            }}
          />
        ))}
      </View>
      <View className="flex-row items-center justify-between px-5 pt-3">
        <Text style={[textStyles.caption, { color: fixedColors.heroLabel2 }]}>
          {t('rhythm.tideTable.title')}
        </Text>
        {closeButton}
      </View>

      <View className="flex-1 px-7" style={{ width }}>
        <Animated.View
          key={`${index}`}
          entering={reduceMotion ? undefined : FadeIn.duration(220)}
          className="flex-1"
        >
          <StoryCard card={card} ctx={ctx} />
        </Animated.View>
        {/* tap zones: left third = back, rest = forward; the goal-offer buttons sit above */}
        <View
          pointerEvents="box-none"
          style={[
            StyleSheet.absoluteFill,
            { flexDirection: 'row' },
            // the last card hosts buttons (goal offer): keep the lower part free for them
            index === last ? { bottom: undefined, height: '35%' } : null,
          ]}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={() => go(-1)}
            accessibilityRole="button"
            accessibilityLabel={t('insights.review.prev')}
          />
          <Pressable
            style={{ flex: 2 }}
            onPress={() => go(1)}
            accessibilityRole="button"
            accessibilityLabel={t('insights.review.next')}
          />
        </View>
      </View>

      <View
        className="flex-row items-center justify-between px-7 pt-2"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Text
          style={[
            textStyles.caption,
            { color: fixedColors.heroLabel2, flex: 1 },
          ]}
        >
          {showIncomplete ? t('rhythm.tideTable.incomplete') : ''}
        </Text>
        {sharable ? (
          <Pressable
            onPress={() => setShareOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('rhythm.tideTable.share')}
            className="h-11 flex-row items-center gap-2 rounded-full px-4"
            style={{ backgroundColor: fixedColors.heroTrack }}
          >
            <SymbolView
              name="square.and.arrow.up"
              size={16}
              weight="semibold"
              tintColor={fixedColors.heroLabel}
            />
            <Text
              style={[
                textStyles.callout,
                { color: fixedColors.heroLabel, fontWeight: '600' },
              ]}
            >
              {t('rhythm.tideTable.share')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Modal
        visible={shareOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShareOpen(false)}
      >
        <View className="bg-bg flex-1 gap-5 p-5">
          <View className="flex-row items-center justify-between">
            <Text
              accessibilityRole="header"
              className="text-label"
              style={textStyles.title}
            >
              {t('insights.review.share.title')}
            </Text>
            <Pressable
              onPress={() => setShareOpen(false)}
              accessibilityRole="button"
              accessibilityLabel={t('insights.review.close')}
              className="bg-surface-raised h-11 w-11 items-center justify-center rounded-full"
            >
              <SymbolView
                name="xmark"
                size={16}
                weight="semibold"
                tintColor="label"
              />
            </Pressable>
          </View>
          <Card variant="hero">
            <View className="flex-row justify-between">
              {weekCard && weekCard.kind === 'week'
                ? weekCard.glyphs.map((g, i) => (
                    <DayGlyphIcon key={weekCard.dates[i]} glyph={g} size={30} />
                  ))
                : null}
            </View>
            <Text style={[textStyles.body, { color: fixedColors.heroLabel }]}>
              {shareText ?? ''}
            </Text>
          </Card>
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-label" style={textStyles.body}>
                {t('insights.review.share.showName')}
              </Text>
              <Switch
                value={prefs.showName}
                onValueChange={(v) => setPref('showName', v)}
                accessibilityLabel={t('insights.review.share.showName')}
              />
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-label" style={textStyles.body}>
                {t('insights.review.share.showDetails')}
              </Text>
              <Switch
                value={prefs.showDetails}
                onValueChange={(v) => setPref('showDetails', v)}
                accessibilityLabel={t('insights.review.share.showDetails')}
              />
            </View>
            <Text className="text-label-secondary" style={textStyles.caption}>
              {t('insights.review.share.detailsHint')}
            </Text>
          </View>
          <View className="flex-1 justify-end">
            <GlassActionButton
              label={t('insights.review.share.cta')}
              symbol="square.and.arrow.up"
              onPress={() => void doShare()}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
