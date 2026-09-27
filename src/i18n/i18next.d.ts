import 'i18next';

import type { deTranslation } from './index';

/**
 * Type-safe `t('key')` across the app. the merged German translation (`deTranslation`) is the reference shape —
 * every other locale (see the registry in `src/i18n/index.ts`) must match it.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof deTranslation;
    };
  }
}
