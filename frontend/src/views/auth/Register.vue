<template>
  <div class="auth-container" style="min-height: 100vh">
    <!-- LEFT SIDE -->
    <div class="left">
      <div class="overlay">
         <div class="logo">
           <Logo src="/Images/logo-removebg.png" size="lg" :showTagline="false" />
         </div>

        <div class="left-content">
          <div class="hero-badge">              <span class="hero-badge-dot"></span>
            {{ $t('appTagline') }}
          </div>
          <h1>{{ $t('startYourJourney') }}<br /><span class="journey-highlight">{{ $t('inMinutes') }}</span></h1>
          <p>{{ $t('accessAFleetOfPremiumVehiclesAtYourFingertipsRentForAnHourDriveForALifetime2') }}</p>
        </div>

        <div class="review-card">
          <div class="stars">★★★★★</div>
          <p class="review-text">{{ $t('theEasiestRentalExperienceIVeEverHadNoPaperworkJustPureDrivingPleasure2') }}</p>
          <div class="review-user">
            <strong>{{ $t('alexRivera') }}</strong>
            <span>{{ $t('platinumMember') }}</span>
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
          <h2>{{ $t('createAccount') }}</h2>
          <p class="subtitle">{{ $t('registerDescription') }}</p>
        </div>

        <!-- Selected Role Display -->
        <div class="selected-role" v-if="selectedRole">
          <span class="role-label">{{ $t('selectedRole') }}:</span>
          <span class="role-badge" :data-role="selectedRole">{{
            selectedRole === "customer"
              ? "Customer"
              : selectedRole === "shop_owner"
              ? "Shop Owner"
              : "Admin"
          }}</span>
          <button type="button" @click="changeRole" class="change-role-btn">{{ $t('changeRole') }}</button>
        </div>

        <!-- Success Message -->
        <div class="message-block success" v-if="successMessage">
          <span class="message-icon">✓</span>
          <span class="message-text">{{ successMessage }}</span>
        </div>

        <!-- Error Message -->
        <div
          class="message-block error"
          v-if="Object.keys(errors).length > 0 && !successMessage"
        >
          <span class="message-icon">✗</span>
          <span class="message-text">{{ $t('pleaseFixErrorsBelowToContinue') }}</span>
        </div>

        <form @submit.prevent="handleRegister" novalidate>
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

          <div class="form-group">
            <label><span class="required-star">*</span> {{ $t('fullName') }}</label>
            <input
              type="text"
              placeholder="John Doe"
              v-model="form.fullName"
              :class="{ error: errors.fullName }"
              required
            />
            <span class="error-text" v-if="errors.fullName">{{
              errors.fullName
            }}</span>
          </div>

          <div class="form-group">
            <label><span class="required-star">*</span> {{ $t('emailAddress') }}</label>
            <input
              type="email"
              placeholder="name@example.com"
              v-model="form.email"
              :class="{ error: errors.email }"
              required
            />
            <span class="error-text" v-if="errors.email">{{
              errors.email
            }}</span>
          </div>

          <div class="form-group">
            <label><span class="required-star">*</span> {{ $t('phoneNumber') }}</label>
            <input
              type="tel"
              placeholder="+855 12 345 678"
              v-model="form.phone"
              :class="{ error: errors.phone }"
              required
            />
            <span class="error-text" v-if="errors.phone">{{
              errors.phone
            }}</span>
          </div>

          <div class="row">
            <div class="form-group">
              <label><span class="required-star">*</span> {{ $t('password') }}</label>
              <div class="password-input-wrapper">
                <input
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  v-model="form.password"
                  :class="{ error: errors.password }"
                  required
                />
                <button
                  type="button"
                  class="toggle-password"
                  @click="showPassword = !showPassword"
                >
                  <svg
                    v-if="showPassword"
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                    ></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <svg
                    v-else
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                    ></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                </button>
              </div>
              <span class="error-text" v-if="errors.password">{{
                errors.password
              }}</span>
            </div>
            <div class="form-group">
              <label><span class="required-star">*</span> {{ $t('confirmPassword') }}</label>
              <div class="password-input-wrapper">
                <input
                  :type="showConfirmPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  v-model="form.confirmPassword"
                  :class="{ error: errors.confirmPassword }"
                  required
                />
                <button
                  type="button"
                  class="toggle-password"
                  @click="showConfirmPassword = !showConfirmPassword"
                >
                  <svg
                    v-if="showConfirmPassword"
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                    ></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <svg
                    v-else
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                    ></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                </button>
              </div>
              <span class="error-text" v-if="errors.confirmPassword">{{
                errors.confirmPassword
              }}</span>
            </div>
          </div>

          <button type="submit" class="login-btn" :disabled="isLoading">
            <span v-if="!isLoading">{{ $t('register') }}</span>
            <span v-else>{{ $t('register') }}...</span>
          </button>
        </form>

        <div class="register-prompt">
          <span>{{ $t('haveAccount') }}</span>
          <router-link to="/login" class="register-link">{{ $t('loginLink') }}</router-link>
        </div>

        <div class="divider">
          <span>{{ $t('orContinueWith') }}</span>
        </div>
        <p class="terms">
          {{ $t('termsRegister') }}
        </p>
      </div>
    </div>
    <ToastStack />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { registerUser, setSession } from "../../services/auth";
import { hasLocationAccess, saveLocationAccess } from "../../utils/locationAccess";
import { useToast } from "../../composables/useToast";
import "../../css/login.css";
import Logo from '@/components/Logo.vue'
import ToastStack from '@/components/ToastStack.vue'

const { t } = useI18n();

const router = useRouter();
const route = useRoute();
const toast = useToast();
const isLoading = ref(false);
const errors = ref({});
const successMessage = ref("");
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const locationGranted = ref(hasLocationAccess());
const isRequestingLocation = ref(false);

// Get role from query parameter or default to customer
const selectedRole = ref(route.query.role || "customer");

// Redirect admin to login page - admin cannot register
if (selectedRole.value === 'admin') {
  router.push("/login");
}

const form = reactive({
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  role: selectedRole.value, // Set role from query parameter
});

const syncLocationState = () => {
  locationGranted.value = hasLocationAccess();
};

const validateForm = () => {
  const newErrors = {};

  if (!form.fullName.trim()) {
    newErrors.fullName = "Full name is required";
  } else if (form.fullName.length < 2) {
    newErrors.fullName = "Name must be at least 2 characters";
  }

  if (!form.email.trim()) {
    newErrors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    newErrors.email = "Please enter a valid email";
  }

  if (!form.phone.trim()) {
    newErrors.phone = "Phone number is required";
  } else if (!/^\+?[\d\s\-\(\)]{7,15}$/.test(form.phone.replace(/\s/g, ""))) {
    newErrors.phone = "Please enter a valid phone number";
  }

  if (!form.password) {
    newErrors.password = "Password is required";
  } else if (form.password.length < 8) {
    newErrors.password = "Password must be at least 8 characters";
  }

  if (!form.confirmPassword) {
    newErrors.confirmPassword = "Please confirm your password";
  } else if (form.password !== form.confirmPassword) {
    newErrors.confirmPassword = "Passwords do not match";
  }

  errors.value = newErrors;
  return Object.keys(newErrors).length === 0;
};

const handleRegister = async () => {
  if (!locationGranted.value) {
    errors.value = { email: "Please allow location access before registering." };
    return;
  }

  if (!validateForm()) {
    return;
  }

  isLoading.value = true;
  successMessage.value = "";
  errors.value = {};

  try {
    const payload = {
      name: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      password: form.password,
      password_confirmation: form.confirmPassword,
      role: selectedRole.value || 'customer',
    };

    console.log("Registering with payload:", payload);

    const requestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    };

    // Try /api/register first (points to AuthController)
    let response = await fetch("/api/register", requestInit);
    console.log("Response status:", response.status);
    
    // If 404, try /api/users/register as fallback
    if (response.status === 404) {
      response = await fetch("/api/users/register", requestInit);
      console.log("Fallback response status:", response.status);
    }

    const data = await response.json().catch(() => ({}));
    console.log("Response data:", data);

    if (response.ok) {
      // Store token & user from response so they're auto-logged in
      if (data.token) {
        setSession({ token: data.token, user: data.user });
      }

      // Reset form
      form.fullName = "";
      form.email = "";
      form.phone = "";
      form.password = "";
      form.confirmPassword = "";

      // Welcome toast to confirm auto-login
      toast.success('Welcome! You are now signed in.');

      // Redirect based on role — no need to sign in again
      const userRole = data.user?.role || selectedRole.value || 'customer';
      successMessage.value = "Registration successful! Redirecting...";
      setTimeout(() => {
        if (userRole === 'admin') {
          router.push('/admin');
        } else if (userRole === 'shop_owner') {
          router.push('/dashboard');
        } else {
          router.push('/view_shop');
        }
      }, 1500);
    } else {
      // Handle validation errors from backend
      if (data.errors) {
        const newErrors = {};
        Object.keys(data.errors).forEach((field) => {
          newErrors[field === "name" ? "fullName" : field] =
            Array.isArray(data.errors[field]) 
              ? data.errors[field][0] 
              : data.errors[field];
        });
        errors.value = newErrors;
      } else {
        errors.value.email = data.message || "Registration failed. Please try again.";
      }
    }
  } catch (error) {
    console.error("Registration error:", error);
    errors.value.email = error.message || "Network error. Please check if backend is running.";
  } finally {
    isLoading.value = false;
  }
};

const requestLocationAccess = () => {
  if (isRequestingLocation.value) return;
  if (!navigator?.geolocation) {
    errors.value = { email: "Your browser does not support geolocation." };
    return;
  }

  isRequestingLocation.value = true;
  errors.value = {};

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const location = saveLocationAccess({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      locationGranted.value = Boolean(location);
      isRequestingLocation.value = false;
      if (!location) {
        errors.value = { email: "Could not save location. Please try again." };
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
      errors.value = {
        email:
          error?.code === 1
            ? "Location permission was denied. Please allow it to continue."
            : "Unable to get your location. Please try again.",
      };
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  );
};

const clearError = (field) => {
  if (errors.value[field]) {
    delete errors.value[field];
  }
};

const togglePassword = () => {
  showPassword.value = !showPassword.value;
};

const toggleConfirmPassword = () => {
  showConfirmPassword.value = !showConfirmPassword.value;
};

const changeRole = () => {
  router.push("/chooserole");
};

onMounted(() => {
  window.addEventListener("location-access-updated", syncLocationState);
});

onBeforeUnmount(() => {
  window.removeEventListener("location-access-updated", syncLocationState);
});
</script>

<style>
@import "../../css/register.css";
</style>
