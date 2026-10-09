import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Reveal, RollingNumber } from '@/components/motion';
import { LogoMark } from '@/components/brand';
import type { ReviewCard, WeekGoals } from '@/domain';
import { storage } from '@/lib/storage';
import { fixedColors } from '@/theme/colors';
import { fontFamily, textStyles } from '@/theme/typography';

import { DayGlyphIcon } from './DayGlyphIcon';
import { stageNames, weekTitleLines, weekTitles } from './copy';

export interface StoryContext {
  exerciseName: (id: string) => string;
  /** kg -> display number in the user's unit */
  toDisplay: (kg: number) => number;
  unit: string;
  showRhythm: boolean;
  dayLabel: (isoDate: string) => string;
  weekdayInitial: (isoDate: string) => string;
  onSetTrainingGoal: (goals: WeekGoals) => void;
  /** week the card belongs to (for the one-time goal offer) */
  weekStart: string;
}

const OFFER_KEY = 'review:goalOffer:';
const OFFER_COOLDOWN_DAYS = 28;

function offerHandledRecently(kind: string, weekStart: string): boolean {
  try {
    const last = storage.getString(OFFER_KEY + kind);
    if (!last) return false;
    const days =
      (Date.parse(`${weekStart}T12:00:00Z`) - Date.parse(`${last}T12:00:00Z`)) /
      86_400_000;
    return days < OFFER_COOLDOWN_DAYS;
  } catch {
    return false;
  }
}

function markOfferHandled(kind: string, weekStart: string) {
  try {
    storage.set(OFFER_KEY + kind, weekStart);
  } catch {
    // ignore
  }
}

const hero = fixedColors.heroLabel;
const hero2 = fixedColors.heroLabel2;

function Overline({ children }: { children: string }) {
  return (
    <Text
      maxFontSizeMultiplier={1.3}
      style={[textStyles.overline, { color: hero2 }]}
    >
      {children}
    </Text>
  );
}

function Headline({ children }: { children: string }) {
  return (
    <Text
      maxFontSizeMultiplier={1.3}
      accessibilityRole="header"
      style={[textStyles.display, { color: hero }]}
    >
      {children}
    </Text>
  );
}

function Line({ children }: { children: string }) {
  return (
    <Text
      maxFontSizeMultiplier={1.4}
      style={[textStyles.body, { color: hero2 }]}
    >
      {children}
    </Text>
  );
}

function BigNumber({ value, color }: { value: number; color?: string }) {
  return (
    <RollingNumber
      value={value}
      startFrom={0}
      mode="count"
      format={(v) => String(Math.round(v))}
      fontSize={72}
      color={color ?? fixedColors.lime}
      accessibilityLabel={String(value)}
    />
  );
}

export function StoryCard({
  card,
  ctx,
}: {
  card: ReviewCard;
  ctx: StoryContext;
}) {
  const { t } = useTranslation();
  const [offerDone, setOfferDone] = useState(false);

  switch (card.kind) {
    case 'intro': {
      const title = weekTitles(t)[card.titleKey];
      return (
        <View className="flex-1 justify-center gap-5">
          <Reveal index={0}>
            <LogoMark size={72} variant="color" decorative />
          </Reveal>
          <Reveal index={1}>
            <Overline>
              {t('insights.review.week', { week: card.weekNumber })}
            </Overline>
          </Reveal>
          <Reveal index={2}>
            <Headline>{title}</Headline>
          </Reveal>
          <Reveal index={3}>
            <Line>{weekTitleLines(t)[card.titleKey]}</Line>
          </Reveal>
        </View>
      );
    }
    case 'week':
      return (
        <View className="flex-1 justify-center gap-6">
          <Reveal index={0}>
            <Headline>{t('insights.review.days.title')}</Headline>
          </Reveal>
          <View className="flex-row justify-between">
            {card.glyphs.map((g, i) => (
              <Reveal key={card.dates[i]} index={i + 1} step={90}>
                <View className="items-center gap-1">
                  <DayGlyphIcon glyph={g} size={38} />
                  <Text
                    style={[textStyles.caption, { color: hero2 }]}
                    maxFontSizeMultiplier={1.2}
                  >
                    {ctx.weekdayInitial(card.dates[i])}
                  </Text>
                </View>
              </Reveal>
            ))}
          </View>
          <Reveal index={8}>
            <View className="gap-1">
              <Text style={[textStyles.headline, { color: hero }]}>
                {t('insights.review.days.food', { count: card.foodDays })}
              </Text>
              <Text style={[textStyles.headline, { color: hero }]}>
                {t('insights.review.days.training', {
                  count: card.trainingDays,
                })}
              </Text>
              {card.avgMealsPerLoggedDay > 0 ? (
                <Line>
                  {t('insights.review.days.meals', {
                    value: card.avgMealsPerLoggedDay,
                  })}
                </Line>
              ) : null}
            </View>
          </Reveal>
        </View>
      );
    case 'highlight': {
      const h = card.highlight;
      let line = '';
      let value: number | null = null;
      switch (h.kind) {
        case 'pr':
          line = t('insights.review.highlight.pr', {
            exercise: ctx.exerciseName(h.exerciseId),
            value: ctx.toDisplay(h.gainKg),
            unit: ctx.unit,
          });
          break;
        case 'longestWorkout':
          value = h.minutes;
          line = t('insights.review.highlight.longestWorkout', {
            minutes: h.minutes,
            day: ctx.dayLabel(h.date),
          });
          break;
        case 'bestProteinDay':
          value = h.proteinG;
          line = t('insights.review.highlight.bestProteinDay', {
            grams: h.proteinG,
            day: ctx.dayLabel(h.date),
          });
          break;
        case 'earliestEntry':
          value = h.hour;
          line = t('insights.review.highlight.earliestEntry', {
            hour: h.hour,
            day: ctx.dayLabel(h.date),
          });
          break;
      }
      const title =
        h.kind === 'pr'
          ? t('insights.review.highlight.title.pr')
          : h.kind === 'longestWorkout'
            ? t('insights.review.highlight.title.longestWorkout')
            : h.kind === 'bestProteinDay'
              ? t('insights.review.highlight.title.bestProteinDay')
              : t('insights.review.highlight.title.earliestEntry');
      return (
        <View className="flex-1 justify-center gap-4">
          <Reveal index={0}>
            <Headline>{title}</Headline>
          </Reveal>
          {value !== null ? (
            <Reveal index={1}>
              <BigNumber value={value} />
            </Reveal>
          ) : null}
          <Reveal index={2}>
            <Line>{line}</Line>
          </Reveal>
        </View>
      );
    }
    case 'connection':
      return (
        <View className="flex-1 justify-center gap-6">
          <Reveal index={0}>
            <Headline>{t('insights.review.connection.title')}</Headline>
          </Reveal>
          <View className="flex-row gap-6">
            <Reveal index={1} style={{ flex: 1 }}>
              <View className="gap-1">
                <Overline>
                  {t('insights.review.connection.training', {
                    count: card.trainingDays,
                  })}
                </Overline>
                <Text
                  style={[textStyles.numericL, { color: fixedColors.lime }]}
                >
                  {card.avgProteinTrainingG}
                </Text>
                <Line>
                  {t('insights.review.connection.protein', {
                    grams: card.avgProteinTrainingG,
                  })}
                </Line>
              </View>
            </Reveal>
            <Reveal index={2} style={{ flex: 1 }}>
              <View className="gap-1">
                <Overline>
                  {t('insights.review.connection.rest', {
                    count: card.restDays,
                  })}
                </Overline>
                <Text style={[textStyles.numericL, { color: hero }]}>
                  {card.avgProteinRestG}
                </Text>
                <Line>
                  {t('insights.review.connection.protein', {
                    grams: card.avgProteinRestG,
                  })}
                </Line>
              </View>
            </Reveal>
          </View>
          <Reveal index={3}>
            <Line>{t('insights.review.connection.line')}</Line>
          </Reveal>
        </View>
      );
    case 'body': {
      const delta = ctx.toDisplay(Math.abs(card.trendDeltaKg));
      const flat = delta < 0.1;
      const sign = card.trendDeltaKg > 0 ? '+' : '-';
      return (
        <View className="flex-1 justify-center gap-4">
          <Reveal index={0}>
            <Headline>{t('insights.review.body.title')}</Headline>
          </Reveal>
          <Reveal index={1}>
            <Text style={[textStyles.numericL, { color: fixedColors.lime }]}>
              {flat
                ? t('rhythm.tideTable.trendFlat')
                : t('rhythm.tideTable.trend', {
                    value: `${sign}${delta}`,
                    unit: ctx.unit,
                  })}
            </Text>
          </Reveal>
          <Reveal index={2}>
            <Line>
              {t('insights.review.body.entries', { count: card.entries })}
            </Line>
          </Reveal>
          <Reveal index={3}>
            <Line>{t('insights.review.body.line')}</Line>
          </Reveal>
        </View>
      );
    }
    case 'rhythm':
      return (
        <View className="flex-1 justify-center gap-4">
          <Reveal index={0}>
            <Headline>{t('insights.review.rhythm.title')}</Headline>
          </Reveal>
          {ctx.showRhythm ? (
            <Reveal index={1}>
              <BigNumber value={card.current} />
            </Reveal>
          ) : null}
          <Reveal index={2}>
            <Text style={[textStyles.headline, { color: hero }]}>
              {ctx.showRhythm
                ? t('rhythm.counter', { count: card.current })
                : t('insights.review.rhythm.hidden')}
            </Text>
          </Reveal>
          <Reveal index={3}>
            <Line>{stageNames(t)[card.stageKey]}</Line>
          </Reveal>
          {card.graceUsed ? (
            <Reveal index={4}>
              <Line>{t('insights.review.rhythm.grace')}</Line>
            </Reveal>
          ) : null}
        </View>
      );
    case 'outlook': {
      const kind = card.suggestion;
      const showOffer =
        kind !== 'keep' &&
        !offerDone &&
        !offerHandledRecently(kind, ctx.weekStart);
      const apply = (delta: number) => {
        markOfferHandled(kind, ctx.weekStart);
        ctx.onSetTrainingGoal({
          ...card.goals,
          trainingDays: Math.max(1, card.goals.trainingDays + delta),
        });
        setOfferDone(true);
      };
      const skip = () => {
        markOfferHandled(kind, ctx.weekStart);
        setOfferDone(true);
      };
      return (
        <View className="flex-1 justify-center gap-5">
          <Reveal index={0}>
            <Headline>{t('insights.review.outlook.title')}</Headline>
          </Reveal>
          {card.goals.trainingDays > 0 ? (
            <Reveal index={1}>
              <Text style={[textStyles.title, { color: fixedColors.lime }]}>
                {t('rhythm.nextWeekQuestion', {
                  count: card.goals.trainingDays,
                })}
              </Text>
            </Reveal>
          ) : null}
          <Reveal index={2}>
            <View className="gap-1">
              <Overline>{t('insights.review.outlook.goalsTitle')}</Overline>
              <Line>
                {t('insights.review.outlook.food', {
                  count: card.goals.foodDays,
                })}
              </Line>
              {card.goals.trainingDays > 0 ? (
                <Line>
                  {t('insights.review.outlook.training', {
                    count: card.goals.trainingDays,
                  })}
                </Line>
              ) : null}
              <Line>
                {t('insights.review.outlook.protein', {
                  count: card.goals.proteinDays,
                })}
              </Line>
            </View>
          </Reveal>
          {showOffer ? (
            <Reveal index={3}>
              <View className="gap-3">
                <Text style={[textStyles.headline, { color: hero }]}>
                  {kind === 'lower'
                    ? t('rhythm.goalOffer.lowerTitle')
                    : t('rhythm.goalOffer.raiseTitle')}
                </Text>
                <Line>
                  {kind === 'lower'
                    ? t('rhythm.goalOffer.lowerBody')
                    : t('rhythm.goalOffer.raiseBody')}
                </Line>
                <View className="flex-row gap-3">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => apply(kind === 'lower' ? -1 : 1)}
                    className="min-h-11 justify-center rounded-full px-5"
                    style={{ backgroundColor: fixedColors.lime }}
                  >
                    <Text
                      style={[
                        textStyles.button,
                        {
                          color: fixedColors.ink,
                          fontFamily: fontFamily.display,
                        },
                      ]}
                    >
                      {kind === 'lower'
                        ? t('rhythm.goalOffer.lowerCta')
                        : t('rhythm.goalOffer.raiseCta')}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={skip}
                    className="min-h-11 justify-center px-3"
                  >
                    <Text style={[textStyles.button, { color: hero }]}>
                      {t('rhythm.goalOffer.keep')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Reveal>
          ) : offerDone ? (
            <Line>{t('insights.review.outlook.done')}</Line>
          ) : null}
        </View>
      );
    }
  }
}
