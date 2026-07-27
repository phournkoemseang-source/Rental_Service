<template>
  <section class="setting-page">
    <div class="frame">
      <main class="panel">
        <section class="content-card">
          <div class="section-head">
            <p class="section-title">{{ t('Ownershop setting') }}</p>
            <div class="avatar-panel">
              <div class="avatar-row">
                <img
                  :key="displayImageUrl"
                  :src="displayImageUrl"
                  alt="Profile photo"
                  class="profile-avatar"
                  @error="onAvatarError"
                />
                <div class="avatar-actions">
                  <button type="button" class="btn btn-primary" :disabled="avatarUploadLoading || avatarRemoveLoading" @click="triggerAvatarPicker">
                    {{ avatarUploadLoading ? t('uploading') : t('uploadProfile') }}
                  </button>
                  <button type="button" class="btn btn-muted" :disabled="avatarUploadLoading || avatarRemoveLoading" @click="openRemoveConfirm">
                    {{ avatarRemoveLoading ? t('removing') : t('removeProfile') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <input ref="avatarInputRef" type="file" accept="image/*" class="sr-only-file" @change="onAvatarChange" />

          <form @submit.prevent="saveSettings" class="form-grid">
            <label class="field">
              <span>{{ t('fullName') }}</span>
              <input v-model="form.name" type="text" required />
            </label>

            <label class="field">
              <span>{{ t('emailAddress') }}</span>
              <div class="verified-wrap">
                <input v-model="form.email" type="email" required />
                <small class="verified">{{ t('verified') }}</small>
              </div>
            </label>

            <label class="field">
              <span>{{ t('shopName') }}</span>
              <input v-model="form.shop_name" type="text" required />
            </label>

            <label class="field">
              <span>Status</span>
              <select v-model="form.shop_status">
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </label>

            <label class="field">
              <span>{{ t('phoneNumber') }}</span>
              <input v-model="form.phone" type="text" />
            </label>


            <label class="field">
              <span>{{ t('password') }}</span>
              <div class="password-wrap">
                <input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  minlength="8"
                  autocomplete="new-password"
                  :placeholder="t('passwordPlaceholder')"
                />
                <button
                  type="button"
                  class="eye-btn"
                  @click="showPassword = !showPassword"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  :title="showPassword ? 'Hide password' : 'Show password'"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" stroke-width="1.8" />
                    <path
                      v-if="!showPassword"
                      d="M4 20L20 4"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                    />
                  </svg>
                </button>
              </div>
            </label>

            <label class="field full">
              <span>Google Map URL</span>
              <input
                v-model="form.map_url"
                type="url"
                placeholder="Paste your Google Maps link here"
              />
              <small v-if="form.latitude && form.longitude" class="form-helpert">
                Coordinates: {{ form.latitude }}, {{ form.longitude }}
              </small>
            </label>

            <label class="field full">
              <span>{{ t('shopAddress') }}</span>
              <textarea v-model="form.shop_address" rows="5"></textarea>
            </label>

            <label class="field">
              <span>Latitude</span>
              <div class="input-with-action">
                <input v-model="form.latitude" type="number" step="any" placeholder="Auto" readonly />
                <button
                  type="button"
                  class="gps-btn"
                  :disabled="detectingLocation"
                  @click="detectCurrentLocation"
                  :title="detectingLocation ? 'Detecting...' : 'Use my current location'"
                >
                  <i class="fa-solid fa-crosshairs"></i>
                </button>
              </div>
            </label>

            <label class="field">
              <span>Longitude</span>
              <div class="input-with-action">
                <input v-model="form.longitude" type="number" step="any" placeholder="Auto" readonly />
                <button
                  type="button"
                  class="gps-btn"
                  :disabled="detectingLocation"
                  @click="detectCurrentLocation"
                  :title="detectingLocation ? 'Detecting...' : 'Use my current location'"
                >
                  <i class="fa-solid fa-crosshairs"></i>
                </button>
              </div>
            </label>

            <!-- Language Selector near Notifications -->
            <div class="field notification-field language-field">
              <span>{{ t('language') }}</span>
              <div class="notify-box language-box">
                <div>
                  <strong>{{ t('selectLanguage') }}</strong>
                  <p>{{ t('languageDescription') }}</p>
                </div>
                <div class="language-options">
                  <button 
                    type="button" 
                    class="lang-btn notranslate"
                    translate="no"
                    :class="{ active: currentLanguage === 'en' }"
                    @click="changeLanguage('en')"
                  >
                    English
                  </button>
                  <button 
                    type="button" 
                    class="lang-btn notranslate"
                    translate="no"
                    :class="{ active: currentLanguage === 'kh' }"
                    @click="changeLanguage('kh')"
                  >
                    Khmer
                  </button>
                </div>
              </div>
            </div>

            <div class="field notification-field">
              <span>{{ t('notifications') }}</span>
              <div class="notify-box">
                <div>
                  <strong>{{ t('enableNotifications') }}</strong>
                  <p>{{ t('receiveOrderUpdates') }}</p>
                </div>
                <label class="switch">
                  <input v-model="form.notifications_enabled" type="checkbox" />
                  <span class="slider"></span>
                </label>
              </div>
            </div>

            <div class="field notification-field">
              <span>{{ t('notificationSound') }}</span>
              <div class="notify-box">
                <div>
                  <strong>{{ t('notificationSound') }}</strong>
                  <p>{{ t('notificationSoundDesc') }}</p>
                </div>
                <label class="switch">
                  <input v-model="form.notification_sound" type="checkbox" />
                  <span class="slider"></span>
                </label>
              </div>
            </div>
            <div class="full action-row">
              <button type="submit" class="btn btn-primary" :disabled="loading">{{ loading ? t('saving') : t('saveSetting') }}</button>
            </div>
          </form>

        </section>
      </main>
    </div>

    <div v-if="showToast" class="settings-toast" :class="toastType === 'error' ? 'is-error' : 'is-success'" role="status" aria-live="polite">
      <span>{{ toastMessage }}</span>
      <button type="button" class="settings-toast-close" @click="closeToast">×</button>
    </div>

    <div v-if="showRemoveConfirm" class="confirm-overlay" @click="closeRemoveConfirm">
      <div class="confirm-modal" @click.stop>
        <p class="confirm-title">{{ t('deleteProfile') }}</p>
        <p class="confirm-text">{{ t('confirmDelete') }}</p>
        <div class="confirm-actions">
          <button type="button" class="btn btn-muted" @click="closeRemoveConfirm">{{ t('cancel') }}</button>
          <button type="button" class="btn btn-primary" :disabled="avatarUploadLoading || avatarRemoveLoading" @click="confirmRemoveAvatar">
            {{ t('confirm') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showLogoutConfirm" class="confirm-overlay" @click="closeLogoutConfirm">
      <div class="confirm-modal logout-modal" @click.stop>
        <p class="confirm-title">{{ t('logout') }}</p>
        <p class="confirm-text">{{ confirmLogoutText }}</p>
        <div class="confirm-actions">
          <button type="button" class="btn btn-muted" @click="closeLogoutConfirm">{{ t('cancel') }}</button>
          <button type="button" class="btn btn-primary" @click="confirmLogout">{{ t('confirm') }}</button>
        </div>
      </div>
    </div>

  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';
import { logoutUser } from '../../services/auth';
import { setLanguage, getCurrentLanguage, syncAutoTranslateWithCurrentLanguage } from '../../i18n';
import { extractCoordinatesFromMapUrl } from '@/utils/shopLocation';
import "../../css/setting.css";
import '../../css/setting_dashboard.css'

const { t } = useI18n();
const router = useRouter();

const currentLanguage = ref(getCurrentLanguage());
const confirmLogoutText = computed(() => {
  const msg = t('confirmLogout');
  return msg === 'confirmLogout' ? 'Are you sure you want to logout?' : msg;
});

const changeLanguage = (lang) => {
  setLanguage(lang);
  currentLanguage.value = lang;
  const delays = [120, 450, 1000];
  delays.forEach((delay) => {
    setTimeout(() => {
      syncAutoTranslateWithCurrentLanguage();
    }, delay);
  });
};

const loading = ref(false);
const avatarUploadLoading = ref(false);
const avatarRemoveLoading = ref(false);
const showPassword = ref(false);
const showRemoveConfirm = ref(false);
const showLogoutConfirm = ref(false);
const success = ref('');
const error = ref('');
const showToast = ref(false);
const toastType = ref('success');
const toastMessage = ref('');
const user = reactive({ id: null, name: '', email: '', role: '', avatar_url: null, img_url: null });
const avatarLoadFailed = ref(false);
const localPreviewUrl = ref(null);
const imageVersion = ref(Date.now());
const currentShopId = ref(null);
const NOTIFY_KEY_PREFIX = 'settings_notifications_enabled_';
const SOUND_KEY_PREFIX = 'settings_notification_sound_';
const apiOrigin = computed(() => {
  try {
    return new URL(api.defaults.baseURL, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
});
const fallbackImageUrl = computed(() => {
  const identity = user.name || user.email || 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(identity)}&background=0D7CB7&color=ffffff&size=256`;
});
const profileImageUrl = computed(() => {
  if (user.avatar_url) {
    return user.avatar_url;
  }
  if (user.img_url) {
    if (/^https?:\/\//.test(user.img_url)) return user.img_url;
    const normalized = user.img_url.replace(/^\/+/, '');
    if (normalized.startsWith('storage/')) {
      return `${apiOrigin.value}/${normalized}`;
    }
    if (normalized.includes('/')) {
      return `${apiOrigin.value}/storage/${normalized}`;
    }
    return `${apiOrigin.value}/storage/avatars/${normalized}`;
  }
  return null;
});
const displayImageUrl = computed(() => {
  if (localPreviewUrl.value) return localPreviewUrl.value;
  if (avatarLoadFailed.value || !profileImageUrl.value) return fallbackImageUrl.value;
  return profileImageUrl.value;
});
const avatarFile = ref(null);
const avatarInputRef = ref(null);
let toastTimer = null;
const form = reactive({
  name: '',
  email: '',
  shop_name: '',
  shop_status: 'active',
  phone: '',
  shop_address: '',
  latitude: '',
  longitude: '',
  map_url: '',
  notifications_enabled: true,
  notification_sound: true,
  password: '',
});

const syncCoordinatesFromMapUrl = () => {
  const coords = extractCoordinatesFromMapUrl(form.map_url);
  if (!coords) return;
  if (!form.latitude) form.latitude = String(coords.lat);
  if (!form.longitude) form.longitude = String(coords.lng);
};

const detectingLocation = ref(false);

const detectCurrentLocation = () => {
  if (detectingLocation.value) return;
  if (!navigator?.geolocation) {
    error.value = 'Geolocation is not supported by your browser.';
    return;
  }

  detectingLocation.value = true;
  error.value = '';

  navigator.geolocation.getCurrentPosition(
    (position) => {
      form.latitude = String(position.coords.latitude);
      form.longitude = String(position.coords.longitude);
      detectingLocation.value = false;
    },
    () => {
      detectingLocation.value = false;
      error.value = 'Unable to retrieve your location. Please allow location access or enter coordinates manually.';
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  );
};

const extractCollection = (responseData) => {
  if (Array.isArray(responseData)) return responseData;
  if (Array.isArray(responseData?.data)) return responseData.data;
  if (Array.isArray(responseData?.data?.data)) return responseData.data.data;
  return [];
};

const getStoredUserId = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id || null;
  } catch {
    return null;
  }
};

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const getCachedShop = (userId) => {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`settings_shop_${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const setCachedShop = (userId, shopData) => {
  if (!userId) return;
  try {
    if (!shopData) {
      localStorage.removeItem(`settings_shop_${userId}`);
      return;
    }
    localStorage.setItem(`settings_shop_${userId}`, JSON.stringify(shopData));
  } catch {
    // Ignore cache write failures.
  }
};

const notifyUserUpdated = () => {
  window.dispatchEvent(new Event('user-updated'));
};

const openToast = (message, type = 'success') => {
  if (!message) return;
  toastType.value = type;
  toastMessage.value = message;
  showToast.value = true;

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    showToast.value = false;
    toastTimer = null;
  }, 3200);
};

const closeToast = () => {
  showToast.value = false;
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
};

watch(success, (value) => {
  if (value) openToast(value, 'success');
});

watch(error, (value) => {
  if (value) openToast(value, 'error');
});

const loadData = async () => {
  error.value = '';
  try {
    const storedUserId = getStoredUserId();
    const storedUser = getStoredUser();
    const cachedShop = getCachedShop(storedUserId);

    // Show known data immediately without waiting for API calls.
    if (storedUser) {
      Object.assign(user, storedUser);
      form.name = storedUser.name || '';
      form.email = storedUser.email || '';
      form.phone = storedUser.phone || '';
    }
    if (cachedShop) {
      currentShopId.value = cachedShop.id || null;
      form.shop_name = cachedShop.name || '';
      form.shop_status = cachedShop.status || 'active';
      form.shop_address = cachedShop.address || '';
      form.phone = cachedShop.phone || storedUser.phone || '';
      form.latitude = cachedShop.latitude != null ? String(cachedShop.latitude) : '';
      form.longitude = cachedShop.longitude != null ? String(cachedShop.longitude) : '';
      form.map_url = cachedShop.map_url || '';
    }

    const [usersResult, shopsResult] = await Promise.allSettled([
      storedUserId ? api.get(`/users/${storedUserId}`) : Promise.resolve({ data: storedUser }),
      api.get('/shops')
    ]);

    const usersData = usersResult.status === 'fulfilled' ? usersResult.value.data : storedUser;
    const selectedUser = (usersData?.id ? usersData : null) || storedUser || null;
    if (!selectedUser) {
      throw new Error('Cannot load user data. Ensure backend is running and login again.');
    }

    Object.assign(user, selectedUser);
    imageVersion.value = Date.now();

    const shops = shopsResult.status === 'fulfilled' ? extractCollection(shopsResult.value.data) : [];
    const myShops = shops.filter((shop) => Number(shop.owner_id) === Number(user.id));
    myShops.sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
      return Number(b.id || 0) - Number(a.id || 0);
    });
    const selectedShop = myShops[0] || null;
    setCachedShop(user.id, selectedShop);
    currentShopId.value = selectedShop?.id || null;

    form.name = user.name || '';
    form.email = user.email || '';
    form.phone = selectedShop?.phone || user.phone || '';
    form.shop_name = selectedShop?.name || '';
    form.shop_status = selectedShop?.status || 'active';
    form.shop_address = selectedShop?.address || '';
    form.latitude = selectedShop?.latitude != null ? String(selectedShop.latitude) : '';
    form.longitude = selectedShop?.longitude != null ? String(selectedShop.longitude) : '';
    form.map_url = selectedShop?.map_url || '';
    form.password = '';

    const notifyRaw = localStorage.getItem(`${NOTIFY_KEY_PREFIX}${user.id}`);
    form.notifications_enabled = notifyRaw === null ? true : notifyRaw === '1';

    const soundRaw = localStorage.getItem(`${SOUND_KEY_PREFIX}${user.id}`);
    form.notification_sound = soundRaw === null ? true : soundRaw === '1';
  } catch (err) {
    error.value = err.response?.data?.message || err.message || t('failedLoadSettings');
  }
};

const onAvatarChange = (event) => {
  const file = event.target.files?.[0] || null;
  if (!file) return;
  if (localPreviewUrl.value) {
    URL.revokeObjectURL(localPreviewUrl.value);
  }
  localPreviewUrl.value = URL.createObjectURL(file);
  avatarFile.value = file;
  avatarLoadFailed.value = false;
  error.value = '';
};

const triggerAvatarPicker = () => {
  if (avatarInputRef.value) {
    avatarInputRef.value.value = '';
  }
  avatarInputRef.value?.click();
};

const onAvatarError = () => {
  avatarLoadFailed.value = true;
};

const openRemoveConfirm = () => {
  showRemoveConfirm.value = true;
};

const closeRemoveConfirm = () => {
  showRemoveConfirm.value = false;
};

const openLogoutConfirm = () => {
  showLogoutConfirm.value = true;
};

const closeLogoutConfirm = () => {
  showLogoutConfirm.value = false;
};

const confirmLogout = async () => {
  showLogoutConfirm.value = false;
  await logoutUser();
  router.push('/login');
};

const confirmRemoveAvatar = async () => {
  showRemoveConfirm.value = false;
  await removeAvatar();
};

const removeAvatar = async () => {
  if (!user.id) {
    error.value = t('userNotFound');
    return;
  }

  avatarRemoveLoading.value = true;
  success.value = '';
  error.value = '';

  try {
    const { data } = await api.delete(`/users/${user.id}/avatar`);
    const updatedUser = data?.user || {};

    user.img_url = updatedUser.img_url || null;
    user.avatar_url = updatedUser.avatar_url || null;
    avatarLoadFailed.value = false;
    imageVersion.value = Date.now();

    if (localPreviewUrl.value) {
      URL.revokeObjectURL(localPreviewUrl.value);
      localPreviewUrl.value = null;
    }

    avatarFile.value = null;
    if (avatarInputRef.value) {
      avatarInputRef.value.value = '';
    }

    localStorage.setItem('user', JSON.stringify(user));
    notifyUserUpdated();
    success.value = data?.message || t('avatarRemoved');
  } catch (err) {
    error.value = err.response?.data?.message || err.message || t('failedRemoveAvatar');
  } finally {
    avatarRemoveLoading.value = false;
  }
};

const uploadAvatar = async (file, options = {}) => {
  const { showSuccessMessage = true } = options;
  if (!user.id) {
    error.value = t('userNotFound');
    throw new Error(t('userNotFound'));
  }

  avatarUploadLoading.value = true;
  if (showSuccessMessage) {
    success.value = '';
  }
  error.value = '';

  const formData = new FormData();
  formData.append('avatar', file);

  try {
    const { data } = await api.post(`/users/${user.id}/avatar`, formData);

    const updatedUser = data?.user || {};
    user.img_url = updatedUser.img_url || null;
    user.avatar_url = updatedUser.avatar_url || null;
    avatarLoadFailed.value = false;
    imageVersion.value = Date.now();

    if (localPreviewUrl.value) {
      URL.revokeObjectURL(localPreviewUrl.value);
      localPreviewUrl.value = null;
    }
    avatarFile.value = null;
    if (avatarInputRef.value) {
      avatarInputRef.value.value = '';
    }

    localStorage.setItem('user', JSON.stringify(user));
    notifyUserUpdated();
    if (showSuccessMessage) {
      success.value = data?.message || t('avatarUploaded');
    }
    return data;
  } catch (err) {
    if (localPreviewUrl.value) {
      URL.revokeObjectURL(localPreviewUrl.value);
      localPreviewUrl.value = null;
    }
    avatarFile.value = null;
    const apiErrors = err.response?.data?.errors;
    const avatarError = Array.isArray(apiErrors?.avatar) ? apiErrors.avatar[0] : null;
    error.value = avatarError || err.response?.data?.message || err.message || t('failedUploadAvatar');
    throw err;
  } finally {
    avatarUploadLoading.value = false;
  }
};

const saveSettings = async () => {
  loading.value = true;
  success.value = '';
  error.value = '';
  try {
    syncCoordinatesFromMapUrl();

    if (form.latitude && (!Number.isFinite(Number(form.latitude)) || Number(form.latitude) < -90 || Number(form.latitude) > 90)) {
      throw new Error('Latitude must be between -90 and 90.');
    }
    if (form.longitude && (!Number.isFinite(Number(form.longitude)) || Number(form.longitude) < -180 || Number(form.longitude) > 180)) {
      throw new Error('Longitude must be between -180 and 180.');
    }

    const userPayload = {
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      role: user.role || 'owner',
    };
    if (form.password) {
      userPayload.password = form.password;
    }

    let userResponse;
    if (user.id) {
      userResponse = await api.put(`/users/${user.id}`, userPayload);
    } else {
      if (!form.password) {
        throw new Error(t('password') + ' is required');
      }
      userResponse = await api.post('/users', {
        ...userPayload,
        password: userPayload.password
      });
    }

    Object.assign(user, userResponse.data || {});
    localStorage.setItem('user', JSON.stringify(user));
    notifyUserUpdated();

    if (avatarFile.value) {
      await uploadAvatar(avatarFile.value, { showSuccessMessage: false });
    }

    const shopPayload = {
      owner_id: user.id,
      name: form.shop_name,
      address: form.shop_address || '',
      phone: form.phone || '',
      latitude: form.latitude || null,
      longitude: form.longitude || null,
      map_url: form.map_url || null,
      status: form.shop_status || 'active'
    };

    if (currentShopId.value) {
      await api.put(`/shops/${currentShopId.value}`, shopPayload);
    } else {
      const { data: createdShop } = await api.post('/shops', shopPayload);
      currentShopId.value = createdShop?.id || null;
    }
    setCachedShop(user.id, {
      id: currentShopId.value,
      name: form.shop_name,
      status: form.shop_status || 'active',
      address: form.shop_address,
      phone: form.phone,
      latitude: form.latitude || null,
      longitude: form.longitude || null,
      map_url: form.map_url || null
    });

    localStorage.setItem(`${NOTIFY_KEY_PREFIX}${user.id}`, form.notifications_enabled ? '1' : '0');
    localStorage.setItem(`${SOUND_KEY_PREFIX}${user.id}`, form.notification_sound ? '1' : '0');
    if (form.password) {
      form.password = '';
    }
    success.value = t('settingsSaved');
    try {
      await loadData();
    } catch {
      // loadData already handles its own error message
    }
  } catch (err) {
    error.value = err.response?.data?.message || err.message || t('failedSaveSettings');
    form.password = '';
  } finally {
    loading.value = false;
  }
};

onMounted(loadData);
onBeforeUnmount(() => {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
});
</script>

