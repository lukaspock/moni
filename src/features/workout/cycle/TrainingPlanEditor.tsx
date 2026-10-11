import { useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import {
  Card,
  GlassActionButton,
  ListRow,
  SectionHeader,
} from '@/components/ui';
import {
  anchorForSavedCycle,
  clampCycleLength,
  cycleAddDays,
  DEFAULT_CYCLE_LENGTH,
  effectivePlanRange,
  MAX_CYCLE_LENGTH,
  MIN_CYCLE_LENGTH,
  resizeCycle,
  resizeEditorCycle,
  slotsForEditor,
  weeklyCycleFromWeekdays,
  type CycleSlot,
} from '@/domain/trainingCycle';
import { toISODate } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { themeColor } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

import { useLegacyWeeklyPlan } from '../plan';
import { useRoutines } from '../routines';
import { useSaveTrainingCycle, useTrainingCycle } from '../trainingCycle';
import type { Routine } from '../types';
import { PlanStrip } from './PlanStrip';

const PREVIEW_DAYS = 14;

function localDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Plan editor (Training tab → "Dein Plan", Profile → Ziele → Trainingsplan):
 * cycle length, one row per day (routine, "next routine" or rest) and a
 * preview of the next two weeks. Saving restarts the cycle (new anchor, shifts
 * cleared — see `src/domain/trainingCycle.ts`).
 */
export function TrainingPlanEditor() {
  const { cycle, isLoading } = useTrainingCycle();
  const legacy = useLegacyWeeklyPlan(!isLoading && !cycle);
  const { routines, isLoading: routinesLoading } = useRoutines();

  if (isLoading || legacy.isLoading || routinesLoading) {
    return (
      <View className="bg-bg flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  const today = toISODate();
  const initial: CycleSlot[] = cycle
    ? slotsForEditor(cycle.slots, cycle.anchorDate, today)
    : legacy.planByWeekday.size > 0
      ? weeklyCycleFromWeekdays(
          [...legacy.planByWeekday.keys()],
          routines.map((r) => r.id),
        )
      : resizeCycle([], DEFAULT_CYCLE_LENGTH);

  // Re-key on the loaded plan so a later refetch with different data resets
  // the draft instead of silently keeping a stale initial state.
  return (
    <EditorBody
      key={JSON.stringify(initial)}
      initial={initial}
      routines={routines}
      today={today}
    />
  );
}

function EditorBody({
  initial,
  routines,
  today,
}: {
  initial: CycleSlot[];
  routines: Routine[];
  today: string;
}) {
  const { t, i18n } = useTranslation();
  const [slots, setSlots] = useState<CycleSlot[]>(initial);
  const { save, isSaving } = useSaveTrainingCycle();
  const length = slots.length;
  const isWeek = length === 7;
  const anchor = anchorForSavedCycle(length, today);

  const routineName = useMemo(() => {
    const byId = new Map(routines.map((r) => [r.id, r.name]));
    return (routineId: string | null) =>
      (routineId ? byId.get(routineId) : undefined) ??
      t('trainingPlan.rotation');
  }, [routines, t]);

  const preview = useMemo(
    () => effectivePlanRange(slots, anchor, [], today, PREVIEW_DAYS),
    [slots, anchor, today],
  );

  const weekdayLong = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'long',
  });

  function dayLabel(position: number): string {
    if (isWeek) {
      return weekdayLong.format(localDate(cycleAddDays(anchor, position)));
    }
    const label = t('trainingPlan.dayN', { n: position + 1 });
    return position === 0 ? `${label} · ${t('trainingPlan.today')}` : label;
  }

  function slotLabel(slot: CycleSlot): string {
    return slot.kind === 'rest'
      ? t('trainingPlan.rest')
      : routineName(slot.routineId);
  }

  function setLength(next: number) {
    const clamped = clampCycleLength(next);
    if (clamped === length) return;
    haptic.select();
    setSlots((prev) => resizeEditorCycle(prev, clamped, today));
  }

  function pickSlot(position: number) {
    const options = [
      ...routines.map((r) => r.name),
      t('trainingPlan.rotation'),
      t('trainingPlan.rest'),
      t('trainingPlan.editor.cancel'),
    ];
    const rotationIndex = routines.length;
    const restIndex = routines.length + 1;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: dayLabel(position),
        message:
          routines.length > 0
            ? t('trainingPlan.editor.rotationHint')
            : t('trainingPlan.editor.noRoutines'),
        options,
        cancelButtonIndex: options.length - 1,
      },
      (index) => {
        if (index === options.length - 1) return;
        const next: CycleSlot =
          index === restIndex
            ? { kind: 'rest' }
            : index === rotationIndex
              ? { kind: 'training', routineId: null }
              : { kind: 'training', routineId: routines[index]!.id };
        haptic.select();
        setSlots((prev) => prev.map((s, i) => (i === position ? next : s)));
      },
    );
  }

  async function onSave() {
    try {
      await save(slots);
      haptic.mealSaved();
      if (router.canGoBack()) router.back();
    } catch {
      haptic.validationError();
      Alert.alert(t('trainingPlan.editor.saveFailed'));
    }
  }

  const minus = length > MIN_CYCLE_LENGTH;
  const plus = length < MAX_CYCLE_LENGTH;

  return (
    <ScrollView
      className="bg-bg flex-1"
      contentContainerClassName="gap-6 px-4 pb-32 pt-4"
      contentInsetAdjustmentBehavior="automatic"
    >
      <View className="gap-2">
        <SectionHeader title={t('trainingPlan.editor.lengthTitle')} />
        <Card className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text
              className="text-label"
              style={textStyles.headline}
              maxFontSizeMultiplier={1.4}
            >
              {t('trainingPlan.editor.lengthValue', { count: length })}
            </Text>
            <View
              className="bg-surface-raised flex-row items-center rounded-full"
              style={{ borderCurve: 'continuous' }}
            >
              <Pressable
                onPress={() => setLength(length - 1)}
                disabled={!minus}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={t('trainingPlan.editor.decrease')}
                className="h-11 w-12 items-center justify-center"
                style={{ opacity: minus ? 1 : 0.4 }}
              >
                <SymbolView
                  name="minus"
                  size={15}
                  weight="semibold"
                  tintColor={themeColor('label')}
                />
              </Pressable>
              <View className="bg-line h-5 w-px" />
              <Pressable
                onPress={() => setLength(length + 1)}
                disabled={!plus}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={t('trainingPlan.editor.increase')}
                className="h-11 w-12 items-center justify-center"
                style={{ opacity: plus ? 1 : 0.4 }}
              >
                <SymbolView
                  name="plus"
                  size={15}
                  weight="semibold"
                  tintColor={themeColor('label')}
                />
              </Pressable>
            </View>
          </View>
          <Text
            className="text-label-secondary"
            style={textStyles.caption}
            maxFontSizeMultiplier={1.4}
          >
            {isWeek
              ? t('trainingPlan.editor.lengthHintWeek')
              : t('trainingPlan.editor.lengthHintCycle')}
          </Text>
        </Card>
      </View>

      <View className="gap-2">
        <SectionHeader title={t('trainingPlan.editor.daysTitle')} />
        <Card className="gap-0 overflow-hidden p-0">
          {slots.map((slot, position) => (
            <ListRow
              key={position}
              title={dayLabel(position)}
              subtitle={slotLabel(slot)}
              symbol={slot.kind === 'training' ? 'dumbbell.fill' : 'moon'}
              iconTone={slot.kind === 'training' ? 'bonus' : 'neutral'}
              onPress={() => pickSlot(position)}
              separator={position < slots.length - 1}
            />
          ))}
        </Card>
      </View>

      <View className="gap-2">
        <SectionHeader title={t('trainingPlan.editor.previewTitle')} />
        <Card>
          <PlanStrip days={preview} today={today} routineLabel={routineName} />
        </Card>
        <Text
          className="text-label-tertiary px-1"
          style={textStyles.caption}
          maxFontSizeMultiplier={1.4}
        >
          {t('trainingPlan.editor.resetNote')}
        </Text>
      </View>

      <GlassActionButton
        label={t('trainingPlan.editor.save')}
        symbol="checkmark"
        disabled={isSaving}
        onPress={() => void onSave()}
      />
    </ScrollView>
  );
}
