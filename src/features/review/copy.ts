import type { TFunction } from 'i18next';

import type { AchievementId, StageKey, WeekTitleKey } from '@/domain';

// Typed i18n keys do not allow template literals, so every lookup is a literal t() call.

export interface AchievementCopy {
  name: string;
  desc: string;
  celebrate: string;
}

export function achievementCopy(
  t: TFunction,
): Record<AchievementId, AchievementCopy> {
  return {
    firstWorkout: {
      name: t('achievements.firstWorkout.name'),
      desc: t('achievements.firstWorkout.desc'),
      celebrate: t('achievements.firstWorkout.celebrate'),
    },
    workouts10: {
      name: t('achievements.workouts10.name'),
      desc: t('achievements.workouts10.desc'),
      celebrate: t('achievements.workouts10.celebrate'),
    },
    workouts50: {
      name: t('achievements.workouts50.name'),
      desc: t('achievements.workouts50.desc'),
      celebrate: t('achievements.workouts50.celebrate'),
    },
    workouts100: {
      name: t('achievements.workouts100.name'),
      desc: t('achievements.workouts100.desc'),
      celebrate: t('achievements.workouts100.celebrate'),
    },
    firstPr: {
      name: t('achievements.firstPr.name'),
      desc: t('achievements.firstPr.desc'),
      celebrate: t('achievements.firstPr.celebrate'),
    },
    volume10t: {
      name: t('achievements.volume10t.name'),
      desc: t('achievements.volume10t.desc'),
      celebrate: t('achievements.volume10t.celebrate'),
    },
    plusTen: {
      name: t('achievements.plusTen.name'),
      desc: t('achievements.plusTen.desc'),
      celebrate: t('achievements.plusTen.celebrate'),
    },
    allRounder: {
      name: t('achievements.allRounder.name'),
      desc: t('achievements.allRounder.desc'),
      celebrate: t('achievements.allRounder.celebrate'),
    },
    firstMeal: {
      name: t('achievements.firstMeal.name'),
      desc: t('achievements.firstMeal.desc'),
      celebrate: t('achievements.firstMeal.celebrate'),
    },
    threeMeals: {
      name: t('achievements.threeMeals.name'),
      desc: t('achievements.threeMeals.desc'),
      celebrate: t('achievements.threeMeals.celebrate'),
    },
    meals100: {
      name: t('achievements.meals100.name'),
      desc: t('achievements.meals100.desc'),
      celebrate: t('achievements.meals100.celebrate'),
    },
    meals500: {
      name: t('achievements.meals500.name'),
      desc: t('achievements.meals500.desc'),
      celebrate: t('achievements.meals500.celebrate'),
    },
    wellFuelled: {
      name: t('achievements.wellFuelled.name'),
      desc: t('achievements.wellFuelled.desc'),
      celebrate: t('achievements.wellFuelled.celebrate'),
    },
    proteinWeek: {
      name: t('achievements.proteinWeek.name'),
      desc: t('achievements.proteinWeek.desc'),
      celebrate: t('achievements.proteinWeek.celebrate'),
    },
    proteinStreak4: {
      name: t('achievements.proteinStreak4.name'),
      desc: t('achievements.proteinStreak4.desc'),
      celebrate: t('achievements.proteinStreak4.celebrate'),
    },
    bridgeDay: {
      name: t('achievements.bridgeDay.name'),
      desc: t('achievements.bridgeDay.desc'),
      celebrate: t('achievements.bridgeDay.celebrate'),
    },
    firstRhythm: {
      name: t('achievements.firstRhythm.name'),
      desc: t('achievements.firstRhythm.desc'),
      celebrate: t('achievements.firstRhythm.celebrate'),
    },
    rhythm4: {
      name: t('achievements.rhythm4.name'),
      desc: t('achievements.rhythm4.desc'),
      celebrate: t('achievements.rhythm4.celebrate'),
    },
    rhythm12: {
      name: t('achievements.rhythm12.name'),
      desc: t('achievements.rhythm12.desc'),
      celebrate: t('achievements.rhythm12.celebrate'),
    },
    rhythm26: {
      name: t('achievements.rhythm26.name'),
      desc: t('achievements.rhythm26.desc'),
      celebrate: t('achievements.rhythm26.celebrate'),
    },
    fullWeek: {
      name: t('achievements.fullWeek.name'),
      desc: t('achievements.fullWeek.desc'),
      celebrate: t('achievements.fullWeek.celebrate'),
    },
    fullWeek4: {
      name: t('achievements.fullWeek4.name'),
      desc: t('achievements.fullWeek4.desc'),
      celebrate: t('achievements.fullWeek4.celebrate'),
    },
    comeback: {
      name: t('achievements.comeback.name'),
      desc: t('achievements.comeback.desc'),
      celebrate: t('achievements.comeback.celebrate'),
    },
    goodPause: {
      name: t('achievements.goodPause.name'),
      desc: t('achievements.goodPause.desc'),
      celebrate: t('achievements.goodPause.celebrate'),
    },
    weekendKeeper: {
      name: t('achievements.weekendKeeper.name'),
      desc: t('achievements.weekendKeeper.desc'),
      celebrate: t('achievements.weekendKeeper.celebrate'),
    },
    fullMonth: {
      name: t('achievements.fullMonth.name'),
      desc: t('achievements.fullMonth.desc'),
      celebrate: t('achievements.fullMonth.celebrate'),
    },
    firstWeigh: {
      name: t('achievements.firstWeigh.name'),
      desc: t('achievements.firstWeigh.desc'),
      celebrate: t('achievements.firstWeigh.celebrate'),
    },
    trendReady: {
      name: t('achievements.trendReady.name'),
      desc: t('achievements.trendReady.desc'),
      celebrate: t('achievements.trendReady.celebrate'),
    },
    adaptiveOn: {
      name: t('achievements.adaptiveOn.name'),
      desc: t('achievements.adaptiveOn.desc'),
      celebrate: t('achievements.adaptiveOn.celebrate'),
    },
    bodyGoal2kg: {
      name: t('achievements.bodyGoal2kg.name'),
      desc: t('achievements.bodyGoal2kg.desc'),
      celebrate: t('achievements.bodyGoal2kg.celebrate'),
    },
    strongAsYou: {
      name: t('achievements.strongAsYou.name'),
      desc: t('achievements.strongAsYou.desc'),
      celebrate: t('achievements.strongAsYou.celebrate'),
    },
    goalReached: {
      name: t('achievements.goalReached.name'),
      desc: t('achievements.goalReached.desc'),
      celebrate: t('achievements.goalReached.celebrate'),
    },
    firstPhoto: {
      name: t('achievements.firstPhoto.name'),
      desc: t('achievements.firstPhoto.desc'),
      celebrate: t('achievements.firstPhoto.celebrate'),
    },
    firstVoice: {
      name: t('achievements.firstVoice.name'),
      desc: t('achievements.firstVoice.desc'),
      celebrate: t('achievements.firstVoice.celebrate'),
    },
    firstLabel: {
      name: t('achievements.firstLabel.name'),
      desc: t('achievements.firstLabel.desc'),
      celebrate: t('achievements.firstLabel.celebrate'),
    },
    scanner25: {
      name: t('achievements.scanner25.name'),
      desc: t('achievements.scanner25.desc'),
      celebrate: t('achievements.scanner25.celebrate'),
    },
    firstFavorite: {
      name: t('achievements.firstFavorite.name'),
      desc: t('achievements.firstFavorite.desc'),
      celebrate: t('achievements.firstFavorite.celebrate'),
    },
    ownExercise: {
      name: t('achievements.ownExercise.name'),
      desc: t('achievements.ownExercise.desc'),
      celebrate: t('achievements.ownExercise.celebrate'),
    },
    healthLinked: {
      name: t('achievements.healthLinked.name'),
      desc: t('achievements.healthLinked.desc'),
      celebrate: t('achievements.healthLinked.celebrate'),
    },
    patternFound: {
      name: t('achievements.patternFound.name'),
      desc: t('achievements.patternFound.desc'),
      celebrate: t('achievements.patternFound.celebrate'),
    },
    reviews4: {
      name: t('achievements.reviews4.name'),
      desc: t('achievements.reviews4.desc'),
      celebrate: t('achievements.reviews4.celebrate'),
    },
    sharedFirst: {
      name: t('achievements.sharedFirst.name'),
      desc: t('achievements.sharedFirst.desc'),
      celebrate: t('achievements.sharedFirst.celebrate'),
    },
    oneYear: {
      name: t('achievements.oneYear.name'),
      desc: t('achievements.oneYear.desc'),
      celebrate: t('achievements.oneYear.celebrate'),
    },
  };
}

export function stageNames(t: TFunction): Record<StageKey, string> {
  return {
    warmup: t('rhythm.stage.name.warmup'),
    inTune: t('rhythm.stage.name.inTune'),
    inStep: t('rhythm.stage.name.inStep'),
    inSync: t('rhythm.stage.name.inSync'),
    metronome: t('rhythm.stage.name.metronome'),
    original: t('rhythm.stage.name.original'),
  };
}

export function stageDescriptions(t: TFunction): Record<StageKey, string> {
  return {
    warmup: t('rhythm.stage.desc.warmup'),
    inTune: t('rhythm.stage.desc.inTune'),
    inStep: t('rhythm.stage.desc.inStep'),
    inSync: t('rhythm.stage.desc.inSync'),
    metronome: t('rhythm.stage.desc.metronome'),
    original: t('rhythm.stage.desc.original'),
  };
}

export function weekTitles(t: TFunction): Record<WeekTitleKey, string> {
  return {
    full: t('insights.review.title.full'),
    strength: t('insights.review.title.strength'),
    recovery: t('insights.review.title.recovery'),
    restart: t('insights.review.title.restart'),
    quiet: t('insights.review.title.quiet'),
  };
}

export function weekTitleLines(t: TFunction): Record<WeekTitleKey, string> {
  return {
    full: t('insights.review.titleLine.full'),
    strength: t('insights.review.titleLine.strength'),
    recovery: t('insights.review.titleLine.recovery'),
    restart: t('insights.review.titleLine.restart'),
    quiet: t('insights.review.titleLine.quiet'),
  };
}
