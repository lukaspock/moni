import { Text, View } from 'react-native';

const BAR_AREA_HEIGHT = 64;

/** Small bar row for a per-week count (e.g. training days), oldest first. */
export function WeeklyBars({ values, max = 7, labels }: { values: readonly number[]; max?: number; labels: readonly string[] }) {
  const top = Math.max(max, ...values, 1);
  return (
    <View className="flex-row items-end gap-2" style={{ height: BAR_AREA_HEIGHT + 34 }}>
      {values.map((v, i) => (
        <View key={i} className="flex-1 items-center gap-1">
          <Text className="text-xs font-medium text-label">{v}</Text>
          <View className="w-full justify-end rounded-md bg-secondary-system-background" style={{ height: BAR_AREA_HEIGHT }}>
            <View className="w-full rounded-md bg-tint" style={{ height: Math.max((v / top) * BAR_AREA_HEIGHT, v > 0 ? 4 : 0) }} />
          </View>
          <Text className="text-[10px] text-secondary-label">{labels[i]}</Text>
        </View>
      ))}
    </View>
  );
}
