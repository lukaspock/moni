import { Text, View } from 'react-native';

export interface DailyKcalBar {
  key: string;
  /** short label under the bar (weekday initial etc.) */
  label: string;
  eatenKcal: number;
  targetKcal: number | null;
  logged: boolean;
}

const BAR_AREA_HEIGHT = 96;

/**
 * Bars of eaten kcal relative to each day's target (the top of the area = 130 %
 * of target; the tick line marks 100 %). Over-target bars turn destructive,
 * unlogged days show an empty slot. Plain RN views — layout only.
 */
export function DailyKcalBars({ bars }: { bars: readonly DailyKcalBar[] }) {
  const CAP = 1.3;
  return (
    <View className="flex-row items-end gap-1.5" style={{ height: BAR_AREA_HEIGHT + 18 }}>
      {bars.map((b) => {
        const ratio = b.targetKcal && b.targetKcal > 0 ? Math.min(b.eatenKcal / b.targetKcal, CAP) / CAP : 0;
        const over = !!b.targetKcal && b.eatenKcal > b.targetKcal * 1.1;
        return (
          <View key={b.key} className="flex-1 items-center gap-1">
            <View className="w-full justify-end overflow-hidden rounded-md bg-secondary-system-background" style={{ height: BAR_AREA_HEIGHT }}>
              {b.logged && (
                <View
                  className={over ? 'w-full rounded-md bg-destructive' : 'w-full rounded-md bg-tint'}
                  style={{ height: Math.max(ratio * BAR_AREA_HEIGHT, 3) }}
                />
              )}
              <View
                pointerEvents="none"
                className="absolute w-full border-t border-dashed border-secondary-label"
                style={{ bottom: (BAR_AREA_HEIGHT / CAP) }}
              />
            </View>
            <Text className="text-[10px] text-secondary-label">{b.label}</Text>
          </View>
        );
      })}
    </View>
  );
}
