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
    <View
      className="flex-row items-end gap-1.5"
      style={{ height: BAR_AREA_HEIGHT + 18 }}
    >
      {bars.map((b) => {
        const ratio =
          b.targetKcal && b.targetKcal > 0
            ? Math.min(b.eatenKcal / b.targetKcal, CAP) / CAP
            : 0;
        const over = !!b.targetKcal && b.eatenKcal > b.targetKcal * 1.1;
        return (
          <View key={b.key} className="flex-1 items-center gap-1">
            <View
              className="bg-secondary-system-background w-full justify-end overflow-hidden rounded-md"
              style={{ height: BAR_AREA_HEIGHT }}
            >
              {b.logged && (
                <View
                  className={
                    over
                      ? 'bg-destructive w-full rounded-md'
                      : 'bg-tint w-full rounded-md'
                  }
                  style={{ height: Math.max(ratio * BAR_AREA_HEIGHT, 3) }}
                />
              )}
              <View
                pointerEvents="none"
                className="border-secondary-label absolute w-full border-t border-dashed"
                style={{ bottom: BAR_AREA_HEIGHT / CAP }}
              />
            </View>
            <Text className="text-secondary-label text-[10px]">{b.label}</Text>
          </View>
        );
      })}
    </View>
  );
}
