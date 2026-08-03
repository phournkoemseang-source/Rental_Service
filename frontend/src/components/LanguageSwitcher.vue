<template>
  <div
    class="lang-switcher"
    :class="`lang-switcher--${variant}`"
    role="group"
    :aria-label="t('selectLanguage')"
  >
    <button
      v-for="lang in languages"
      :key="lang.code"
      type="button"
      class="lang-switcher__btn notranslate"
      :class="{ 'lang-switcher__btn--active': currentLang === lang.code }"
      :title="lang.label"
      :aria-label="lang.label"
      :aria-pressed="currentLang === lang.code"
      translate="no"
      @click="switchLang(lang.code)"
    >
      <span class="lang-switcher__flag" aria-hidden="true" v-html="lang.flag"></span>
      <span v-if="variant === 'pill'" class="lang-switcher__label">{{ lang.code === 'en' ? 'EN' : 'KH' }}</span>
      <span v-else class="lang-switcher__label">{{ lang.code === 'en' ? t('english') : t('khmer') }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLanguage } from '@/i18n'

defineProps({
  variant: {
    type: String,
    default: 'pill',
    validator: (value) => ['pill', 'wide', 'list'].includes(value),
  },
})

const { t, locale } = useI18n()
const currentLang = computed(() => locale.value)

// Inline SVG flags (no external assets needed, render reliably on all platforms)
const US_FLAG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="3" height="2" fill="#fff"/><g fill="#b22234"><rect width="3" height="0.1538"/><rect y="0.3077" width="3" height="0.1538"/><rect y="0.6154" width="3" height="0.1538"/><rect y="0.9231" width="3" height="0.1538"/><rect y="1.2308" width="3" height="0.1538"/><rect y="1.5385" width="3" height="0.1538"/><rect y="1.8462" width="3" height="0.1538"/></g><rect width="1.26" height="1.077" fill="#3c3b6e"/></svg>'

const KH_FLAG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="3" height="2" fill="#e00025"/><rect width="3" height="0.5" fill="#032ea1"/><rect y="1.5" width="3" height="0.5" fill="#032ea1"/><path fill="#fff" d="M1.15.55h.7v.9h-.7z"/><path fill="#fff" d="M1.02.65h.28v.72h-.28zM1.7.65h.28v.72H1.7z"/></svg>'

const languages = [
  { code: 'en', label: 'English', flag: US_FLAG },
  { code: 'kh', label: 'ភាសាខ្មែរ', flag: KH_FLAG },
]

const switchLang = (code) => {
  if (code !== currentLang.value) {
    setLanguage(code)
  }
}
</script>

<style scoped>
.lang-switcher {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border-radius: 10px;
  background: rgba(148, 163, 184, 0.14);
  border: 1px solid rgba(148, 163, 184, 0.25);
}

.lang-switcher__btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.75rem;
  letter-spacing: 0.03em;
  color: #7c8ba1;
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
}

.lang-switcher__btn:hover {
  color: #334155;
}

.lang-switcher__btn:active {
  transform: scale(0.94);
}

.lang-switcher__btn--active {
  background: #ffffff;
  color: #2563eb;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.12);
}

.lang-switcher__flag {
  display: inline-flex;
  width: 18px;
  height: 12px;
  border-radius: 2px;
  overflow: hidden;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.1);
  flex-shrink: 0;
}

.lang-switcher__flag :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

/* ── Wide variant (settings pages) ─────────────── */
.lang-switcher--wide {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
}

.lang-switcher--wide .lang-switcher__btn {
  justify-content: center;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid #d5e7eb;
  background: #ffffff;
  font-size: 0.9rem;
  color: #475569;
}

.lang-switcher--wide .lang-switcher__btn:hover {
  background: #eef5f7;
  color: #1d4ed8;
}

.lang-switcher--wide .lang-switcher__btn--active {
  background: #2054e4;
  border-color: #1d4ed8;
  color: #ffffff;
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.25);
}

.lang-switcher--wide .lang-switcher__flag {
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.14);
}

:root[data-theme='dark'] .lang-switcher--wide .lang-switcher__btn,
.dark-theme .lang-switcher--wide .lang-switcher__btn {
  background: #1e293b;
  border-color: #334155;
  color: #cbd5e1;
}

:root[data-theme='dark'] .lang-switcher--wide .lang-switcher__btn--active,
.dark-theme .lang-switcher--wide .lang-switcher__btn--active {
  background: #1d4ed8;
  border-color: #3b82f6;
  color: #ffffff;
}

/* ── List variant (dark footer) ────────────────── */
.lang-switcher--list {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
}

.lang-switcher--list .lang-switcher__btn {
  justify-content: flex-start;
  padding: 4px 8px;
  border-radius: 6px;
  background: transparent;
  font-size: 0.92rem;
  color: rgba(255, 255, 255, 0.6);
}

.lang-switcher--list .lang-switcher__btn:hover {
  color: #ffffff;
}

.lang-switcher--list .lang-switcher__btn--active {
  color: #60a5fa;
  box-shadow: none;
}
</style>
