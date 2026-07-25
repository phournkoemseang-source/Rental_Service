
<template>
  <div class="auth-container">
    <!-- LEFT SIDE -->
    <div class="left">
        <div class="overlay">
             <div class="logo">
               <Logo src="/Images/logo-removebg.png" size="lg" :showTagline="false" />
             </div>

          <div class="left-content">
            <div class="hero-badge">
              <span class="hero-badge-dot"></span>
              {{ $t('appTagline') }}
            </div>
            <h1>Start your journey<br /><span class="journey-highlight">in minutes.</span></h1>
            <p>
              Access a fleet of premium vehicles at your fingertips.
              Rent for an hour, drive for a lifetime.
            </p>
          </div>

          <div class="review-card">
            <div class="stars">★★★★★</div>
            <p class="review-text">
              "The easiest rental experience I've ever had.
              No paperwork, just pure driving pleasure."
            </p>
            <div class="review-user">
              <strong>Alex Rivera</strong>
              <span>Platinum Member</span>
            </div>
          </div>
        </div>
    </div>

    <!-- RIGHT SIDE -->
  <div class="right">

      <!-- Floating decorative elements for right side -->
      <div class="right-decor">
        <div class="decor-circle circle-1"></div>
        <div class="decor-circle circle-2"></div>
        <div class="decor-circle circle-3"></div>
        <div class="decor-dot dot-1"></div>
        <div class="decor-dot dot-2"></div>
        <div class="decor-dot dot-3"></div>
        <div class="decor-dot dot-4"></div>
      </div>
      <div class="form-box">
        <div class="form-header">
          <h2>{{ $t('welcomeBack') }}</h2>
          <p class="subtitle">{{ $t('signInDescription') }}</p>
        </div>

        <form @submit.prevent="handleLogin" novalidate>
          <div class="location-guard-card" :class="{ granted: locationGranted }">
            <div class="guard-icon">
              <i :class="locationGranted ? 'fa-solid fa-circle-check' : 'fa-solid fa-location-crosshairs'"></i>
            </div>
            <div class="guard-copy">
              <strong>{{ locationGranted ? $t('locationGranted') : $t('locationRequired') }}</strong>
              <p>
                {{
                  locationGranted
                    ? $t('locationGrantedDesc')
                    : $t('locationDesc')
                }}
              </p>
              <button
                v-if="!locationGranted"
                type="button"
                class="location-enable-btn"
                @click="requestLocationAccess"
                :disabled="isRequestingLocation"
              >
                {{ isRequestingLocation ? $t('detectingLocation') : $t('allowLocation') }}
              </button>
            </div>
          </div>

          <!-- Error Alert -->
          <div v-if="generalError" class="error-alert">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{{ generalError }}</span>
          </div>

          <div class="form-group">
            <label><span class="required-star">*</span> {{ $t('emailAddress') }}</label>
            <input 
              type="email" 
              :placeholder="$t('email') + '...'" 
              v-model="form.email" 
              :class="{ 'error': errors.email }"
              required 
            />
            <span class="error-text" v-if="errors.email">{{ errors.email }}</span>
          </div>

          <div class="form-group">
            <label><span class="required-star">*</span> {{ $t('password') }}</label>
            <div class="password-input-wrapper">
              <input 
                :type="showPassword ? 'text' : 'password'" 
                :placeholder="$t('passwordPlaceholder')" 
                v-model="form.password"
                autocomplete="current-password"
                :class="{ 'error': errors.password }"
                required 
              />
              <button type="button" class="toggle-password" @click="showPassword = !showPassword">
                <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              </button>
            </div>
            <span class="error-text danger-text" v-if="errors.password">{{ errors.password }}</span>
          </div>

          <div class="form-options">
            <label class="checkbox">
              <input type="checkbox" v-model="form.remember" />
              <span>{{ $t('rememberMe') }}</span>
            </label>
          </div>

          <button type="submit" class="login-btn" :disabled="isLoading">
            <span v-if="!isLoading">{{ $t('signIn') }}</span>
            <span v-else>{{ $t('signIn') }}...</span>
          </button>
        </form>

        <div class="register-prompt">
          <span>{{ $t('noAccount') }}</span>
          <router-link to="/register" class="register-link">{{ $t('registerLink') }}</router-link>
        </div>

        <div class="divider">
          <span>{{ $t('orContinueWith') }}</span>
        </div>

        <p class="terms">
          {{ $t('terms') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { loginUser } from "../../services/auth";
import { hasLocationAccess, saveLocationAccess } from "../../utils/locationAccess";
import "../../css/login.css";
import Logo from '@/components/Logo.vue'

const { t } = useI18n();

const router = useRouter();
const isLoading = ref(false);
const errors = ref({});
const showPassword = ref(false);
const generalError = ref("");
const locationGranted = ref(hasLocationAccess());
const isRequestingLocation = ref(false);

const form = reactive({
  email: "",
  password: "",
  remember: false,
});

const syncLocationState = () => {
  locationGranted.value = hasLocationAccess();
};

const handleLogin = async () => {
  errors.value = {};
  generalError.value = "";

  if (!form.email) {
    errors.value.email = "Email is required";
    return;
  }
  
  if (!form.password) {
    errors.value.password = "Password is required";
    return;
  }

  isLoading.value = true;

  try {
    const data = await loginUser({
      email: form.email.trim(),
      password: form.password,
    });

    const token = data?.token || data?.access_token;
    const user = data?.user || data?.data?.user;
    
    if (!token) {
      throw new Error('Invalid response: missing token');
    }

    console.log('Login successful:', { user, token });

    // Redirect based on user role
    const userRole = user?.role;
    if (userRole === 'admin') {
      router.push('/admin');
    } else if (userRole === 'shop_owner') {
      router.push('/dashboard');
    } else {
      router.push('/view_shop');
    }
  } catch (error) {
    console.error('Login error:', error);
    const responseData = error?.response?.data;
    const firstField = responseData?.errors ? Object.keys(responseData.errors)[0] : null;
    const fieldMessage = firstField
      ? Array.isArray(responseData.errors[firstField])
        ? responseData.errors[firstField][0]
        : responseData.errors[firstField]
      : '';
    const apiMessage = fieldMessage || responseData?.message;
    generalError.value = apiMessage || error.message || 'Invalid email or password';
  } finally {
    isLoading.value = false;
  }
};

const requestLocationAccess = () => {
  if (isRequestingLocation.value) return;
  if (!navigator?.geolocation) {
    generalError.value = "Your browser does not support geolocation.";
    return;
  }

  isRequestingLocation.value = true;
  generalError.value = "";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const location = saveLocationAccess({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      locationGranted.value = Boolean(location);
      isRequestingLocation.value = false;
      if (!location) {
        generalError.value = "Could not save location. Please try again.";
        return;
      }
      window.dispatchEvent(
        new CustomEvent("location-access-updated", {
          detail: { granted: true, location },
        })
      );
    },
    (error) => {
      isRequestingLocation.value = false;
      generalError.value =
        error?.code === 1
          ? "Location permission was denied. Please allow it to continue."
          : "Unable to get your location. Please try again.";
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  );
};

onMounted(() => {
  window.addEventListener("location-access-updated", syncLocationState);
});

onBeforeUnmount(() => {
  window.removeEventListener("location-access-updated", syncLocationState);
});
</script>
