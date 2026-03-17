import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend)         // fetches translations via HTTP — not bundled into JS
  .use(LanguageDetector)    // reads localStorage['lang'] or browser language
  .use(initReactI18next)
  .init({
    // ── Where to load translations from ─────────────────────────────────────
    // Right now: served from /public (your own hosting).
    // To go fully remote (Crowdin OTA, your CDN, S3, etc.):
    //   just replace this URL — nothing else changes.
    backend: {
      loadPath: '/locales/{{lng}}/translation.json',
    },

    fallbackLng: 'en',
    supportedLngs: ['en', 'ta'],

    keySeparator: false,   // "nav.dashboard" is a flat key, not nav > dashboard
    nsSeparator: false,

    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'lang',
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
