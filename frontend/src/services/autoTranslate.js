const GOOGLE_CONTAINER_ID = 'google_translate_element';
const GOOGLE_SCRIPT_ID = 'google-translate-script';
const GOOGLE_STYLE_ID = 'google-translate-style';
const RESET_FLAG_KEY = 'auto_translate_reset_en_once';

let googleScriptPromise = null;
let googleWidgetReadyPromise = null;
let bannerObserver = null;

const languageMap = {
  en: 'en',
  kh: 'km',
};

const ensureHiddenContainer = () => {
  if (typeof document === 'undefined') return;

  let container = document.getElementById(GOOGLE_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = GOOGLE_CONTAINER_ID;
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '1px';
    container.style.height = '1px';
    container.style.overflow = 'hidden';
    container.style.opacity = '0';
    container.setAttribute('aria-hidden', 'true');
    document.body.appendChild(container);
  }
};

const ensureGoogleStyles = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById(GOOGLE_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = GOOGLE_STYLE_ID;
  style.textContent = `
    .goog-te-banner-frame.skiptranslate { display: none !important; }
    .goog-te-banner-frame { display: none !important; }
    iframe.goog-te-banner-frame { display: none !important; visibility: hidden !important; }
    .skiptranslate iframe { display: none !important; }
    body > .skiptranslate { display: none !important; }
    body { top: 0 !important; }
    html { top: 0 !important; }
    .goog-logo-link, .goog-te-gadget span { display: none !important; }
    .goog-te-gadget { font-size: 0 !important; }
  `;
  document.head.appendChild(style);
};

const hideGoogleBannerNow = () => {
  if (typeof document === 'undefined') return;

  const nodes = document.querySelectorAll(
    '.goog-te-banner-frame, iframe.goog-te-banner-frame, body > .skiptranslate'
  );

  nodes.forEach((node) => {
    node.style.setProperty('display', 'none', 'important');
    node.style.setProperty('visibility', 'hidden', 'important');
    node.style.setProperty('height', '0', 'important');
    node.style.setProperty('min-height', '0', 'important');
  });

  if (document.body) {
    document.body.style.setProperty('top', '0px', 'important');
    document.body.style.removeProperty('margin-top');
    document.body.style.removeProperty('padding-top');
  }

  if (document.documentElement) {
    document.documentElement.style.setProperty('top', '0px', 'important');
  }
};

const ensureBannerBlocker = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (bannerObserver) return;

  hideGoogleBannerNow();

  bannerObserver = new MutationObserver(() => {
    hideGoogleBannerNow();
  });

  bannerObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class'],
  });
};

const setGoogTransCookie = (targetLang) => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const value = `/en/${targetLang}`;
  const maxAge = 60 * 60 * 24 * 30;
  const hostname = window.location.hostname;

  document.cookie = `googtrans=${value};path=/;max-age=${maxAge}`;

  if (hostname && hostname.includes('.')) {
    document.cookie = `googtrans=${value};path=/;domain=.${hostname};max-age=${maxAge}`;
  }
};

const clearGoogTransCookie = () => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const hostname = window.location.hostname;
  document.cookie = 'googtrans=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT';
  if (hostname && hostname.includes('.')) {
    document.cookie = `googtrans=;path=/;domain=.${hostname};expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
};

const loadGoogleTranslateScript = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve();
  }

  if (window.google?.translate?.TranslateElement) {
    return Promise.resolve();
  }

  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Translate script')), { once: true });
      return;
    }

    const callbackName = '__googleTranslateInitCallback';
    window[callbackName] = () => resolve();

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.async = true;
    script.src = `https://translate.google.com/translate_a/element.js?cb=${callbackName}`;
    script.onerror = () => reject(new Error('Failed to load Google Translate script'));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
};

const ensureGoogleWidget = async () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (googleWidgetReadyPromise) return googleWidgetReadyPromise;

  googleWidgetReadyPromise = (async () => {
    ensureHiddenContainer();
    ensureGoogleStyles();
    ensureBannerBlocker();
    await loadGoogleTranslateScript();

    if (!window.google?.translate?.TranslateElement) return;

    if (!window.__googleTranslateWidgetReady) {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: 'en,km',
          autoDisplay: false,
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        },
        GOOGLE_CONTAINER_ID
      );
      window.__googleTranslateWidgetReady = true;
    }
  })();

  return googleWidgetReadyPromise;
};

const triggerLanguageSelection = (targetLangCode) => {
  const select = document.querySelector('.goog-te-combo');
  if (!select) return false;

  select.value = targetLangCode;
  select.dispatchEvent(new Event('change'));
  return true;
};

// Synchronously persist the googtrans cookie for a language without loading
// the Google Translate widget (used right before a page reload, where loading
// the widget would just be discarded).
export const persistGoogTransCookie = (lang) => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const targetLangCode = languageMap[lang] || 'en';
  if (targetLangCode === 'en') {
    // Switching back to English: drop any stale translation cookie first.
    clearGoogTransCookie();
  }
  setGoogTransCookie(targetLangCode);
};

export const applyAutoTranslate = async (lang) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const targetLangCode = languageMap[lang] || 'en';

  if (targetLangCode === 'en') {
    clearGoogTransCookie();
    setGoogTransCookie('en');

    // Reset Google Translate widget to English without reload
    if (!triggerLanguageSelection('en')) {
      // If widget isn't ready yet, retry after a short delay
      setTimeout(() => triggerLanguageSelection('en'), 200);
    }

    // Clean up Google Translate DOM artifacts
    const translatedClass = document.documentElement.classList.contains('translated-ltr')
      || document.documentElement.classList.contains('translated-rtl');
    if (translatedClass) {
      document.documentElement.classList.remove('translated-ltr', 'translated-rtl');
    }

    sessionStorage.removeItem(RESET_FLAG_KEY);
  } else {
    sessionStorage.removeItem(RESET_FLAG_KEY);
  }

  setGoogTransCookie(targetLangCode);

  try {
    ensureGoogleStyles();
    ensureBannerBlocker();
    hideGoogleBannerNow();
    await ensureGoogleWidget();

    if (triggerLanguageSelection(targetLangCode)) return;

    // Widget select may appear asynchronously after script init.
    let attempts = 0;
    const maxAttempts = 20;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (triggerLanguageSelection(targetLangCode) || attempts >= maxAttempts) {
        window.clearInterval(timer);
      }
    }, 150);
  } catch (error) {
    console.warn('Auto translation unavailable:', error);
  }
};
