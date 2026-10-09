import { Text, View } from 'react-native';

import { textStyles } from '@/theme/typography';

type PlaceholderScreenProps = {
  title: string;
  description: string;
};

/**
 * Stand-in for a screen's content (empty/unavailable states). Kept so every
 * route renders something real instead of an empty view.
 */
export function PlaceholderScreen({
  title,
  description,
}: PlaceholderScreenProps) {
  return (
    <View className="bg-bg flex-1 items-center justify-center gap-2 px-8">
      <Text
        accessibilityRole="header"
        className="text-label text-center"
        style={textStyles.title}
      >
        {title}
      </Text>
      <Text
        className="text-label-secondary text-center"
        style={textStyles.body}
      >
        {description}
      </Text>
    </View>
  );
}
