import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './locales/de.json';
import deAccount from './locales/de/account.json';
import deExercise from './locales/de/exercise.json';
import deFood from './locales/de/food.json';
import deNotifications from './locales/de/notifications.json';
import deWorkout from './locales/de/workout.json';
import en from './locales/en.json';
import enAccount from './locales/en/account.json';
import enExercise from './locales/en/exercise.json';
import enFood from './locales/en/food.json';
import enNotifications from './locales/en/notifications.json';
import enWorkout from './locales/en/workout.json';

/**
 * Each language = the base file (`<code>.json`: common, tabs, screen titles)
 * plus one file per feature (`<code>/<feature>.json`), merged under the
 * feature's key: `t('food.review.title')`, `t('exercise.bench_press')`.
 * Feature files keep parallel work on different features conflict-free.
 */
export const deTranslation = {
  ...de,
  account: deAccount,
  exercise: deExercise,
  food: deFood,
  notifications: deNotifications,
  workout: deWorkout,
};

const enTranslation = {
  ...en,
  account: enAccount,
  exercise: enExercise,
  food: enFood,
  notifications: enNotifications,
  workout: enWorkout,
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
