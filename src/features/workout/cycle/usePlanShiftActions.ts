import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { haptic } from '@/lib/haptics';

import {
  usePlanShiftState,
  usePostponeToday,
  usePullForwardToday,
  useUndoPlanShift,
  type PlanShiftActions,
} from '../trainingCycle';

export interface PlanShiftToast {
  message: string;
  actionLabel: string;
  onAction: () => void;
}

/**
 * "Heute nicht" / "Doch trainieren" / undo for today, shared by the Training
 * tab and Today. Success reports an undo toast through `onToast`; failures
 * show a plain alert. No shaming copy — postponing is fine.
 */
export function usePlanShiftActions(onToast: (toast: PlanShiftToast) => void): {
  state: PlanShiftActions;
  postpone: () => void;
  pullForward: () => void;
  undoToday: () => void;
} {
  const { t } = useTranslation();
  const state = usePlanShiftState();
  const postponeToday = usePostponeToday();
  const pullForwardToday = usePullForwardToday();
  const undoShift = useUndoPlanShift();

  const fail = useCallback(() => {
    haptic.validationError();
    Alert.alert(t('trainingPlan.actions.failed'));
  }, [t]);

  const undo = useCallback(
    (id: string) => {
      haptic.select();
      undoShift(id).catch(fail);
    },
    [undoShift, fail],
  );

  const run = useCallback(
    (action: () => Promise<string>, message: string) => {
      haptic.select();
      action()
        .then((id) =>
          onToast({
            message,
            actionLabel: t('trainingPlan.actions.undo'),
            onAction: () => undo(id),
          }),
        )
        .catch(fail);
    },
    [onToast, t, undo, fail],
  );

  const todayShiftId = state.todayShift?.id ?? null;
  return {
    state,
    postpone: () => run(postponeToday, t('trainingPlan.actions.postponed')),
    pullForward: () =>
      run(pullForwardToday, t('trainingPlan.actions.pulledForward')),
    undoToday: () => {
      if (todayShiftId) undo(todayShiftId);
    },
  };
}
