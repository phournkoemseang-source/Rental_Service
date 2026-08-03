<template>
  <MobileCustomerLayout :show-back="false" :show-fab="false">
  <div>
  <div class="vehicles-page">
    <UserNavbar
      :nav-items="userNavItems"
      :show-back-button="false"
      :show-fallback-message="false"
      @logout-request="handleLogout"
    />

    <main class="content">
      <section class="deals-section">
        <div class="section-header">
          <div class="section-badge">
            <i class="fa-solid fa-car"></i>
            <span>{{ $t('availableVehicles2') }}</span>
          </div>

           <h2>{{ displayedVehicles.length }} vehicles found in {{ selectedShopName || location }}</h2>

           <div class="filter-row">
           <button  
              v-for="item in filterItems"
              :key="item.id"
              class="filter-pill"
              :class="{ active: activeFilter === item.id }"
              @click="activeFilter = item.id"
            >
              <i :class="item.icon"></i>
              <span>{{ item.label }}</span>
            </button>
          </div>
        </div>

        <p v-if="isLoading" class="action-message">{{ $t('loadingVehiclesFromDatabase') }}</p>
        <p v-else-if="loadingError" class="action-message">{{ loadingError }}</p>
        <p v-if="actionMessage" class="action-message">{{ actionMessage }}</p>

        <div class="promo-grid">
          <article class="promo-card" v-for="vehicle in displayedVehicles" :key="vehicle.id">
            <div class="promo-media">
              <img :src="getVehicleImage(vehicle)" :alt="getVehicleName(vehicle)" />
              <span v-if="vehicle.bestValue" class="promo-ribbon">{{ $t('bestValue') }}</span>
              <span class="promo-type" @click="toggleFavorite(vehicle.id, getVehicleName(vehicle))" style="cursor: pointer;">
                <i :class="favoriteIds.has(vehicle.id) ? 'fa-solid fa-heart' : 'fa-regular fa-heart'" aria-hidden="true"></i>
              </span>
            </div>

            <div class="promo-body">
              <h3>{{ getVehicleName(vehicle) }}</h3>

              <div class="vehicle-meta">
                <span><i class="fa-solid fa-gear" aria-hidden="true"></i> {{ vehicle.transmission }}</span>
                <span><i class="fa-solid fa-gas-pump" aria-hidden="true"></i> {{ vehicle.fuel_type }}</span>
                <span><i class="fa-regular fa-star" aria-hidden="true"></i> {{ vehicle.rating }}</span>
              </div>

               <div class="shop-info">
                 <img 
                   v-if="getVehicleShopImage(vehicle)" 
                   :src="getVehicleShopImage(vehicle)" 
                   :alt="getVehicleShop(vehicle) + ' logo'" 
                   class="shop-logo"
                 >
                 <span v-else><i class="fa-regular fa-building" aria-hidden="true"></i></span>
                 <span class="shop-name">{{ getVehicleShop(vehicle) }}</span>
               </div>

              <div class="promo-meta">
                <div class="promo-value">
                  <strong>${{ vehicle.price_per_day }}</strong>
                  <span>{{ $t('perDay') }}</span>
                </div>
                <button class="book-btn" @click="bookNow(vehicle)">{{ $t('bookNow') }}</button>
              </div>
            </div>
          </article>
        </div>
      </section>


      <section class="map-section">
        <div class="map">
            <div class="map-controls">
              <button class="btn-reset open-map-btn" :class="{ active: mapMode === 'satellite' }" @click="mapMode = 'satellite'">{{ $t('satellite') }}</button>
              <button class="btn-reset open-map-btn" :class="{ active: mapMode === 'road' }" @click="mapMode = 'road'">{{ $t('roadmap') }}</button>
              <button class="btn-reset open-map-btn" :class="{ active: mapMode === 'route' }" @click="mapMode = 'route'">{{ $t('showRoute') }}</button>
              <button class="btn-reset open-map-btn secondary" @click="useMyLocation">{{ $t('useMyLocation') }}</button>
              <div class="distance-info" v-if="distanceKm !== null">
                <strong>{{ $t('distance2') }}</strong> {{ distanceKm.toFixed(2) }} km
              </div>
            </div>


            <iframe
              class="map-frame"
              :src="mapEmbedUrl"
              title="Google map location"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
            ></iframe>

            <div class="map-actions">
              <button class="btn-reset open-map-btn" @click="openMainLocation">{{ $t('openInGoogleMaps') }}</button>
              <button v-if="selectedShopLocationLink" class="btn-reset open-map-btn secondary" @click="openCustomLocation">{{ $t('openSavedLocation') }}</button>
            </div>
        </div>
      </section>
    </main>
  </div>

  <!-- Common Footer -->
  <CommonFooter />
  </div>
  </MobileCustomerLayout>
</template>


<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/services/api';
import { userService } from '../../services/database.js';
import CommonFooter from '../../components/CommonFooter.vue';
import '../../css/VehicleByShop.css'
import '@/css/customer-responsive.css'
import UserNavbar from '@/components/UserNavbar.vue'
import MobileCustomerLayout from '@/components/MobileCustomerLayout.vue'
import { cacheSelectedShop, clearSelectedShopCache } from '@/utils/shopSelectionCache'
import { extractCoordinatesFromMapUrl } from '@/utils/shopLocation'

const location = ref('Siem Reap');
const formatDate = (date) =>
  `${new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date)}/${date.getDate()}/${date.getFullYear()}`;

const buildRollingDateRange = () => {
  const today = new Date();
  return formatDate(today);
};

const dateRange = ref(buildRollingDateRange());
let dateRangeTimer = null;

const route = useRoute();
const router = useRouter();
const userNavItems = [
  { label: 'Home', route: '/view_shop' },
  { label: 'My Bookings', route: '/my-bookings' },
  { label: 'Profile', route: '/user/profile' }
];
const actionMessage = ref('');
const activeFilter = ref('all');
const filterItems = [
  { id: 'all', label: 'All', icon: 'fa-solid fa-circle-dot' },
  { id: 'motorbike', label: 'Motorbikes', icon: 'fa-solid fa-motorcycle' },
  { id: 'bicycle', label: 'Bicycles', icon: 'fa-solid fa-bicycle' },
  { id: 'car', label: 'Cars', icon: 'fa-solid fa-car-side' }
];

const normalizeType = (raw, fallback = '') => {
  const t = String(raw || fallback || '').trim().toLowerCase();
  if (!t) return '';
  // Prefer explicit car detection before motorbike keywords
  if (t.includes('car') || t.includes('suv')) return 'car';
  if (t.includes('bicy')) return 'bicycle';
  if (['motorbike', 'motorbikes', 'motor', 'motorcycle', 'motorcycles', 'scooter', 'scooters', 'bike'].some((k) => t.includes(k))) {
    return 'motorbike';
  }
  return t;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';
const API_ROOT = API_BASE_URL.replace(/\/api\/?$/, '');
const fallbackImageByType = {
  motorbike: 'https://i.pinimg.com/1200x/61/68/42/61684256edbd26664520bdfcf379c762.jpg',
  bicycle: 'https://i.pinimg.com/1200x/2c/90/78/2c9078d8032d2e4ae3e737684317f814.jpg',
  car: 'https://i.pinimg.com/1200x/d9/9e/06/d99e06bd9dd77fb2581170af2063b3b5.jpg'
};

const vehicles = ref([]);
const shopNamesById = ref({});
const isLoading = ref(false);
const loadingError = ref('');
const selectedShopId = computed(() => {
  const value = Number(route.query.shop_id);
  return Number.isFinite(value) && value > 0 ? value : null;
});
const selectedShopName = computed(() => {
  if (!selectedShopId.value) return '';
  const shop = shopNamesById.value[selectedShopId.value];
  return typeof shop === 'object' ? shop.name : shop;
});


const selectedShopLocation = computed(() => {
  if (!selectedShopId.value) return location.value;
  const shop = shopNamesById.value[selectedShopId.value];
  if (typeof shop === 'object' && shop.address) {
    return shop.address;
  }
  return location.value;
});


const selectedShopAddress = computed(() => {
  if (!selectedShopId.value) return '';
  const shop = shopNamesById.value[selectedShopId.value];
  return typeof shop === 'object' ? shop.address : '';
});
const selectedShopLocationLink = computed(() => {
  if (!selectedShopId.value) return '';
  const shop = shopNamesById.value[selectedShopId.value];
  if (!shop || typeof shop !== 'object') return '';
  const loc = shop.map_url || shop.location || '';
  if (typeof loc !== 'string') return '';
  return loc.trim();
});

const syncShopSelectionToStorage = () => {
  if (selectedShopId.value) {
    cacheSelectedShop(selectedShopId.value, selectedShopName.value)
  } else {
    clearSelectedShopCache()
  }
}

watch(
  [() => selectedShopId.value, () => selectedShopName.value],
  () => {
    syncShopSelectionToStorage()
  },
  { immediate: true }
)
const selectedShopCoords = computed(() => {
  if (!selectedShopId.value) return null;
  const shop = shopNamesById.value[selectedShopId.value];
  if (!shop) return null;
  let lat = shop.latitude ?? shop.lat;
  let lng = shop.longitude ?? shop.lng;
  if (lat == null || lng == null) {
    const parsed = extractCoordinatesFromMapUrl(shop.map_url || shop.location || '');
    lat = parsed?.lat;
    lng = parsed?.lng;
  }
  if (lat === null || lng === null || typeof lat === 'undefined' || typeof lng === 'undefined') return null;
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null;
  return { lat: parsedLat, lng: parsedLng };
});
// Map UI mode: 'satellite' | 'road' | 'route'
const mapMode = ref('satellite');
// Optional origin coordinates for route mode (set via geolocation or other input)
const originCoords = ref(null);

// Haversine distance (km) between originCoords and selectedShopCoords
const distanceKm = computed(() => {
  const dest = selectedShopCoords.value;
  const origin = originCoords.value;
  if (!dest || !origin) return null;
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(dest.lat - origin.lat);
  const dLon = toRad(dest.lng - origin.lng);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(origin.lat)) * Math.cos(toRad(dest.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
});

const useMyLocation = () => {
  if (!navigator?.geolocation) {
    actionMessage.value = 'Geolocation not available in this browser.';
    return;
  }
  actionMessage.value = 'Fetching your location...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      originCoords.value = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      actionMessage.value = 'Using your location as origin.';
    },
    (err) => {
      console.error(err);
      actionMessage.value = 'Could not read your location.';
    },
    { enableHighAccuracy: false, timeout: 10000 }
  );
};
const mapEmbedUrl = computed(() => {
  const coords = selectedShopCoords.value;
  const shopAddress = selectedShopAddress.value;
  const shopName = selectedShopName.value || 'Shop';
  const fallback = 'Siem Reap, Cambodia';

  const queryParts = [];
  if (shopName) queryParts.push(shopName);
  if (shopAddress) queryParts.push(shopAddress);
  if (coords) queryParts.push(`${coords.lat},${coords.lng}`);
  const query = queryParts.join(' - ') || fallback;


  // Route mode: when origin is available and mapMode is 'route', show directions
  if (mapMode.value === 'route' && coords && originCoords.value) {
    const o = originCoords.value;
    return `https://www.google.com/maps/dir/?api=1&origin=${o.lat},${o.lng}&destination=${coords.lat},${coords.lng}&travelmode=driving`;
  }

  // Map tiles: satellite or road
  const tile = mapMode.value === 'satellite' ? 'k' : 'm';
  if (coords) {
    return `https://maps.google.com/maps?hl=en&ll=${coords.lat},${coords.lng}&q=${encodeURIComponent(query)}&t=${tile}&z=18&output=embed`;
  }

  return `https://maps.google.com/maps?hl=en&q=${encodeURIComponent(query)}&t=${tile}&z=16&output=embed`;
});
const currentUser = computed(() => userService.getCurrentUser());
const userDisplayName = computed(() => currentUser.value?.name || 'customer');


const getVehicleName = (vehicle) => `${vehicle.brand} ${vehicle.model}`;
const getVehicleShop = (vehicle) => {
  if (!vehicle.shop_id) return 'Unknown Shop';
  const shop = shopNamesById.value[vehicle.shop_id];
  if (!shop) return 'Unknown Shop';
  return typeof shop === 'object' ? shop.name : shop;
};

const favoriteIds = reactive(new Set());

const filteredVehicles = computed(() => {
  const source = selectedShopId.value
    ? vehicles.value.filter((v) => Number(v.shop_id) === selectedShopId.value)
    : vehicles.value;

if (activeFilter.value === 'all') {
    return source;
  }
  return source.filter(
    (v) => normalizeType(v.type || v.category, `${v.name} ${v.brand} ${v.model}`) === activeFilter.value
  );
});

const displayedVehicles = computed(() => {
  const limit = activeFilter.value === 'all' ? 8 : 20;
  return filteredVehicles.value.slice(0, limit);
});

const getVehicleImage = (vehicle) => {
   // First check for full URL (provided by backend accessor)
   if (vehicle.image_url_full) {
     return vehicle.image_url_full;
   }
   // Check photo_urls array for multiple images
   if (vehicle.photo_urls && Array.isArray(vehicle.photo_urls) && vehicle.photo_urls.length > 0) {
     return vehicle.photo_urls[0];
   }
   // Fallback to image_url processing
   const image = vehicle.image_url ? String(vehicle.image_url).trim() : '';
   if (image) {
     if (image.startsWith('http://') || image.startsWith('https://')) return image;
     if (image.startsWith('/')) return `${API_ROOT}${image}`;
     return `${API_ROOT}/storage/${image.replace(/^storage\//, '')}`;
   }
   const normalizedType = normalizeType(vehicle.type || vehicle.category, `${vehicle.name} ${vehicle.brand} ${vehicle.model}`);
   return fallbackImageByType[normalizedType] || fallbackImageByType.motorbike;
 };

const getVehicleShopImage = (vehicle) => {
   if (!vehicle.shop_id) return null;
   const shop = shopNamesById.value[vehicle.shop_id];
   if (!shop) return null;
   
   // Check if shop has image/logo
   if (shop.shop_image_url) {
     const image = shop.shop_image_url;
     if (image.startsWith('http://') || image.startsWith('https://')) return image;
     if (image.startsWith('/')) return `${API_ROOT}${image}`;
     return `${API_ROOT}/storage/${image.replace(/^storage\//, '')}`;
   }
   
   // Fallback to shop logo or default
   if (shop.logo_url) {
     const image = shop.logo_url;
     if (image.startsWith('http://') || image.startsWith('https://')) return image;
     if (image.startsWith('/')) return `${API_ROOT}${image}`;
     return `${API_ROOT}/storage/${image.replace(/^storage\//, '')}`;
   }
   
   return null;
 };

const loadAllPages = async (resource) => {
  let page = 1;
  let lastPage = 1;
  const results = [];


  while (page <= lastPage) {
    const response = await api.get(`/${resource}`, { params: { page } });
    const payload = response.data;
    const data = Array.isArray(payload) ? payload : payload?.data || [];
    // Normalize types up front so filters work even if API returns "Motorbikes" etc.
    results.push(
      ...data.map((item) => ({
        ...item,
        type: normalizeType(item.type || item.category, `${item.name} ${item.brand} ${item.model}`)
      }))
    );
    lastPage = payload?.last_page || 1;
    page += 1;
  }

  return results;
};

const loadVehiclesAndShops = async () => {
  isLoading.value = true;
  loadingError.value = '';
  try {
    const [vehicleList, shopList] = await Promise.all([
      loadAllPages('vehicles'),
      loadAllPages('shops')
    ]);

    vehicles.value = vehicleList.map((vehicle) => ({
      ...vehicle,
      rating: Number(vehicle.rating ?? vehicle.average_rating ?? 0),
    }));
    shopNamesById.value = shopList.reduce((acc, shop) => {
      acc[shop.id] = shop;
      return acc;
    }, {});
  } catch (error) {
    loadingError.value = 'Could not load vehicles from database. Check backend server and API URL.';
    console.error(error);
  } finally {
    isLoading.value = false;
  }
};


const handleSearch = () => {
  actionMessage.value = `Search triggered for ${location}, ${dateRange}.`;
};

const openMainLocation = () => {
  const coords = selectedShopCoords.value;
  const shopAddress = selectedShopAddress.value;
  const shopName = selectedShopName.value || '';
  if (coords) {
    // Open directions to the exact coordinates; include address for clarity if available
    const destination = shopAddress
      ? `${shopName ? `${shopName}, ` : ''}${shopAddress} (${coords.lat},${coords.lng})`
      : `${shopName ? `${shopName}, ` : ''}${coords.lat},${coords.lng}`;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`, '_blank');
    return;
  }
  // Use address first, then shop name, then Trip Zone as fallback
  const query = shopAddress || shopName || 'Trip Zone Motorbike and Scooter Rental, Siem Reap, Cambodia';
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`, '_blank');
};

const openCustomLocation = () => {
  const link = selectedShopLocationLink.value;
  if (!link) return;
  const target = link.startsWith('http') ? link : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(link)}`;
  window.open(target, '_blank');
};

const notify = (message) => {
  actionMessage.value = message;
};

const handleLogout = async () => {
  await userService.logout();
  router.push('/login');
};

const runFilterSearch = () => {
  actionMessage.value = `Search clicked for ${activeFilter.value === 'all' ? 'all vehicles' : activeFilter.value}.`;
};

const toggleFavorite = (id, name) => {
  if (favoriteIds.has(id)) {
    favoriteIds.delete(id);
    actionMessage.value = `${name} removed from favorites.`;
  } else {
    favoriteIds.add(id);
    actionMessage.value = `${name} added to favorites.`;
  }
};

const bookNow = (vehicle) => {
  const vehicleName = getVehicleName(vehicle);
  actionMessage.value = `Booking started for ${vehicleName}.`;
  router.push({
    name: 'vehicle-detail',
    params: { id: vehicle.id },
    query: selectedShopId.value ? { shop_id: String(selectedShopId.value) } : {}
  });
};

onMounted(() => {
   dateRangeTimer = window.setInterval(() => {
     dateRange.value = buildRollingDateRange();
   }, 60 * 1000);
   // Scroll to top when page loads to ensure user sees vehicles first
   window.scrollTo(0, 0);
  loadVehiclesAndShops();
});

onUnmounted(() => {
  if (dateRangeTimer) {
    window.clearInterval(dateRangeTimer);
  }
});

</script>

<style scoped>
.vehicles-page {
  --brand: #1d4ed8;
  --brand-dark: #1e40af;
  --bg: #eff1f4;
  --card: #ffffff;
  --line: #d8dee7;
  --text: #1e2430;
  --muted: #c4ccda;
  min-height: 100vh;
  padding: 0 40px;
  font-family: var(--font-sans);
  background: var(--bg);
  color: var(--text);
}


.btn-reset {
  border: 0;
  background: transparent;
  font: inherit;
  color: inherit;
  cursor: pointer;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 32px;
  align-items: center;
  width: calc(100% + 80px);
  margin-left: -40px;
  margin-right: -40px;
  padding: 14px 20px;
  background: #fff;
  border-bottom: 1px solid var(--line);
  box-sizing: border-box;
  padding-right: 60px;
}

.book-btn {
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #1b75ff, #0d62df);
  color: #fff;
  padding: 13px 20px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.book-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(27, 117, 255, 0.35);
}

.brand {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 20px;
  font-weight: 700;
  color: #2563eb;
  white-space: nowrap;
}


.map-controls {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.map-frame {
  width: 100%;
  height: 380px;
  border: 0;
  border-radius: 12px;
}
.map-actions {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}
.open-map-btn.active {
  background: linear-gradient(90deg,#1158d6,#0b4fc0);
  color: #fff;
  border-radius: 8px;
  padding: 8px 12px;
}
.distance-info {
  margin-left: 12px;
  font-size: 14px;
  color: #0b243a;
}

.brand-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: #dbeafe;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-self: end;
  white-space: nowrap;
}

.nav-links {
  display: flex;
  gap: 24px;
  justify-self: center;
}

.nav-link {
  padding: 8px 16px;
  border-radius: 8px;
  color: #4a556b;
  font-size: 14px;
  font-weight: 700;
}

.nav-link.active,
.nav-link:hover {
  background: #eef7ff;
  color: #2563eb;
}

.brand-icon-image {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.user-display-name {
  font-size: 16px;
  font-weight: 800;
  color: #33435d;
}

.avatar {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #f4f8fc;
  color: #9a6a32;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.logout-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.logout-btn:hover {
  background: #1d4ed8;
}

.fav-btn i {
  font-size: 16px;
}

.shop i,
.meta i {
  margin-right: 4px;
}

.meta .fa-star {
  color: #f6b200;
}

.filters {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 20px;
  background: #fff;
  border-bottom: 1px solid var(--line);
}

.type-filters,
.option-filters {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-pill{
   display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  color: #334155;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-pill.active{
   background: #1d6fff;
  border-color: #1d6fff;
  color: #fff;
}
.filter-pill:hover {
  background: #1d6fff;
  border-color: #1d6fff;
  color: #fff;
}

.chip,
.select-chip {
  padding: 8px 14px;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: #f5f7fa;
  font-size: 14px;
}

.chip.active {
  background: var(--brand);
  color: #fff;
  border-color: var(--brand);
}

.select-chip {
  background: #fff;
}

.search-filter-btn {
  min-width: 92px;
  background: var(--brand);
  color: #fff;
  border-color: var(--brand);
  font-weight: 600;
}

.search-filter-btn:hover {
  background: var(--brand-dark);
  border-color: var(--brand-dark);
}

.content {
  max-width: 1240px;
  margin: 0 auto;
  padding: 22px 20px 36px;
}


.results-head h1 {
  margin: 0;
  font-size: 24px;
}

.results-head p {
  margin: 4px 0 12px;
  color: var(--muted);
}

.action-message {
  margin: 0 0 12px;
  color: #0f74ab;
  font-size: 14px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.card {
  position: relative;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--card);
  overflow: hidden;
  background-color:#eaf7fa;
  
}

.badge {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: var(--brand);
}

.fav-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: #f8f6f6;
  border: 1px solid var(--line);
}

.fav-btn.active {
  color: #ef4f68;
}


.card-image {
  height: 172px;
  background: #ffffff;
  display: grid;
  place-items: center;
  width: 100%;
  /* padding: 0px; */
}

.card-image img {
  width: 100%;
  max-height: 152px;
  object-fit: contain;
}

.card-body {
  padding: 12px;
  background-color:#eaf7fa;
}

.card-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.card-top h3 {
  margin: 0;
  font-size: 24px;
  line-height: 1.3;
}

.price {
  text-align: right;
}

.price strong {
  color: var(--brand);
  font-size: 20px;
}

.price span {
  display: block;
  font-size: 11px;
  color: var(--muted);
}

.shop {
  margin: 4px 0 10px;
  font-size: 16px;
  color: #617086;
}

.meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 13px;
  color: #59667b;
  margin-bottom: 12px;
}

.book {
  width: 100%;
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--brand);
  color: #fff;
  font-weight: 600;
}

.book:hover {
  background: var(--brand-dark);
}

.map-section {
  margin-top: 26px;
}

.map {
  position: relative;
  height: 330px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--line);
}

.map-frame {
  width: 100%;
  height: 100%;
  border: 0;
}

.open-map-btn {
  position: absolute;
  left: 12px;
  bottom: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid var(--line);
  color: var(--brand-dark);
  font-size: 13px;
  font-weight: 600;
}
.open-map-btn.secondary {
  left: auto;
  right: 12px;
}

@media (max-width: 1080px) {
  .topbar {
    grid-template-columns: 1fr;
    width: 100%;
    margin-left: 0;
    margin-right: 0;
    gap: 10px;
  }

  .nav-links,
  .top-actions {
    justify-self: start;
  }

  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .vehicles-page {
    padding: 0 12px;
  }

  .topbar {
    width: calc(100% + 24px);
    margin-left: -12px;
    margin-right: -12px;
    padding: 12px;
  }

  .nav-links {
    flex-wrap: wrap;
  }

  .filters {
    flex-direction: column;
  }

  .grid {
    grid-template-columns: 1fr;
  }
}

</style>
