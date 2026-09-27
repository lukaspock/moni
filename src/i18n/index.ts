import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './locales/de.json';
import en from './locales/en.json';

/**
 * Language registry. To add a new language:
 *   1. Add `src/i18n/locales/<code>.json` (same key shape as `de.json`).
 *   2. Add one entry below.
 * That's it — device-language detection and the fallback to `en` pick it up
 * automatically. See PLAN.md §7.9.
 */
export const resources = {
  de: { translation: de },
  en: { translation: en },
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
