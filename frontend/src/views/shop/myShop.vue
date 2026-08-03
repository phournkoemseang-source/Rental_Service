<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { shopApi, cityApi } from "@/services/api";
import { extractCoordinatesFromMapUrl } from "@/utils/shopLocation";
import "../../css/Myshop.css";

const CAMBODIA_PROVINCES = [
  'Banteay Meanchey', 'Battambang', 'Kampong Cham', 'Kampong Chhnang',
  'Kampong Speu', 'Kampong Thom', 'Kampot', 'Kandal', 'Kep',
  'Koh Kong', 'Kratie', 'Mondulkiri', 'Oddar Meanchey', 'Pailin',
  'Phnom Penh', 'Preah Sihanouk', 'Preah Vihear', 'Prey Veng',
  'Pursat', 'Ratanakiri', 'Siem Reap', 'Stung Treng', 'Svay Rieng',
  'Takeo', 'Tboung Khmum'
]

const provinces = ref([...CAMBODIA_PROVINCES])

const shop = ref(null);
const ownerName = ref("");
const ownerEmail = ref("");
const detectingLocation = ref(false);

// Computed property to check if shop exists
const hasShop = computed(() => !!shop.value);

const showCreateModal = ref(false);
const showSuccessPopup = ref(false);
const showSingleShopAlert = ref(false);
const loading = ref(false);
const error = ref("");
const shopImageFile = ref(null);
const shopImagePreview = ref("");
const changeImagePreview = ref("");
const shopImageLoadFailed = ref(false);
const shopImageInputRef = ref(null);
const isShopImageDragOver = ref(false);
const changeImageInputRef = ref(null);
const isUpdatingImage = ref(false);

const createForm = reactive({
  name: "",
  phone: "",
  description: "",
  address: "",
  location: "",
  latitude: "",
  longitude: "",
  map_url: "",
  status: "active",
  instagram: "",
  facebook: "",
  img_url: "",
});

const getCachedShop = (ownerId) => {
  if (!ownerId) return null;
  try {
    const raw = localStorage.getItem(`myshop_cache_${ownerId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const setCachedShop = (ownerId, shopData) => {
  if (!ownerId) return;
  try {
    if (!shopData) {
      localStorage.removeItem(`myshop_cache_${ownerId}`);
      return;
    }
    localStorage.setItem(`myshop_cache_${ownerId}`, JSON.stringify(shopData));
  } catch {
    // Ignore cache write errors.
  }
};

const getStoredUser = () => {
  try {
    const rawUser = localStorage.getItem("user");
    if (!rawUser) return null;
    const parsed = JSON.parse(rawUser);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const getUserId = () => {
  const rawUser = localStorage.getItem("user");
  if (!rawUser) return 1;

  try {
    const parsed = JSON.parse(rawUser);
    return parsed.id || 1;
  } catch {
    return 1;
  }
};

const asArray = (payload) => payload?.data || payload || [];

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api`;
const API_ROOT = API_BASE_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");

const getShopImageUrl = (url) => {
  if (!url) return "";
  // If it's already a data URL or full URL, return as-is
  const value = String(url).trim();
  if (!value) return "";
  if (/^(data:image|blob:)/i.test(value)) return value;
  if (/^https?:\/\//i.test(value)) return value;
  // For relative paths, normalize common Laravel storage variants
  const cleanUrl = value.replace(/^\/+/, "");
  if (cleanUrl.startsWith("storage/app/public/")) {
    return `${API_ROOT}/storage/${cleanUrl.replace(/^storage\/app\/public\//, "")}`;
  }
  if (cleanUrl.startsWith("app/public/")) {
    return `${API_ROOT}/storage/${cleanUrl.replace(/^app\/public\//, "")}`;
  }
  if (cleanUrl.startsWith("storage/")) return `${API_ROOT}/${cleanUrl}`;
  if (cleanUrl.startsWith("public/")) {
    return `${API_ROOT}/storage/${cleanUrl.replace(/^public\//, "")}`;
  }
  return `${API_ROOT}/storage/${cleanUrl}`;
};

const loadMyShop = async () => {
  const ownerId = getUserId();
  const storedUser = getStoredUser();
  ownerName.value = storedUser?.name || "N/A";
  ownerEmail.value = storedUser?.email || "";

  shop.value = null;
  const cachedShop = getCachedShop(ownerId);
  if (cachedShop) {
    shop.value = cachedShop;
  }

  try {
    const response = await shopApi.getMyShop();
    const data = response.data;
    if (!data || (response.status && response.status === 204)) {
      shop.value = null;
      setCachedShop(ownerId, null);
      return;
    }

    shop.value = data;
    shopImageLoadFailed.value = false;
    setCachedShop(ownerId, data);
    ownerName.value =
      shop.value?.owner_name ||
      shop.value?.owner?.name ||
      storedUser?.name ||
      "N/A";
    ownerEmail.value =
      shop.value?.owner_email ||
      storedUser?.email ||
      ownerEmail.value ||
      "";
  } catch (e) {
    console.error("Failed to load shop", e);
    if (!cachedShop) {
      shop.value = null;
    }
    ownerName.value = storedUser?.name || "N/A";
  }
};

const resetForm = () => {
  createForm.name = "";
  createForm.phone = "";
  createForm.description = "";
  createForm.address = "";
  createForm.location = "";
  createForm.latitude = "";
  createForm.longitude = "";
  createForm.map_url = "";
  createForm.status = "active";
  createForm.instagram = "";
  createForm.facebook = "";
  createForm.img_url = "";
  shopImageFile.value = null;
  if (shopImagePreview.value) {
    URL.revokeObjectURL(shopImagePreview.value);
    shopImagePreview.value = "";
  }
  error.value = "";
};

const validateCreateForm = () => {
  const name = createForm.name.trim();
  const address = createForm.address.trim();
  const phone = createForm.phone.trim();
  const description = createForm.description.trim();

  if (!name || !address || !phone || !description) {
    return false;
  }

  // Basic phone validation - just check length
  return phone.length >= 7;
};

const syncCoordinatesFromMapUrl = () => {
  const coords = extractCoordinatesFromMapUrl(createForm.map_url)
  if (!coords) return
  createForm.latitude = String(coords.lat)
  createForm.longitude = String(coords.lng)
}

const detectCurrentLocation = () => {
  if (detectingLocation.value) return
  if (!navigator?.geolocation) {
    error.value = "Geolocation is not supported by your browser."
    return
  }

  detectingLocation.value = true
  error.value = ""

  navigator.geolocation.getCurrentPosition(
    (position) => {
      createForm.latitude = String(position.coords.latitude)
      createForm.longitude = String(position.coords.longitude)
      detectingLocation.value = false
    },
    () => {
      detectingLocation.value = false
      error.value = "Unable to retrieve your location. Please allow location access or enter coordinates manually."
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  )
}

watch(
  () => createForm.map_url,
  () => {
    syncCoordinatesFromMapUrl()
  }
)

const applyShopImageFile = (file) => {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    error.value = "Please select a valid image file.";
    return;
  }
  if (shopImagePreview.value) {
    URL.revokeObjectURL(shopImagePreview.value);
  }
  shopImageFile.value = file;
  createForm.img_url = "";
  shopImagePreview.value = URL.createObjectURL(file);
  error.value = "";
};

const onShopImageChange = (event) => {
  const file = event.target.files?.[0] || null;
  applyShopImageFile(file);
};

const onShopImageDrop = (event) => {
  isShopImageDragOver.value = false;
  const file = event.dataTransfer?.files?.[0] || null;
  applyShopImageFile(file);
};

const openCreateModal = () => {
  resetForm();
  // Pre-fill phone from user if available
  const storedUser = getStoredUser();
  if (storedUser?.phone) {
    createForm.phone = storedUser.phone;
  }
  showCreateModal.value = true;
};

const handleCreateClick = () => {
  if (hasShop.value) {
    showSingleShopAlert.value = true;
    return;
  }
  openCreateModal();
};

const closeCreateModal = () => {
  showCreateModal.value = false;
  error.value = "";
};

const triggerChangeImagePicker = () => {
  if (changeImageInputRef.value) {
    changeImageInputRef.value.value = "";
    changeImageInputRef.value.click();
  }
};

const setChangeImagePreview = (file) => {
  if (changeImagePreview.value) {
    URL.revokeObjectURL(changeImagePreview.value);
    changeImagePreview.value = "";
  }
  if (!file) return;
  changeImagePreview.value = URL.createObjectURL(file);
};

const updateShopImage = async (file) => {
  if (!shop.value?.id) return;
  if (!file || !file.type.startsWith("image/")) {
    error.value = "Please select a valid image file.";
    return;
  }

  isUpdatingImage.value = true;
  error.value = "";
  shopImageLoadFailed.value = false;

  try {
    const payload = new FormData();
    payload.append("img_url", file);

    const { data } = await shopApi.update(shop.value.id, payload);
    const updatedShop = data?.data || data || null;
    if (updatedShop && typeof updatedShop === "object") {
      shop.value = updatedShop;
      setCachedShop(getUserId(), updatedShop);
    }
    await loadMyShop();
    if (changeImagePreview.value) {
      URL.revokeObjectURL(changeImagePreview.value);
      changeImagePreview.value = "";
    }
  } catch (e) {
    error.value = e?.response?.data?.message || "Failed to update shop image.";
    console.error("Update shop image error", e);
  } finally {
    isUpdatingImage.value = false;
  }
};

const onChangeShopImage = async (event) => {
  const file = event.target.files?.[0] || null;
  if (file) {
    setChangeImagePreview(file);
  }
  await updateShopImage(file);
};

const onShopImageError = () => {
  shopImageLoadFailed.value = true;
};

const shopImageSrc = computed(() => {
  if (changeImagePreview.value) return changeImagePreview.value;
  if (shopImageLoadFailed.value) return "";
  const raw =
    shop.value?.img_url ||
    shop.value?.image_url ||
    shop.value?.image ||
    shop.value?.cover ||
    "";
  return getShopImageUrl(raw);
});

const removeShopImage = async () => {
  if (!shop.value?.id) return;

  isUpdatingImage.value = true;
  error.value = "";
  if (changeImagePreview.value) {
    URL.revokeObjectURL(changeImagePreview.value);
    changeImagePreview.value = "";
  }

  try {
    const payload = new FormData();
    payload.append("remove_img", "1");
    const { data } = await shopApi.update(shop.value.id, payload);
    const updatedShop = data?.data || data || null;
    if (updatedShop && typeof updatedShop === "object") {
      shop.value = updatedShop;
      setCachedShop(getUserId(), updatedShop);
    }
    await loadMyShop();
  } catch (e) {
    error.value = e?.response?.data?.message || "Failed to delete shop image.";
    console.error("Delete shop image error", e);
  } finally {
    isUpdatingImage.value = false;
  }
};

const createShop = async () => {
  if (createForm.map_url && (!createForm.latitude || !createForm.longitude)) {
    onMapUrlBlur();
  }
  
  if (!validateCreateForm()) {
    error.value = "Please fill all required fields (name, address, phone, description).";
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    let payload;
    // if an image file has been selected, use FormData to send multipart request
    if (shopImageFile.value) {
      payload = new FormData();
      payload.append("owner_id", getUserId());
      payload.append("name", createForm.name.trim());
      payload.append("description", createForm.description.trim());
      payload.append("address", createForm.address.trim());
      if (createForm.location)
        payload.append("location", createForm.location.trim());
      if (createForm.latitude) payload.append("latitude", createForm.latitude);
      if (createForm.longitude)
        payload.append("longitude", createForm.longitude);
      if (createForm.map_url) payload.append("map_url", createForm.map_url.trim());
      payload.append("phone", createForm.phone.trim());
      payload.append("status", createForm.status);
      // the backend expects the field name img_url
      payload.append("img_url", shopImageFile.value);
    } else {
      payload = {
        owner_id: getUserId(),
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        address: createForm.address.trim(),
        location: createForm.location.trim() || null,
        latitude: createForm.latitude || null,
        longitude: createForm.longitude || null,
        map_url: createForm.map_url.trim() || null,
        phone: createForm.phone.trim(),
        status: createForm.status,
        img_url: createForm.img_url || null,
      };
    }

    const { data: created } = await shopApi.create(payload);
    const createdShop = created?.data || created || null;
    if (createdShop && typeof createdShop === "object") {
      shop.value = createdShop;
      setCachedShop(getUserId(), createdShop);
    }
    await loadMyShop();

    showCreateModal.value = false;
    showSuccessPopup.value = true;
    resetForm();

    setTimeout(() => {
      showSuccessPopup.value = false;
    }, 1400);
  } catch (e) {
    error.value = e?.response?.data?.message || "Create shop failed.";
    console.error("Create shop error", e);
  } finally {
    loading.value = false;
  }
};

const copyStatus = ref("Copy link");

const copyMapUrl = async () => {
  const url = shop.value?.map_url;
  if (!url || !navigator?.clipboard) return;
  try {
    await navigator.clipboard.writeText(url);
    copyStatus.value = "Copied!";
    window.setTimeout(() => {
      copyStatus.value = "Copy link";
    }, 1600);
  } catch {
    copyStatus.value = "Try again";
  }
};

const loadCities = async () => {
  try {
    const response = await cityApi.getAll()
    const cities = response.data?.data || response.data || []
    if (Array.isArray(cities) && cities.length) {
      const apiNames = cities.map(c => c.name).filter(Boolean)
      const merged = Array.from(new Set([...CAMBODIA_PROVINCES, ...apiNames]))
      provinces.value = merged
    }
  } catch {
    // fall back to hardcoded list
  }
}

onMounted(async () => {
  await Promise.all([loadMyShop(), loadCities()]);
});

onBeforeUnmount(() => {
  if (shopImagePreview.value) {
    URL.revokeObjectURL(shopImagePreview.value);
  }
  if (changeImagePreview.value) {
    URL.revokeObjectURL(changeImagePreview.value);
  }
});
</script>

<template>
  <div class="myshop-page">
    <div class="page-header">
      <h1>{{ $t('myShop') }}</h1>
      <button v-if="!shop" class="create-btn" @click="handleCreateClick">{{ $t('createShop2') }}</button>
    </div>

    <div v-if="!shop" class="empty-state">
      <h3>{{ $t('noShopInformationYet') }}</h3>
      <p>{{ $t('createShopInfo') }}</p>
    </div>

    <div v-else class="shop-card">
      <div class="shop-settings-card">
        <div class="shop-settings-header">
          <div class="settings-title">
            <span class="settings-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="1.8">
                <path d="M12 3v2.2"></path>
                <path d="M12 18.8V21"></path>
                <path d="M4.22 5.64l1.56 1.56"></path>
                <path d="M17.22 16.64l1.56 1.56"></path>
                <path d="M3 12h2.2"></path>
                <path d="M18.8 12H21"></path>
                <path d="M4.22 18.36l1.56-1.56"></path>
                <path d="M17.22 7.36l1.56-1.56"></path>
                <circle cx="12" cy="12" r="5"></circle>
              </svg>
            </span>
            <div>
              <h2>{{ $t('ownershipSetting') }}</h2>
              <p>{{ $t('manageYourShopProfileDetailsAndContactInfo') }}</p>
            </div>
          </div>
          <span
            class="status-badge"
            :class="(shop.status || 'inactive').toLowerCase()"
          >
            <span>{{ shop.status || "inactive" }}</span>
          </span>
        </div>

        <div class="shop-settings-profile">
          <div class="shop-avatar-stack">
            <img
              v-if="shopImageSrc"
              :src="shopImageSrc"
              alt="Shop Image"
              class="shop-cover-image"
              @error="onShopImageError"
            />
            <div v-else class="shop-cover-placeholder">
              <svg
                viewBox="0 0 32 32"
                width="32"
                height="32"
                fill="none"
                stroke="#94a3b8"
                stroke-width="1.5"
              >
                <rect x="3" y="3" width="26" height="26" rx="4" ry="4"></rect>
                <circle cx="10.5" cy="10.5" r="2"></circle>
                <polyline points="27 20 17 10 5 22"></polyline>
              </svg>
            </div>
            <input
              ref="changeImageInputRef"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              class="hidden-file-input"
              @change="onChangeShopImage"
            />
          </div>
          <div class="profile-actions">
            <button
              v-if="!shop"
              type="button"
              class="profile-btn primary"
              @click="handleCreateClick"
            >{{ $t('createShop2') }}</button>
            <button
              v-else
              type="button"
              class="profile-btn primary"
              :disabled="isUpdatingImage"
              @click="triggerChangeImagePicker"
            >
              {{ isUpdatingImage ? "Updating..." : "Upload Profile" }}
            </button>
            <button
              v-if="shop"
              type="button"
              class="profile-btn ghost"
              :disabled="isUpdatingImage || !shopImageSrc"
              @click="removeShopImage"
            >{{ $t('removeProfile') }}</button>
          </div>
        </div>
        <p v-if="error && !showCreateModal" class="error-text">
          {{ error }}
        </p>

        <div class="settings-form-grid">
          <label class="settings-field">
            <span>{{ $t('fullName') }}</span>
            <input type="text" :value="ownerName" readonly />
          </label>
          <label class="settings-field">
            <span>{{ $t('emailAddress') }}</span>
            <div class="input-with-badge">
              <input type="email" :value="ownerEmail" readonly />
              <span class="verified-badge">{{ $t('verified') }}</span>
            </div>
          </label>
          <label class="settings-field">
            <span>{{ $t('shopName') }}</span>
            <input type="text" :value="shop.name || ''" readonly />
          </label>
          <label class="settings-field">
            <span>{{ $t('provinceCity2') }}</span>
            <div class="province-display">
              <i class="fa-solid fa-location-dot province-icon"></i>
              <span class="province-value">{{ shop.city?.name || shop.location || '—' }}</span>
            </div>
          </label>
          <label class="settings-field">
            <span>{{ $t('status') }}</span>
            <select disabled>
              <option :value="shop.status">{{ shop.status || "inactive" }}</option>
            </select>
          </label>
          <label class="settings-field">
            <span>{{ $t('phoneNumber') }}</span>
            <input type="text" :value="shop.phone || ''" readonly />
          </label>
          <label class="settings-field">
            <span>{{ $t('password') }}</span>
            <div class="password-field">
              <input
                type="password"
                placeholder="Enter new password or leave blank"
                readonly
              />
              <button class="eye-btn" type="button" aria-label="Show password">
                <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </div>
          </label>
          <label class="settings-field full">
            <span>{{ $t('shopAddress2') }}</span>
            <textarea rows="2" :value="shop.address || ''" readonly></textarea>
          </label>
        </div>

        <!-- Shop Location Preview -->
        <div v-if="shop && (shop.latitude || shop.longitude || shop.address)" class="shop-location-preview">
          <h3 class="location-preview-title">
            <i class="fa-solid fa-map-location-dot"></i>{{ $t('shopLocation2') }}</h3>
          <div class="location-preview-content">
            <div class="location-preview-info">
              <p v-if="shop.address" class="location-address">
                <i class="fa-solid fa-location-dot"></i>
                {{ shop.address }}
              </p>
              <p v-if="shop.latitude && shop.longitude" class="location-coords">
                <i class="fa-solid fa-crosshairs"></i>
                {{ shop.latitude }}, {{ shop.longitude }}
              </p>
              <a
                v-if="shop.latitude && shop.longitude"
                :href="`https://www.google.com/maps?q=${shop.latitude},${shop.longitude}`"
                target="_blank"
                rel="noopener"
                class="location-map-link"
              >
                <i class="fa-solid fa-arrow-up-right-from-square"></i>{{ $t('openInGoogleMaps') }}</a>
            </div>
            <div class="location-preview-map">
              <iframe
                v-if="shop.latitude && shop.longitude"
                :src="`https://www.openstreetmap.org/export/embed.html?bbox=${Number(shop.longitude)-0.01},${Number(shop.latitude)-0.01},${Number(shop.longitude)+0.01},${Number(shop.latitude)+0.01}&layer=mapnik&marker=${shop.latitude},${shop.longitude}`"
                width="100%"
                height="200"
                style="border: 0; border-radius: 12px;"
                loading="lazy"
                title="Shop location map"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showCreateModal"
      class="modal-overlay"
      @click.self="closeCreateModal"
    >
      <div class="modal-card create-shop-modal">
        <div class="modal-header create-shop-header">
          <div>
            <h3>{{ $t('createNewShop') }}</h3>
            <p class="shop-header-sub">{{ $t('addANewRentalShopPendingApprovalByDefault') }}</p>
          </div>
          <button
            class="close-btn"
            @click="closeCreateModal"
            aria-label="Close"
          >
            x
          </button>
        </div>

        <form class="create-shop-form" @submit.prevent="createShop">
          <div class="shop-modal-grid">
            <article class="shop-preview-card">
              <div class="shop-preview-image">
                <img
                  v-if="shopImagePreview"
                  :src="shopImagePreview"
                  alt="Shop preview"
                />
                <div v-else class="shop-preview-placeholder">
                  <svg
                    viewBox="0 0 80 80"
                    fill="none"
                    stroke="#94a3b8"
                    stroke-width="1.5"
                  >
                    <rect x="14" y="20" width="52" height="36" rx="12" />
                    <path d="M24 36h32" />
                    <path d="M32 28h16" />
                  </svg>
                </div>
              </div>
              <div class="shop-preview-info">
                <h4>{{ createForm.name || "Untitled shop" }}</h4>
                <p>{{ createForm.description || "Add a location and contact details" }}</p>
                <p class="shop-preview-meta">
                  {{ createForm.address || "City, Country" }}
                </p>
              </div>
              <div class="shop-preview-status">
                <span>{{ $t('status') }}</span>
                <strong>{{ $t('pending') }}</strong>
              </div>
            </article>

            <section class="shop-panel">
              <label
                class="upload-card"
                :class="{ active: isShopImageDragOver }"
                @dragover.prevent="isShopImageDragOver = true"
                @dragleave.prevent="isShopImageDragOver = false"
                @drop.prevent="onShopImageDrop"
              >
                <input
                  ref="shopImageInputRef"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  class="hidden-file-input"
                  @change="onShopImageChange"
                />
                <div class="upload-content">
                  <div class="upload-icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2563eb"
                      stroke-width="1.6"
                    >
                      <path d="M12 5v14m0-14l-4 4m4-4l4 4"></path>
                      <path d="M6 19h12a2 2 0 1 0 2-2v-5"></path>
                    </svg>
                  </div>
                  <div>
                    <p class="upload-title">{{ $t('uploadShopCover') }}</p>
                    <p class="upload-sub">{{ $t('dropAnImageOrClickToBrowseFiles') }}</p>
                  </div>
                </div>
              </label>

              <div class="field-grid">
                <label class="form-field">
                  <span>{{ $t('shopName3') }}</span>
                  <input
                    v-model="createForm.name"
                    type="text"
                    placeholder="e.g. Berlin Elite Rentals"
                  />
                </label>
                <label class="form-field full">
                  <span>{{ $t('googleMapUrl') }}</span>
                  <input
                    v-model="createForm.map_url"
                    type="url"
                    placeholder="Paste your Google Maps link here"
                  />
                  <small v-if="createForm.latitude && createForm.longitude" class="form-helpert">
                    Coordinates auto-detected: {{ createForm.latitude }}, {{ createForm.longitude }}
                  </small>
                </label>
                <label class="form-field">
                  <span>{{ $t('address') }}</span>
                  <input
                    v-model="createForm.address"
                    type="text"
                    placeholder="Street, building, village"
                  />
                </label>
                <label class="form-field">
                  <span>{{ $t('provinceCity2') }}</span>
                  <select v-model="createForm.location" class="province-select">
                    <option value="" disabled>{{ $t('selectAProvince') }}</option>
                    <option v-for="p in provinces" :key="p" :value="p">{{ p }}</option>
                  </select>
                </label>
                <label class="form-field">
                  <span>{{ $t('latitude') }}</span>
                  <div class="input-with-action">
                    <input
                      v-model="createForm.latitude"
                      type="number"
                      step="any"
                      placeholder="Auto"
                      readonly
                    />
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
                <label class="form-field">
                  <span>{{ $t('longitude') }}</span>
                  <div class="input-with-action">
                    <input
                      v-model="createForm.longitude"
                      type="number"
                      step="any"
                      placeholder="Auto"
                      readonly
                    />
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
                <label class="form-field">
                  <span>{{ $t('shopPhone') }}</span>
                  <input
                    v-model="createForm.phone"
                    type="text"
                    placeholder="+855..."
                  />
                </label>
                <label class="form-field full">
                  <span>{{ $t('shopDescription') }}</span>
                  <textarea
                    v-model="createForm.description"
                    rows="4"
                    placeholder="Describe the shop, services or fleet."
                  ></textarea>
                </label>
              </div>
            </section>
          </div>

          <p v-if="error" class="error-text form-error">{{ error }}</p>

          <div class="form-actions">
            <button type="button" class="ghost-btn" @click="closeCreateModal">{{ $t('cancel') }}</button>
            <button type="button" class="primary-btn" @click="createShop">
              {{ loading ? "Creating..." : "Create Shop" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div
      v-if="showSuccessPopup"
      class="success-toast"
      role="status"
      aria-live="polite"
    >
      <span class="toast-icon">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
        >
          <path d="M20 6L9 17l-5-5"></path>
        </svg>
      </span>
      <div class="toast-content">
        <strong>{{ $t('success') }}</strong>
        <p>{{ $t('yourShopWasCreated') }}</p>
      </div>
    </div>

    <div
      v-if="showSingleShopAlert"
      class="alert-overlay"
      @click.self="showSingleShopAlert = false"
    >
      <div class="alert-modal">
        <div class="alert-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h3>{{ $t('oneShopOnly') }}</h3>
        <p>{{ $t('youCanOnlyCreateOneShopPerAccount') }}</p>
        <button class="alert-btn" @click="showSingleShopAlert = false">{{ $t('ok') }}</button>
      </div>
    </div>
  </div>
</template>
