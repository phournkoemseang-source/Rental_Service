<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import ShopDashboard from "./ShopDashboard.vue";
import Bookings from "./Bookings.vue";
import Payments from "./Payments.vue";
import ReviewsFeedback from "./Review_Feedback.vue";
import Coupons from "./Coupons.vue";
import MyShop from "./myShop.vue";
import Setting from "./setting.vue";
import NotificationOwner from "./Notification_owner.vue";
import api, { shopApi, vehicleApi } from "@/services/api";
import { getSessionUser, logoutUser } from "@/services/auth";
import { useNotifications } from "@/composables/useNotifications";
import { setLanguage, getCurrentLanguage } from "@/i18n";
import ToastStack from "@/components/ToastStack.vue";

const { t } = useI18n();

// Toast notifications
const router = useRouter();
const logoUrl = "/Images/logo-removebg.png";
const route = useRoute();
const SHOP_DASHBOARD_THEME_KEY = "shop-dashboard-theme";
const toast = ref({ show: false, message: "", type: "success" });
const showToast = (message, type = "success") => {
  toast.value = { show: true, message, type };
  setTimeout(() => (toast.value.show = false), 3200);
};

const { unreadCount, loadNotifications } = useNotifications();
let notificationPollTimer = null;
const isDarkMode = ref(false);

const SOUND_KEY_PREFIX = 'settings_notification_sound_';

const playNotificationSound = () => {
  // Check user preference in localStorage before playing
  try {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const pref = localStorage.getItem(`${SOUND_KEY_PREFIX}${storedUser.id}`);
    if (pref === '0') return; // Sound disabled
  } catch { /* ignore */ }

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    // First tone (C5 ~ 523Hz) - gentle sine chime
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.value = 523.25;
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.08, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Second tone (E5 ~ 659Hz) - harmony, slightly delayed
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 659.25;
    gain2.gain.setValueAtTime(0, now + 0.05);
    gain2.gain.linearRampToValueAtTime(0.05, now + 0.09);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.35);

    // Auto-close after sound finishes
    setTimeout(() => { ctx.close().catch(() => {}); }, 500);
  } catch {
    // Audio not available - silently ignore
  }
};

// Watch for new unread notifications and play sound
watch(unreadCount, (newCount, oldCount) => {
  if (newCount > oldCount && oldCount !== undefined) {
    playNotificationSound();
  }
});

// Language state
const currentShopLang = ref(getCurrentLanguage())
const switchShopLang = (lang) => {
  if (lang !== currentShopLang.value) {
    setLanguage(lang)
    currentShopLang.value = lang
  }
}

const themeModeLabel = computed(() =>
  isDarkMode.value ? t('darkMode') : t('lightMode'),
);

const badgeLabel = computed(() => {
  if (!unreadCount.value) return "";
  return unreadCount.value > 9 ? "9+" : String(unreadCount.value);
});

const loadStoredTheme = () => {
  try {
    const storedTheme = window.localStorage.getItem(SHOP_DASHBOARD_THEME_KEY);
    if (storedTheme === "dark" || storedTheme === "light") {
      isDarkMode.value = storedTheme === "dark";
      return;
    }
    isDarkMode.value =
      window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  } catch {
    isDarkMode.value = false;
  }
};

const toggleThemeMode = () => {
  isDarkMode.value = !isDarkMode.value;
};

const goToOwnerNotifications = () => {
  router.push({ name: "shop-notifications" })
}

const sections = computed(() => [
  { id: "dashboard", label: t('dashboard'), icon: "dashboard" },
  { id: "my-shop", label: t('myShop'), icon: "building" },
  { id: "vehicles", label: t('vehicles'), icon: "motorcycle" },
  { id: "bookings", label: t('bookings'), icon: "calendar-check" },
  { id: "payments", label: t('payments'), icon: "wallet" },
  { id: "reviews", label: t('reviewsFeedback'), icon: "message-star" },
  { id: "coupons", label: t('coupons'), icon: "ticket" },
  { id: "notifications", label: t('notifications'), icon: "bell" },
  { id: "settings", label: t('shopSettings'), icon: "settings" },
]);

const active = ref("dashboard");
const isSidebarCollapsed = ref(false);
const sidebarWidth = computed(() => (isSidebarCollapsed.value ? 84 : 272));
const sessionUser = ref(getSessionUser() || {});
const avatarLoadFailed = ref(false);
const showUserMenu = ref(false);
const apiOrigin = computed(() => {
  try {
    return new URL(api.defaults.baseURL, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
});

const displayName = computed(() => sessionUser.value?.name || "User");

const displayRole = computed(() => {
  const role = sessionUser.value?.role;
  if (role === "shop_owner" || role === "owner") return "Shop Owner";
  if (role === "admin") return "Admin";
  if (role === "customer") return "Customer";
  return role || "User";
});

const normalizeAvatarUrl = (url) => {
  if (!url) return "";
  if (/^https?:\/\//.test(url)) return url;
  const normalized = String(url).replace(/^\/+/, "");
  if (normalized.startsWith("storage/"))
    return `${apiOrigin.value}/${normalized}`;
  if (normalized.includes("/"))
    return `${apiOrigin.value}/storage/${normalized}`;
  return `${apiOrigin.value}/storage/avatars/${normalized}`;
};

const normalizeVehicleImageUrl = (url) => {
  if (!url) return "";
  if (/^https?:\/\//.test(url) || /^data:image\//.test(url)) {
    const originValue = apiOrigin.value;
    // Check if current origin matches or the URL host is bogus (localhost without port)
    try {
      const urlObj = new URL(url);
      const currentOrigin = window.location.origin;
      if (urlObj.hostname === 'localhost' && !currentOrigin.includes('localhost:8000') && !currentOrigin.includes('127.0.0.1:8000')) {
        // Replace wrong host with API origin
        return url.replace(urlObj.origin, originValue);
      }
    } catch { /* ignore invalid URLs */ }
    return url;
  }
  const normalized = String(url).replace(/^\/+/, "");
  if (normalized.startsWith("storage/")) return `/${normalized}`;
  if (normalized.startsWith("vehicles/")) return `/storage/${normalized}`;
  return `/${normalized}`;
};

const displayAvatarUrl = computed(() => {
  if (avatarLoadFailed.value) return "";
  return normalizeAvatarUrl(
    sessionUser.value?.avatar_url || sessionUser.value?.img_url || "",
  );
});

const displayInitials = computed(() => {
  const name = (displayName.value || "").trim();
  if (!name) return "U";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
});

const userMenuTimer = ref(null);

const clearUserMenuTimer = () => {
  if (userMenuTimer.value) {
    clearTimeout(userMenuTimer.value);
    userMenuTimer.value = null;
  }
};

const scheduleUserMenuAutoClose = () => {
  clearUserMenuTimer();
  userMenuTimer.value = setTimeout(() => {
    showUserMenu.value = false;
    userMenuTimer.value = null;
  }, 2000);
};

watch(showUserMenu, (isOpen) => {
  if (isOpen) {
    scheduleUserMenuAutoClose();
  } else {
    clearUserMenuTimer();
  }
});



watch(isDarkMode, (enabled) => {
  try {
    window.localStorage.setItem(
      SHOP_DASHBOARD_THEME_KEY,
      enabled ? "dark" : "light",
    );
  } catch {
    // Ignore storage failures and keep the theme in memory for this session.
  }
});

watch(
  () => route.meta.defaultSection,
  (section) => {
    if (!section) return;
    const matching = sections.value.find((s) => s.id === section);
    if (matching) {
      active.value = section;
    }
  },
  { immediate: true }
);

let initializeShopData = async () => {}

const refreshSessionUser = () => {
  sessionUser.value = getSessionUser() || {};
  avatarLoadFailed.value = false;
  loadDashboardData().catch(() => {});
};

const onAvatarError = () => {
  avatarLoadFailed.value = true;
};

onMounted(() => {
  loadStoredTheme();
  window.addEventListener("storage", refreshSessionUser);
  window.addEventListener("user-updated", refreshSessionUser);

  // Load all dashboard data in a single unified call (shop → vehicles → bookings → payments)
  loadDashboardData().catch(() => {});

  // Load notifications on mount and poll every 30s for real-time updates
  loadNotifications().catch(() => {});
  notificationPollTimer = setInterval(() => {
    loadNotifications().catch(() => {});
  }, 15000);
});

onBeforeUnmount(() => {
  window.removeEventListener("storage", refreshSessionUser);
  window.removeEventListener("user-updated", refreshSessionUser);
  clearUserMenuTimer();

  if (notificationPollTimer) {
    clearInterval(notificationPollTimer);
    notificationPollTimer = null;
  }
});
const categories = ["Car", "Moto", "Bike"];
const statuses = ["Available", "Rented", "Maintenance"];
const search = ref("");
const categoryFilter = ref("All Categories");
const statusFilter = ref("All Status");
const modal = ref(false);
const editId = ref(null);
const showLogoutModal = ref(false);

// Delete confirmation modal
const showDeleteModal = ref(false);
const deleteId = ref(null);
const deleteVehicleName = ref("");

const confirmDelete = (v) => {
  deleteId.value = v.id;
  deleteVehicleName.value = v.name
    ? `${v.name} - ${v.plate || "No plate"}`
    : v.plate || "Unknown Vehicle";
  showDeleteModal.value = true;
};

const cancelDelete = () => {
  deleteId.value = null;
  deleteVehicleName.value = "";
  showDeleteModal.value = false;
};

const onMenuClick = (item) => {
  if (item.id === "logout") {
    showLogoutModal.value = true;
    return;
  }
  active.value = item.id;
  if (item.id === "vehicles") {
    loadOwnerShopName();
  }
  if (item.id === "notifications") {
    goToOwnerNotifications();
    return;
  }
};

const cancelLogout = () => {
  showLogoutModal.value = false;
};

const confirmLogout = async () => {
  showLogoutModal.value = false;
  try {
    await logoutUser();
  } finally {
    router.push("/login");
  }
};

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value;
};

const goToSettings = () => {
  showUserMenu.value = false;
  active.value = "settings";
};

const vehicles = ref([]);
const bookings = ref([]);
const payments = ref([]);
const feedback = ref([]);
const coupons = ref([]);
const loyalty = ref([]);

// Dashboard loading states
const isLoadingDashboard = ref(false);
const dashboardError = ref(null);

// Shop data
const shop = ref(null);
const shopRating = ref({ average_rating: 0, total_ratings: 0 });
const shopModal = ref(false);
const shopForm = reactive({
  name: "",
  city_id: null,
  description: "",
  address: "",
  location: "",
  latitude: "",
  longitude: "",
  map_url: "",
  img_url: "",
});
const cities = ref([]);
const isLoadingShop = ref(false);

// Image upload handling for shop
const shopImageFile = ref(null);
const shopImagePreview = ref("");
const shopImageInputRef = ref(null);
const isShopImageDragOver = ref(false);

// Handle image upload
const onShopImageChange = (event) => {
  const file = event.target.files?.[0];
  if (file) {
    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file", "error");
      return;
    }
    shopImageFile.value = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      shopForm.img_url = e.target?.result || "";
      shopImagePreview.value = e.target?.result || "";
    };
    reader.readAsDataURL(file);
  }
};

const onShopImageDrop = (event) => {
  const file = event.dataTransfer?.files?.[0];
  if (file && file.type.startsWith("image/")) {
    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file", "error");
      return;
    }
    shopImageFile.value = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      shopForm.img_url = e.target?.result || "";
      shopImagePreview.value = e.target?.result || "";
    };
    reader.readAsDataURL(file);
  }
};

const triggerShopImagePicker = () => {
  if (shopImageInputRef.value) {
    shopImageInputRef.value.value = "";
    shopImageInputRef.value.click();
  }
};

// Fetch shop data
const SHOP_CACHE_PREFIX = "settings_shop_";

const shopCacheKey = (ownerId) => `${SHOP_CACHE_PREFIX}${ownerId}`;

const getCachedShop = (ownerId) => {
  if (!ownerId) return null;
  try {
    const raw = localStorage.getItem(shopCacheKey(ownerId));
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
      localStorage.removeItem(shopCacheKey(ownerId));
      return;
    }
    localStorage.setItem(shopCacheKey(ownerId), JSON.stringify(shopData));
  } catch {
    // best effort
  }
};

const fetchShop = async () => {
  try {
    const ownerId = Number(sessionUser.value?.id || 0);
    if (!ownerId) {
      shop.value = null;
      return;
    }

    const response = await shopApi.getMyShop();
    const data = response.data;
    if (!data || (response.status && response.status === 204)) {
      shop.value = null;
      setCachedShop(ownerId, null);
      return;
    }

    shop.value = data;
    setCachedShop(ownerId, data);
  } catch (error) {
    if (error.response?.status === 401) {
      logoutUser();
      router.push('/login');
      return;
    }
    console.error("Error fetching shop:", error);
    shop.value = null;
  }
};

// Hardcoded 25 Cambodia provinces as fallback when API has no data
const CAMBODIA_PROVINCES = [
  'Banteay Meanchey', 'Battambang', 'Kampong Cham', 'Kampong Chhnang',
  'Kampong Speu', 'Kampong Thom', 'Kampot', 'Kandal', 'Kep',
  'Koh Kong', 'Kratié', 'Mondulkiri', 'Oddar Meanchey', 'Pailin',
  'Phnom Penh', 'Preah Vihear', 'Prey Veng', 'Pursat', 'Ratanakiri',
  'Siem Reap', 'Preah Sihanouk', 'Stung Treng', 'Svay Rieng', 'Takéo',
  'Tboung Khmum',
];

// Fetch cities
const fetchCities = async () => {
  try {
    const response = await api.get("/cities");
    const apiData = response.data.data || response.data || [];
    if (Array.isArray(apiData) && apiData.length > 0) {
      // API returned real data — use it
      cities.value = apiData;
    } else {
      // API returned empty — fallback to hardcoded province list
      cities.value = CAMBODIA_PROVINCES.map((name, idx) => ({
        id: idx + 1,
        name,
      }));
    }
  } catch (error) {
    console.error("Error fetching cities, using fallback:", error);
    // Network error — use hardcoded list
    cities.value = CAMBODIA_PROVINCES.map((name, idx) => ({
      id: idx + 1,
      name,
    }));
  }
};

// Open create shop modal
const openShopModal = () => {
  shopForm.name = shop.value?.name || "";
  shopForm.city_id = shop.value?.city_id || null;
  shopForm.description = shop.value?.description || "";
  shopForm.address = shop.value?.address || "";
  shopForm.location = shop.value?.location || "";
  shopForm.latitude = shop.value?.latitude || "";
  shopForm.longitude = shop.value?.longitude || "";
  shopForm.map_url = shop.value?.map_url || "";
  shopForm.img_url = shop.value?.img_url || "";
  // Reset image fields
  shopImageFile.value = null;
  shopImagePreview.value = "";
  shopModal.value = true;
};

// Save shop
const saveShop = async () => {
  if (!shopForm.name) {
    showToast("Please enter shop name", "error");
    return;
  }

  isLoadingShop.value = true;
  try {
    const ownerId = Number(sessionUser.value?.id || getUserId());
    let savedShop = null;

    // If an image file has been selected, use FormData to send multipart request
    if (shopImageFile.value) {
      const formData = new FormData();
      formData.append("owner_id", ownerId);
      formData.append("name", shopForm.name);
      if (shopForm.city_id) {
        formData.append("city_id", shopForm.city_id);
      }
      formData.append("description", shopForm.description);
      formData.append("address", shopForm.address);
      if (shopForm.location) formData.append("location", shopForm.location);
      if (shopForm.latitude) formData.append("latitude", shopForm.latitude);
      if (shopForm.longitude) formData.append("longitude", shopForm.longitude);
      if (shopForm.map_url) formData.append("map_url", shopForm.map_url);
      formData.append("status", "active");
      // the backend expects the field name img_url
      formData.append("img_url", shopImageFile.value);

      if (shop.value?.id) {
        // Update existing shop
        const response = await api.post(`/shops/${shop.value.id}?_method=PUT`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        savedShop = response.data;
        showToast("Shop updated successfully!", "success");
      } else {
        // Create new shop
        const response = await api.post("/shops", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        savedShop = response.data;
        shop.value = response.data;
        showToast("Shop created successfully!", "success");
      }
    } else {
      // No image file - send as regular JSON payload
      const payload = {
        owner_id: ownerId,
        name: shopForm.name,
        city_id: shopForm.city_id || null,
        description: shopForm.description,
        address: shopForm.address,
        location: shopForm.location || null,
        latitude: shopForm.latitude || null,
        longitude: shopForm.longitude || null,
        map_url: shopForm.map_url || null,
        status: "active",
        img_url: shopForm.img_url || null,
      };

      if (shop.value?.id) {
        // Update existing shop
        const response = await api.put(`/shops/${shop.value.id}`, payload);
        savedShop = response.data;
        showToast("Shop updated successfully!", "success");
      } else {
        // Create new shop
        const response = await api.post("/shops", payload);
        savedShop = response.data;
        shop.value = response.data;
        showToast("Shop created successfully!", "success");
      }
    }

    shopModal.value = false;
    // Reset image related refs
    shopImageFile.value = null;
    shopImagePreview.value = "";
    await fetchShop();
    await loadOwnerShopName();
    form.shop = savedShop?.name || shop.value?.name || currentShopName.value;
    
    // Full dashboard data reload — fetches vehicles, bookings, payments for the new/updated shop
    await loadDashboardData();
  } catch (error) {
    console.error("Error saving shop:", error);
    const validationErrors = error.response?.data?.errors;
    const firstValidationError = validationErrors
      ? Object.values(validationErrors)[0]
      : null;
    const errorMessage = Array.isArray(firstValidationError)
      ? firstValidationError[0]
      : firstValidationError || error.response?.data?.message || "Failed to save shop. Please try again.";
    showToast(errorMessage, "error");
  } finally {
    isLoadingShop.value = false;
  }
};

// Load cities on mount
// Cities are fetched once on script setup (no dependency on shop)
fetchCities();

// Fetch shop owner bookings for dashboard stats
const normalizePaymentStatusKey = (value) => {
  const raw = (value || "").toString().trim().toLowerCase();
  if (!raw) return "pending";
  const cleaned = raw.replace(/[\s-]+/g, "_");
  const aliases = {
    canceled: "cancelled",
    cancel: "cancelled",
    cencel: "cancelled",
    comfirmed: "confirmed",
    process: "processing",
    processing: "processing",
    in_process: "processing",
    in_progress: "processing",
    success: "paid",
    successful: "paid",
    succeeded: "paid",
    complete: "completed",
    completed: "completed",
    confirm: "confirmed",
    confirmed: "confirmed",
    paid: "paid",
    pending_payment: "pending",
  };
  return aliases[cleaned] || cleaned;
};

const isPaidPayment = (payment) => {
  const statusKey = normalizePaymentStatusKey(payment?.status || payment?.payment_status);
  return ["paid", "confirmed", "completed"].includes(statusKey);
};

const getPaymentDate = (payment) => {
  return payment?.paid_at || payment?.created_at || payment?.date || "";
};

const getDateKey = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const shopMatchesEntry = (entry) => {
  const shopId = Number(shop.value?.id);
  if (!shopId) return false;  // Don't show any data if no shop exists
  const bookingShopId =
    entry.shop_id ||
    entry.booking?.shop_id ||
    entry.vehicle?.shop_id ||
    entry.shop?.id;
  return Number(bookingShopId) === shopId;
};

const shopPayments = computed(() =>
  payments.value.filter((payment) => shopMatchesEntry(payment)),
);


const fetchFeedback = async () => {
  try {
    const response = await api.get("/feedback");
    const raw = response.data?.data || response.data || [];
    const data = Array.isArray(raw) ? raw : [];
    const filtered = data.filter(shopMatchesEntry);
    feedback.value = filtered.map((entry) => ({
      ...entry,
      rating: Number(entry.rating || entry.score || 0),
    }));
  } catch (error) {
    console.error("Error fetching feedback:", error);
    feedback.value = [];
  }
};

const fetchShopRating = async () => {
  const shopId = shop.value?.id;
  if (!shopId) {
    shopRating.value = { average_rating: 0, total_ratings: 0 };
    return;
  }
  try {
    const response = await api.get(`/shop-rating?shop_id=${shopId}`);
    shopRating.value = response.data || { average_rating: 0, total_ratings: 0 };
  } catch (error) {
    console.error("Error fetching shop rating:", error);
    shopRating.value = { average_rating: 0, total_ratings: 0 };
  }
};

// ─── Unified data loader (called once from onMounted) ───────
const loadDashboardData = async (skipLoading = false) => {
  if (!skipLoading) isLoadingDashboard.value = true;
  dashboardError.value = null;
  try {
    // Step 1: Resolve shop first — everything depends on it
    await initializeShopData();
    
    const hasShop = Boolean(shop.value?.id);
    
    // Step 2: Fetch vehicles (requires shop)
    if (hasShop) {
      const response = await vehicleApi.getAll();
      const allVehicles = response.data.data || response.data || [];
      const shopId = Number(shop.value.id);
      vehicles.value = allVehicles
        .filter((v) => Number(v.shop_id) === shopId)
        .map((v) => {
          const normalizedStatus = typeof v.status === "string" ? v.status.trim() : v.status;
          const createdAtValue = v.created_at || v.create_at || v.createdAt || "";
          return {
            ...v,
            name: v.name,
            type: v.type,
            category: v.type || v.category,
            brand: v.brand,
            model: v.model,
            plate: v.plate_number,
            plate_number: v.plate_number,
            price: v.price_per_day,
            price_per_day: v.price_per_day,
            status: normalizedStatus || "Available",
            description: v.description,
            fuel: v.fuel_type,
            fuel_type: v.fuel_type,
            transmission: v.transmission,
            totalVehiclesInput: v.total_vehicles ?? 1,
            riderDetails: v.rider_details ?? "",
            insuranceFee: v.insurance_fee ?? "",
            taxesFee: v.taxes_fee ?? "",
            createdAt: createdAtValue,
            updatedAt: v.updated_at,
            image: normalizeVehicleImageUrl(v.image_url_full) || normalizeVehicleImageUrl(v.image_url || ""),
            image_url:
              normalizeVehicleImageUrl(v.image_url_full) || normalizeVehicleImageUrl(v.image_url || ""),
          };
        });
    }
    
    // Step 3: Fetch bookings (requires shop)
    if (hasShop) {
      try {
        const response = await api.get("/shop-bookings");
        bookings.value = response.data || [];
      } catch (error) {
        console.error("Error fetching shop bookings:", error);
        bookings.value = [];
      }
    }
    
    // Step 4: Fetch payments (requires shop)
    if (hasShop) {
      try {
        const response = await api.get("/shop-payments");
        const data = response.data || [];
        payments.value = Array.isArray(data) ? data : data.data || [];
      } catch (error) {
        console.error("Error fetching shop payments:", error);
        payments.value = [];
      }
    }
  } catch (error) {
    console.error("Dashboard load error:", error);
    dashboardError.value = "Failed to load dashboard data.";
  } finally {
    isLoadingDashboard.value = false;
  }
};

const histories = ref([
  { id: 1, action: "New booking received for Toyota Camry", time: "2 min ago" },
  { id: 2, action: "Payment of $45 received from Sokha", time: "15 min ago" },
  {
    id: 3,
    action: "Vehicle Honda Wave marked as Available",
    time: "1 hour ago",
  },
  { id: 4, action: "New review: 5 stars from Dara", time: "3 hours ago" },
]);

const form = reactive({
  name: "",
  type: "",
  brand: "",
  plate: "",
  price: "",
  fuel: "",
  transmission: "",
  totalVehiclesInput: 1,
  riderDetails: "",
  insuranceFee: "",
  taxesFee: "",
  status: "Available",
  description: "",
  shop: "",
  image: "",
  createdAt: "",
  updatedAt: "",
});

const normalizeOptionalNumber = (value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const currentShopName = ref("No Shop Found");

const getUserId = () => {
  const sessionId = Number(sessionUser.value?.id || 0);
  if (sessionId) return sessionId;

  const rawUser = localStorage.getItem("user");
  if (!rawUser) return 1;
  try {
    const parsed = JSON.parse(rawUser);
    return parsed.id || 1;
  } catch {
    return 1;
  }
};

const loadOwnerShopName = async () => {
  try {
    if (shop.value?.name) {
      currentShopName.value = shop.value.name;
      form.shop = currentShopName.value;
      return;
    }

    const ownerId = getUserId();
    const response = await shopApi.getMyShop();
    const data = response.data;
    if (!data || (response.status && response.status === 204)) {
      currentShopName.value = "No Shop Found";
      form.shop = currentShopName.value;
      return;
    }

    currentShopName.value = data.name || "No Shop Name";
    form.shop = currentShopName.value;
  } catch (error) {
    console.error("Error loading owner shop name:", error);
    currentShopName.value = "No Shop Found";
    form.shop = currentShopName.value;
  }
};

const resolveOwnerShop = async () => {
  if (shop.value?.id) return shop.value;

  try {
    const response = await shopApi.getMyShop();
    const data = response.data;
    if (!data || (response.status && response.status === 204)) return null;

    shop.value = data;
    currentShopName.value = shop.value?.name || "No Shop Name";
    form.shop = currentShopName.value;
    return shop.value;
  } catch (error) {
    console.error("Error resolving owner shop:", error);
    return null;
  }
};

initializeShopData = async () => {
  await fetchShop();
  await loadOwnerShopName();
};

watch(
  shop,
  (current) => {
    if (current?.id) {
      fetchFeedback().catch(() => {});
      fetchShopRating().catch(() => {});
      return;
    }
    feedback.value = [];
    shopRating.value = { average_rating: 0, total_ratings: 0 };
  },
  { immediate: true },
);

const khTime = () => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Phnom_Penh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
};

// Format date to show only day, month, year
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateStr;
  }
};

// Status icons
const getStatusIcon = (status) => {
  if (status === "Available") {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10b981" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
  } else if (status === "Rented") {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  } else if (status === "Maintenance") {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#f59e0b" stroke-width="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>';
  }
  return "";
};

// Get status badge class
const getStatusClass = (status) => {
  if (status === "Available") return "status-available";
  if (status === "Rented") return "status-rented";
  if (status === "Maintenance") return "status-maintenance";
  return "";
};

const sampleThumb =
  "https://images.unsplash.com/photo-1549924231-f129b911e442?auto=format&fit=crop&w=900&q=80";

const today = computed(() => khTime().split(" ")[0]);
const filteredVehicles = computed(() => {
  const s = search.value.trim().toLowerCase();
  return vehicles.value.filter((v) => {
    const sOk =
      !s ||
      (v.name && v.name.toLowerCase().includes(s)) ||
      (v.category && v.category.toLowerCase().includes(s)) ||
      (v.brand && v.brand.toLowerCase().includes(s)) ||
      (v.model && v.model.toLowerCase().includes(s)) ||
      (v.plate && v.plate.toLowerCase().includes(s)) ||
      (v.type && v.type.toLowerCase().includes(s));
    const cOk =
      categoryFilter.value === "All Categories" ||
      v.category === categoryFilter.value ||
      v.type === categoryFilter.value;
    const stOk =
      statusFilter.value === "All Status" || v.status === statusFilter.value;
    return sOk && cOk && stOk;
  });
});

const totalBookings = computed(() => bookings.value.length);
const totalEarnings = computed(() =>
  shopPayments.value.reduce((sum, payment) => {
    if (!isPaidPayment(payment)) return sum;
    return sum + Number(payment.amount || payment.total_price || 0);
  }, 0),
);
const todayBookings = computed(
  () =>
    bookings.value.filter((b) => {
      const key = getDateKey(b.start_date || b.created_at || b.startDate);
      return key && key === today.value;
    }).length,
);
const totalVehicles = computed(() => vehicles.value.length);
const availableVehicles = computed(
  () => vehicles.value.filter((v) => v.status === "Available").length,
);
const maintenanceVehicles = computed(
  () => vehicles.value.filter((v) => v.status === "Maintenance").length,
);
const monthlyIncome = computed(() => {
  const now = new Date();
  return shopPayments.value.reduce((sum, payment) => {
    if (!isPaidPayment(payment)) return sum;
    const dateStr = getPaymentDate(payment);
    if (!dateStr) return sum;
    const date = new Date(dateStr);
    if (
      !Number.isNaN(date.getTime()) &&
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    ) {
      return sum + Number(payment.amount || payment.total_price || 0);
    }
    return sum;
  }, 0);
});

const formatCurrency = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
};
const newCustomers = computed(
  () => new Set(bookings.value.map((b) => b.customer)).size,
);
const averageRating = computed(() => {
  // Only show rating if shop has ratings
  if (!shopRating.value.total_ratings || shopRating.value.total_ratings === 0) {
    return "- ";
  }
  return String(shopRating.value.average_rating || "0");
});
const potentialPerDay = computed(() =>
  vehicles.value.reduce((a, b) => a + Number(b.price || 0), 0),
);
const latestVehicles = computed(() => vehicles.value.slice(0, 8));

const openCreate = async () => {
  await loadOwnerShopName();
  let ownerShop = null;
  try {
    ownerShop = await resolveOwnerShop();
  } catch (error) {
    console.error("Error resolving owner shop:", error);
  }
  if (!ownerShop?.id) {
    openShopModal();
    showToast("Create your shop first, then add vehicles.", "error");
    return;
  }

  editId.value = null;
  Object.assign(form, {
    name: "",
    type: categories[0] || "",
    brand: "",
    plate: "",
    price: "",
    fuel: "",
    transmission: "",
    totalVehiclesInput: 1,
    riderDetails: "",
    insuranceFee: "",
    taxesFee: "",
    status: "Available",
    description: "",
    shop: currentShopName.value,
    image: "",
    createdAt: khTime(),
    updatedAt: khTime(),
  });
  modal.value = true;
};

const openEdit = (v) => {
  editId.value = v.id;
  Object.assign(form, {
    name: v.name || "",
    type: v.type || v.category || categories[0] || "",
    brand: v.brand || "",
    plate: v.plate || "",
    price: v.price || "",
    fuel: v.fuel || "",
    transmission: v.transmission || "",
    totalVehiclesInput: v.totalVehiclesInput ?? 1,
    riderDetails: v.riderDetails || "",
    insuranceFee: v.insuranceFee ?? "",
    taxesFee: v.taxesFee ?? "",
    status: v.status || "Available",
    description: v.description || "",
    shop: v.shop || currentShopName.value,
    image: v.image || "",
    createdAt: v.createdAt || "",
    updatedAt: khTime(),
  });
  modal.value = true;
};

const saveVehicle = async () => {
  const nameValue = String(form.name || "").trim();
  const typeValue = String(
    form.type || form.category || categories[0] || "",
  ).trim();
  if (
    !nameValue ||
    !typeValue ||
    form.price === "" ||
    form.price === null ||
    form.price === undefined
  ) {
    showToast(
      "Please fill in all required fields: Name, Category, and Price",
      "error",
    );
    return;
  }

  let ownerShop = null;
  try {
    ownerShop = await resolveOwnerShop();
  } catch (error) {
    console.error("Error resolving owner shop:", error);
  }
  const shopId = ownerShop?.id || null;

  if (!shopId) {
    openShopModal();
    showToast("Create your shop first, then add vehicles.", "error");
    return;
  }

  // Ensure form has a type/category value
  form.type = typeValue;

  const payload = {
    name: nameValue,
    category: typeValue,
    brand: form.brand,
    plate: form.plate,
    price: Number(form.price),
    status: form.status,
    description: form.description,
    shop: form.shop,
    shop_id: shopId,
    fuel: form.fuel,
    transmission: form.transmission,
    total_vehicles: normalizeOptionalNumber(form.totalVehiclesInput) ?? 1,
    rider_details: form.riderDetails,
    insurance_fee: normalizeOptionalNumber(form.insuranceFee),
    taxes_fee: normalizeOptionalNumber(form.taxesFee),
    photos: form.image ? [form.image] : [],
    previewUrl: form.image,
  };

  try {
    if (editId.value) {
      // Update existing vehicle
      const response = await vehicleApi.update(editId.value, payload);
      const updatedData = response.data;
      const index = vehicles.value.findIndex((v) => v.id === editId.value);
      if (index >= 0) {
        vehicles.value[index] = {
          ...vehicles.value[index],
          ...payload,
          name: updatedData.name,
          type: updatedData.type,
          category: updatedData.type,
          brand: updatedData.brand,
          plate: updatedData.plate_number,
          price: updatedData.price_per_day,
          status: updatedData.status,
          description: updatedData.description,
          fuel: updatedData.fuel_type,
          transmission: updatedData.transmission,
          totalVehiclesInput: updatedData.total_vehicles ?? form.totalVehiclesInput ?? 1,
          riderDetails: updatedData.rider_details ?? "",
          insuranceFee: updatedData.insurance_fee ?? "",
          taxesFee: updatedData.taxes_fee ?? "",
          image:
            normalizeVehicleImageUrl(updatedData.image_url_full) ||
            normalizeVehicleImageUrl(updatedData.image_url || "") ||
            form.image,
          updatedAt: khTime(),
        };
      }
      modal.value = false;
      showToast("Vehicle updated successfully!", "success");
    } else {
      // Create new vehicle - wait for API response
      const response = await vehicleApi.create(payload);
      const newData = response.data;

      // Add vehicle to list with real ID from server
      vehicles.value.unshift({
        id: newData.id,
        ...payload,
        name: newData.name,
        type: newData.type,
        category: newData.type,
        brand: newData.brand,
        plate: newData.plate_number,
        price: newData.price_per_day,
        status: newData.status,
        description: newData.description,
        fuel: newData.fuel_type,
        transmission: newData.transmission,
        totalVehiclesInput: newData.total_vehicles ?? form.totalVehiclesInput ?? 1,
        riderDetails: newData.rider_details ?? "",
        insuranceFee: newData.insurance_fee ?? "",
        taxesFee: newData.taxes_fee ?? "",
        image:
          normalizeVehicleImageUrl(newData.image_url_full) ||
          normalizeVehicleImageUrl(newData.image_url || "") ||
          form.image,
        createdAt: khTime(),
        updatedAt: khTime(),
      });

      modal.value = false;
      showToast("Vehicle created successfully!", "success");
    }
  } catch (error) {
    console.error("Error saving vehicle:", error);
    console.error("Error response:", error.response);
    console.error("Error response data:", error.response?.data);

    let errorMessage = "Failed to save vehicle. Please try again.";

    if (error.response) {
      // Server responded with error
      if (error.response.status === 401) {
        errorMessage = "You are not authenticated. Please login again.";
      } else if (error.response.status === 403) {
        errorMessage =
          error.response.data?.message ||
          "You do not have permission to perform this action.";
      } else if (error.response.status === 422) {
        // Validation error
        const errors = error.response.data?.errors;
        if (errors) {
          const firstError = Object.values(errors)[0];
          errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
        } else {
          errorMessage = error.response.data?.message || "Validation failed.";
        }
      } else {
        const serverMessage =
          error.response.data?.message || error.response.data?.error || "";
        if (typeof serverMessage === "string" && serverMessage.length > 180) {
          errorMessage = "Failed to save vehicle. Please try again.";
        } else {
          errorMessage =
            serverMessage || `Server error: ${error.response.status}`;
        }
      }
    } else if (error.request) {
      errorMessage = "No response from server. Please check your connection.";
    }

    showToast(errorMessage, "error");
  }
};

const removeVehicle = async () => {
  if (!deleteId.value) return;
  try {
    await vehicleApi.delete(deleteId.value);
    vehicles.value = vehicles.value.filter((v) => v.id !== deleteId.value);
    showToast("Vehicle deleted successfully!", "success");
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    showToast("Failed to delete vehicle. Please try again.", "error");
  } finally {
    cancelDelete();
  }
};
const onPhotos = (e) => {
  const file = e.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      form.image = event.target?.result || "";
    };
    reader.readAsDataURL(file);
  }
};
const onPhotoDrop = (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (file && file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (event) => {
      form.image = event.target?.result || "";
    };
    reader.readAsDataURL(file);
  }
};

const iconSvg = (name) => {
  const icons = {
    dashboard:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    building:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/><path d="M11 21v-3h2v3"/></svg>',
    motorcycle:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.5" cy="17.5" r="3.5"/><circle cx="17.5" cy="17.5" r="3.5"/><path d="M7 17.5h4.5l2.5-4.5h3.5"/><path d="M14 13h2.8l1.8 3.2"/><path d="M11.5 17.5l1.6-2.8"/><path d="M9.2 10.5H13l1.2 2.5"/><path d="M9.2 10.5 8 7.8H5.8"/></svg>',
    "calendar-check":
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/><path d="m9.5 15 2 2 4-4"/></svg>',
    wallet:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M16 14h3"/><circle cx="15" cy="14" r=".8" fill="currentColor" stroke="none"/></svg>',
    "shield-alert":
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 3 5 6v6c0 4.8 3 7.8 7 9 4-1.2 7-4.2 7-9V6z"/><path d="M12 9v4"/><circle cx="12" cy="16.5" r=".9" fill="currentColor" stroke="none"/></svg>',
    "message-star":
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M20 14a3 3 0 0 1-3 3H9l-4 4v-4H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z"/><path d="m12 7 1 2 2.2.3-1.6 1.6.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.6L11 9z"/></svg>',
    badge:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/><path d="m9.5 12.5-1.3 8 3.8-2 3.8 2-1.3-8"/></svg>',
    chart:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 20h16"/><path d="M7 16v-5M12 16V8M17 16v-3"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 0 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 0 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 0 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 0 1 0 4h-.2a1 1 0 0 0-.9.6z"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    shop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 9l1.5-5h13L20 9"/><path d="M5 10h14v9H5z"/><path d="M9 14h6"/></svg>',
    car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2.5-3h11L18 7h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6"/><path d="M1 9h22"/></svg>',
    calendar:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>',
    activity:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 18h14"/><path d="M8 16V9"/><path d="M12 16V6"/><path d="M16 16v-4"/></svg>',
    dollar:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v20"/><path d="M17 6.5a4 4 0 0 0-3-1.2h-3a3 3 0 1 0 0 6h2a3 3 0 1 1 0 6H9a4 4 0 0 1-3-1.2"/></svg>',
    trend:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 17l7-7 4 4 7-7"/><path d="M14 7h7v7"/></svg>',
    users:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 11c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3z"/><path d="M8 11c1.7 0 3-1.3 3-3S9.7 5 8 5 5 6.3 5 8s1.3 3 3 3z"/><path d="M8 13c-3.3 0-6 1.3-6 3v1h12v-1c0-1.7-2.7-3-6-3z"/><path d="M22 17v-1c0-1.4-1.7-2.6-4-2.9"/></svg>',
    warning:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3L2.8 19a1.6 1.6 0 0 0 1.4 2.4h15.6a1.6 1.6 0 0 0 1.4-2.4z"/><path d="M12 9v4"/><circle cx="12" cy="16.8" r=".8"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2-4.5-4.4 6.2-.9z"/></svg>',
    ticket:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 8a2 2 0 0 1 2-2h14v4a2 2 0 0 0 0 4v4H5a2 2 0 0 1-2-2z"/><path d="M9 6v12M15 6v12"/></svg>',
    gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="9" width="18" height="12" rx="2"/><path d="M12 9v12M3 13h18"/><path d="M12 9s-3.5-1.5-4.5-3A2.2 2.2 0 0 1 11 4.2c.7 1 .9 2.3 1 4.8zM12 9s3.5-1.5 4.5-3A2.2 2.2 0 0 0 13 4.2c-.7 1-.9 2.3-1 4.8z"/></svg>',
    history:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/></svg>',
    settings:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 0 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 0 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 0 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 0 1 0 4h-.2a1 1 0 0 0-.9.6z"/></svg>',
    logout:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
    brand:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2.5-3h11L18 7h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6"/><path d="M1 9h22"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5"/><path d="M10 17a2 2 0 0 0 4 0"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77"/></svg>',
  };
  return icons[name] || "";
};
</script>

<template>
  <div
    class="page"
    :class="{
      'sidebar-collapsed': isSidebarCollapsed,
      'dark-theme': isDarkMode,
    }"
  >
    <aside
      class="sidebar"
      :style="{ width: `${sidebarWidth}px`, flexBasis: `${sidebarWidth}px` }"
    >
      <div class="brand">
        <div class="brand-badge">
          <img class="brand-logo" :src="logoUrl" alt="Chong Choul" />
        </div>
        <div class="brand-text">
          <div class="brand-row">
            <span class="brand-name">Chong</span>
            <span class="brand-cyan">Choul</span>
          </div>
        </div>
      </div>
      <button
        class="sidebar-toggle"
        @click="isSidebarCollapsed = !isSidebarCollapsed"
        :title="isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        <span class="toggle-icon" :class="{ rotate: isSidebarCollapsed }">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </span>
      </button>
      
      <!-- Logo/Brand Section -->
      
      <div class="menu-area">
        <button
          v-for="item in sections"
          :key="item.id"
          class="menu-item"
          :class="{ active: item.id === active }"
          @click="onMenuClick(item)"
        >
          <span class="menu-icon" v-html="iconSvg(item.icon)"></span>
          <span class="menu-label">{{ item.label }}</span>
        </button>
      </div>
      <button class="menu-item logout-item" @click="showLogoutModal = true">
        <span class="menu-icon logout-icon" v-html="iconSvg('logout')"></span>
        <span class="menu-label">Logout</span>
      </button>
    </aside>

    <main class="main">
      <header class="topbar">
        <div class="topbar-left">
          <span
            class="topbar-icon"
            v-html="
              iconSvg(sections.find((s) => s.id === active)?.icon || 'grid')
            "
          ></span>
          <h1>{{ sections.find((s) => s.id === active)?.label || t('shopDashboardTitle') }}</h1>
        </div>
        <div class="topbar-right">
          <!-- Language Toggle -->
          <div class="header-lang-toggle-shop">
            <button
              class="hl-btn-shop"
              :class="{ active: currentShopLang === 'en' }"
              @click="switchShopLang('en')"
              title="English"
            >
              EN
            </button>
            <span class="hl-sep-shop">|</span>
            <button
              class="hl-btn-shop"
              :class="{ active: currentShopLang === 'kh' }"
              @click="switchShopLang('kh')"
              title="ភាសាខ្មែរ"
            >
              KH
            </button>
          </div>
          <button
            type="button"
            class="theme-toggle"
            :title="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
            @click="toggleThemeMode"
          >
            <span
              class="theme-toggle-icon"
              v-html="iconSvg(isDarkMode ? 'sun' : 'moon')"
            ></span>
            <span class="theme-toggle-label">{{ themeModeLabel }}</span>
          </button>
          <button
            type="button"
            class="bell-btn notification-btn"
            aria-label="Open notifications"
            @click.stop="goToOwnerNotifications"
          >
            <span class="bell-icon" v-html="iconSvg('bell')"></span>
            <span v-if="badgeLabel" class="notification-count">{{ badgeLabel }}</span>
          </button>
          <div class="user-box">
            <div class="user-dropdown" @click="toggleUserMenu">
              <div class="avatar">
                <img
                  v-if="displayAvatarUrl"
                  :key="displayAvatarUrl"
                  :src="displayAvatarUrl"
                  alt="User profile"
                  class="avatar-img"
                  @error="onAvatarError"
                />
                <span v-else>{{ displayInitials }}</span>
              </div>
              <div class="user-info">
                <strong>{{ displayName }}</strong>
                <p>{{ displayRole }}</p>
              </div>
              <svg
                class="dropdown-arrow"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>

              <!-- Dropdown Menu -->
              <div v-if="showUserMenu" class="user-dropdown-menu">
                <div class="dropdown-header">
                  <div class="dropdown-avatar">
                    <img
                      v-if="displayAvatarUrl"
                      :key="displayAvatarUrl"
                      :src="displayAvatarUrl"
                      alt="User profile"
                      class="avatar-img"
                      @error="onAvatarError"
                    />
                    <span v-else>{{ displayInitials }}</span>
                  </div>
                  <div class="dropdown-user-info">
                    <strong>{{ displayName }}</strong>
                    <p>{{ displayRole }}</p>
                    <p class="user-email">{{ sessionUser?.email || "" }}</p>
                  </div>
                </div>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item" @click="goToSettings">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path
                      d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 0 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 0 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 0 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 0 1 0 4h-.2a1 1 0 0 0-.9.6z"
                    />
                  </svg>
                  Settings
                </button>
                <button
                  class="dropdown-item"
                  @click="
                    showLogoutModal = true;
                    showUserMenu = false;
                  "
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section v-if="active === 'dashboard'" class="shop-dash-section">
        <div v-if="isLoadingDashboard" class="shop-loading">
          <div class="shop-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
        <ShopDashboard
          v-else
          :has-shop="!!shop?.id"
          :total-bookings="totalBookings"
          :total-earnings="totalEarnings"
          :total-vehicles="totalVehicles"
          :average-rating="averageRating"
          :is-loading="isLoadingDashboard"
          :recent-activity="histories"
          @create-shop="openShopModal"
          @navigate="(section) => active = section"
        />
      </section>

      <section v-else-if="active === 'coupons'" class="coupons-view">
        <Coupons />
      </section>

      <section v-else-if="active === 'notifications'" class="notifications-view">
        <NotificationOwner :shop-id="shop?.id" />
      </section>

      <section v-else-if="active === 'reviews'" class="reviews-view">
        <ReviewsFeedback :shop-id="shop?.id" />
      </section>

      <section v-else-if="active === 'payments'" class="payments-view">
        <Payments />
      </section>

      <section v-else-if="active === 'bookings'" class="bookings-view">
        <Bookings />
      </section>

      <section v-else-if="active === 'vehicles'" class="panel">
        <div class="panel-top">
          <h3>Manage Vehicles</h3>
          <button class="primary" @click="openCreate">Add New Vehicle</button>
        </div>
        <div class="stats compact">
          <article class="card">
            <span>Total Vehicles</span>
            <h3>{{ totalVehicles }}</h3>
          </article>
          <article class="card">
            <span
              ><span v-html="getStatusIcon('Available')"></span> Available</span
            >
            <h3>{{ availableVehicles }}</h3>
          </article>
          <article class="card">
            <span
              ><span v-html="getStatusIcon('Maintenance')"></span>
              Maintenance</span
            >
            <h3>{{ maintenanceVehicles }}</h3>
          </article>
          <article class="card">
            <span>Potential/Day</span>
            <h3>${{ potentialPerDay }}</h3>
          </article>
        </div>
        <div class="filters">
          <input
            v-model="search"
            placeholder="Search vehicle name or model or branch"
          />
          <select v-model="categoryFilter">
            <option>All Categories</option>
            <option v-for="c in categories" :key="c">{{ c }}</option>
          </select>
          <select v-model="statusFilter">
            <option>All Status</option>
            <option v-for="s in statuses" :key="s">{{ s }}</option>
          </select>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th>Vehicle</th>
                <th>Category</th>
                <th>Plate Number</th>
                <th>Stock</th>
                <th>Price/Day</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in filteredVehicles" :key="v.id">
                <td>
                  <img
                    :src="v.image || sampleThumb"
                    alt="Vehicle"
                    @error="$event.target.src = sampleThumb"
                    style="
                      width: 50px;
                      height: 35px;
                      object-fit: cover;
                      border-radius: 4px;
                    "
                  />
                </td>
                <td>
                  <span class="vehicle-name-cell">
                    <span
                      class="vehicle-row-icon"
                      v-html="iconSvg('car')"
                    ></span>
                    {{ v.name }}
                  </span>
                </td>
                <td>{{ v.category }}</td>
                <td>{{ v.plate }}</td>
                <td>{{ v.total_vehicles ?? 1 }}</td>
                <td>${{ v.price }}</td>
                <td>
                  <span :class="['status-badge', getStatusClass(v.status)]">
                    <span v-html="getStatusIcon(v.status)"></span>
                    {{ v.status }}
                  </span>
                </td>
                <td>{{ formatDate(v.createdAt) }}</td>
                <td>
                  <button @click="openEdit(v)" title="Edit">
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="#000000"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M12 20h9"></path>
                      <path
                        d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"
                      ></path>
                    </svg>
                  </button>
                  <button
                    class="danger"
                    @click="confirmDelete(v)"
                    title="Delete"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="#000000"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M3 6h18"></path>
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                    </svg>
                  </button>
                </td>
              </tr>
              <tr v-if="filteredVehicles.length === 0">
                <td colspan="8" class="empty">No vehicles yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else-if="active === 'my-shop'" class="my-shop-view">
        <MyShop />
      </section>

      <section v-else-if="active === 'settings'" class="settings-view">
        <Setting />
      </section>
    </main>

    <div v-if="modal" class="add-vehicle-overlay" @click.self="modal = false">
      <div class="add-vehicle-modal">
        <!-- Header -->
        <div class="add-vehicle-header">
          <h2>{{ editId ? "Edit Vehicle" : "Add New Vehicle" }}</h2>
          <button class="close-btn" @click="modal = false">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="add-vehicle-content">
          <!-- Left Column -->
          <div class="add-vehicle-left">
            <!-- Vehicle Information -->
            <div class="form-card">
              <h3 class="card-title">Vehicle Identification</h3>
              <div class="form-group">
                <label>Vehicle Name</label>
                <input
                  v-model="form.name"
                  placeholder="e.g. 2023 Luxury Sedan White"
                />
              </div>
              <div class="form-group">
                  <label>Total Vehicles</label>
                  <input
                    v-model="form.totalVehiclesInput"
                    type="number"
                    min="1"
                    placeholder="1"
                  />
                </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Category</label>
                  <select v-model="form.type">
                    <option value="" disabled>Select Category</option>
                    <option>Car</option>
                    <option>Moto</option>
                    <option>Bike</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Brand</label>
                  <input
                    v-model="form.brand"
                    placeholder="e.g. Toyota, Honda"
                  />
                </div>
              </div>
            </div>
            <!-- Vehicle Information -->
            <div class="form-card" v-if="form.category !== 'Bike'">
              <h3 class="card-title">Booking</h3>
              <div class="form-group">

                  <label>Rider Details</label>
                  <select v-model="form.riderDetails">
                    <option value="" disabled>Select Rider Details</option>
                    <option>1 Rider</option>
                    <option>2 Riders</option>
                    <option>3 Riders</option>
                    <option>4+ Riders</option>
                  </select>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Insurance Fee ($)</label>
                  <input
                    v-model="form.insuranceFee"
                    type="number"
                    placeholder="$ 0.00"
                  />
                </div>
                <div class="form-group">
                  <label>Taxes & Fees ($)</label>
                  <input
                    v-model="form.taxesFee"
                    type="number"
                    placeholder="$ 0.00"
                  />
                </div>
              </div>
            </div>

            <!-- Description -->
            <div class="form-card">
              <h3 class="card-title">Description</h3>
              <div class="form-row">
                <div class="form-group">
                  <label>Plate Number</label>
                  <input v-model="form.plate" placeholder="e.g. ABC-1234" />
                </div>
                <div class="form-group" v-if="form.category !== 'Bike'">
                  <label>Fuel Type</label>
                  <select v-model="form.fuel">
                    <option value="" disabled>Select Fuel</option>
                    <option>Petrol</option>
                    <option>Diesel</option>
                    <option>Electric</option>
                    <option>Hybrid</option>
                  </select>
                </div>
                <div class="form-group" v-if="form.category !== 'Bike'">
                  <label>Transmission</label>
                  <select v-model="form.transmission">
                    <option value="" disabled>Select Transmission</option>
                    <option>Automatic</option>
                    <option>Manual</option>
                  </select>
                </div>
              </div>
              <div class="form-group mt-12">
                <label>Vehicle Description</label>
                <textarea
                  v-model="form.description"
                  placeholder="Provide a detailed description of the vehicle features..."
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Right Column -->
          <div class="add-vehicle-right">
            <!-- Pricing & Status -->
            <div class="form-card">
              <h3 class="card-title">Pricing & Status</h3>
              <div class="form-row">
                <div class="form-group">
                  <label>Price per Day ($)</label>
                  <input
                    v-model="form.price"
                    type="number"
                    placeholder="$ 0.00"
                  />
                </div>
                <div class="form-group">
                  <label>Status</label>
                  <select v-model="form.status">
                    <option>Available</option>
                    <option>Rented</option>
                    <option>Maintenance</option>
                  </select>
                </div>
              </div>
              <div class="form-group mt-12">
                <label>Shop Name</label>
                <input v-model="form.shop" class="shop-name-input" readonly />
              </div>
            </div>

            <!-- Vehicle Photos -->
            <div class="form-card">
              <h3 class="card-title">Vehicle Photos</h3>
              <div
                class="photo-upload-area"
                @click="$refs.photoInput && $refs.photoInput.click()"
                @dragover.prevent
                @drop.prevent="onPhotoDrop"
              >
                <input
                  ref="photoInput"
                  type="file"
                  @change="onPhotos"
                  style="display: none"
                />
                <div v-if="!form.image" class="upload-placeholder">
                  <svg
                    viewBox="0 0 24 24"
                    width="40"
                    height="40"
                    fill="none"
                    stroke="#94a3b8"
                    stroke-width="1.5"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 5 17 10"></polyline>
                    <line x1="12" y1="5" x2="12" y2="16"></line>
                  </svg>
                  <p>Click to upload or drag and drop</p>
                  <span>PNG, JPG up to 10MB</span>
                </div>
                <div v-else class="photo-preview">
                  <img :src="form.image" alt="Vehicle preview" />
                  <div class="photo-overlay">
                    <span>Click to change</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="add-vehicle-footer">
          <button class="cancel-btn-modal" @click="modal = false">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Cancel
          </button>
          <button class="store-btn" @click="saveVehicle">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
              ></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            {{ editId ? "Update Vehicle" : "Store Vehicle" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <div v-if="toast.show" :class="['toast', toast.type]">
      {{ toast.message }}
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteModal"
      class="delete-overlay"
      @click.self="cancelDelete"
    >
      <div class="delete-modal">
        <div class="delete-icon-wrapper">
          <svg
            viewBox="0 0 24 24"
            width="48"
            height="48"
            fill="none"
            stroke="#e74c3c"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="3 6 5 6 21 6"></polyline>
            <path
              d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
            ></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </div>
        <h3 class="delete-title">Delete Vehicle</h3>
        <p class="delete-message">
          Are you sure you want to delete this vehicle?
        </p>
        <p class="delete-vehicle-name">{{ deleteVehicleName }}</p>
        <p class="delete-warning">
          This action cannot be undone. All associated data (maintenance
          history, documents, photos, assignments) will be permanently removed.
        </p>
        <div class="delete-actions">
          <button class="delete-cancel-btn" @click="cancelDelete">
            Cancel
          </button>
          <button class="delete-confirm-btn" @click="removeVehicle">
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Logout Confirmation Modal -->
    <div
      v-if="showLogoutModal"
      class="delete-overlay"
      @click.self="cancelLogout"
    >
      <div class="delete-modal">
        <div class="delete-icon-wrapper">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f59e0b"
            stroke-width="2"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </div>
        <h3 class="delete-title">Logout</h3>
        <p class="delete-message">Are you sure you want to logout?</p>
        <div class="delete-actions">
          <button class="delete-cancel-btn" @click="cancelLogout">No</button>
          <button
            class="delete-confirm-btn logout-confirm-btn"
            @click="confirmLogout"
          >
            Yes
          </button>
        </div>
      </div>
    </div>

    <!-- Shop Create/Edit Modal -->
    <div
      v-if="shopModal"
      class="shop-modal-overlay"
      @click.self="shopModal = false"
    >
      <div class="shop-modal">
        <div class="shop-modal-header">
          <div>
            <h2>{{ shop ? "Edit Shop" : "Create New Shop" }}</h2>
            <p class="shop-modal-sub">Add a new rental shop (pending approval by default).</p>
          </div>
          <button class="close-btn" @click="shopModal = false">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="shop-modal-content">
          <div class="shop-modal-grid">
            <article class="shop-preview-panel">
              <div class="shop-preview-image">
                <img
                  v-if="shopImagePreview || shopForm.img_url"
                  :src="shopImagePreview || shopForm.img_url"
                  alt="Shop preview"
                />
                <div v-else class="shop-preview-placeholder">
                  <svg
                    viewBox="0 0 80 80"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <rect x="6" y="6" width="68" height="68" rx="16" />
                    <path d="M22 34h36l-5 7-7-9-5 5-6-9-3 6z" />
                  </svg>
                </div>
              </div>
              <div class="shop-preview-info">
                <h3>{{ shopForm.name || shop?.name || "Untitled Shop" }}</h3>
                <p>
                  {{
                    shopForm.description ||
                      shop?.description ||
                      "Describe your shop, fleet highlights or location to attract customers."
                  }}
                </p>
                <p class="shop-preview-meta">
                  {{ shopForm.address || shop?.address || "Address" }}
                  <span>•</span>
                  {{ shopForm.location || shop?.location || "City, Country" }}
                </p>
              </div>
              <div class="shop-preview-status">
                <span>Status</span>
                <strong>{{ shop?.status || "Draft" }}</strong>
              </div>
            </article>

            <section class="shop-details-panel">
            <div class="upload-card">
              <div class="upload-card__header">
                <div>
                  <h3>Upload shop cover</h3>
                  <p>Drop an image or click to browse files.</p>
                </div>
              </div>
              <input
                ref="shopImageInputRef"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                class="visually-hidden"
                @change="onShopImageChange"
              />
              <div
                class="upload-dropzone"
                :class="{ 'is-active': isShopImageDragOver }"
                @click="triggerShopImagePicker"
                @dragover.prevent="isShopImageDragOver = true"
                @dragleave.prevent="isShopImageDragOver = false"
                @drop.prevent="onShopImageDrop"
              >
                <div v-if="shopImagePreview || shopForm.img_url" class="upload-preview">
                  <img
                    :src="shopImagePreview || shopForm.img_url"
                    alt="Shop preview"
                  />
                  <span>Click to change</span>
                </div>
                <div v-else class="upload-placeholder">
                  <svg
                    viewBox="0 0 32 32"
                    width="46"
                    height="46"
                    fill="none"
                    stroke="#2563eb"
                    stroke-width="2"
                  >
                    <path d="M16 7v16"></path>
                    <path d="M9 15l7-8 7 8"></path>
                    <path d="M26 22v3a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-3"></path>
                  </svg>
                  <p>Drop an image or click to browse files</p>
                  <span>PNG, JPG or WebP up to 5MB</span>
                </div>
              </div>
            </div>

            <div class="form-card">
              <div class="form-card__header">
                <div>
                  <h3>Shop Information</h3>
                  <p>Fill in the key details to publish your shop listing quickly.</p>
                </div>
              </div>
              <div class="form-card__body">
                <div class="field-grid two-column">
                  <label class="field">
                    <span>Shop Name</span>
                    <input
                      class="rounded-input"
                      v-model="shopForm.name"
                      type="text"
                      placeholder="e.g. Berlin Elite Rentals"
                    />
                  </label>
                  <label class="field">
                    <span>Address</span>
                    <input
                      class="rounded-input"
                      v-model="shopForm.address"
                      type="text"
                      placeholder="Street, City, Country"
                    />
                  </label>
                </div>
                <div class="field-grid two-column">
                  <label class="field">
                    <span>Province / City</span>
                    <select
                      class="rounded-input"
                      v-model="shopForm.city_id"
                    >
                      <option value="" disabled>Select province</option>
                      <option
                        v-for="city in cities"
                        :key="city.id"
                        :value="city.id"
                      >
                        {{ city.name }}
                      </option>
                    </select>
                  </label>
                  <label class="field">
                    <span>Phone</span>
                    <input
                      class="rounded-input"
                      v-model="shopForm.phone"
                      type="text"
                      placeholder="+855..."
                    />
                  </label>
                </div>
                <label class="field">
                  <span>Area / Location hint</span>
                  <input
                    class="rounded-input"
                    v-model="shopForm.location"
                    type="text"
                    placeholder="e.g. Street 123, Khan ..."
                  />
                </label>
                <label class="field full">
                  <span>Google Map URL</span>
                  <input
                    class="rounded-input"
                    v-model="shopForm.map_url"
                    type="url"
                    placeholder="Paste your Google Maps link here"
                  />
                </label>
                <label class="field">
                  <span>Description</span>
                  <textarea
                    class="rounded-input"
                    v-model="shopForm.description"
                    rows="4"
                    placeholder="Describe the shop, services or fleet."
                  ></textarea>
                </label>
              </div>
            </div>
          </section>
        </div>
        </div>
        <div class="shop-modal-footer">
          <button class="cancel-btn-modal" @click="shopModal = false">
            Cancel
          </button>
          <button
            class="save-shop-btn"
            @click="saveShop"
            :disabled="isLoadingShop"
          >
            {{
              isLoadingShop ? "Saving..." : shop ? "Update Shop" : "Create Shop"
            }}
          </button>
        </div>
      </div>
    </div>
    <ToastStack />
  </div>
</template>

<style>
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap");
</style>

<style scoped>
:root {
  font-family:
    "Inter",
    ui-sans-serif,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    sans-serif;
}

.shop-dash-section {
  padding: 20px;
}

.shop-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 60px 20px;
  color: #475569;
  font-size: 14px;
}

.shop-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 14px 20px;
  border-radius: 8px;
  color: #0f172a;
  font-weight: 500;
  font-size: 14px;
  z-index: 9999;
  animation: slideIn 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
}

.toast.success {
  background: #d1fae5;
  border-left: 4px solid #10b981;
}

.toast.error {
  background: #fee2e2;
  border-left: 4px solid #ef4444;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }

  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.status-available {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.status-rented {
  background: #fee2e2;
  color: #dc2626;
}

.status-badge.status-maintenance {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.available {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.rented {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.maintenance {
  background: #fef3c7;
  color: #92400e;
}

.edit-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  margin-right: 4px;
}

.edit-btn:hover {
  background: #2563eb;
}

.delete-btn {
  background: #ef4444;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
}

.delete-btn:hover {
  background: #dc2626;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e2e8f0;
  margin-top: 10px;
}

.cancel-btn {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.cancel-btn:hover {
  background: #e2e8f0;
}

.save-btn {
  background: #10b981;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.save-btn:hover {
  background: #059669;
}

.page {
  min-height: 100vh;
  height: 100vh;
  display: flex;
  background: #f1f3f7;
  color: #0f172a;
  font-family:
    "Inter",
    ui-sans-serif,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    sans-serif;
  overflow: hidden;
  box-sizing: border-box;
}

.sidebar {
  width: 272px;
  flex: 0 0 272px;
  min-width: 0;
  background:
    radial-gradient(1200px 600px at -200px -200px, rgba(34, 211, 238, 0.12), transparent 55%),
    linear-gradient(180deg, #0b1220, #070a12);
  color: #d2ddf2;
  border-right: 1px solid rgba(148, 163, 184, 0.2);
  padding: 18px 12px 14px;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  transition:
    width 0.2s ease,
    flex-basis 0.2s ease;
  z-index: 20;
  display: flex;
  flex-direction: column;
}

.sidebar {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.45) transparent;
}

.sidebar::-webkit-scrollbar {
  width: 8px;
}

.sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.4);
  border-radius: 999px;
}

.page.sidebar-collapsed .sidebar {
  width: 84px;
  flex-basis: 84px;
}

.sidebar-toggle {
  position: absolute;
  right: 10px;
  transform: none;
  top: 86px;
  width: 32px !important;
  height: 32px !important;
  min-width: 32px;
  min-height: 32px;
  border-radius: 999px !important;
  background: #f8fafc;
  border: 1px solid #dbe1ea;
  padding: 0 !important;
  margin: 0;
  display: grid;
  place-items: center;
  z-index: 50;
  line-height: 0;
  overflow: hidden;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.28);
}

.toggle-icon {
  width: 14px !important;
  height: 14px !important;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.toggle-icon svg {
  width: 14px;
  height: 14px;
  display: block;
}

.toggle-icon.rotate {
  transform: rotate(180deg);
}

/* Logo/Brand Section */
/* .brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-right: 3px;
  padding: 16px 20px;
  border-bottom: 1px solid #1a2a52;
  margin-bottom: 8px;
} */

.brand-badge {
  width: 60px;
  height: 60px;
  border-radius: 60px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.06);
  color: var(--mp-cyan-2);
  border: none;
  overflow: visible;
  position: relative;
  flex-shrink: 0;
}

.brand-badge::after {
  content: '';
  position: absolute;
  inset: -5px;
  border-radius: inherit;
  border: 2px solid rgba(14, 165, 233, 0.3);
  opacity: 0.8;
  animation: brandRingSpin 12s linear infinite, brandRingPulse 5s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}

@keyframes brandRingSpin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes brandRingPulse {
  0% {
    transform: rotate(0deg) scale(0.98);
  }
  50% {
    transform: rotate(180deg) scale(1.02);
  }
  100% {
    transform: rotate(360deg) scale(0.98);
  }
}

.brand-logo {
  width: 48px;
  height: 48px;
  border-radius: 90px;
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.3));
  object-fit: contain;
  display: block;
  position: relative;
  z-index: 1;
  background-color: white;
  padding: 4px;
}

.brand-text {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-left: 10px;
}

.brand-name {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  white-space: nowrap;
}

.brand-cyan {
  color: #22d3ee;
}

.brand-tagline {
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: #94a3c2;
  text-transform: uppercase;
}

.brand-role {
  margin: 4px 0 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #e2e8f0;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.brand-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.tagline-row {
  color: #64748b;
}

.brand p {
  margin: 4px 0 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: #8ca4df;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: 0;
  background: transparent;
  color: rgba(226, 232, 240, 0.82);
  border-radius: 12px;
  text-align: left;
  padding: 12px 12px;
  margin-bottom: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.16s ease,
    color 0.16s ease,
    border-color 0.16s ease;
}

.menu-icon {
  width: 18px;
  height: 18px;
  border-radius: 0;
  background: transparent;
  color: rgba(226, 232, 240, 0.76);
  display: inline-grid;
  place-items: center;
  flex: 0 0 18px;
}

.menu-icon :deep(svg) {
  width: 17px;
  height: 17px;
}

.menu-item:hover {
  background: rgba(148, 163, 184, 0.12);
  color: #ffffff;
  transform: translateX(2px);
}

.menu-item.active {
  background: rgba(34, 211, 238, 0.16);
  border-color: rgba(34, 211, 238, 0.32);
  color: #fff;
  box-shadow: inset 3px 0 0 #22d3ee;
}

.menu-item.active .menu-icon {
  color: #22d3ee;
}


.main {
  flex: 1;
  min-width: 0;
  padding: 0 0 18px;
  overflow-x: hidden;
  overflow-y: auto;
  min-height: 0;
}

.topbar {
  min-height: 64px;
  margin: 0 0 20px;
  padding: 0 20px 0 24px;
  border-bottom: 1px solid #e2e8f0;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
  overflow: visible;
  position: sticky;
  top: 0;
  z-index: 30;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.topbar h1 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.topbar-icon {
  width: 20px;
  height: 20px;
  color: #1f2937;
  display: inline-flex;
  align-items: center;
}

.topbar-icon :deep(svg) {
  width: 18px;
  height: 18px;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
  margin-right: 8px;
  flex-shrink: 0;
}

.theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  transition: all 0.2s ease;
}
.theme-toggle:hover {
  border-color: #2563eb;
  color: #2563eb;
  box-shadow: 0 2px 8px rgba(37,99,235,0.1);
}

.theme-toggle:hover {
  background: #eef2ff;
  border-color: #c7d2fe;
  color: #1d4ed8;
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(59, 130, 246, 0.12);
}

.theme-toggle-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  line-height: 0;
}

.theme-toggle-icon :deep(svg) {
  width: 16px;
  height: 16px;
}

.theme-toggle-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.bell-btn {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.bell-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #334155;
}

.bell-btn :deep(svg) {
  width: 18px;
  height: 18px;
}

.bell-icon {
  display: inline-flex;
  line-height: 0;
}

.bell-dot {
  position: absolute;
  right: 7px;
  top: 7px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  border: 2px solid #fff;
  pointer-events: none;
}

.user-box {
  position: relative;
  margin-right: 0;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px 4px 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: transparent;
  border: 1px solid transparent;
}

.user-dropdown:hover {
  background: #f1f5f9;
  border-color: #e2e8f0;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #0ea5e9;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-width: 120px;
}

.user-info strong {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-info p {
  margin: 0;
  color: #64748b;
  font-size: 11px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-arrow {
  width: 14px;
  height: 14px;
  color: #94a3b8;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.user-dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 280px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
  border: 1px solid #e2e8f0;
  z-index: 100;
  overflow: hidden;
  animation: dropdownFade 0.2s ease;
}

@keyframes dropdownFade {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.dropdown-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #0ea5e9;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.dropdown-avatar .avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dropdown-user-info {
  flex: 1;
  min-width: 0;
}

.dropdown-user-info strong {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 2px;
}

.dropdown-user-info p {
  margin: 0;
  font-size: 13px;
  color: #64748b;
}

.user-email {
  font-size: 12px !important;
  color: #94a3b8 !important;
  margin-top: 2px !important;
}

.dropdown-divider {
  height: 1px;
  background: #e2e8f0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.dropdown-item:hover {
  background: #f8fafc;
  color: #1e293b;
}

.dropdown-item svg {
  width: 18px;
  height: 18px;
  color: #64748b;
  flex-shrink: 0;
}

.dropdown-item:hover svg {
  color: #3b82f6;
}

.dashboard-view {
  padding: 0 24px 24px;
}

.dashboard-view h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
}

.sub {
  margin: 6px 0 22px;
  color: #64748b;
  font-size: 15px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 14px;
}

.dashboard-cards .card {
  min-height: 120px;
  padding: 20px 18px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.dashboard-cards .card span {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: #64748b;
}

.dashboard-cards .card h3 {
  font-size: 32px;
  font-weight: 700;
  color: #0f172a;
  margin: 8px 0 4px;
}

.stats.compact {
  margin-top: 8px;
}

.card {
  position: relative;
  background: #fff;
  border: 1px solid #d7dee9;
  border-radius: 14px;
  padding: 14px;
}

.card span {
  display: block;
  color: #52627e;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.card h3 {
  margin: 8px 0 4px;
  font-size: 28px;
}

.card small {
  color: #17a34a;
  font-size: 13px;
}

.stat-icon {
  position: absolute;
  right: 14px;
  top: 14px;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: inline-grid;
  place-items: center;
  color: inherit;
}

.stat-icon :deep(svg) {
  width: 22px;
  height: 22px;
}

.icon-teal {
  background: #ccfbf1;
  color: #0891b2;
}

.icon-blue {
  background: #e7efff;
  color: #2563eb;
}

.icon-green {
  background: #dcfce7;
  color: #16a34a;
}

.icon-sky {
  background: #e0f2fe;
  color: #0284c7;
}

.icon-orange {
  background: #ffedd5;
  color: #d97706;
}

.icon-yellow {
  background: #fef9c3;
  color: #ca8a04;
}

.activity-card,
.panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 20px;
}

.activity-card h3,
.panel h3 {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
}

.activity-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 4px;
  border-top: 1px solid #e4e9f1;
  font-size: 13px;
}

.activity-row small {
  color: #6b7280;
  font-size: 12px;
}

.panel-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.filters {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.table-wrap {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: auto;
}

table {
  width: 100%;
  min-width: 500px;
  border-collapse: collapse;
}

th,
td {
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}

th {
  background: #f8fafc;
  font-size: 12px;
  color: #475569;
  text-transform: uppercase;
}

input,
select {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 9px 10px;
  font-size: 14px;
}

button {
  border: 0;
  border-radius: 10px;
  padding: 8px 12px;
  cursor: pointer;
}

.primary {
  background: #1d4ed8;
  color: #fff;
}

.danger {
  background: #ef4444;
  color: #fff;
}

.empty {
  text-align: center;
  color: #64748b;
}

.placeholder p {
  color: #64748b;
  margin: 0;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.6);
  display: grid;
  place-items: center;
  padding: 16px;
}

.modal {
  width: min(860px, 100%);
  max-height: 92vh;
  overflow: auto;
  background: #fff;
  border-radius: 14px;
  padding: 16px;
}

label {
  font-size: 13px;
  color: #334155;
}

.modal-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-like-page {
  width: min(880px, 100%);
  border: 1px solid #dfe5ee;
  background: #f8fafc;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
}

.form-section {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  padding: 14px;
  margin-top: 12px;
}

.form-section h4 {
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
}

.single-page-form {
  padding: 0;
  background: #fff;
  margin: 0 auto;
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px 8px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  margin: 0;
  font-size: 20px;
}

.form-section.no-card {
  border: 0;
  border-radius: 0;
  margin: 0;
  padding: 16px 18px 12px;
}

.form-section.with-divider {
  border-top: 1px solid #e2e8f0;
}

.first-section {
  padding-top: 16px;
}

.sec-ic {
  width: 18px;
  height: 18px;
  color: #1d4ed8;
  display: inline-grid;
}

.sec-ic :deep(svg) {
  width: 18px;
  height: 18px;
}

.form-grid-one {
  display: grid;
  grid-template-columns: 1fr;
  margin-bottom: 12px;
}

.name-row {
  max-width: 100%;
  margin: 0 0 12px;
}

.form-line {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 12px;
  align-items: start;
}

.form-line.three-col {
  grid-template-columns: 1fr 1fr 1fr;
}

textarea {
  width: 100%;
  min-height: 84px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 9px 10px;
  font-size: 14px;
  resize: vertical;
}

.short-field {
  max-width: calc((100% - 14px) / 2);
}

.photo-drop {
  border: 1px dashed #cfd8e3;
  border-radius: 10px;
  padding: 12px;
  background: #f8fafc;
}

.equal-width-drop {
  width: 100%;
  margin: 0;
}

.drop-head {
  color: #475569;
  font-size: 12px;
  text-align: center;
  margin-bottom: 10px;
}

.thumbs {
  display: grid;
  grid-template-columns: 120px repeat(3, 1fr);
  gap: 8px;
  margin-top: 10px;
}

.thumb {
  height: 88px;
  border-radius: 8px;
  border: 1px dashed #d6dee8;
  display: grid;
  place-items: center;
  color: #64748b;
  font-weight: 700;
  background: #f8fafc;
}

.thumb-main {
  background: linear-gradient(180deg, #203a43, #2c5364);
  color: #fff;
  font-size: 10px;
}

.thumb-add {
  font-size: 22px;
  color: #94a3b8;
}

.files-text {
  display: block;
  margin-top: 8px;
  color: #64748b;
}

.photo-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.photo-actions button {
  min-width: 120px;
}

.secondary-btn {
  background: #fff;
  border: 1px solid #cbd5e1;
  color: #334155;
}

.modal-like-page label {
  display: block;
  width: 100%;
  font-size: 12px;
  color: #253244;
  font-weight: 600;
}

.modal-like-page label input,
.modal-like-page label select,
.modal-like-page label textarea {
  margin-top: 6px;
  background: #fff;
}

.page.sidebar-collapsed .brand-text,
.page.sidebar-collapsed .menu-title,
.page.sidebar-collapsed .menu-label {
  display: none;
}

.page.sidebar-collapsed .brand-badge {
  display: none;
}

.page.sidebar-collapsed .brand {
  justify-content: center;
  padding-left: 0;
  padding-right: 0;
}

@media (max-width: 1200px) {
  .sidebar {
    width: 236px;
    flex-basis: 236px;
  }

  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .brand h2 {
    font-size: 19px;
  }

  .brand p {
    font-size: 11px;
  }

  .dashboard-view h2 {
    font-size: 32px;
  }

  .sub {
    font-size: 18px;
  }

  .card span {
    font-size: 13px;
  }

  .card h3 {
    font-size: 34px;
  }
}

@media (max-width: 768px) {
  .sidebar {
    width: 100% !important;
    flex-basis: 100% !important;
    padding-bottom: 8px;
  }

  .page,
  .page.sidebar-collapsed {
    flex-direction: column;
  }

  .menu-item {
    font-size: 14px;
  }

  .sidebar-toggle {
    right: 8px;
    transform: none;
    top: 10px;
  }

  .topbar {
    min-height: 58px;
    padding: 0 12px;
  }

  .topbar h1 {
    font-size: 16px;
  }

  .topbar-right {
    gap: 8px;
  }

  .user-box {
    margin-right: 0;
  }

  .user-dropdown {
    padding-right: 6px;
  }

  .user-info,
  .dropdown-arrow {
    display: none;
  }

  .filters,
  .form-line,
  .stats {
    grid-template-columns: 1fr;
  }

  .name-row,
  .equal-width-drop {
    width: 100%;
    max-width: 100%;
  }

  .thumbs {
    grid-template-columns: repeat(2, 1fr);
  }

  .topbar {
    flex-wrap: wrap;
    height: auto;
    padding: 12px 14px;
    gap: 10px;
  }

  .topbar-left {
    order: 1;
  }

  .topbar-right {
    order: 2;
    margin-right: 0;
  }

  .user-box {
    order: 3;
    width: 100%;
    justify-content: center;
    padding-top: 8px;
    border-top: 1px solid #e2e8f0;
    margin-top: 4px;
  }

  .topbar h1 {
    font-size: 16px;
  }

  .topbar-left {
    gap: 8px;
  }

  .brand h2 {
    font-size: 17px;
  }

  .brand p {
    font-size: 11px;
  }

  .dashboard-view h2 {
    font-size: 26px;
  }

  .sub {
    font-size: 15px;
    margin-bottom: 16px;
  }

  .stats {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .dashboard-cards .card {
    min-height: 90px;
    padding: 12px;
  }

  .card span {
    font-size: 11px;
  }

  .card h3 {
    font-size: 28px;
  }

  .stat-icon {
    width: 26px;
    height: 26px;
    right: 10px;
    top: 10px;
  }

  .stat-icon :deep(svg) {
    width: 14px;
    height: 14px;
  }

  .activity-card,
  .panel {
    padding: 12px;
  }

  .activity-card h3,
  .panel h3 {
    font-size: 16px;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    min-width: 600px;
  }

  th,
  td {
    padding: 8px 10px;
    font-size: 13px;
  }

  .panel-top {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .panel-top h3 {
    font-size: 18px;
  }

  .primary {
    width: 100%;
    text-align: center;
    padding: 12px;
  }

  .filters {
    gap: 8px;
  }

  .filters input,
  .filters select {
    padding: 10px 12px;
    font-size: 13px;
  }

  .activity-card {
    margin-top: 14px;
  }

  .add-vehicle-modal {
    max-height: 95vh;
  }

  .add-vehicle-header {
    padding: 16px 18px;
  }

  .add-vehicle-header h2 {
    font-size: 18px;
  }

  .add-vehicle-content {
    padding: 16px;
    gap: 16px;
  }

  .form-card {
    padding: 14px;
  }

  .card-title {
    font-size: 13px;
    margin-bottom: 12px;
    padding-bottom: 10px;
  }

  .form-group {
    margin-bottom: 12px;
  }

  .form-group label {
    font-size: 12px;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: 10px 12px;
    font-size: 13px;
  }

  .form-row {
    flex-direction: column;
    gap: 0;
  }

  .photo-upload-area {
    padding: 20px;
    min-height: 160px;
  }

  .upload-placeholder svg {
    width: 32px;
    height: 32px;
  }

  .upload-placeholder p {
    font-size: 13px;
  }

  .add-vehicle-footer {
    padding: 14px 18px;
    flex-direction: column;
    gap: 10px;
  }

  .discard-btn,
  .store-btn {
    width: 100%;
    justify-content: center;
    padding: 12px;
  }
}

@media (max-width: 640px) {
  .sidebar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    top: auto;
    height: auto;
    width: 100% !important;
    flex-basis: 100% !important;
    flex-direction: row;
    padding: 8px 10px;
    overflow-x: auto;
    z-index: 100;
    border-right: none;
    border-top: 1px solid #1b2a52;
  }

  .sidebar-toggle,
  .brand,
  .menu-title,
  .brand-text {
    display: none !important;
  }

  .menu-item {
    flex-direction: column;
    padding: 8px 10px;
    margin-bottom: 0;
    font-size: 10px;
    min-width: 50px;
    gap: 4px;
  }

  .menu-icon {
    width: 20px;
    height: 20px;
    flex: 0 0 20px;
  }

  .menu-label {
    font-size: 9px;
    white-space: nowrap;
  }

  .page {
    padding-bottom: 70px;
  }

  .main {
    padding: 0 12px 12px;
  }

  .topbar {
    margin: 0 -12px 16px;
    padding: 10px 12px;
  }

  .topbar h1 {
    font-size: 15px;
  }

  .topbar-left {
    gap: 6px;
  }

  .topbar-icon {
    width: 18px;
    height: 18px;
  }

  .topbar-right {
    display: none;
  }

  .user-box {
    padding-top: 6px;
  }

  .avatar {
    width: 32px;
    height: 32px;
    font-size: 11px;
  }

  .user-box strong {
    font-size: 13px;
  }

  .user-box p {
    font-size: 11px;
  }

  .dashboard-view h2 {
    font-size: 22px;
  }

  .sub {
    font-size: 14px;
  }

  .stats {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .dashboard-cards .card {
    min-height: 80px;
    padding: 10px;
    border-radius: 12px;
  }

  .card span {
    font-size: 10px;
  }

  .card h3 {
    font-size: 24px;
  }

  .stat-icon {
    width: 24px;
    height: 24px;
    right: 8px;
    top: 8px;
  }

  .activity-card h3,
  .panel h3 {
    font-size: 15px;
  }

  .table-wrap {
    border-radius: 8px;
  }

  table {
    min-width: 500px;
  }

  th,
  td {
    padding: 6px 8px;
    font-size: 12px;
  }

  .filters {
    gap: 6px;
  }

  .filters input,
  .filters select {
    padding: 8px 10px;
    font-size: 12px;
    border-radius: 6px;
  }

  button {
    padding: 6px 10px;
    font-size: 12px;
  }

  .status-badge {
    padding: 3px 8px;
    font-size: 10px;
  }

  .status-badge :deep(svg) {
    width: 10px;
    height: 10px;
  }

  .delete-modal {
    padding: 20px;
    margin: 12px;
  }

  .delete-icon-wrapper {
    width: 60px;
    height: 60px;
  }

  .delete-icon-wrapper svg {
    width: 32px;
    height: 32px;
  }

  .delete-title {
    font-size: 20px;
  }

  .delete-message {
    font-size: 14px;
  }

  .delete-warning {
    font-size: 12px;
  }

  .delete-actions {
    flex-direction: column;
  }

  .delete-cancel-btn,
  .delete-confirm-btn {
    width: 100%;
    padding: 10px;
  }

  .toast {
    bottom: 80px;
    right: 10px;
    left: 10px;
    width: auto;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .main {
    padding: 0 8px 8px;
  }

  .topbar {
    margin: 0 -8px 12px;
    padding: 8px 10px;
  }

  .topbar h1 {
    font-size: 14px;
  }

  .user-box strong {
    font-size: 12px;
  }

  .user-box p {
    font-size: 10px;
  }

  .avatar {
    width: 28px;
    height: 28px;
    font-size: 10px;
  }

  .dashboard-view h2 {
    font-size: 18px;
  }

  .sub {
    font-size: 13px;
    margin-bottom: 12px;
  }

  .card h3 {
    font-size: 20px;
  }

  .activity-card,
  .panel {
    padding: 10px;
    border-radius: 10px;
  }

  .activity-card h3,
  .panel h3 {
    font-size: 14px;
  }

  table {
    min-width: 400px;
  }

  th,
  td {
    padding: 5px 6px;
    font-size: 11px;
  }

  .filters input,
  .filters select {
    padding: 8px;
    font-size: 11px;
  }

  .menu-item {
    padding: 6px 8px;
    min-width: 44px;
  }

  .menu-icon {
    width: 18px;
    height: 18px;
  }

  .menu-label {
    font-size: 8px;
  }

  .add-vehicle-modal {
    margin: 8px;
    border-radius: 10px;
  }

  .add-vehicle-header {
    padding: 12px 14px;
  }

  .add-vehicle-header h2 {
    font-size: 16px;
  }

  .add-vehicle-content {
    padding: 12px;
    gap: 12px;
  }

  .form-card {
    padding: 12px;
  }

  .card-title {
    font-size: 12px;
  }

  .photo-upload-area {
    padding: 16px;
    min-height: 140px;
  }

  .upload-placeholder svg {
    width: 28px;
    height: 28px;
  }

  .upload-placeholder p {
    font-size: 12px;
  }

  .upload-placeholder span {
    font-size: 10px;
  }

  .add-vehicle-footer {
    padding: 12px 14px;
  }

  .discard-btn,
  .store-btn {
    padding: 10px;
    font-size: 13px;
  }
}

/* Delete Modal Styles */
.delete-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.delete-modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 420px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.delete-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #fef2f2;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.delete-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 12px;
}

.delete-message {
  font-size: 16px;
  color: #333;
  margin: 0 0 8px;
  font-weight: 500;
}

.delete-vehicle-name {
  font-size: 14px;
  color: #e74c3c;
  font-weight: 600;
  margin: 0 0 16px;
  padding: 8px 16px;
  background: #fef2f2;
  border-radius: 8px;
  display: inline-block;
}

.delete-warning {
  font-size: 13px;
  color: #666;
  margin: 0 0 24px;
  line-height: 1.5;
}

.delete-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.delete-cancel-btn {
  padding: 12px 24px;
  border: 2px solid #ddd;
  background: white;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 120px;
}

.delete-cancel-btn:hover {
  border-color: #999;
  color: #333;
}

.delete-confirm-btn {
  padding: 12px 24px;
  border: none;
  background: #e74c3c;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 120px;
}

.delete-confirm-btn:hover {
  background: #c0392b;
}

.logout-confirm-btn {
  background: #1d4ed8;
}

.logout-confirm-btn:hover {
  background: #1e40af;
}

@media (max-width: 480px) {
  .delete-modal {
    padding: 24px;
    margin: 16px;
  }

  .delete-actions {
    flex-direction: column;
  }

  .delete-cancel-btn,
  .delete-confirm-btn {
    width: 100%;
  }
}

/* Add Vehicle Modal Styles */
.add-vehicle-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.add-vehicle-modal {
  background: #fcfcfd;
  border-radius: 16px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04);
}

.add-vehicle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.add-vehicle-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.add-vehicle-header .close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f1f5f9;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  transition: all 0.2s;
}

.add-vehicle-header .close-btn:hover {
  background: #e2e8f0;
  color: #1a1a1a;
}

.add-vehicle-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.add-vehicle-left,
.add-vehicle-right {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-card {
  background: #ffffff;
  border: 1px solid #edf2f7;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.form-group {
  margin-bottom: 16px;
  flex: 1;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 5px;
  letter-spacing: -0.01em;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 13px;
  border: 1.5px solid #e5e9ef;
  border-radius: 10px;
  font-size: 0.92rem;
  color: #1f2937;
  background: #fafbfc;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
  font-family: inherit;
}

.form-group input:hover,
.form-group select:hover,
.form-group textarea:hover {
  background: #ffffff;
  border-color: #d1d9e6;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #6366f1;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08);
}

.form-group input::placeholder,
.form-group textarea::placeholder {
  color: #94a3b8;
}

.form-group select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.form-group textarea {
  min-height: 80px;
  resize: vertical;
}

.shop-name-input[readonly] {
  background: #f8fafc;
  color: #334155;
  border-style: dashed;
  cursor: not-allowed;
}

.form-row {
  display: flex;
  gap: 12px;
}

.mt-12 {
  margin-top: 12px;
}

.photo-upload-area {
  border: 2px dashed #dce2ec;
  border-radius: 14px;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.25s ease;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafbfc;
}

.photo-upload-area:hover {
  border-color: #818cf8;
  background: #f0f2ff;
  border-style: solid;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-placeholder p {
  margin: 0;
  font-size: 14px;
  color: #475569;
  font-weight: 500;
}

.upload-placeholder span {
  font-size: 12px;
  color: #94a3b8;
}

.photo-preview {
  position: relative;
  width: 100%;
  max-width: 200px;
}

.photo-preview img {
  width: 100%;
  border-radius: 8px;
  object-fit: cover;
}

.photo-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.photo-preview:hover .photo-overlay {
  opacity: 1;
}

.photo-overlay span {
  color: white;
  font-size: 12px;
  font-weight: 500;
}

.add-vehicle-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.discard-btn {
  padding: 10px 20px;
  border: 1.5px solid #e5e9ef;
  background: transparent;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.discard-btn:hover {
  border-color: #d1d9e6;
  color: #374151;
  background: #f9fafb;
}

.store-btn {
  padding: 10px 24px;
  border: none;
  background: #1f2937;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  letter-spacing: -0.01em;
}

.store-btn:hover {
  background: #111827;
  transform: translateY(-1px);
}

.store-btn:active {
  transform: translateY(0);
}

.cancel-btn-modal {
  padding: 10px 20px;
  border: 1.5px solid #e5e9ef;
  background: transparent;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.cancel-btn-modal:hover {
  border-color: #d1d9e6;
  color: #374151;
  background: #f9fafb;
}

@media (max-width: 768px) {
  .add-vehicle-content {
    grid-template-columns: 1fr;
  }

  .form-row {
    flex-direction: column;
    gap: 0;
  }

  .add-vehicle-footer {
    flex-direction: column;
  }

  .discard-btn,
  .store-btn {
    width: 100%;
    justify-content: center;
  }
}

/* Sidebar layout helpers */
.menu-area {
  flex: 1;
  overflow: visible;
  margin-top: 30px;
  padding-right: 2px;
}

/* Sidebar Profile Section */
.sidebar-profile {
  background: #0a1628;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 8px;
}

.sidebar-profile-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.sidebar-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #2f6bff;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.sidebar-avatar .avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sidebar-user-info {
  flex: 1;
  min-width: 0;
}

.sidebar-user-info strong {
  display: block;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-user-info p {
  margin: 2px 0 0;
  color: #8ca4df;
  font-size: 11px;
}

.sidebar-profile-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  background: #1a3a6e;
  border: none;
  border-radius: 8px;
  color: #8ca4df;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.sidebar-profile-btn:hover {
  background: #2a4a8e;
  color: #fff;
}

.sidebar-profile-btn svg {
  width: 14px;
  height: 14px;
}

.page.sidebar-collapsed .sidebar-profile {
  display: none;
}

/* Header Language Toggle for Shop */
.header-lang-toggle-shop {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  background: rgba(59, 130, 246, 0.08);
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.12);
}

.hl-btn-shop {
  background: transparent;
  border: none;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.78rem;
  color: #64748b;
  transition: all 0.2s ease;
  font-family: inherit;
  letter-spacing: 0.06em;
}

.hl-btn-shop:hover {
  color: #2563eb;
}

.hl-btn-shop.active {
  background: #ffffff;
  color: #2563eb;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.hl-sep-shop {
  color: #cbd5e1;
  font-size: 0.7rem;
  user-select: none;
}

.sidebar-footer {
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  padding: 8px 0 0;
  flex-shrink: 0;
}

.logout-item {
  color: #fb7185 !important;
  margin-top: auto;
  flex-shrink: 0;
}

.logout-icon {
  color: #fb7185 !important;
}

.logout-item:hover {
  background: rgba(251, 113, 133, 0.08) !important;
}

/* Vehicle name cell with car icon */
.vehicle-name-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.vehicle-row-icon {
  width: 20px;
  height: 20px;
  color: #2563eb;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.vehicle-row-icon :deep(svg) {
  width: 18px;
  height: 18px;
}

/* Shop Modal Styles */
.shop-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.shop-modal {
  background: #f7f8fb;
  border-radius: 30px;
  width: 100%;
  max-width: 940px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 60px rgba(15, 23, 42, 0.25);
}

.shop-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid #edeff5;
}

.shop-modal-header h2 {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.shop-modal-sub {
  margin: 4px 0 0;
  font-size: 0.9rem;
  color: #64748b;
}

.shop-modal-content {
  padding: 32px 40px;
  flex: 1;
  overflow-y: auto;
  background: #f7f8fb;
}

.shop-modal-grid {
  display: grid;
  grid-template-columns: minmax(220px, 280px) 1fr;
  gap: 24px;
}

.shop-preview-panel {
  background: #fff;
  border-radius: 28px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.1);
}

.shop-preview-image {
  width: 100%;
  height: 150px;
  border-radius: 20px;
  background: #edf0f5;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shop-preview-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shop-preview-placeholder {
  width: 70px;
  height: 70px;
  color: #94a3b8;
}

.shop-preview-info h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #1f2937;
}

.shop-preview-info p {
  margin: 6px 0 0;
  color: #475569;
  font-size: 0.9rem;
  line-height: 1.4;
}

.shop-preview-meta {
  margin-top: 12px;
  font-size: 0.85rem;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
}
.shop-preview-meta span {
  color: #cbd5f5;
}

.shop-preview-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-radius: 16px;
  background: #f5f6fb;
  border: 1px solid #e5e7eb;
  font-size: 0.85rem;
  color: #475569;
}

.shop-preview-status strong {
  color: #0f172a;
}

.shop-details-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.upload-card,
.form-card {
  background: #fff;
  border-radius: 24px;
  padding: 24px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  box-shadow: 0 22px 40px rgba(15, 23, 42, 0.08);
}

.upload-card__header,
.form-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}

.upload-card__header h3,
.form-card__header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.upload-card__header p,
.form-card__header p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

.upload-dropzone {
  border: 2px dashed rgba(249, 115, 22, 0.6);
  border-radius: 18px;
  padding: 28px;
  text-align: center;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
}

.upload-dropzone.is-active {
  border-color: #f97316;
  background: #fff3e0;
}

.upload-preview {
  width: 100%;
  height: 160px;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
}

.upload-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-preview span {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #fff;
  background: rgba(15, 23, 42, 0.4);
}

.upload-placeholder svg {
  margin-bottom: 6px;
}

.upload-placeholder p {
  margin: 0;
  font-weight: 600;
  color: #0f172a;
}

.upload-placeholder span {
  font-size: 0.85rem;
  color: #94a3b8;
}

.form-card__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field-grid {
  display: grid;
  gap: 16px;
}

.field-grid.two-column {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field span {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 6px;
}

.field input,
.field select,
.field textarea {
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  font-size: 0.95rem;
  font-family: "Inter", system-ui, sans-serif;
  color: #0f172a;
  background: #fcfcff;
  transition: border 0.2s ease, box-shadow 0.2s ease;
}

.rounded-input {
  border-radius: 16px;
  background: #f5f6fb;
  border: 1px solid #dfe7f5;
  font-size: 0.95rem;
}

.field textarea {
  min-height: 120px;
  resize: vertical;
}

.field input:focus,
.field select:focus,
.field textarea:focus {
  outline: none;
  border-color: #f97316;
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.15);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.shop-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 22px 32px;
  border-top: 1px solid #edeff5;
  background: #f7f8fb;
}

.save-shop-btn {
  padding: 12px 28px;
  border: none;
  border-radius: 999px;
  background: #f97316;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
  box-shadow: 0 10px 25px rgba(249, 115, 22, 0.25);
}

.save-shop-btn:hover:not(:disabled) {
  background: #ea580c;
  transform: translateY(-1px);
}

.save-shop-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  box-shadow: none;
}

@media (max-width: 640px) {
  .shop-modal {
    max-height: 95vh;
  }

  .shop-modal-content {
    padding: 16px;
  }

  .shop-modal-footer {
    flex-direction: column;
    padding: 16px;
  }

  .save-shop-btn {
    width: 100%;
    justify-content: center;
  }

  .shop-modal-grid {
    grid-template-columns: 1fr;
  }

  .shop-preview-panel {
    order: 1;
  }
}

.notification-btn {
  position: relative;
  border: none;
  background: transparent;
  padding: 0;
  margin-right: 16px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  transition: background 0.2s ease;
}

.notification-btn:hover {
  background: rgba(59, 130, 246, 0.08);
}

.notification-count {
  position: absolute;
  top: 4px;
  right: 4px;
  background: #ef4444;
  color: #fff;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 999px;
  font-weight: 700;
}

.page.dark-theme {
  background: #060f1d;
  color: #e2e8f0;
}

.page.dark-theme .main {
  background: linear-gradient(180deg, #081120 0%, #0f172a 100%);
}

.page.dark-theme .sidebar {
  background: #071121;
  color: #bfd0ee;
  border-right-color: #182742;
}

.page.dark-theme .sidebar-toggle {
  background: #121d31;
  border-color: #24344f;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45);
}

.page.dark-theme .toggle-icon,
.page.dark-theme .menu-title,
.page.dark-theme .menu-label,
.page.dark-theme .sidebar-profile-btn,
.page.dark-theme .sidebar-user-info p {
  color: #9fb2d4;
}

.page.dark-theme .sidebar-user-info strong,
.page.dark-theme .brand-text,
.page.dark-theme .menu-item.active,
.page.dark-theme .logout-item {
  color: #e2e8f0;
}

.page.dark-theme .menu-item:hover {
  background: #102142;
  color: #f8fafc;
}

  .page.dark-theme .menu-item.active {
    background: #12264c;
  }


.page.dark-theme .topbar {
  background: rgba(10, 18, 32, 0.95);
  border-bottom-color: #20314b;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.28);
}

.page.dark-theme .topbar h1,
.page.dark-theme .topbar-icon,
.page.dark-theme .user-info strong,
.page.dark-theme .dropdown-user-info strong,
.page.dark-theme .dashboard-view h2,
.page.dark-theme .card h3,
.page.dark-theme .panel h3,
.page.dark-theme .activity-card h3,
.page.dark-theme .card-title,
.page.dark-theme .shop-modal-header h2,
.page.dark-theme .form-card__header h3,
.page.dark-theme th,
.page.dark-theme td strong {
  color: #f8fafc;
}

.page.dark-theme .sub,
.page.dark-theme .card span,
.page.dark-theme .card small,
.page.dark-theme .panel p,
.page.dark-theme .user-info p,
.page.dark-theme .dropdown-user-info p,
.page.dark-theme .shop-modal-sub,
.page.dark-theme .form-card__header p,
.page.dark-theme td,
.page.dark-theme .delete-message,
.page.dark-theme .delete-warning {
  color: #94a3b8;
}

.page.dark-theme .theme-toggle {
  background: #111b2f;
  border-color: #24344f;
  color: #dbeafe;
}

.page.dark-theme .theme-toggle:hover {
  background: #18253d;
  border-color: #36527d;
  color: #ffffff;
}

.page.dark-theme .bell-btn {
  background: #111b2f;
  border-color: #24344f;
  color: #cbd5e1;
}

.page.dark-theme .bell-btn:hover,
.page.dark-theme .user-dropdown:hover {
  background: #162235;
  border-color: #31445f;
  color: #f8fafc;
}

.page.dark-theme .user-dropdown {
  border-color: transparent;
}

.page.dark-theme .dropdown-arrow {
  color: #94a3b8;
}

.page.dark-theme .user-dropdown-menu,
.page.dark-theme .dashboard-cards .card,
.page.dark-theme .card,
.page.dark-theme .activity-card,
.page.dark-theme .panel,
.page.dark-theme .table-wrap,
.page.dark-theme .modal-like-page,
.page.dark-theme .add-vehicle-modal,
.page.dark-theme .delete-modal,
.page.dark-theme .shop-modal,
.page.dark-theme .form-card {
  background: #111a2d;
  border-color: #22314a;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);
}

.page.dark-theme .dropdown-header,
.page.dark-theme .shop-modal-header,
.page.dark-theme .shop-modal-footer,
.page.dark-theme .add-vehicle-header,
.page.dark-theme .add-vehicle-footer {
  background: #0d1627;
  border-color: #22314a;
}

.page.dark-theme .dropdown-divider {
  background: #22314a;
}

.page.dark-theme table {
  background: transparent;
}

.page.dark-theme thead {
  background: #0f172a;
}

.page.dark-theme tbody tr {
  border-bottom-color: #1f2b40;
}

.page.dark-theme tbody tr:hover {
  background: rgba(59, 130, 246, 0.08);
}

.page.dark-theme input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),
.page.dark-theme select,
.page.dark-theme textarea,
.page.dark-theme .rounded-input,
.page.dark-theme .shop-name-input[readonly] {
  background: #0b1322;
  color: #e2e8f0;
  border-color: #22314a;
}

.page.dark-theme input:not([type="checkbox"]):not([type="radio"]):not([type="file"])::placeholder,
.page.dark-theme textarea::placeholder {
  color: #64748b;
}

.page.dark-theme input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):focus,
.page.dark-theme select:focus,
.page.dark-theme textarea:focus,
.page.dark-theme .rounded-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
}

.page.dark-theme .delete-icon-wrapper {
  background: rgba(239, 68, 68, 0.12);
}

.page.dark-theme .delete-title,
.page.dark-theme .delete-cancel-btn {
  color: #f8fafc;
}

.page.dark-theme .delete-cancel-btn {
  background: #111a2d;
  border-color: #2a3953;
}

.page.dark-theme .delete-cancel-btn:hover {
  background: #172236;
  border-color: #3b4d69;
  color: #ffffff;
}

.page.dark-theme .delete-vehicle-name {
  background: rgba(239, 68, 68, 0.14);
  color: #fda4af;
}

@media (max-width: 700px) {
  .theme-toggle {
    width: 38px;
    padding: 0;
    justify-content: center;
  }

  .theme-toggle-label {
    display: none;
  }
}
</style>
