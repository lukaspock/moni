import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { themeColor, useThemeHex } from '@/theme/colors';
import { textStyles } from '@/theme/typography';
import {
  Card,
  GlassActionButton,
  IconTile,
  ListRow,
  ScreenTitle,
  SectionHeader,
} from '@/components/ui';
import { PressableScale, Reveal } from '@/components/motion';
import {
  estimateDurationMin,
  formatClock,
  lastDoneLabel,
  lastPerformedAt,
  nextRoutine,
} from '@/domain/trainingPlan';
import { nextTrainingAfter } from '@/domain/trainingCycle';
import { useSession } from '@/features/auth';
import {
  elapsedSeconds,
  useActiveWorkoutStore,
  useDeleteRoutine,
  useExerciseCatalog,
  usePlanShiftActions,
  useRoutines,
  useStartWorkout,
  useTodayPlan,
  useTrainingCycle,
  useUpcomingPlan,
  useWorkoutHistory,
  useWorkoutsForDate,
  PlanStrip,
  type Exercise,
  type Routine,
  type WorkoutSummary,
} from '@/features/workout';
import { UndoToast, type UndoToastState } from '@/features/today/UndoToast';
import { WorkoutHistoryRow } from '@/features/workout/WorkoutHistoryRow';
import {
  hasPromptedTrainingSetup,
  markTrainingSetupPrompted,
  openTrainingSetup,
} from '@/features/workout/setup';
import { addDays, toISODate } from '@/lib/date';

const RECENT_COUNT = 3;
/** Enough history to find the last routine session for the rotation. */
const HISTORY_FETCH = 20;
const ROUTINE_CARD_WIDTH = 156;

function routineDuration(
  routine: Routine,
  catalogById: ReadonlyMap<string, Exercise>,
): number {
  return estimateDurationMin({
    exercises: routine.exercises.map((re) => {
      const type = catalogById.get(re.exerciseId)?.trackingType;
      return {
        targetSets: re.targetSets,
        timed: type === 'duration' || type === 'distance_duration',
      };
    }),
  });
}

/** Live session clock, ticking once a second while a workout runs. */
function useElapsed(startedAt: string | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return startedAt ? elapsedSeconds(startedAt, now) : 0;
}

export default function TrainingScreen() {
  const { t, i18n } = useTranslation();
  const { userId } = useSession();
  const { routines, isLoading: routinesLoading } = useRoutines();
  const { workouts: history } = useWorkoutHistory(HISTORY_FETCH);
  const { workouts: todaysWorkouts } = useWorkoutsForDate(toISODate());
  const { exercises: catalog } = useExerciseCatalog();
  const deleteRoutine = useDeleteRoutine();
  const { startEmpty, startFromRoutine, resumeWorkout } = useStartWorkout();
  const runningId = useActiveWorkoutStore((s) => s.workoutId);
  const runningRoutineId = useActiveWorkoutStore((s) => s.routineId);
  const runningStartedAt = useActiveWorkoutStore((s) => s.startedAt);
  const elapsed = useElapsed(runningId ? runningStartedAt : null);
  const running = runningId !== null;

  const catalogById = useMemo(
    () => new Map(catalog.map((e) => [e.id, e])),
    [catalog],
  );

  // First visit without routines: open the setup flow once (per user).
  useFocusEffect(
    useCallback(() => {
      if (!userId || routinesLoading || routines.length > 0 || running) return;
      if (hasPromptedTrainingSetup(userId)) return;
      markTrainingSetupPrompted(userId);
      openTrainingSetup();
    }, [userId, routinesLoading, routines.length, running]),
  );

  const today = toISODate();
  const todayPlan = useTodayPlan();
  const { cycle } = useTrainingCycle();
  const { days: week } = useUpcomingPlan(7);
  const [toast, setToast] = useState<UndoToastState | null>(null);
  const hideToast = useCallback(() => setToast(null), []);
  const shiftActions = usePlanShiftActions(
    useCallback(
      (next: Omit<UndoToastState, 'id'>) =>
        setToast({ id: Date.now(), ...next }),
      [],
    ),
  );
  const rotationNext = nextRoutine(routines, history);
  const isRestDay = todayPlan.hasCycle && todayPlan.day?.kind === 'rest';
  // With a cycle the plan decides today's routine; without one the rotation does.
  const next = todayPlan.hasCycle ? todayPlan.routine : rotationNext;
  const doneToday = todaysWorkouts.some((w) => w.endedAt);

  const routineNameById = useMemo(
    () => new Map(routines.map((r) => [r.id, r.name])),
    [routines],
  );
  const planRoutineLabel = useCallback(
    (routineId: string | null) =>
      (routineId ? routineNameById.get(routineId) : undefined) ??
      t('trainingPlan.rotation'),
    [routineNameById, t],
  );
  const openPlan = () => router.push('/(tabs)/training/plan');

  // Rest day: name the next planned session ("Nächste Einheit: Push · morgen").
  let restBody: string | null = null;
  if (isRestDay && cycle) {
    const upcoming = nextTrainingAfter(
      cycle.slots,
      cycle.anchorDate,
      cycle.shifts,
      today,
    );
    if (upcoming && upcoming.day.kind === 'training') {
      const dayText =
        upcoming.date === addDays(today, 1)
          ? t('trainingPlan.hero.tomorrow')
          : new Date(`${upcoming.date}T12:00:00`).toLocaleDateString(
              i18n.language,
              { weekday: 'long' },
            );
      const name =
        (upcoming.day.routineId
          ? routineNameById.get(upcoming.day.routineId)
          : undefined) ?? rotationNext?.name;
      restBody = name
        ? t('trainingPlan.hero.restNext', { name, day: dayText })
        : t('trainingPlan.hero.restNextFree', { day: dayText });
    }
  }

  // One quiet secondary action under the hero: undo today's shift, or shift.
  let secondary: { label: string; onPress: () => void } | null = null;
  if (!running && !doneToday) {
    if (shiftActions.state.todayShift) {
      secondary = {
        label: t('trainingPlan.actions.undo'),
        onPress: shiftActions.undoToday,
      };
    } else if (shiftActions.state.canPostpone) {
      secondary = {
        label: t('trainingPlan.actions.postpone'),
        onPress: shiftActions.postpone,
      };
    } else if (shiftActions.state.canPullForward) {
      secondary = {
        label: t('trainingPlan.actions.pullForward'),
        onPress: shiftActions.pullForward,
      };
    }
  }

  const others = routines.filter((r) => r.id !== next?.id);
  const recent = history.slice(0, RECENT_COUNT);

  function lastDoneText(routine: Routine): string | null {
    const last = lastPerformedAt(routine, history);
    if (!last) return null;
    const label = lastDoneLabel(last, new Date());
    switch (label.kind) {
      case 'today':
        return t('trainingSetup.tab.lastToday');
      case 'yesterday':
        return t('trainingSetup.tab.lastYesterday');
      case 'weekday':
        return t('trainingSetup.tab.lastOn', {
          day: new Date(last).toLocaleDateString(i18n.language, {
            weekday: 'short',
          }),
        });
      case 'date':
        return t('trainingSetup.tab.lastOn', {
          day: new Date(last).toLocaleDateString(i18n.language, {
            day: 'numeric',
            month: 'short',
          }),
        });
    }
  }

  function confirmDelete(routine: Routine) {
    Alert.alert(
      t('trainingSetup.tab.deleteTitle'),
      t('trainingSetup.tab.deleteMessage'),
      [
        { text: t('trainingSetup.tab.cancel'), style: 'cancel' },
        {
          text: t('trainingSetup.tab.delete'),
          style: 'destructive',
          onPress: () => deleteRoutine(routine.id),
        },
      ],
    );
  }

  function openRoutineMenu(routine: Routine) {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: routine.name,
        options: [
          t('trainingSetup.tab.edit'),
          t('trainingSetup.tab.delete'),
          t('trainingSetup.tab.cancel'),
        ],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
      },
      (index) => {
        if (index === 0) {
          router.push({
            pathname: '/routine-editor',
            params: { id: routine.id },
          });
        } else if (index === 1) {
          confirmDelete(routine);
        }
      },
    );
  }

  return (
    <View className="bg-bg flex-1">
      <ScreenTitle title={t('training.title')} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 pb-32 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <Reveal index={0} style={{ paddingHorizontal: 16 }}>
          <TrainingHero
            running={running}
            elapsed={elapsed}
            runningName={
              routines.find((r) => r.id === runningRoutineId)?.name ?? null
            }
            next={isRestDay ? null : next}
            rest={isRestDay ? { body: restBody } : null}
            secondary={secondary}
            doneToday={todaysWorkouts.length > 0}
            meta={
              next
                ? [
                    t('trainingSetup.tab.meta', {
                      count: next.exercises.length,
                      minutes: routineDuration(next, catalogById),
                    }),
                    lastDoneText(next),
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : null
            }
            loading={routinesLoading}
            onResume={resumeWorkout}
            onStart={() => next && startFromRoutine(next)}
            onSetup={openTrainingSetup}
            onLongPress={() => next && openRoutineMenu(next)}
          />
        </Reveal>

        {cycle ? (
          <Reveal index={1} style={{ paddingHorizontal: 16 }}>
            <View className="gap-2">
              <SectionHeader
                title={t('trainingPlan.week.title')}
                actionLabel={t('trainingPlan.week.edit')}
                onActionPress={openPlan}
              />
              <Card>
                <PlanStrip
                  days={week}
                  today={today}
                  routineLabel={planRoutineLabel}
                />
              </Card>
            </View>
          </Reveal>
        ) : routines.length > 0 ? (
          <Reveal index={1} style={{ paddingHorizontal: 16 }}>
            <Card className="gap-0 overflow-hidden p-0">
              <ListRow
                title={t('trainingPlan.week.setup')}
                subtitle={t('trainingPlan.week.setupSubtitle')}
                symbol="calendar"
                iconTone="accent"
                onPress={openPlan}
              />
            </Card>
          </Reveal>
        ) : null}

        {routines.length > 0 && (
          // Plain View, not <Reveal>: an entering animation around a horizontal
          // ScrollView left this whole section stuck invisible (Fabric).
          <View>
            <View className="gap-2">
              <View className="px-4">
                <SectionHeader
                  title={
                    others.length > 0
                      ? t('trainingSetup.tab.moreRoutines')
                      : t('trainingSetup.tab.routines')
                  }
                />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-3 px-4"
              >
                {others.map((routine) => (
                  <RoutineCard
                    key={routine.id}
                    title={routine.name}
                    subtitle={t('trainingSetup.tab.meta', {
                      count: routine.exercises.length,
                      minutes: routineDuration(routine, catalogById),
                    })}
                    hint={t('trainingSetup.tab.routineCardHint')}
                    onPress={() => startFromRoutine(routine)}
                    onLongPress={() => openRoutineMenu(routine)}
                  />
                ))}
                <RoutineCard
                  title={t('trainingSetup.tab.newRoutine')}
                  add
                  onPress={() => router.push('/routine-editor')}
                />
              </ScrollView>
            </View>
          </View>
        )}

        <Reveal index={2} style={{ paddingHorizontal: 16 }}>
          <Card className="gap-0 overflow-hidden p-0">
            <ListRow
              title={t('trainingSetup.tab.freeSession')}
              subtitle={t('trainingSetup.tab.freeSessionSubtitle')}
              symbol="figure.strengthtraining.functional"
              iconTone="bonus"
              onPress={startEmpty}
            />
          </Card>
        </Reveal>

        {recent.length > 0 && (
          <Reveal index={3} style={{ paddingHorizontal: 16 }}>
            <RecentSessions
              recent={recent}
              hasMore={history.length > RECENT_COUNT}
            />
          </Reveal>
        )}
      </ScrollView>
      <UndoToast toast={toast} onHide={hideToast} />
    </View>
  );
}

function TrainingHero({
  running,
  elapsed,
  runningName,
  next,
  rest,
  secondary,
  doneToday,
  meta,
  loading,
  onResume,
  onStart,
  onSetup,
  onLongPress,
}: {
  running: boolean;
  elapsed: number;
  runningName: string | null;
  next: Routine | null;
  /** Planned rest day (cycle): calm rest state instead of a start button. */
  rest: { body: string | null } | null;
  /** Quiet text action under the CTA ("Heute nicht", "Doch trainieren", "Rückgängig"). */
  secondary: { label: string; onPress: () => void } | null;
  doneToday: boolean;
  meta: string | null;
  loading: boolean;
  onResume: () => void;
  onStart: () => void;
  onSetup: () => void;
  onLongPress: () => void;
}) {
  const { t } = useTranslation();

  let eyebrow: string;
  let title: string;
  let body: string | null = null;
  let cta: {
    label: string;
    symbol: 'play.fill' | 'sparkles';
    onPress: () => void;
  } | null;

  if (running) {
    eyebrow = t('trainingSetup.tab.heroRunningEyebrow', {
      time: formatClock(elapsed),
    });
    title = runningName ?? t('trainingSetup.tab.heroRunningTitle');
    cta = {
      label: t('trainingSetup.tab.resume'),
      symbol: 'play.fill',
      onPress: onResume,
    };
  } else if (rest) {
    eyebrow = t('trainingPlan.hero.restEyebrow');
    title = t('trainingPlan.hero.restTitle');
    body = rest.body;
    cta = null;
  } else if (next) {
    eyebrow = doneToday
      ? t('trainingSetup.tab.heroDoneToday')
      : t('trainingSetup.tab.heroEyebrow');
    title = next.name;
    body = meta;
    cta = {
      label: t('trainingSetup.tab.start'),
      symbol: 'play.fill',
      onPress: onStart,
    };
  } else {
    eyebrow = t('trainingSetup.tab.setupEyebrow');
    title = t('trainingSetup.tab.setupTitle');
    body = t('trainingSetup.tab.setupBody');
    cta = loading
      ? null
      : {
          label: t('trainingSetup.tab.setupCta'),
          symbol: 'sparkles',
          onPress: onSetup,
        };
  }

  // Neutral hero (owner: no orange) – raised surface, label text, Light/Dark aware.
  const ink = useThemeHex('label');
  const heroSurface = useThemeHex('surfaceRaised');

  return (
    <Pressable
      onLongPress={!running && next ? onLongPress : undefined}
      accessibilityHint={
        !running && next ? t('trainingSetup.tab.routineCardHint') : undefined
      }
      className="overflow-hidden"
      style={{ borderRadius: 32, borderCurve: 'continuous' }}
    >
      <LinearGradient
        colors={[heroSurface, heroSurface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 24, gap: 16 }}
      >
        <View className="gap-1">
          <Text
            maxFontSizeMultiplier={1.3}
            style={{
              ...textStyles.caption,
              color: ink,
              opacity: 0.75,
              textTransform: 'uppercase',
            }}
          >
            {eyebrow}
          </Text>
          <Text
            accessibilityRole="header"
            maxFontSizeMultiplier={1.3}
            style={{ ...textStyles.title, color: ink }}
          >
            {title}
          </Text>
          {body ? (
            <Text
              maxFontSizeMultiplier={1.4}
              style={{ ...textStyles.callout, color: ink, opacity: 0.75 }}
            >
              {body}
            </Text>
          ) : null}
        </View>
        {cta || secondary ? (
          <View className="gap-1">
            {cta ? (
              <GlassActionButton
                label={cta.label}
                symbol={cta.symbol}
                onPress={cta.onPress}
              />
            ) : null}
            {secondary ? (
              <Pressable
                onPress={secondary.onPress}
                accessibilityRole="button"
                accessibilityLabel={secondary.label}
                hitSlop={6}
                className={`h-11 justify-center ${cta ? 'items-center' : 'items-start'}`}
              >
                <Text
                  maxFontSizeMultiplier={1.4}
                  style={{ ...textStyles.button, color: ink, opacity: 0.7 }}
                >
                  {secondary.label}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </LinearGradient>
    </Pressable>
  );
}

function RoutineCard({
  title,
  subtitle,
  hint,
  add = false,
  onPress,
  onLongPress,
}: {
  title: string;
  subtitle?: string;
  hint?: string;
  add?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityHint={hint}
      onPress={onPress}
      onLongPress={onLongPress}
      className={`justify-between gap-3 rounded-card p-4 ${
        add
          ? 'border-line border border-dashed'
          : 'bg-surface border-line-soft border'
      }`}
      style={{
        width: ROUTINE_CARD_WIDTH,
        minHeight: 120,
        borderCurve: 'continuous',
      }}
    >
      {add ? (
        <IconTile symbol="plus" tone="accent" />
      ) : (
        <IconTile symbol="dumbbell.fill" tone="bonus" />
      )}
      <View className="gap-0.5">
        <Text
          className={`${add ? 'text-tint' : 'text-label'} text-[16px] font-semibold`}
          numberOfLines={2}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-label-secondary text-xs" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {!add ? (
        <View className="absolute right-3 top-3">
          <SymbolView
            name="play.fill"
            size={12}
            tintColor={themeColor('labelTertiary')}
          />
        </View>
      ) : null}
    </PressableScale>
  );
}

function RecentSessions({
  recent,
  hasMore,
}: {
  recent: WorkoutSummary[];
  hasMore: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View className="gap-2">
      <SectionHeader
        title={t('trainingSetup.tab.recent')}
        actionLabel={hasMore ? t('trainingSetup.tab.showAll') : undefined}
        onActionPress={
          hasMore ? () => router.push('/(tabs)/training/history') : undefined
        }
      />
      <Card className="gap-0 overflow-hidden p-0">
        {recent.map((workout, index) => (
          <WorkoutHistoryRow
            key={workout.id}
            workout={workout}
            separator={index < recent.length - 1}
          />
        ))}
      </Card>
    </View>
  );
}
