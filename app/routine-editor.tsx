import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import {
  Card,
  Chip,
  GlassActionButton,
  ModalTopBar,
  SectionHeader,
} from '@/components/ui';
import { Reveal } from '@/components/motion';
import {
  allTemplatePlans,
  indexCatalogByNameKey,
  resolveTemplate,
  type RoutineTemplate,
} from '@/domain/routineTemplates';
import {
  ExercisePickerView,
  exerciseDisplayName,
  useDeleteRoutine,
  useExerciseCatalog,
  useRoutines,
  useSaveRoutine,
  type Exercise,
  type Routine,
} from '@/features/workout';
import {
  ROUTINE_NAME_KEYS,
  appendExercises,
  canSaveRoutine,
  draftFromStored,
  draftFromTemplate,
  formatTarget,
  linkDraftWithNext,
  moveItem,
  normalizeDraftGroups,
  swapExercise,
  templatesBySetting,
  toRoutineInput,
  unlinkDraft,
  type DraftExercise,
  type ExerciseMeta,
  type RoutineNameKey,
} from '@/features/workout/editor/routineDraft';
import {
  getRoutineRepMins,
  setRoutineRepMins,
} from '@/features/workout/editor/repRangeStore';
import { NativeMenu } from '@/features/workout/editor/NativeMenu';
import { TargetEditor } from '@/features/workout/editor/TargetEditor';
import {
  canLinkWithNext,
  isInGroup,
  supersetBlocks,
  supersetKind,
} from '@/domain/supersets';
import { haptic } from '@/lib/haptics';
import { themeColor } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

export default function RoutineEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { routines, isLoading } = useRoutines();

  // Wait for the existing routine to load before mounting the form, so its
  // local draft state can be seeded directly from `existing` at mount time
  // instead of being synchronized in afterwards via an effect.
  if (id && isLoading) {
    return (
      <View className="bg-bg flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  const existing = routines.find((r) => r.id === id);
  return <RoutineForm id={id} existing={existing} />;
}

type PickerState = { kind: 'add' } | { kind: 'swap'; index: number } | null;

function RoutineForm({ id, existing }: { id?: string; existing?: Routine }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { exercises: catalog } = useExerciseCatalog();
  const saveRoutine = useSaveRoutine();
  const deleteRoutine = useDeleteRoutine();

  const catalogById = useMemo(
    () => new Map(catalog.map((e) => [e.id, e])),
    [catalog],
  );
  const metaFor = (exerciseId: string): ExerciseMeta | undefined => {
    const e = catalogById.get(exerciseId);
    return e
      ? { trackingType: e.trackingType, category: e.category }
      : undefined;
  };

  const [name, setName] = useState(existing?.name ?? '');
  const [draft, setDraft] = useState<DraftExercise[]>(() => {
    if (!existing) return [];
    // DB lower bound first; the device-local value only for older routines.
    const mins = getRoutineRepMins(existing.id);
    return normalizeDraftGroups(
      existing.exercises.map((e) =>
        draftFromStored(
          e,
          metaFor(e.exerciseId),
          e.targetRepsMin ?? mins[e.exerciseId],
        ),
      ),
    );
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerState>(null);
  const saving = useRef(false);

  const nameSuggestions: Record<RoutineNameKey, string> = {
    push: t('routineEditor.names.push'),
    pull: t('routineEditor.names.pull'),
    legs: t('routineEditor.names.legs'),
    fullBody: t('routineEditor.names.fullBody'),
    upper: t('routineEditor.names.upper'),
    lower: t('routineEditor.names.lower'),
  };
  const settingLabel = {
    gym: t('routineEditor.template.gym'),
    home: t('routineEditor.template.home'),
    endurance: t('routineEditor.template.endurance'),
  };
  const templateGroups = useMemo(
    () => templatesBySetting(allTemplatePlans()),
    [],
  );

  const canSave = canSaveRoutine(name, draft);

  function nameOf(exerciseId: string): string {
    const e = catalogById.get(exerciseId);
    return e ? exerciseDisplayName(e, t) : '…';
  }

  function targetLabel(d: DraftExercise): string {
    const f = formatTarget(d);
    return f.kind === 'minutes'
      ? t('routineEditor.target.minutes', { sets: f.sets, value: f.value })
      : t('routineEditor.target.reps', { sets: f.sets, value: f.value });
  }

  function updateAt(index: number, next: DraftExercise) {
    setDraft((prev) => prev.map((d, i) => (i === index ? next : d)));
  }

  function move(index: number, dir: -1 | 1) {
    haptic.select();
    setDraft((prev) =>
      normalizeDraftGroups(moveItem(prev, index, index + dir)),
    );
  }

  function remove(index: number) {
    haptic.tapLight();
    setDraft((prev) =>
      normalizeDraftGroups(prev.filter((_, i) => i !== index)),
    );
  }

  function link(index: number) {
    haptic.select();
    setDraft((prev) => linkDraftWithNext(prev, index));
  }

  function unlink(index: number) {
    haptic.select();
    setDraft((prev) => unlinkDraft(prev, index));
  }

  function fillFromTemplate(template: RoutineTemplate) {
    const resolved = resolveTemplate(template, indexCatalogByNameKey(catalog));
    const next = draftFromTemplate(resolved.exercises, metaFor);
    if (next.length === 0) return;
    haptic.itemAdded();
    setDraft(next);
    if (!name.trim()) setName(t(template.nameKey));
  }

  async function handleSave() {
    if (!canSave || saving.current) return;
    saving.current = true; // double-tap would otherwise create two routines
    try {
      const routineId = await saveRoutine({
        id,
        name: name.trim(),
        exercises: toRoutineInput(draft),
      });
      // The lower rep bound now lives in the DB (target_reps_min); drop the
      // legacy device-local copy so it can't shadow a removed range.
      setRoutineRepMins(routineId, {});
      router.back();
    } catch (error) {
      console.warn('[routine-editor] save failed', error);
      saving.current = false;
    }
  }

  function confirmDelete() {
    if (!id) return;
    haptic.destructivePrompt();
    Alert.alert(
      t('routineEditor.routineMenu.deleteTitle'),
      t('routineEditor.routineMenu.deleteMessage', {
        name: existing?.name ?? name,
      }),
      [
        { text: t('routineEditor.routineMenu.cancel'), style: 'cancel' },
        {
          text: t('routineEditor.routineMenu.deleteConfirm'),
          style: 'destructive',
          onPress: () => {
            deleteRoutine(id);
            setRoutineRepMins(id, {});
            router.back();
          },
        },
      ],
    );
  }

  function renderRow(
    d: DraftExercise,
    index: number,
    separator: boolean = index > 0,
  ) {
    const expanded = expandedId === d.exerciseId;
    const exerciseName = nameOf(d.exerciseId);
    const target = targetLabel(d);
    const groups = draft.map((x) => x.supersetGroup);
    return (
      <View key={d.exerciseId}>
        {separator ? <View className="bg-line ml-4 h-px" /> : null}
        <View className="min-h-[60px] flex-row items-center gap-2 py-1.5 pl-4 pr-1">
          <Text
            numberOfLines={2}
            maxFontSizeMultiplier={1.4}
            className="text-label flex-1 text-base"
          >
            {exerciseName}
          </Text>
          <Pressable
            onPress={() => {
              haptic.select();
              setExpandedId(expanded ? null : d.exerciseId);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${exerciseName}. ${t(
              'routineEditor.target.a11y',
              { target },
            )}`}
            accessibilityState={{ expanded }}
            hitSlop={6}
            className={`h-8 justify-center rounded-full px-3 ${
              expanded ? 'bg-bonus' : 'bg-bonus-soft'
            }`}
          >
            <Text
              maxFontSizeMultiplier={1.15}
              className={expanded ? 'text-on-tint' : 'text-bonus'}
              style={textStyles.numericS}
            >
              {target}
            </Text>
          </Pressable>
          <NativeMenu
            label={t('routineEditor.exerciseMenu.label', {
              name: exerciseName,
            })}
            items={[
              {
                key: 'swap',
                label: t('routineEditor.exerciseMenu.swap'),
                systemImage: 'arrow.triangle.2.circlepath',
                onPress: () => setPicker({ kind: 'swap', index }),
              },
              ...(index > 0
                ? [
                    {
                      key: 'up',
                      label: t('routineEditor.exerciseMenu.moveUp'),
                      systemImage: 'arrow.up' as const,
                      onPress: () => move(index, -1),
                    },
                  ]
                : []),
              ...(index < draft.length - 1
                ? [
                    {
                      key: 'down',
                      label: t('routineEditor.exerciseMenu.moveDown'),
                      systemImage: 'arrow.down' as const,
                      onPress: () => move(index, 1),
                    },
                  ]
                : []),
              ...(canLinkWithNext(groups, index)
                ? [
                    {
                      key: 'link',
                      label: t('routineEditor.exerciseMenu.link'),
                      systemImage: 'link' as const,
                      onPress: () => link(index),
                    },
                  ]
                : []),
              ...(isInGroup(groups, index)
                ? [
                    {
                      key: 'unlink',
                      label: t('routineEditor.exerciseMenu.unlink'),
                      systemImage: 'minus.circle' as const,
                      onPress: () => unlink(index),
                    },
                  ]
                : []),
              {
                key: 'remove',
                label: t('routineEditor.exerciseMenu.remove'),
                systemImage: 'trash',
                destructive: true,
                onPress: () => remove(index),
              },
            ]}
          />
        </View>
        {expanded ? (
          <Reveal>
            <TargetEditor
              draft={d}
              onChange={(next) => updateAt(index, next)}
              onDone={() => setExpandedId(null)}
            />
          </Reveal>
        ) : null}
      </View>
    );
  }

  // The picker renders inline (a formSheet stacked on a formSheet showed an
  // empty sheet on device); local draft state survives because we stay mounted.
  if (picker) {
    const swapping = picker.kind === 'swap' ? draft[picker.index] : undefined;
    const swapExerciseRow: Exercise | undefined = swapping
      ? catalogById.get(swapping.exerciseId)
      : undefined;
    return (
      <View className="bg-bg flex-1">
        <ModalTopBar
          title={
            picker.kind === 'swap'
              ? t('routineEditor.picker.swapTitle')
              : t('routineEditor.picker.addTitle')
          }
          icon="chevron.left"
          label={t('routineEditor.picker.back')}
          onPress={() => setPicker(null)}
        />
        {picker.kind === 'swap' ? (
          <ExercisePickerView
            embedded
            mode="single"
            onConfirm={(ids) => {
              const newId = ids[0];
              if (newId) {
                setDraft((prev) =>
                  swapExercise(prev, picker.index, newId, metaFor(newId)),
                );
                setExpandedId(null);
              }
              setPicker(null);
            }}
            preferMuscleGroup={swapExerciseRow?.muscleGroups[0] ?? null}
            excludeIds={swapping ? [swapping.exerciseId] : []}
            alreadyAddedIds={draft.map((d) => d.exerciseId)}
          />
        ) : (
          <ExercisePickerView
            embedded
            multiSelect
            alreadyAddedIds={draft.map((d) => d.exerciseId)}
            onConfirm={(ids) => {
              if (ids.length) haptic.itemAdded();
              setDraft((prev) => appendExercises(prev, ids, metaFor));
              setPicker(null);
            }}
          />
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" className="bg-bg flex-1">
      <View>
        <ModalTopBar
          title={
            existing
              ? t('routineEditor.titleEdit')
              : t('routineEditor.titleNew')
          }
          icon="xmark"
          label={t('routineEditor.close')}
          onPress={() => router.back()}
        />
        {existing ? (
          <View className="absolute right-5" style={{ top: insets.top + 8 }}>
            <NativeMenu
              label={t('routineEditor.routineMenu.label')}
              items={[
                {
                  key: 'delete',
                  label: t('routineEditor.routineMenu.delete'),
                  systemImage: 'trash',
                  destructive: true,
                  onPress: confirmDelete,
                },
              ]}
            />
          </View>
        ) : null}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 p-5 pb-10"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View className="gap-3">
          <SectionHeader title={t('routineEditor.nameLabel')} />
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('routineEditor.namePlaceholder')}
            placeholderTextColor={themeColor('labelTertiary')}
            accessibilityLabel={t('routineEditor.nameLabel')}
            returnKeyType="done"
            className="bg-surface text-label rounded-inner px-4 py-4 text-lg"
            style={{ borderCurve: 'continuous' }}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            className="-mx-5 grow-0"
            contentContainerClassName="gap-2 px-5"
          >
            {ROUTINE_NAME_KEYS.map((key) => {
              const label = nameSuggestions[key];
              return (
                <Chip
                  key={key}
                  label={label}
                  selected={name.trim() === label}
                  activeStyle="soft"
                  onPress={() => {
                    haptic.select();
                    setName(label);
                  }}
                />
              );
            })}
          </ScrollView>
        </View>

        <View className="gap-3">
          <SectionHeader title={t('routineEditor.exercises')} marker="bonus" />
          <Card className="gap-0 overflow-hidden p-0">
            {draft.length === 0 ? (
              <Text className="text-label-secondary px-4 pt-4 text-sm">
                {t('routineEditor.empty')}
              </Text>
            ) : null}
            {supersetBlocks(draft.map((d) => d.supersetGroup)).map((b) => {
              if (b.group === null) {
                const d = draft[b.start]!;
                return renderRow(d, b.start);
              }
              const size = b.end - b.start + 1;
              const label = t(
                supersetKind(size) === 'circuit'
                  ? 'routineEditor.group.circuit'
                  : 'routineEditor.group.superset',
              );
              return (
                <View
                  key={`group-${b.group}-${draft[b.start]!.exerciseId}`}
                  accessibilityLabel={t('routineEditor.group.a11y', {
                    label,
                    count: size,
                  })}
                >
                  {b.start > 0 ? <View className="bg-line ml-4 h-px" /> : null}
                  <View className="flex-row">
                    <View
                      className="bg-bonus my-3 ml-2 w-1 rounded-full"
                      importantForAccessibility="no"
                    />
                    <View className="flex-1">
                      <Text
                        maxFontSizeMultiplier={1.3}
                        className="text-bonus pl-2 pt-3"
                        style={textStyles.overline}
                      >
                        {label}
                      </Text>
                      {draft
                        .slice(b.start, b.end + 1)
                        .map((d, k) => renderRow(d, b.start + k, k > 0))}
                    </View>
                  </View>
                </View>
              );
            })}
            {draft.length > 0 ? <View className="bg-line ml-4 h-px" /> : null}
            <Pressable
              onPress={() => setPicker({ kind: 'add' })}
              accessibilityRole="button"
              className="min-h-[56px] flex-row items-center gap-3 px-4 active:opacity-70"
            >
              <SymbolView
                name="plus.circle.fill"
                size={22}
                tintColor={themeColor('accent')}
              />
              <Text className="text-tint text-base font-semibold">
                {t('routineEditor.addExercises')}
              </Text>
            </Pressable>
          </Card>

          {draft.length === 0 ? (
            <View className="items-center">
              <NativeMenu
                label={t('routineEditor.fillFromTemplate')}
                text={t('routineEditor.fillFromTemplate')}
                textSymbol="square.stack.3d.up"
                sections={templateGroups.map((g) => ({
                  key: g.setting,
                  title: settingLabel[g.setting],
                  items: g.templates.map((tpl) => ({
                    key: tpl.id,
                    label: t(tpl.nameKey),
                    onPress: () => fillFromTemplate(tpl),
                  })),
                }))}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View
        className="bg-bg gap-2 px-5 pt-2"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        {!canSave ? (
          <Text
            maxFontSizeMultiplier={1.4}
            className="text-label-tertiary text-center text-xs"
          >
            {t('routineEditor.saveHint')}
          </Text>
        ) : null}
        <GlassActionButton
          label={t('routineEditor.save')}
          symbol="checkmark"
          disabled={!canSave}
          onPress={() => void handleSave()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
