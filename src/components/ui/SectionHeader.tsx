import { Text } from 'react-native';

/** Small uppercase label above a card/list (same look as "QUICK LOG · SNACK"). */
export function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-secondary-label px-1 text-xs font-semibold uppercase">
      {title}
    </Text>
  );
}
