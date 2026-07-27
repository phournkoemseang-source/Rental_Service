<script setup>
import { useRouter } from "vue-router";
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import api from "../services/api";
import "../css/chooserole.css";

const router = useRouter();
const { t } = useI18n();
const adminAlreadyRegistered = ref(false);

const selectRole = (role) => {
  localStorage.setItem("selectedRole", role);
  if (role === 'admin') {
    router.push("/login");
  } else {
    router.push(`/register?role=${role}`);
  }
};

onMounted(async () => {
  // Auto-redirect if user is already logged in
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  if (token) {
    try {
      const raw = localStorage.getItem('user');
      const user = raw ? JSON.parse(raw) : null;
      const role = user?.role || '';
      if (role === 'admin') {
        router.push('/admin');
        return;
      } else if (role === 'shop_owner') {
        router.push('/dashboard');
        return;
      } else {
        router.push('/view_shop');
        return;
      }
    } catch {
      // Invalid user data in storage, fall through to role selection
    }
  }

  try {
    const { data } = await api.get('/admin/exists');
    adminAlreadyRegistered.value = Boolean(data?.has_admin);
  } catch (error) {
    console.error('Failed to check admin presence', error);
  }
});
</script>

<template>
  <main class="role-page">
    <section class="role-box">
      <h1>{{ t('chooseRole') }}</h1>
      <p class="role-subtitle">{{ t('selectRole') }}</p>

      <div class="roles">
        <!-- Customer -->
        <button type="button" class="role-card" @click="selectRole('customer')">
          <span class="role-icon role-icon--customer" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          </span>
          <span class="role-card-title">{{ t('customer') }}</span>
          <span class="role-card-desc">{{ t('appTagline') }} — {{ t('appDescription') }}</span>
        </button>

        <!-- Shop Owner -->
        <button type="button" class="role-card" @click="selectRole('shop_owner')">
          <span class="role-icon role-icon--owner" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
            </svg>
          </span>
          <span class="role-card-title">{{ t('shopOwner') }}</span>
          <span class="role-card-desc">{{ t('registerYourShop') }} — {{ t('ctaDesc') }}</span>
        </button>

        <!-- Admin -->
        <button
          type="button"
          class="role-card"
          :class="{ 'role-card--disabled': adminAlreadyRegistered }"
          :disabled="adminAlreadyRegistered"
          @click="selectRole('admin')"
        >
          <span class="role-icon role-icon--admin" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </span>
          <span class="role-card-title">{{ t('admin') }}</span>
          <span class="role-card-desc">{{ adminAlreadyRegistered ? t('adminRegistered') : t('adminDashboard') }}</span>
        </button>
      </div>

      <p class="role-hint">{{ t('haveAccount') }} <RouterLink to="/login" style="color: var(--color-primary); font-weight: 600;">{{ t('loginLink') }}</RouterLink></p>
      <RouterLink class="back-home" to="/">
        <i class="fa-solid fa-arrow-left"></i> {{ t('back') }}
      </RouterLink>
    </section>
  </main>
</template>
