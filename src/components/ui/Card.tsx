import type { ReactNode } from 'react';
import { View } from 'react-native';

/** The one surface used for every grouped block in the app (rounded-2xl, secondary background). */
export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <View
      className={`bg-secondary-system-background gap-3 rounded-2xl p-4 ${className}`}
    >
      {children}
    </View>
  );
}
