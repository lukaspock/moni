import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { themeColor } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

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
      className="bg-bg flex-row items-center px-5 pb-3"
      style={{ paddingTop: insets.top + 8 }}
    >
      <Pressable
        onPress={onPress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={label}
        className="bg-surface-raised h-11 w-11 items-center justify-center rounded-full"
      >
        <SymbolView
          name={icon}
          size={18}
          weight="semibold"
          tintColor={themeColor('label')}
        />
      </Pressable>
      <Text
        accessibilityRole="header"
        maxFontSizeMultiplier={1.3}
        numberOfLines={1}
        className="text-label flex-1 pr-11 text-center"
        style={[textStyles.title, { fontSize: 20, lineHeight: 24 }]}
      >
        {title}
      </Text>
    </View>
  );
}
