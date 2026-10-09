import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { Card, SectionHeader } from '@/components/ui';
import { useRhythm, useWeekTally, type WeekTallyDay } from '@/features/rhythm';
import { useThemeHex } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

function DayGlyph({ day, label }: { day: WeekTallyDay; label: string }) {
  const { t } = useTranslation();
  const ink = useThemeHex('labelTertiary');
  const accent = useThemeHex('accent');
  const bonus = useThemeHex('bonus');
  const strong = useThemeHex('label');
  const future = day.state === 'future';
  const state =
    day.isPlannedRestDay && day.glyph.rest
      ? t('identity.today.dayRest')
      : day.state === 'kept'
        ? t('identity.today.dayKept')
        : day.state === 'paused'
          ? t('identity.today.dayPaused')
          : future
            ? t('identity.today.dayFuture')
            : t('identity.today.dayOpen');
  return (
    <View
      className="items-center gap-1.5"
      style={{ opacity: future ? 0.45 : 1 }}
      accessible
      accessibilityLabel={t('identity.today.weekGlyph', {
        weekday: label,
        state,
      })}
    >
      <Text
        style={[
          textStyles.caption,
          { color: day.isToday ? accent : ink, fontWeight: '700' },
        ]}
        maxFontSizeMultiplier={1.2}
      >
        {label}
      </Text>
      <Svg width={30} height={30} viewBox="0 0 30 30">
        <Circle
          cx={15}
          cy={15}
          r={12}
          stroke={day.glyph.ring ? accent : day.isToday ? strong : ink}
          strokeWidth={day.isToday ? 2.5 : 2}
          strokeDasharray={day.state === 'paused' ? '3 4' : undefined}
          fill={day.glyph.ring ? accent : 'none'}
          fillOpacity={day.glyph.ring ? 0.22 : 0}
        />
        {day.glyph.slash ? (
          <Line
            x1={6}
            y1={24}
            x2={24}
            y2={6}
            stroke={bonus}
            strokeWidth={3}
            strokeLinecap="round"
          />
        ) : null}
        {day.glyph.rest ? (
          <Circle cx={15} cy={15} r={2.5} fill={accent} />
        ) : null}
      </Svg>
    </View>
  );
}

function RingStat({
  name,
  done,
  goal,
  closed,
}: {
  name: string;
  done: number;
  goal: number;
  closed: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View
      className="flex-1 gap-0.5"
      accessible
      accessibilityLabel={t('rhythm.rings.a11y', { name, done, goal })}
    >
      <Text
        className="text-label-secondary"
        style={textStyles.caption}
        maxFontSizeMultiplier={1.2}
      >
        {name}
      </Text>
      <Text
        className={closed ? 'text-tint' : 'text-label'}
        style={textStyles.numericS}
        maxFontSizeMultiplier={1.15}
      >
        {t('rhythm.rings.progress', { done, goal })}
      </Text>
    </View>
  );
}

/** Seven day glyphs + the weekly triad; the rhythm number only when the user wants it. */
export function WeekStrip() {
  const { t, i18n } = useTranslation();
  const tally = useWeekTally();
  const rhythm = useRhythm();
  const fmt = new Intl.DateTimeFormat(i18n.language, { weekday: 'narrow' });
  const label = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return fmt.format(new Date(y, m - 1, d));
  };
  const count = rhythm.state.current;
  const { rings } = tally;
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <SectionHeader title={t('identity.today.thisWeek')} />
        </View>
        {rhythm.showRhythm ? (
          <Text
            className="text-label-secondary px-1"
            style={textStyles.caption}
            maxFontSizeMultiplier={1.2}
          >
            {count > 0 ? t('rhythm.counter', { count }) : t('rhythm.begin')}
          </Text>
        ) : null}
      </View>
      <Card className="gap-4">
        <View className="flex-row justify-between">
          {tally.days.map((d) => (
            <DayGlyph key={d.date} day={d} label={label(d.date)} />
          ))}
        </View>
        <View className="flex-row gap-3">
          <RingStat
            name={t('rhythm.rings.food')}
            done={rings.food.done}
            goal={rings.food.goal}
            closed={rings.food.closed}
          />
          {rings.training ? (
            <RingStat
              name={t('rhythm.rings.training')}
              done={rings.training.done}
              goal={rings.training.goal}
              closed={rings.training.closed}
            />
          ) : null}
          <RingStat
            name={t('rhythm.rings.protein')}
            done={rings.protein.done}
            goal={rings.protein.goal}
            closed={rings.protein.closed}
          />
        </View>
      </Card>
    </View>
  );
}
