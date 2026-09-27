import 'i18next';

import de from './locales/de.json';

/**
 * Type-safe `t('key')` across the app. `de.json` is the reference shape —
 * every other locale (see the registry in `src/i18n/index.ts`) must match it.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof de;
    };
  }
}
