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
    <View className="bg-secondary-system-grouped-background gap-3 rounded-2xl p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-label text-base font-semibold">{title}</Text>
        {accessory}
      </View>
      {children}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: SFSymbol;
  title: string;
  body: string;
}) {
  return (
    <View className="items-center gap-1.5 py-4">
      <SymbolView name={icon} size={28} tintColor={themeColor('accent')} />
      <Text className="text-label text-center text-base font-medium">
        {title}
      </Text>
      <Text className="text-secondary-label text-center text-sm">{body}</Text>
    </View>
  );
}

export function InsightRow({ icon, text }: { icon: SFSymbol; text: string }) {
  return (
    <View className="flex-row items-start gap-3">
      <SymbolView
        name={icon}
        size={18}
        tintColor={themeColor('accent')}
        style={{ marginTop: 2 }}
      />
      <Text className="text-label flex-1 text-sm">{text}</Text>
    </View>
  );
}
