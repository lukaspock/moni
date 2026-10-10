import type { TFunction } from 'i18next';

import type {
  AchievementId,
  DaySentenceKey,
  GreetingSlot,
  NextStepKind,
  MealType,
} from '@/domain';

// Records of literal `t()` calls (typed keys do not allow template literals).

export function greetingText(
  t: TFunction,
  slot: GreetingSlot,
  name: string | null,
): string {
  const n = name?.trim() || null;
  const map: Record<GreetingSlot, [string, string]> = {
    morning: [
      t('identity.greeting.morning.withName', { name: n }),
      t('identity.greeting.morning.noName'),
    ],
    midday: [
      t('identity.greeting.midday.withName', { name: n }),
      t('identity.greeting.midday.noName'),
    ],
    afternoon: [
      t('identity.greeting.afternoon.withName', { name: n }),
      t('identity.greeting.afternoon.noName'),
    ],
    evening: [
      t('identity.greeting.evening.withName', { name: n }),
      t('identity.greeting.evening.noName'),
    ],
    night: [
      t('identity.greeting.night.withName', { name: n }),
      t('identity.greeting.night.noName'),
    ],
  };
  return n ? map[slot][0] : map[slot][1];
}

export function daySentenceText(
  t: TFunction,
  key: DaySentenceKey,
  variant: 0 | 1 | 2,
  vars: { kcal: string; weekday: string; date: string },
): string {
  const map: Record<DaySentenceKey, [string, string, string]> = {
    welcomeBack: [
      t('identity.daySentence.welcomeBack.0', vars),
      t('identity.daySentence.welcomeBack.1', vars),
      t('identity.daySentence.welcomeBack.2', vars),
    ],
    night: [
      t('identity.daySentence.night.0', vars),
      t('identity.daySentence.night.1', vars),
      t('identity.daySentence.night.2', vars),
    ],
    bridgeToFood: [
      t('identity.daySentence.bridgeToFood.0', vars),
      t('identity.daySentence.bridgeToFood.1', vars),
      t('identity.daySentence.bridgeToFood.2', vars),
    ],
    trainingGrewLimit: [
      t('identity.daySentence.trainingGrewLimit.0', vars),
      t('identity.daySentence.trainingGrewLimit.1', vars),
      t('identity.daySentence.trainingGrewLimit.2', vars),
    ],
    trainingDay: [
      t('identity.daySentence.trainingDay.0', vars),
      t('identity.daySentence.trainingDay.1', vars),
      t('identity.daySentence.trainingDay.2', vars),
    ],
    restDay: [
      t('identity.daySentence.restDay.0', vars),
      t('identity.daySentence.restDay.1', vars),
      t('identity.daySentence.restDay.2', vars),
    ],
    balanced: [
      t('identity.daySentence.balanced.0', vars),
      t('identity.daySentence.balanced.1', vars),
      t('identity.daySentence.balanced.2', vars),
    ],
    rhythmReached: [
      t('identity.daySentence.taktReached.0', vars),
      t('identity.daySentence.taktReached.1', vars),
      t('identity.daySentence.taktReached.2', vars),
    ],
    monday: [
      t('identity.daySentence.monday.0', vars),
      t('identity.daySentence.monday.1', vars),
      t('identity.daySentence.monday.2', vars),
    ],
    friday: [
      t('identity.daySentence.friday.0', vars),
      t('identity.daySentence.friday.1', vars),
      t('identity.daySentence.friday.2', vars),
    ],
    sunday: [
      t('identity.daySentence.sunday.0', vars),
      t('identity.daySentence.sunday.1', vars),
      t('identity.daySentence.sunday.2', vars),
    ],
    default: [
      t('identity.daySentence.default.0', vars),
      t('identity.daySentence.default.1', vars),
      t('identity.daySentence.default.2', vars),
    ],
  };
  return map[key][variant];
}

export function nextStepText(
  t: TFunction,
  kind: Exclude<NextStepKind, 'none'>,
  mealType: MealType | undefined,
): { title: string; body: string; cta: string } {
  const meal: Record<MealType, { title: string; body: string; cta: string }> = {
    breakfast: {
      title: t('identity.nextStep.logMeal.breakfast.title'),
      body: t('identity.nextStep.logMeal.breakfast.body'),
      cta: t('identity.nextStep.logMeal.breakfast.cta'),
    },
    lunch: {
      title: t('identity.nextStep.logMeal.lunch.title'),
      body: t('identity.nextStep.logMeal.lunch.body'),
      cta: t('identity.nextStep.logMeal.lunch.cta'),
    },
    dinner: {
      title: t('identity.nextStep.logMeal.dinner.title'),
      body: t('identity.nextStep.logMeal.dinner.body'),
      cta: t('identity.nextStep.logMeal.dinner.cta'),
    },
    snack: {
      title: t('identity.nextStep.logMeal.snack.title'),
      body: t('identity.nextStep.logMeal.snack.body'),
      cta: t('identity.nextStep.logMeal.snack.cta'),
    },
  };
  switch (kind) {
    case 'logWeight':
      return {
        title: t('identity.nextStep.logWeight.title'),
        body: t('identity.nextStep.logWeight.body'),
        cta: t('identity.nextStep.logWeight.cta'),
      };
    case 'proteinBridge':
      return {
        title: t('identity.nextStep.proteinBridge.title'),
        body: t('identity.nextStep.proteinBridge.body'),
        cta: t('identity.nextStep.proteinBridge.cta'),
      };
    case 'startWorkout':
      return {
        title: t('identity.nextStep.startWorkout.title'),
        body: t('identity.nextStep.startWorkout.body'),
        cta: t('identity.nextStep.startWorkout.cta'),
      };
    case 'closeDay':
      return {
        title: t('identity.nextStep.closeDay.title'),
        body: t('identity.nextStep.closeDay.body'),
        cta: t('identity.nextStep.closeDay.cta'),
      };
    case 'weeklyReview':
      return {
        title: t('identity.nextStep.weeklyReview.title'),
        body: t('identity.nextStep.weeklyReview.body'),
        cta: t('identity.nextStep.weeklyReview.cta'),
      };
    case 'logMeal':
      return meal[mealType ?? 'snack'];
  }
}

export function achievementText(
  t: TFunction,
  id: AchievementId,
): { name: string; celebrate: string } {
  const map: Record<AchievementId, { name: string; celebrate: string }> = {
    firstWorkout: {
      name: t('achievements.firstWorkout.name'),
      celebrate: t('achievements.firstWorkout.celebrate'),
    },
    workouts10: {
      name: t('achievements.workouts10.name'),
      celebrate: t('achievements.workouts10.celebrate'),
    },
    workouts50: {
      name: t('achievements.workouts50.name'),
      celebrate: t('achievements.workouts50.celebrate'),
    },
    workouts100: {
      name: t('achievements.workouts100.name'),
      celebrate: t('achievements.workouts100.celebrate'),
    },
    firstPr: {
      name: t('achievements.firstPr.name'),
      celebrate: t('achievements.firstPr.celebrate'),
    },
    volume10t: {
      name: t('achievements.volume10t.name'),
      celebrate: t('achievements.volume10t.celebrate'),
    },
    plusTen: {
      name: t('achievements.plusTen.name'),
      celebrate: t('achievements.plusTen.celebrate'),
    },
    allRounder: {
      name: t('achievements.allRounder.name'),
      celebrate: t('achievements.allRounder.celebrate'),
    },
    firstMeal: {
      name: t('achievements.firstMeal.name'),
      celebrate: t('achievements.firstMeal.celebrate'),
    },
    threeMeals: {
      name: t('achievements.threeMeals.name'),
      celebrate: t('achievements.threeMeals.celebrate'),
    },
    meals100: {
      name: t('achievements.meals100.name'),
      celebrate: t('achievements.meals100.celebrate'),
    },
    meals500: {
      name: t('achievements.meals500.name'),
      celebrate: t('achievements.meals500.celebrate'),
    },
    wellFuelled: {
      name: t('achievements.wellFuelled.name'),
      celebrate: t('achievements.wellFuelled.celebrate'),
    },
    proteinWeek: {
      name: t('achievements.proteinWeek.name'),
      celebrate: t('achievements.proteinWeek.celebrate'),
    },
    proteinStreak4: {
      name: t('achievements.proteinStreak4.name'),
      celebrate: t('achievements.proteinStreak4.celebrate'),
    },
    bridgeDay: {
      name: t('achievements.bridgeDay.name'),
      celebrate: t('achievements.bridgeDay.celebrate'),
    },
    firstRhythm: {
      name: t('achievements.firstRhythm.name'),
      celebrate: t('achievements.firstRhythm.celebrate'),
    },
    rhythm4: {
      name: t('achievements.rhythm4.name'),
      celebrate: t('achievements.rhythm4.celebrate'),
    },
    rhythm12: {
      name: t('achievements.rhythm12.name'),
      celebrate: t('achievements.rhythm12.celebrate'),
    },
    rhythm26: {
      name: t('achievements.rhythm26.name'),
      celebrate: t('achievements.rhythm26.celebrate'),
    },
    fullWeek: {
      name: t('achievements.fullWeek.name'),
      celebrate: t('achievements.fullWeek.celebrate'),
    },
    fullWeek4: {
      name: t('achievements.fullWeek4.name'),
      celebrate: t('achievements.fullWeek4.celebrate'),
    },
    comeback: {
      name: t('achievements.comeback.name'),
      celebrate: t('achievements.comeback.celebrate'),
    },
    goodPause: {
      name: t('achievements.goodPause.name'),
      celebrate: t('achievements.goodPause.celebrate'),
    },
    weekendKeeper: {
      name: t('achievements.weekendKeeper.name'),
      celebrate: t('achievements.weekendKeeper.celebrate'),
    },
    fullMonth: {
      name: t('achievements.fullMonth.name'),
      celebrate: t('achievements.fullMonth.celebrate'),
    },
    firstWeigh: {
      name: t('achievements.firstWeigh.name'),
      celebrate: t('achievements.firstWeigh.celebrate'),
    },
    trendReady: {
      name: t('achievements.trendReady.name'),
      celebrate: t('achievements.trendReady.celebrate'),
    },
    adaptiveOn: {
      name: t('achievements.adaptiveOn.name'),
      celebrate: t('achievements.adaptiveOn.celebrate'),
    },
    bodyGoal2kg: {
      name: t('achievements.bodyGoal2kg.name'),
      celebrate: t('achievements.bodyGoal2kg.celebrate'),
    },
    strongAsYou: {
      name: t('achievements.strongAsYou.name'),
      celebrate: t('achievements.strongAsYou.celebrate'),
    },
    goalReached: {
      name: t('achievements.goalReached.name'),
      celebrate: t('achievements.goalReached.celebrate'),
    },
    firstPhoto: {
      name: t('achievements.firstPhoto.name'),
      celebrate: t('achievements.firstPhoto.celebrate'),
    },
    firstVoice: {
      name: t('achievements.firstVoice.name'),
      celebrate: t('achievements.firstVoice.celebrate'),
    },
    firstLabel: {
      name: t('achievements.firstLabel.name'),
      celebrate: t('achievements.firstLabel.celebrate'),
    },
    scanner25: {
      name: t('achievements.scanner25.name'),
      celebrate: t('achievements.scanner25.celebrate'),
    },
    firstFavorite: {
      name: t('achievements.firstFavorite.name'),
      celebrate: t('achievements.firstFavorite.celebrate'),
    },
    ownExercise: {
      name: t('achievements.ownExercise.name'),
      celebrate: t('achievements.ownExercise.celebrate'),
    },
    healthLinked: {
      name: t('achievements.healthLinked.name'),
      celebrate: t('achievements.healthLinked.celebrate'),
    },
    patternFound: {
      name: t('achievements.patternFound.name'),
      celebrate: t('achievements.patternFound.celebrate'),
    },
    reviews4: {
      name: t('achievements.reviews4.name'),
      celebrate: t('achievements.reviews4.celebrate'),
    },
    sharedFirst: {
      name: t('achievements.sharedFirst.name'),
      celebrate: t('achievements.sharedFirst.celebrate'),
    },
    oneYear: {
      name: t('achievements.oneYear.name'),
      celebrate: t('achievements.oneYear.celebrate'),
    },
  };
  return map[id];
}
