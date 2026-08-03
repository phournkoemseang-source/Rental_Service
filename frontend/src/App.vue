<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SplashScreen from './components/SplashScreen.vue'
import LocationPrompt from './components/LocationPrompt.vue'
import { hasLocationAccess, saveLocationAccess } from './utils/locationAccess'

const router = useRouter()
const route = useRoute()

const showSplash = ref(true)
const showLocationPrompt = ref(false)
const locationGranted = ref(false)
const requestingLocation = ref(false)
const locationError = ref('')

const syncLocationFromStorage = () => {
  locationGranted.value = hasLocationAccess()
}

// Detect a reload that was triggered by a language switch so the splash
// screen can be skipped and the new language appears instantly.
const isLanguageSwitchReload = () => {
  try {
    if (sessionStorage.getItem('lang_switch_reload') === '1') {
      sessionStorage.removeItem('lang_switch_reload')
      return true
    }
  } catch {
    // Session storage unavailable — splash will play once, that's fine.
  }
  return false
}

onMounted(() => {
  locationGranted.value = hasLocationAccess()
  window.addEventListener('location-access-updated', syncLocationFromStorage)

  if (isLanguageSwitchReload()) {
    // Language-switch reloads skip the splash (and the location re-prompt)
    // so switching languages feels instant.
    showSplash.value = false
    return
  }

  setTimeout(() => {
    showSplash.value = false
    if (!locationGranted.value) {
      setTimeout(() => openLocationPrompt(), 300)
    }
  }, 2500)
})

onBeforeUnmount(() => {
  window.removeEventListener('location-access-updated', syncLocationFromStorage)
})

const handleAllowLocation = () => {
  if (requestingLocation.value) return

  if (!navigator?.geolocation) {
    locationError.value = 'Geolocation is not supported by your browser.'
    return
  }

  requestingLocation.value = true
  locationError.value = ''

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const location = saveLocationAccess({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      })

      if (!location) {
        locationError.value = 'Could not save your location. Please try again.'
        requestingLocation.value = false
        return
      }

      locationGranted.value = true
      showLocationPrompt.value = false
      requestingLocation.value = false

      window.dispatchEvent(
        new CustomEvent('location-access-updated', {
          detail: { granted: true, location },
        })
      )
    },
    (error) => {
      const denied = error?.code === 1
      locationError.value = denied
        ? 'Location access was denied. Please allow location to continue.'
        : 'Unable to detect your location. Please try again.'
      requestingLocation.value = false
      locationGranted.value = false
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  )
}

const handleCloseLocation = () => {
  showLocationPrompt.value = false
}

const openLocationPrompt = () => {
  locationError.value = ''
  showLocationPrompt.value = true
}

const showGlobalBackButton = computed(() => {
  if (showSplash.value) return false
  return route.path === '/login' || route.path === '/register'
})

const getFallbackRoute = () => {
  try {
    const rawUser = localStorage.getItem('user')
    if (rawUser) {
      const parsedUser = JSON.parse(rawUser)
      const role = String(parsedUser?.role || '').toLowerCase()
      if (role === 'admin') return '/admin'
      if (role === 'shop_owner') return '/dashboard'
      if (role) return '/view_shop'
    }
  } catch {
    // Keep default fallback route.
  }

  return '/'
}

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.push(getFallbackRoute())
}
</script>

<template>
  <div id="app">
    <SplashScreen :show="showSplash" :location-required="!locationGranted" />

    <LocationPrompt
      :show="showLocationPrompt"
      :loading="requestingLocation"
      :error="locationError"
      @confirm="handleAllowLocation"
      @close="handleCloseLocation"
    />

    <router-view
      v-if="!showSplash"
      :locationGranted="locationGranted"
      @request-location="openLocationPrompt"
    />

    <button
      v-if="showGlobalBackButton"
      type="button"
      class="global-back-btn"
      @click="goBack"
      aria-label="Go back"
      title="Go back"
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span>{{ $t('back') }}</span>
    </button>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
}

html,
body,
#app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.global-back-btn {
  position: fixed;
  top: 18px;
  left: 18px;
  z-index: 110000;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  font-weight: 700;
  font-size: 0.88rem;
  color: #0f2b66;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 12px 28px rgba(2, 6, 23, 0.18);
  backdrop-filter: blur(8px);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.global-back-btn svg {
  width: 18px;
  height: 18px;
}

.global-back-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 30px rgba(2, 6, 23, 0.22);
}

@media (max-width: 640px) {
  .global-back-btn {
    top: 12px;
    left: 12px;
    padding: 8px 12px;
    font-size: 0.82rem;
  }
}
</style>
