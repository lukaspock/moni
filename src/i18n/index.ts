import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './locales/de.json';
import deAccount from './locales/de/account.json';
import deAchievements from './locales/de/achievements.json';
import deExercise from './locales/de/exercise.json';
import deFood from './locales/de/food.json';
import deInsights from './locales/de/insights.json';
import deHealth from './locales/de/health.json';
import deIdentity from './locales/de/identity.json';
import deNotifications from './locales/de/notifications.json';
import deNudges from './locales/de/nudges.json';
import deRhythm from './locales/de/rhythm.json';
import deWorkout from './locales/de/workout.json';
import deRoutineEditor from './locales/de/routineEditor.json';
import deTrainingSetup from './locales/de/trainingSetup.json';
import deWorkoutLive from './locales/de/workoutLive.json';
import en from './locales/en.json';
import enAccount from './locales/en/account.json';
import enAchievements from './locales/en/achievements.json';
import enExercise from './locales/en/exercise.json';
import enFood from './locales/en/food.json';
import enInsights from './locales/en/insights.json';
import enHealth from './locales/en/health.json';
import enIdentity from './locales/en/identity.json';
import enNotifications from './locales/en/notifications.json';
import enNudges from './locales/en/nudges.json';
import enRhythm from './locales/en/rhythm.json';
import enWorkout from './locales/en/workout.json';
import enRoutineEditor from './locales/en/routineEditor.json';
import enTrainingSetup from './locales/en/trainingSetup.json';
import enWorkoutLive from './locales/en/workoutLive.json';

/**
 * Each language = the base file (`<code>.json`: common, tabs, screen titles)
 * plus one file per feature (`<code>/<feature>.json`), merged under the
 * feature's key: `t('food.review.title')`, `t('exercise.bench_press')`.
 * Feature files keep parallel work on different features conflict-free.
 */
export const deTranslation = {
  ...de,
  account: deAccount,
  achievements: deAchievements,
  exercise: deExercise,
  food: deFood,
  insights: deInsights,
  health: deHealth,
  identity: deIdentity,
  notifications: deNotifications,
  nudges: deNudges,
  rhythm: deRhythm,
  workout: deWorkout,
  routineEditor: deRoutineEditor,
  trainingSetup: deTrainingSetup,
  workoutLive: deWorkoutLive,
};

const enTranslation = {
  ...en,
  account: enAccount,
  achievements: enAchievements,
  exercise: enExercise,
  food: enFood,
  insights: enInsights,
  health: enHealth,
  identity: enIdentity,
  notifications: enNotifications,
  nudges: enNudges,
  rhythm: enRhythm,
  workout: enWorkout,
  routineEditor: enRoutineEditor,
  trainingSetup: enTrainingSetup,
  workoutLive: enWorkoutLive,
};

/**
 * Language registry. To add a new language:
 *   1. Add `src/i18n/locales/<code>.json` + `src/i18n/locales/<code>/*.json`
 *      (same key shape as the `de` files) and merge them like `deTranslation`.
 *   2. Add one entry below.
 * That's it — device-language detection and the fallback to `en` pick it up
 * automatically. See PLAN.md §7.9.
 */
export const resources = {
  de: { translation: deTranslation },
  en: { translation: enTranslation },
} as const;

export const supportedLanguages = Object.keys(
  resources,
) as (keyof typeof resources)[];

export const fallbackLanguage = 'en' satisfies keyof typeof resources;

function detectDeviceLanguage(): keyof typeof resources {
  const deviceLanguageCode = Localization.getLocales()[0]?.languageCode;
  const match = supportedLanguages.find(
    (language) => language === deviceLanguageCode,
  );
  return match ?? fallbackLanguage;
}

// eslint-disable-next-line import/no-named-as-default-member -- `i18n.use` is the documented i18next API, not the named `use` export.
void i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLanguage(),
  fallbackLng: fallbackLanguage,
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
});

export default i18n;
