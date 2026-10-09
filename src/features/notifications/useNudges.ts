import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  shouldAskQuieter,
  type NudgeCategory,
  type NudgePrefs,
} from '../../domain';
import { useLedger, useRhythm } from '@/features/rhythm';
import { useWeeklyPlan, useWorkoutsForDate } from '@/features/workout';
import { toISODate } from '@/lib/date';
import {
  getReminderPermission,
  requestReminderPermission,
  type ReminderPermission,
} from './permissions';
import {
  applyQuieterChoice,
  localNowString,
  quietUntilFor,
  type QuieterChoice,
} from './nudgeLogic';
import { expoNudgeNotifier, registerNudgeCategory } from './nudgeNotifier';
import { rescheduleNudges } from './nudgeScheduler';
import { ensureNudgeMigration, snapshot } from './nudgeEvents';
import { useNudgeStore } from './nudgeStore';

function monthNameFor(language: string) {
  return (isoDate: string) => {
    const [y, m] = isoDate.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(language, {
      month: 'long',
    });
  };
}

/**
 * Mount ONCE (e.g. in `app/(tabs)/_layout.tsx`). Replans the local nudges whenever the app
 * comes to the foreground, the data/prefs/language change; settles sent/ignored nudges.
 */
export function useNudgeScheduler(): void {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const ledger = useLedger();
  const rhythm = useRhythm();
  const { planByWeekday } = useWeeklyPlan();
  const today = ledger.today;
  const { workouts } = useWorkoutsForDate(today);
  const masterEnabled = useNudgeStore((s) => s.masterEnabled);
  const prefs = useNudgeStore((s) => s.prefs);
  const suppressedDate = useNudgeStore((s) => s.suppressedDate);

  const plannedWeekdays = useMemo(
    () => new Set(planByWeekday.keys()),
    [planByWeekday],
  );
  const lastEndedIso = useMemo(() => {
    let best: string | null = null;
    for (const w of workouts)
      if (w.endedAt && (!best || w.endedAt > best)) best = w.endedAt;
    return best;
  }, [workouts]);

  const openPending = useRef(true);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const latest = useRef({
    ledger,
    rhythm,
    plannedWeekdays,
    lastEndedIso,
    language,
  });
  useEffect(() => {
    latest.current = {
      ledger,
      rhythm,
      plannedWeekdays,
      lastEndedIso,
      language,
    };
  });

  const run = useCallback(() => {
    chain.current = chain.current.then(async () => {
      try {
        ensureNudgeMigration();
        const {
          ledger: l,
          rhythm: r,
          plannedWeekdays: pw,
          lastEndedIso: ended,
          language: lang,
        } = latest.current;
        if (!l.isReady) return;
        const before = snapshot();
        const permissionGranted = (await getReminderPermission()) === 'granted';
        if (permissionGranted && before.masterEnabled)
          await registerNudgeCategory();
        const appOpened = openPending.current;
        openPending.current = false;
        const next = await rescheduleNudges(
          before,
          {
            now: localNowString(new Date()),
            ledger: l.days,
            rhythm: r.state,
            plannedWeekdays: pw,
            pauses: r.pauses,
            careFlagged: r.careFlagged,
            lastWorkoutEndedAt: ended ? localNowString(new Date(ended)) : null,
            permissionGranted,
            appOpened,
            t: (key, options) =>
              (
                i18n.t as unknown as (
                  k: string,
                  o?: Record<string, unknown>,
                ) => string
              )(key, options),
            monthName: monthNameFor(lang),
          },
          expoNudgeNotifier,
        );
        const store = useNudgeStore.getState();
        const consumed = before.openedIds.filter(
          (id) => !next.openedIds.includes(id),
        );
        store.patch({
          state: next.state,
          scheduled: next.scheduled,
          lastOpenDate: next.lastOpenDate,
          openedIds: store.openedIds.filter((id) => !consumed.includes(id)),
        });
      } catch (e) {
        console.warn('[notifications] nudge planning failed', e);
      }
    });
  }, [i18n]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        openPending.current = true;
        run();
      }
    });
    return () => sub.remove();
  }, [run]);

  const dataKey = `${ledger.lastSyncedDate}|${ledger.days.length}|${rhythm.state.current}|${lastEndedIso}`;
  useEffect(() => {
    const timer = setTimeout(run, 900);
    return () => clearTimeout(timer);
  }, [
    run,
    dataKey,
    ledger.isReady,
    masterEnabled,
    prefs,
    suppressedDate,
    language,
    plannedWeekdays,
  ]);
}

export interface NudgeSettingsApi {
  masterEnabled: boolean;
  prefs: NudgePrefs;
  quietUntil: string | null;
  /** enables/disables the smart nudges; asks for permission when needed. Resolves to the resulting state. */
  setMasterEnabled: (value: boolean) => Promise<boolean>;
  setCategory: (category: NudgeCategory, value: boolean) => void;
  /** quiet mode for N days from today (0 = off) */
  setQuietDays: (days: number) => void;
  setQuietHours: (earliestMinutes: number, latestMinutes: number) => void;
  setWeighInWeekday: (weekday: number) => void;
  /** live system permission (refresh after returning from iOS settings) */
  getPermission: () => Promise<ReminderPermission>;
}

/** Settings API for `app/(tabs)/profile/notifications.tsx`. */
export function useNudgeSettings(): NudgeSettingsApi {
  const masterEnabled = useNudgeStore((s) => s.masterEnabled);
  const prefs = useNudgeStore((s) => s.prefs);

  const setMasterEnabled = useCallback(async (value: boolean) => {
    const { patch } = useNudgeStore.getState();
    if (!value) {
      patch({ masterEnabled: false });
      return false;
    }
    let permission = await getReminderPermission();
    if (permission !== 'granted')
      permission = await requestReminderPermission();
    const ok = permission === 'granted';
    patch({ masterEnabled: ok });
    return ok;
  }, []);

  const setPrefs = useCallback((update: (p: NudgePrefs) => NudgePrefs) => {
    const { patch, prefs: p } = useNudgeStore.getState();
    patch({ prefs: update(p) });
  }, []);

  return {
    masterEnabled,
    prefs,
    quietUntil: prefs.quietUntil,
    setMasterEnabled,
    setCategory: (category, value) =>
      setPrefs((p) => ({
        ...p,
        categories: { ...p.categories, [category]: value },
      })),
    setQuietDays: (days) =>
      setPrefs((p) => ({ ...p, quietUntil: quietUntilFor(toISODate(), days) })),
    setQuietHours: (earliestMinutes, latestMinutes) =>
      setPrefs((p) => ({ ...p, earliestMinutes, latestMinutes })),
    setWeighInWeekday: (weekday) =>
      setPrefs((p) => ({ ...p, weighInWeekday: weekday })),
    getPermission: getReminderPermission,
  };
}

/** "Should we be quieter?" — `visible` after two auto-mutes in a row; show it once on the next open. */
export function useQuieterPrompt(): {
  visible: boolean;
  choose: (choice: QuieterChoice) => void;
  dismiss: () => void;
} {
  const visible = useNudgeStore(
    (s) => s.masterEnabled && shouldAskQuieter(s.state),
  );
  const choose = useCallback((choice: QuieterChoice) => {
    const store = useNudgeStore.getState();
    store.patch(
      applyQuieterChoice(
        {
          masterEnabled: store.masterEnabled,
          prefs: store.prefs,
          state: store.state,
        },
        choice,
      ),
    );
  }, []);
  const dismiss = useCallback(() => {
    const store = useNudgeStore.getState();
    store.patch({ state: { ...store.state, askedQuieter: true } });
  }, []);
  return { visible, choose, dismiss };
}
