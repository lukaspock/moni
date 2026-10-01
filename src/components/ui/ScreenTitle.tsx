import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Fixed tab title (top-left, solid page background, no native header / glass capsule).
 * Every tab root renders this above its ScrollView and sets `headerShown: false`.
 */
export function ScreenTitle({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="bg-system-background px-5 pb-2"
      style={{ paddingTop: insets.top + 8 }}
    >
      <Text className="text-label text-[28px] font-bold">{title}</Text>
    </View>
  );
}
