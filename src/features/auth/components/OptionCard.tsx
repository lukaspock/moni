import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';

/**
 * Large-tap-target selectable card, used for onboarding's single/multi-choice
 * questions (sex, activity level, goal, weekdays…). Plain RN Pressable +
 * NativeWind/PlatformColor tokens per PLAN §2's fallback rule — no `@expo/ui`
 * control fits a big, chunky, icon+label choice list this well natively.
 */
export function OptionCard({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      className={`min-h-16 flex-row items-center justify-between rounded-2xl border px-5 py-4 ${
        selected ? 'border-tint bg-secondary-system-background' : 'border-separator bg-system-background'
      }`}
    >
      <View className="flex-1 gap-0.5">
        <Text className="text-base font-semibold text-label">{label}</Text>
        {description ? <Text className="text-sm text-secondary-label">{description}</Text> : null}
      </View>
      <View
        className={`ml-3 h-6 w-6 items-center justify-center rounded-full border-2 ${
          selected ? 'border-tint bg-tint' : 'border-separator'
        }`}
      >
        {selected ? <Text className="text-xs font-bold text-system-background">✓</Text> : null}
      </View>
    </Pressable>
  );
}
