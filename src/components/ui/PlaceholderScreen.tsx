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
    <View className="bg-system-background flex-1 items-center justify-center gap-2 px-8">
      <Text className="text-label text-center text-xl font-semibold">
        {title}
      </Text>
      <Text className="text-secondary-label text-center text-base">
        {description}
      </Text>
    </View>
  );
}
