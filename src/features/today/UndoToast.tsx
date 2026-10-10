import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ToastView } from '@/components/ui';

export interface UndoToastState {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Top toast that hides itself after `ms` (default 4 s). */
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
      style={{ top: insets.top + 8 }}
    >
      <Animated.View
        key={toast.id}
        entering={FadeInUp.duration(200)}
        exiting={FadeOutUp.duration(160)}
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
