import Svg, { Path } from 'react-native-svg';

const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

/** 24x24, stroke 2, round caps/joins, no fill (docs/identity/assets/icons). */
const ICONS = {
  kcalRing: [
    circle(12, 12, 8.5),
    'M3.8 14.2C7 11 9.6 11.8 12 12.8s5 1.8 8.2-1.4',
  ],
  macroCarbs: [
    'M12 21V9M12 9C9 9 8 7 8 5c3 0 4 2 4 4ZM12 9c3 0 4-2 4-4-3 0-4 2-4 4ZM12 14c-3 0-4-2-4-4M12 14c3 0 4-2 4-4M12 19c-3 0-4-2-4-4M12 19c3 0 4-2 4-4',
  ],
  macroFat: [
    'M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11ZM9.5 15a2.5 2.5 0 0 0 2.5 2.5',
  ],
  macroProtein: [
    circle(6, 17, 2.5),
    circle(18, 17, 2.5),
    circle(12, 6, 2.5),
    'M8.2 15.7L10.3 8M15.8 15.7L13.7 8M8.5 17h7',
  ],
  mealBreakfast: [
    'M3 18h18M7 18a5 5 0 0 1 10 0M12 6v2.5M4.9 9.9l1.7 1.7M19.1 9.9l-1.7 1.7',
  ],
  mealDinner: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z'],
  mealLunch: [circle(12, 12, 8.5), circle(12, 12, 4)],
  mealSnack: [
    'M12 8c-3-2-7-1-7 4 0 4 3 8 5 8 1 0 1.5-.5 2-.5s1 .5 2 .5c2 0 5-4 5-8 0-5-4-6-7-4ZM12 8c0-2 1-4 3-5',
  ],
  photoMeal: ['M4 8h3l2-3h6l2 3h3v11H4Z', circle(12, 13.5, 3.5)],
  scanLabel: [
    'M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M8 9v6M12 9v6M16 9v6',
  ],
  weight: [
    'M8 4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Z',
    'M8.5 10.5a4.5 4.5 0 0 1 7 0M12 10.5l1.8-1.6',
  ],
  workoutBonus: ['M13 3L5 13h6l-1 8 8-10h-6Z'],
} as const;

export type BrandIconName = keyof typeof ICONS;
export const BRAND_ICON_NAMES = Object.keys(ICONS) as BrandIconName[];

export type BrandIconProps = {
  name: BrandIconName;
  size?: number;
  color: string;
  /** Stroke width in 24-unit space (default 2). */
  strokeWidth?: number;
};

/** møni domain icons (meals, macros, kcal, bonus, scan); SF Symbols stay the default elsewhere. */
export function BrandIcon({
  name,
  size = 24,
  color,
  strokeWidth = 2,
}: BrandIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
    >
      {ICONS[name].map((d, i) => (
        <Path key={i} d={d} />
      ))}
    </Svg>
  );
}
