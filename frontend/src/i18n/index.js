import { createI18n } from 'vue-i18n';
import en from './en';
import kh from './kh';
import { persistGoogTransCookie } from '../services/autoTranslate';

// Get stored language or default to English
const getStoredLanguage = () => {
  try {
    const stored = localStorage.getItem('app_language');
    if (stored && (stored === 'en' || stored === 'kh')) {
      return stored;
    }
  } catch (e) {
    console.warn('Failed to get stored language:', e);
  }
  return 'en';
};

// Map the app's internal locale codes ('kh') to valid BCP-47 language tags
// ('km' is the ISO 639-1 code for Khmer) for the <html lang> attribute.
const toHtmlLang = (lang) => (lang === 'kh' ? 'km' : lang);

const i18n = createI18n({
  legacy: false,
  locale: getStoredLanguage(),
  fallbackLocale: 'en',
  globalInjection: true,
  messages: {
    en,
    kh,
  },
});

try {
  document.documentElement.lang = toHtmlLang(i18n.global.locale.value);
} catch (e) {
  console.warn('Failed to set document language:', e);
}

// Helper function to change language.
//
// Saves the choice and reloads the page. A reload is the only reliable way to
// switch every part of the app: on the next load vue-i18n paints all static
// UI text in the chosen language from the first frame (the `lang_switch_reload`
// session flag lets App.vue skip the splash screen so it feels instant).
// The `googtrans` cookie is also persisted so any Google Translate widget
// loaded later (for database-driven content) respects the chosen language.
export const setLanguage = (lang) => {
  if (lang === 'en' || lang === 'kh') {
    i18n.global.locale.value = lang;
    localStorage.setItem('app_language', lang);
    document.documentElement.lang = toHtmlLang(lang);

    // Persist the googtrans cookie (synchronously, without loading the
    // widget) so dynamic content keeps the chosen language after reload.
    persistGoogTransCookie(lang);

    if (typeof window !== 'undefined') {
      // Tell the app this reload is a language switch so it can skip the
      // splash screen and switch languages instantly.
      try {
        sessionStorage.setItem('lang_switch_reload', '1');
      } catch (e) {
        // Session storage unavailable — splash will play once, that's fine.
      }

      // Tiny delay so the click handler finishes and the cookie / storage
      // writes are fully flushed before the page reloads.
      window.setTimeout(() => window.location.reload(), 120);
    }
  }
};

// Helper function to get current language
export const getCurrentLanguage = () => {
  return i18n.global.locale.value;
};

export default i18n;
