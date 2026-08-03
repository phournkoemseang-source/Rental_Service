<template>
  <span :class="logoClass" v-bind="attrs">
    <template v-if="src">
      <div class="app-logo__image-wrap">
        <img :src="src" alt="Logo" class="app-logo__image" />
        <div v-if="brandName || showTagline" class="app-logo__brand">
          <span v-if="brandName" class="app-logo__brandName">{{ brandName }}</span>
          <small v-if="showTagline" class="app-logo__tagline">{{ $t('appTagline') }}</small>
        </div>
      </div>
    </template>
    <template v-else>
      <span class="app-logo__mark" aria-hidden="true">{{ $t('cc') }}</span>
      <span class="app-logo__img">
        <span class="app-logo__name">Chong Choul</span>
        <small v-if="showTagline" class="app-logo__tagline">{{ $t('appTagline') }}</small>
      </span>
    </template>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { useAttrs } from 'vue'

const props = defineProps({
  theme: { type: String, default: 'light' },
  size: { type: String, default: 'md' },
  showTagline: { type: Boolean, default: false },
  src: { type: String, default: '' },
  brandName: { type: String, default: '' }
})

const attrs = useAttrs()

const logoClass = computed(() => [
  'app-logo',
  `app-logo--${props.theme}`,
  `app-logo--${props.size}`,
  attrs.class
].filter(Boolean))
</script>

<style scoped>
.app-logo {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  text-transform: none;
  font-family: inherit;
}

.app-logo__mark {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: linear-gradient(135deg, #39A9E1, #2563eb);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.1rem;
  letter-spacing: -0.03em;
}

.app-logo__img {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.app-logo__name {
  font-weight: 850;
  letter-spacing: -0.02em;
  color: #0b2b73;
}

.app-logo__tagline {
  font-size: 0.65rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #6b7280;
}

.app-logo__image {
  height: 100%;
  width: auto;
  object-fit: contain;
}

.app-logo__image-wrap {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.app-logo__brand {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.app-logo__brandName {
  font-weight: 900;
  color: #0b2b73;
  letter-spacing: -0.02em;
  text-transform: uppercase;
  font-size: 1rem;
}

.app-logo--lg .app-logo__brandName {
  font-size: 1.35rem;
}

.app-logo--lg .app-logo__image {
  height: 180px;
}

.app-logo--md .app-logo__image {
  height: 100px;
}

.app-logo--sm .app-logo__image {
  height: 70px;
}

.app-logo--dark .app-logo__mark {
  background: #101828;
}

.app-logo--lg .app-logo__mark {
  width: 72px;
  height: 72px;
  font-size: 1.3rem;
}

.app-logo--lg .app-logo__name {
  font-size: 1.3rem;
}
</style>
