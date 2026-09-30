import { Text, View } from 'react-native';

const BAR_AREA_HEIGHT = 64;

/** Small bar row for a per-week count (e.g. training days), oldest first. */
export function WeeklyBars({
  values,
  max = 7,
  labels,
}: {
  values: readonly number[];
  max?: number;
  labels: readonly string[];
}) {
  const top = Math.max(max, ...values, 1);
  return (
    <View
      className="flex-row items-end gap-2"
      style={{ height: BAR_AREA_HEIGHT + 34 }}
    >
      {values.map((v, i) => (
        <View key={i} className="flex-1 items-center gap-1">
          <Text className="text-label text-xs font-medium">{v}</Text>
          <View
            className="bg-secondary-system-background w-full justify-end rounded-md"
            style={{ height: BAR_AREA_HEIGHT }}
          >
            <View
              className="bg-tint w-full rounded-md"
              style={{
                height: Math.max((v / top) * BAR_AREA_HEIGHT, v > 0 ? 4 : 0),
              }}
            />
          </View>
          <Text className="text-secondary-label text-[10px]">{labels[i]}</Text>
        </View>
      ))}
    </View>
  );
}
