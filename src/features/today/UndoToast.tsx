import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ToastView } from '@/components/ui';

/** Native tab bar (floating, iOS 26) height + gap. */
const TAB_BAR_CLEARANCE = 84;

export interface UndoToastState {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Toast above the tab bar that hides itself after `ms` (default 4 s). Bottom,
 * not top: the screen title area is drawn natively above RN content and hid it;
 * down here "Rückgängig" is also in thumb reach.
 */
export function UndoToast({
  toast,
  onHide,
  ms = 4000,
}: {
  toast: UndoToastState | null;
  onHide: () => void;
  ms?: number;
}) {
  const insets = useSafeAreaInsets();
  const id = toast?.id;
  useEffect(() => {
    if (id == null) return;
    const timer = setTimeout(onHide, ms);
    return () => clearTimeout(timer);
  }, [id, ms, onHide]);
  if (!toast) return null;
  return (
    <View
      pointerEvents="box-none"
      className="absolute left-0 right-0 items-center px-5"
      style={{ bottom: insets.bottom + TAB_BAR_CLEARANCE }}
    >
      <Animated.View
        key={toast.id}
        entering={FadeInDown.duration(200)}
        exiting={FadeOutDown.duration(160)}
      >
        <ToastView
          kind="success"
          message={toast.message}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
        />
      </Animated.View>
    </View>
  );
}
