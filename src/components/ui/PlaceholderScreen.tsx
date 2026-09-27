import { Text, View } from 'react-native';

type PlaceholderScreenProps = {
  title: string;
  description: string;
};

/**
 * Phase 0 stand-in for a tab's content. Later phases replace this with the
 * real feature screens (see `src/features/*`) — kept here only so every tab
 * renders something real instead of an empty view.
 */
export function PlaceholderScreen({
  title,
  description,
}: PlaceholderScreenProps) {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-system-background px-8">
      <Text className="text-center text-xl font-semibold text-label">
        {title}
      </Text>
      <Text className="text-center text-base text-secondary-label">
        {description}
      </Text>
    </View>
  );
}
