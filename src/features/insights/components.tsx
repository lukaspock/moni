import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';

import { themeColor } from '@/theme/colors';

export function InsightCard({
  title,
  accessory,
  children,
}: {
  title: string;
  accessory?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View className="gap-3 rounded-2xl bg-secondary-system-grouped-background p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-label">{title}</Text>
        {accessory}
      </View>
      {children}
    </View>
  );
}

export function EmptyState({ icon, title, body }: { icon: SFSymbol; title: string; body: string }) {
  return (
    <View className="items-center gap-1.5 py-4">
      <SymbolView name={icon} size={28} tintColor={themeColor('accent')} />
      <Text className="text-center text-base font-medium text-label">{title}</Text>
      <Text className="text-center text-sm text-secondary-label">{body}</Text>
    </View>
  );
}

export function InsightRow({ icon, text }: { icon: SFSymbol; text: string }) {
  return (
    <View className="flex-row items-start gap-3">
      <SymbolView name={icon} size={18} tintColor={themeColor('accent')} style={{ marginTop: 2 }} />
      <Text className="flex-1 text-sm text-label">{text}</Text>
    </View>
  );
}
