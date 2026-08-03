<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { vehicleApi, shopApi, ratingApi } from '@/services/api'
import { userService } from '../../services/database.js'
import { readStoredLocation } from '@/utils/locationAccess'
import { extractCoordinatesFromMapUrl, haversineDistanceKm } from '@/utils/shopLocation'
import CommonFooter from '../../components/CommonFooter.vue'
import '../../css/ShopVehicle.css'
import '@/css/customer-responsive.css'
import UserNavbar from '@/components/UserNavbar.vue'
import { cacheSelectedShop, clearSelectedShopCache } from '@/utils/shopSelectionCache'

const route = useRoute()
const router = useRouter()
const navItems = [
  { label: 'Home', route: '/view_shop' },
  { label: 'My Bookings', route: '/my-bookings' },
  { label: 'Profile', route: '/user/profile' }
]

const shopId = computed(() => route.params.id)
const vehicles = ref([])
const selectedCategory = ref('all')
const shop = ref(null)
const shopDisplayName = computed(() => shop.value?.name || '')
const isLoading = ref(true)
const error = ref('')
const shopError = ref('')
const isLoadingShop = ref(false)
const ratingSummaryMap = ref({})
const mapMode = ref('satellite')
const isLocating = ref(false)
const initialLocation = readStoredLocation()
const originCoords = ref(
  initialLocation ? { lat: Number(initialLocation.lat), lng: Number(initialLocation.lng) } : null
)

const currentUser = computed(() => userService.getCurrentUser())
const activeNavLabel = computed(() => {
  const matchedItem = navItems.find((item) => item.route && route.path.startsWith(item.route))
  return matchedItem?.label || 'My Bookings'
})

const isOwnerRole = computed(() => {
  const role = String(currentUser.value?.role || '').toLowerCase()
  return role === 'shop_owner' || role === 'owner'
})

const getShopImage = () => {
  if (!shop.value) return ''
  // Use img_url_full accessor from backend if available
  if (shop.value.img_url_full) {
    return shop.value.img_url_full
  }
  const img = shop.value.img_url || shop.value.image || shop.value.cover || ''
  if (!img) return ''
  if (/^(https?:\/\/|data:|blob:)/i.test(img)) return img
  const normalized = String(img).replace(/^\/+/, '')
  if (normalized.startsWith('storage/')) return `${getApiOrigin()}/${normalized}`
  return `${getApiOrigin()}/storage/${normalized.replace(/^storage\//, '')}`
}

const getApiOrigin = () => {
  try {
    const currentOrigin = window.location.origin
    if (currentOrigin.includes('5173')) {
      return import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, '') || 'http://127.0.0.1:8000'
    }
    return currentOrigin
  } catch {
    return import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, '') || 'http://127.0.0.1:8000'
  }
}

const resolveVehicleImageUrl = (value) => {
  if (!value || typeof value !== 'string') return value
  // If it's already a full URL (http, https, data, blob), return as-is
  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('blob:') ||
    value.startsWith('data:')
  ) {
    return value
  }
  const clean = value.replace(/^\/+/, '')
  if (clean.startsWith('storage/')) {
    return `${getApiOrigin()}/${clean}`
  }
  return `${getApiOrigin()}/storage/${clean}`
}

const normalizeType = (raw) => {
  const t = String(raw || '').trim().toLowerCase()
  if (!t) return ''
  // Prefer explicit car detection before motorbike keywords
  if (t.includes('car') || t.includes('suv')) return 'car'
  if (t.includes('bicy')) return 'bicycle'
  if (['motorbike', 'motorbikes', 'motor', 'moto', 'motorbike ', 'motorbike-', 'motorcycle', 'motorcycles', 'scooter', 'scooters', 'bike'].some(k => t.includes(k))) {
    return 'motorbike'
  }
  return t
}

const normalizeVehicle = (vehicle) => {
  let parsedPhotos = []
  try {
    if (vehicle.photos) {
      if (Array.isArray(vehicle.photos)) {
        parsedPhotos = vehicle.photos
      } else if (typeof vehicle.photos === 'string') {
        parsedPhotos = JSON.parse(vehicle.photos)
      }
    }
  } catch (e) {
    parsedPhotos = []
  }


  // Priority: image_url_full (backend accessor) > photo_urls > image_url > photos
  let imageUrl = ''
  if (vehicle.image_url_full) {
    imageUrl = vehicle.image_url_full
  } else if (vehicle.photo_urls && Array.isArray(vehicle.photo_urls) && vehicle.photo_urls.length > 0) {
    imageUrl = vehicle.photo_urls[0]
  } else if (vehicle.image_url) {
    imageUrl = vehicle.image_url
  } else if (parsedPhotos.length > 0) {
    imageUrl = parsedPhotos[0]
  }

  const normalizedType = normalizeType(vehicle.type || vehicle.category || vehicle.vehicle_type || vehicle.kind || vehicle.name)

  return {
    id: vehicle.id,
    name: vehicle.name || 'Unnamed Vehicle',
    brand: vehicle.brand || '',
    model: vehicle.model || '',
    type: normalizedType,
    plate_number: vehicle.plate_number || vehicle.plate || '',
    price_per_day: Number(vehicle.price_per_day || vehicle.price || 0),
    fuel_type: vehicle.fuel_type || vehicle.fuel || '',
    transmission: vehicle.transmission || '',
    status: vehicle.status || 'Available',
    description: vehicle.description || '',
    imageUrl: resolveVehicleImageUrl(imageUrl),
    photos: parsedPhotos,
    photoUrls: vehicle.photo_urls || [],
    rating: typeof vehicle.rating === 'number' || !Number.isNaN(Number(vehicle.rating)) ? Number(vehicle.rating) : null,
    ratingCount: Number(vehicle.rating_count ?? 0),
    total_vehicles: vehicle.total_vehicles ?? 1,
    available_vehicles:
      typeof vehicle.available_vehicles === 'number'
        ? Math.max(0, Math.trunc(vehicle.available_vehicles))
        : null,
    rider_details: vehicle.rider_details || '',
    insurance_fee: vehicle.insurance_fee ?? 0,
    taxes_fee: vehicle.taxes_fee ?? 0
  }
}

const fetchVehicles = async () => {
  isLoading.value = true
  error.value = ''

  try {
    const response = await vehicleApi.getAll({ shop_id: shopId.value })
    const data = response.data.data || response.data || []
    vehicles.value = data.map(normalizeVehicle)
    
    // Fetch active bookings to calculate available vehicles
    await fetchActiveBookings()
  } catch (err) {
    console.error('Error fetching vehicles:', err)
    error.value = 'Failed to load vehicles. Please try again.'
  } finally {
    isLoading.value = false
  }
}

// Fetch active bookings to calculate available vehicles
const activeBookingsMap = ref({})

const fetchActiveBookings = async () => {
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
  if (!token) {
    activeBookingsMap.value = {}
    return
  }

  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
    const response = await fetch(`${apiBase}/bookings?shop_id=${shopId.value}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const result = await response.json()
    const bookings = result.data || result || []

    const counts = {}
    bookings.forEach((booking) => {
      const vehicleId = booking.vehicle_id
      const status = booking.status?.toLowerCase() || ''
      if (!['returned', 'completed', 'cancelled', 'canceled'].includes(status)) {
        counts[vehicleId] = (counts[vehicleId] || 0) + 1
      }
    })
    activeBookingsMap.value = counts
  } catch (err) {
    console.error('Error fetching active bookings:', err)
    activeBookingsMap.value = {}
  }
}

// Calculate available vehicles (total - active bookings)
const getAvailableVehicles = (vehicle) => {
  if (typeof vehicle.available_vehicles === 'number') {
    return Math.max(0, Math.trunc(vehicle.available_vehicles))
  }

  const total = vehicle.total_vehicles || 1
  const activeBookings = activeBookingsMap.value[vehicle.id] || 0
  return Math.max(0, total - activeBookings)
}


const buildRatingSummaryMap = (summaries) => {
  const map = {}
  if (!Array.isArray(summaries)) {
    ratingSummaryMap.value = {}
    return
  }
  summaries.forEach((entry) => {
    const vehicleId = Number(entry?.id)
    if (!vehicleId) return
    const avg = entry.average_rating
    const count = entry.total_ratings
    map[vehicleId] = {
      averageRating:
        avg === null || avg === undefined ? null : Number(avg),
      totalRatings: Number(count || 0),
    }
  })
  ratingSummaryMap.value = map
}

const fetchVehicleRatingSummary = async () => {
  try {
    const response = await ratingApi.getVehicleRatingsSummary()
    const entries = Array.isArray(response.data) ? response.data : []
    buildRatingSummaryMap(entries)
  } catch (err) {
    console.error('Error fetching vehicle rating summary:', err)
    ratingSummaryMap.value = {}
  }
}

const fetchShop = async () => {
  isLoadingShop.value = true
  shopError.value = ''
  try {
    const response = await shopApi.getById(shopId.value)
    shop.value = response.data?.data || response.data || null
  } catch (err) {
    console.error('Error fetching shop:', err)
    shopError.value = 'Failed to load shop details. Please try again later.'
    shop.value = null
  } finally {
    isLoadingShop.value = false
  }
}

const syncShopSelectionCache = () => {
  const parsedId = Number(shopId.value)
  if (Number.isFinite(parsedId) && parsedId > 0) {
    cacheSelectedShop(parsedId, shopDisplayName.value)
    return
  }
  clearSelectedShopCache()
}

watch([() => shopId.value, shopDisplayName], syncShopSelectionCache, { immediate: true })

const goBack = () => {
  router.push('/view_shop')
}

const handleLogout = async () => {
  await userService.logout()
  localStorage.removeItem('auth_token')
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}

const viewVehicleDetails = (vehicle) => {
  router.push({ path: `/vehicles/${vehicle.id}`, query: route.query })
}

const getStatusClass = (status) => {
  const s = String(status).toLowerCase()
  if (s === 'available') return 'status-available'
  if (s === 'rented') return 'status-rented'
  if (s === 'maintenance') return 'status-maintenance'
  return 'status-available'
}

const vehiclesWithRatingInfo = computed(() => {
  return vehicles.value.map((vehicle) => {
    const idKey = Number(vehicle?.id)
    const summary = ratingSummaryMap.value[idKey]
    if (!summary) return vehicle
    return {
      ...vehicle,
      rating:
        summary.averageRating !== null && summary.averageRating !== undefined
          ? summary.averageRating
          : vehicle.rating,
      ratingCount:
        summary.totalRatings !== undefined
          ? summary.totalRatings
          : vehicle.ratingCount,
    }
  })
})

const filteredVehicles = computed(() => {
  const source = vehiclesWithRatingInfo.value
  if (selectedCategory.value === 'all') return source
  return source.filter((v) => {
    const type = normalizeType(v.type || v.category || v.vehicle_type || v.kind || v.name)
    if (type === selectedCategory.value) return true
    // looser matching: e.g., "motorbikes", "motor" or text mentions
    const text = `${v.name || ''} ${v.brand || ''} ${v.model || ''} ${v.description || ''}`.toLowerCase()
    if (selectedCategory.value === 'motorbike') {
      return ['motor', 'moto', 'bike', 'scooter'].some((k) => type.includes(k) || text.includes(k))
    }
    if (selectedCategory.value === 'bicycle') {
      return ['bicy', 'cycle', 'bike'].some((k) => type.includes(k) || text.includes(k))
    }
    if (selectedCategory.value === 'car') {
      return ['car', 'suv', 'auto', 'sedan', 'truck'].some((k) => type.includes(k) || text.includes(k))
    }
  return false
})
})

const categoryButtons = [
  { label: 'All', value: 'all' },
  { label: 'Motorbikes', value: 'motorbike' },
  { label: 'Bicycles', value: 'bicycle' },
  { label: 'Cars', value: 'car' }
]


onMounted(() => {
  fetchVehicles()
  fetchShop()
  fetchVehicleRatingSummary()
  
  // Refresh bookings when user returns to this page
  window.addEventListener('focus', handleVisibilityChange)
})

// Handle visibility change to refresh when user returns to this page
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    fetchVehicles()
  }
}

const selectedShopCoords = computed(() => {
  if (!shop.value) return null
  let lat = shop.value.latitude ?? shop.value.lat
  let lng = shop.value.longitude ?? shop.value.lng
  if (lat == null || lng == null) {
    const parsed = extractCoordinatesFromMapUrl(shop.value.map_url || shop.value.location || '')
    lat = parsed?.lat
    lng = parsed?.lng
  }
  if (lat == null || lng == null) return null
  const parsedLat = Number(lat)
  const parsedLng = Number(lng)
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null
  return { lat: parsedLat, lng: parsedLng }
})

const selectedShopMapLink = computed(() => String(shop.value?.map_url || shop.value?.location || '').trim())

const distanceKm = computed(() => {
  const origin = originCoords.value
  const dest = selectedShopCoords.value
  if (!origin || !dest) return null
  return haversineDistanceKm(origin.lat, origin.lng, dest.lat, dest.lng)
})

// Optional: Google Maps Embed API key to render the richer place card UI when available
const googleMapsEmbedKey = import.meta.env?.VITE_GOOGLE_MAPS_EMBED_KEY || ''

const mapEmbedUrl = computed(() => {
  const coords = selectedShopCoords.value
  const name = shop.value?.name || 'Shop'
  const address = shop.value?.address || ''
  const fallback = 'Siem Reap, Cambodia'
  const queryParts = []
  if (name) queryParts.push(name)
  if (address) queryParts.push(address)
  const baseQuery = queryParts.join(', ') || fallback

  if (mapMode.value === 'route' && originCoords.value && coords) {
    return `https://www.google.com/maps/dir/?api=1&origin=${originCoords.value.lat},${originCoords.value.lng}&destination=${coords.lat},${coords.lng}&travelmode=driving`
  }

  if (googleMapsEmbedKey) {
    const placeTarget = coords ? `${coords.lat},${coords.lng}` : baseQuery
    const mapType = mapMode.value === 'road' ? 'roadmap' : 'satellite'
    return `https://www.google.com/maps/embed/v1/place?key=${googleMapsEmbedKey}&q=${encodeURIComponent(placeTarget)}&maptype=${mapType}`
  }

  const tile = mapMode.value === 'road' ? 'm' : 'k'
  if (coords) {
    return `https://www.google.com/maps?q=${encodeURIComponent(baseQuery)}&ll=${coords.lat},${coords.lng}&t=${tile}&z=18&output=embed`
  }

  return `https://www.google.com/maps?q=${encodeURIComponent(baseQuery)}&t=${tile}&z=16&output=embed`
})

const useMyLocation = () => {
  if (isLocating.value) return
  if (!navigator?.geolocation) return

  isLocating.value = true
  navigator.geolocation.getCurrentPosition(
    (position) => {
      originCoords.value = {
        lat: Number(position.coords.latitude),
        lng: Number(position.coords.longitude),
      }
      isLocating.value = false
    },
    () => {
      isLocating.value = false
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  )
}

const openMap = () => {
  const mapLink = selectedShopMapLink.value
  if (mapLink && /^https?:\/\//i.test(mapLink) && mapMode.value !== 'route') {
    window.open(mapLink, '_blank')
    return
  }


  const coords = selectedShopCoords.value
  const name = shop.value?.name || ''
  const address = shop.value?.address || ''
  const fallback = 'Siem Reap, Cambodia'
  const destination = `${name ? `${name}, ` : ''}${address || ''}`.trim() || fallback
  if (mapMode.value === 'route' && coords && originCoords.value) {
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${originCoords.value.lat},${originCoords.value.lng}&destination=${coords.lat},${coords.lng}&travelmode=driving`,
      '_blank'
    )
    return
  }
  const destWithCoords = coords ? `${destination} (${coords.lat},${coords.lng})` : destination
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destWithCoords)}`, '_blank')
}
</script>

<template>
  <div class="shop-vehicles-wrapper">
  <div class="shop-vehicles-page">
    <UserNavbar
      :nav-items="navItems"
      :active-label="activeNavLabel"
      :show-fallback-message="false"
      @logout-request="handleLogout"
    />

    <main class="vehicles-content">
      <div class="page-header">
        <h1>{{ $t('availableVehicles') }}</h1>
        <p>{{ $t('browseVehiclesFromThisShop') }}</p>
      </div>

      <div v-if="shopError" class="status-box error" style="margin-bottom: 1rem;">
        {{ shopError }}
      </div>

      <div v-if="isOwnerRole" class="owner-shop-card">
        <div class="owner-top-row">
          <div class="owner-avatar">
            <img v-if="getShopImage()" :src="getShopImage()" alt="Shop" />
            <div v-else class="owner-avatar-placeholder">
              {{ shop?.name?.slice(0, 1) || 'S' }}
            </div>
          </div>
          <div class="owner-actions">
            <button class="owner-btn primary-btn" type="button">{{ $t('changeImage') }}</button>
            <button class="owner-btn secondary-btn" type="button">{{ $t('deleteImage') }}</button>
          </div>
          <span class="owner-status" :class="shop?.status === 'active' ? 'is-active' : 'is-inactive'">
            {{ shop?.status ? shop.status.charAt(0).toUpperCase() + shop.status.slice(1) : 'Draft' }}
          </span>
        </div>
        <div class="owner-info-grid">
          <div class="owner-info-card">
            <p>{{ $t('shopName3') }}</p>
            <strong>{{ shop?.name || 'Your Shop' }}</strong>
          </div>
          <div class="owner-info-card">
            <p>{{ $t('owner') }}</p>
            <strong>{{ shop?.owner_name || 'Owner Name' }}</strong>
          </div>
          <div class="owner-info-card">
            <p>{{ $t('shopPhone') }}</p>
            <strong>{{ shop?.phone || 'N/A' }}</strong>
          </div>
          <div class="owner-info-card">
            <p>{{ $t('address') }}</p>
            <strong>{{ shop?.address || 'Add address' }}</strong>
          </div>
        </div>
      </div>

      <div class="filters-row" v-if="vehicles.length">
        <div class="filter-chips">
          <button
            v-for="category in categoryButtons"
            :key="category.value"
            class="chip"
            :class="{ active: selectedCategory === category.value }"
            @click="selectedCategory = category.value"
          >
            {{ category.label }}
          </button>
        </div>
        <p class="results-text">
          {{ filteredVehicles.length }} vehicles found
          <span v-if="shop?.name">in {{ shop.name }}</span>
        </p>
      </div>


      <div v-if="isLoading" class="status-box">{{ $t('loadingVehicles') }}</div>
      <div v-else-if="error" class="status-box error">{{ error }}</div>
      <div v-else-if="vehicles.length === 0" class="status-box">{{ $t('noVehiclesAvailableAtThisShopYet') }}</div>

      <div v-else-if="filteredVehicles.length === 0" class="status-box">{{ $t('noVehiclesMatchThisCategory') }}</div>

      <div v-else class="vehicles-grid">
        <article v-for="vehicle in filteredVehicles" :key="vehicle.id" class="vehicle-card">
          <div class="vehicle-card-image">
            <img 
              v-if="vehicle.imageUrl" 
              :src="vehicle.imageUrl" 
              :alt="vehicle.name" 
              @error="vehicle.imageUrl = ''" 
            />
            <div v-else class="no-image">
              <i class="fa-solid fa-car"></i>
            </div>
            <span :class="'status-badge ' + getStatusClass(vehicle.status)">
              {{ vehicle.status }}
            </span>
          </div>
          
          <div class="vehicle-card-content">
            <h3>{{ vehicle.name }}</h3>
            <p class="vehicle-type">{{ vehicle.type }} - {{ vehicle.brand }} {{ vehicle.model }}</p>
            
            <div class="vehicle-details">
              <div class="detail-item" v-if="vehicle.plate_number">
                <i class="fa-solid fa-tag"></i>
                <span>{{ vehicle.plate_number }}</span>
              </div>
              <div class="detail-item" v-if="vehicle.fuel_type">
                <i class="fa-solid fa-gas-pump"></i>
                <span>{{ vehicle.fuel_type }}</span>
              </div>
              <div class="detail-item" v-if="vehicle.transmission">
                <i class="fa-solid fa-gear"></i>
                <span>{{ vehicle.transmission }}</span>
              </div>
              <div class="detail-item available-stock" v-if="vehicle.total_vehicles">
                <i class="fa-solid fa-car"></i>
                <span>{{ getAvailableVehicles(vehicle) }} available</span>
              </div>
            </div>

            <div class="vehicle-rating" v-if="vehicle.rating">
              <i class="fa-solid fa-star"></i>
              <span>{{ vehicle.rating.toFixed(1) }}</span>
              <small v-if="vehicle.ratingCount">({{ vehicle.ratingCount }})</small>
            </div>

            <div class="vehicle-price">
              <span class="price-amount">${{ vehicle.price_per_day }}</span>
              <span class="price-period">/day</span>
            </div>

            <button 
              class="view-details-btn" 
              @click="viewVehicleDetails(vehicle)"
              :disabled="getAvailableVehicles(vehicle) <= 0"
            >
              {{ getAvailableVehicles(vehicle) <= 0 ? 'Not Available' : 'View Details' }}
            </button>
          </div>
        </article>
      </div>


      <section class="map-section" v-if="shop">
        <div class="map">
          <div class="map-toolbar">
            <div class="map-modes">
              <button class="map-mode-btn" :class="{ active: mapMode === 'satellite' }" @click="mapMode = 'satellite'">{{ $t('satellite') }}</button>
              <button class="map-mode-btn" :class="{ active: mapMode === 'road' }" @click="mapMode = 'road'">{{ $t('roadmap') }}</button>
              <button class="map-mode-btn" :class="{ active: mapMode === 'route' }" @click="mapMode = 'route'">{{ $t('route') }}</button>
            </div>
            <button class="map-locate-btn" :disabled="isLocating" @click="useMyLocation">
              {{ isLocating ? 'Locating...' : 'Use My Location' }}
            </button>
          </div>

          <p v-if="distanceKm !== null" class="distance-chip">{{ $t('distanceToShop') }}<strong>{{ distanceKm.toFixed(2) }} km</strong>
          </p>

          <iframe
            class="map-frame"
            :src="mapEmbedUrl"
            title="Google map location"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
          ></iframe>
          <div class="map-actions">
            <button class="btn-reset open-map-btn" @click="openMap">{{ $t('openInGoogleMaps') }}</button>
          </div>
        </div>
      </section>
    </main>
  </div>

  <!-- Common Footer -->
  <CommonFooter />
  </div>
</template>
<style scoped>
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 4rem;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  position: sticky;
  top: 0;
  z-index: 100;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.back-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: #333;
  padding: 0.5rem;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.back-btn:hover {
  background-color: #f0f0f0;
}

.brand-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
}

.brand span {
  font-weight: 700;
  font-size: 1.25rem;
  color: #333;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  /* margin-right: 40px; */
}

.user-display-name {
  font-weight: 500;
  color: #333;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  overflow: hidden;
  border: none;
  cursor: pointer;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}


.vehicles-content {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 1.75rem;
  color: #333;
  margin-bottom: 0.5rem;
}

.page-header p {
  color: #666;
}

.owner-shop-card {
  margin-bottom: 2rem;
  background: linear-gradient(180deg, #fafbff 0%, #f4f7ff 100%);
  border-radius: 26px;
  padding: 28px 32px;
  box-shadow: 0 30px 60px rgba(15, 23, 42, 0.15);
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.owner-top-row {
  display: flex;
  align-items: center;
  gap: 28px;
  flex-wrap: wrap;
}

.owner-avatar {
  width: 130px;
  height: 130px;
  border-radius: 50%;
  padding: 6px;
  background: #fff;
  border: 4px solid rgba(37, 99, 235, 0.25);
  box-shadow: 0 14px 40px rgba(15, 23, 42, 0.2);
}

.owner-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: block;
  object-fit: cover;
}

.owner-avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: #2563eb;
  font-weight: 700;
  background: radial-gradient(circle, #e0eeff 0%, #cdd8f6 70%);
}

.owner-actions {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  flex: 1;
}


.owner-btn {
  flex: 1;
  padding: 0.85rem 1rem;
  border-radius: 28px;
  border: none;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
}

.primary-btn {
  background: linear-gradient(135deg, #1d4ed8, #3b82f6);
  color: #fff;
  box-shadow: 0 10px 25px rgba(37, 99, 235, 0.3);
}

.secondary-btn {
  background: #e2e8f0;
  color: #1f2937;
  border: 1px solid #cfd7ea;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.owner-status {
  margin-left: auto;
  padding: 0.5rem 1.25rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: #ecffef;
  color: #047857;
  border: 1px solid rgba(4, 120, 87, 0.3);
}

.owner-status.is-inactive {
  background: #ffe8e8;
  color: #991b1b;
  border-color: rgba(153, 27, 27, 0.3);
}

.owner-info-grid {
  margin-top: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.owner-info-card {
  background: #fff;
  border-radius: 18px;
  padding: 12px 16px;
  border: 1px solid #e0e6f6;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.owner-info-card p {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  color: #6b7280;
}

.owner-info-card strong {
  display: block;
  margin-top: 6px;
  font-size: 1.05rem;
  color: #111827;
  font-weight: 600;
}

.filters-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.filter-chips {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.chip {
  padding: 0.55rem 1rem;
  border-radius: 999px;
  border: 1px solid #d8dee7;
  background: white;
  color: #334155;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.chip:hover {
  border-color: #2563eb;
  color: #2563eb;
}

.chip.active {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.15);
}

.results-text {
  color: #475569;
  font-weight: 600;
}

.status-box {
  text-align: center;
  padding: 3rem;
  background: white;
  border-radius: 12px;
  color: #666;
  font-size: 1.1rem;
}

.status-box.error {
  color: #dc2626;
  background: #fee2e2;
}

.vehicles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.map-section {
  margin-top: 2rem;
}

.map {
  position: relative;
  padding: 14px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #d8dee7;
}

.map-frame {
  width: 100%;
  height: 340px;
  border: 0;
  border-radius: 10px;
}

.map-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}

.map-modes {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.map-mode-btn,
.map-locate-btn,
.open-map-btn {
  padding: 8px 12px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #d8dee7;
  color: #1e40af;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.map-mode-btn.active {
  background: linear-gradient(135deg, #1d4ed8, #2563eb);
  color: #fff;
  border-color: transparent;
}

.map-locate-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.distance-chip {
  margin: 0 0 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1e3a8a;
  font-size: 0.85rem;
}

.map-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-start;
}

.vehicle-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s, box-shadow 0.2s;
}

.vehicle-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.vehicle-card-image {
  position: relative;
  height: 200px;
  background: #f8f9fa;
}

.vehicle-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}


.vehicle-card-image .no-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: #ccc;
}

.status-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-available {
  background: #dcfce7;
  color: #166534;
}

.status-rented {
  background: #fef3c7;
  color: #92400e;
}

.status-maintenance {
  background: #fee2e2;
  color: #991b1b;
}

.vehicle-card-content {
  padding: 1.25rem;
}

.vehicle-card-content h3 {
  font-size: 1.1rem;
  color: #333;
  margin-bottom: 0.25rem;
}

.vehicle-type {
  color: #666;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.vehicle-details {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8rem;
  color: #666;
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
}

.detail-item.available-stock {
  background: #dcfce7;
  color: #16a34a;
  font-weight: 600;
}

.vehicle-rating {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 0.75rem;
  color: #047857;
  font-weight: 600;
}

.vehicle-rating i {
  color: #fbbf24;
}

.vehicle-rating small {
  font-size: 0.75rem;
  color: #475569;
}

.detail-item i {
  font-size: 0.75rem;
}

.vehicle-price {
  margin-bottom: 1rem;
}

.vehicle-extra-fees {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.fee-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: #666;
}

.fee-item i {
  color: #1e40af;
}

.price-amount {
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
}

.price-period {
  font-size: 0.875rem;
  color: #666;
}

.view-details-btn {
  width: 100%;
  padding: 0.75rem;
  background: #2563eb;;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.view-details-btn:hover {
  opacity: 0.9;
}

.view-details-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.7;
}

@media (max-width: 768px) {
  .topbar {
    padding: 1rem;
  }

  .vehicles-content {
    padding: 1rem;
  }

  .vehicles-grid {
    grid-template-columns: 1fr;
  }
}
</style>
