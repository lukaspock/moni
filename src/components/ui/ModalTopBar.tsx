import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { themeColor } from '@/theme/colors';

/** Own top bar (this route lives outside the tabs, so no native header / tab bar). */
export function ModalTopBar({
  title,
  icon,
  label,
  onPress,
}: {
  title: string;
  icon: 'xmark' | 'chevron.left';
  label: string;
  onPress: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="bg-system-background flex-row items-center px-5 pb-3"
      style={{ paddingTop: insets.top + 8 }}
    >
      <Pressable
        onPress={onPress}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={label}
        className="bg-secondary-system-background h-10 w-10 items-center justify-center rounded-full"
      >
        <SymbolView name={icon} size={16} tintColor={themeColor('accent')} />
      </Pressable>
      <Text className="text-label flex-1 pr-10 text-center text-lg font-semibold">
        {title}
      </Text>
    </View>
  );
}
