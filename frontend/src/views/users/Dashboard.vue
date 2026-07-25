<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { logoutUser } from '@/services/auth'
import { shopApi, vehicleApi } from '@/services/api'
import CommonFooter from '@/components/CommonFooter.vue'
import UserNavbar from '@/components/UserNavbar.vue'
import MobileCustomerLayout from '@/components/MobileCustomerLayout.vue'
import CambodiaMap from '@/components/CambodiaMap.vue'
import { readStoredLocation, saveLocationAccess } from '@/utils/locationAccess'
import '@/css/userDashboard.css'
import '@/css/customer-responsive.css'

const router = useRouter()
const { t } = useI18n()

const SEARCH_HISTORY_KEY = 'chong_choul_province_searches'
const FAVORITES_KEY = 'chong_choul_favorites'

const favorites = ref(readFavorites())

function readFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites.value]))
  } catch { /* ignore storage errors */ }
}

function isFavorite(vehicleId) {
  return favorites.value.has(Number(vehicleId))
}

function toggleFavorite(event, vehicleId) {
  event.stopPropagation()
  const id = Number(vehicleId)
  if (favorites.value.has(id)) {
    favorites.value.delete(id)
  } else {
    favorites.value.add(id)
  }
  saveFavorites()
  // Trigger reactivity by replacing the Set
  favorites.value = new Set(favorites.value)
}

const CAMBODIA_PROVINCES = [
  'Banteay Meanchey',
  'Battambang',
  'Kompong Cham',
  'Kompong Chhnang',
  'Kompong Speu',
  'Kompong Thom',
  'Kompot',
  'Kandal',
  'Kep',
  'Koh Kong',
  'Kratie',
  'Mondulkiri',
  'Oddar Meanchey',
  'Pailin',
  'Phnom Penh',
  'Preah Sihanouk',
  'Preah Vihear',
  'Prey Veng',
  'Pursat',
  'Ratanakiri',
  'Siem Reap',
  'Stung Treng',
  'Svay Rieng',
  'Takeo',
  'Tboung Khmum',
]

const isLoading = ref(false)
const isLoadingVehicles = ref(false)
const dataError = ref('')
const shops = ref([])
const vehicles = ref([])
const ALL_PROVINCES_KEY = '__all__'

const provinceQuery = ref('')
const showSuggestions = ref(false)
const selectedProvince = ref(ALL_PROVINCES_KEY)
const searchMessage = ref('')

const isAllMode = computed(() => selectedProvince.value === ALL_PROVINCES_KEY)

const suggestions = computed(() => {
  const query = provinceQuery.value.trim().toLowerCase()
  if (!query) return []
  return provinceOptions.value.filter(province => 
    province.toLowerCase().startsWith(query)
  ).slice(0, 5)
})

const selectSuggestion = (province) => {
  provinceQuery.value = province
  showSuggestions.value = false
  searchProvince()
}

const onSearchInput = () => {
  showSuggestions.value = true
}

const hideSuggestions = () => {
  setTimeout(() => {
    showSuggestions.value = false
  }, 200)
}

const userLocation = ref(getStoredLocation())
const locationStatus = ref(userLocation.value ? t('currentLocationDetected') : t('enableLocation'))
const locating = ref(false)

const chipScrollContainer = ref(null)

function getStoredLocation() {
  const stored = readStoredLocation()
  if (!stored) return null
  return { lat: stored.lat, lng: stored.lng }
}

function getSearchHistory() {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveToSearchHistory(province) {
  const history = getSearchHistory().filter((p) => p !== province)
  history.unshift(province)
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, 25)))
}

const normalizeProvinceName = (value) => {
  const raw = String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

  if (!raw) return ''

  const aliases = {
    'banteay meanchey': 'Banteay Meanchey',
    battambang: 'Battambang',
    'kampong cham': 'Kampong Cham',
    'kampong chhnang': 'Kampong Chhnang',
    'kampong speu': 'Kampong Speu',
    'kampong thom': 'Kampong Thom',
    kampot: 'Kampot',
    kandal: 'Kandal',
    kep: 'Kep',
    'koh kong': 'Koh Kong',
    kratie: 'Kratie',
    mondulkiri: 'Mondulkiri',
    'oddar meanchey': 'Oddar Meanchey',
    pailin: 'Pailin',
    'phnom penh': 'Phnom Penh',
    'preah sihanouk': 'Preah Sihanouk',
    sihanoukville: 'Preah Sihanouk',
    'preah vihear': 'Preah Vihear',
    'prey veng': 'Prey Veng',
    pursat: 'Pursat',
    ratanakiri: 'Ratanakiri',
    'siem reap': 'Siem Reap',
    'stung treng': 'Stung Treng',
    'svay rieng': 'Svay Rieng',
    takeo: 'Takeo',
    'tbong khmum': 'Tboung Khmum',
    'tboung khmum': 'Tboung Khmum',
  }

  return aliases[raw] || raw.replace(/\b\w/g, (char) => char.toUpperCase())
}

const extractProvinceFromText = (value) => {
  const normalized = String(value || '').toLowerCase()
  if (!normalized) return ''
  if (normalized.includes('phnom') && normalized.includes('penh')) return 'Phnom Penh'
  if (normalized.includes('preah') && normalized.includes('sihanouk')) return 'Preah Sihanouk'
  if (normalized.includes('sihanoukville')) return 'Preah Sihanouk'


  const flexibleMatches = [
    { province: 'Phnom Penh', patterns: [/phnom[\s\S]{0,160}penh/] },
    { province: 'Preah Sihanouk', patterns: [/preah[\s\S]{0,160}sihanouk/, /sihanoukville/] },
    { province: 'Banteay Meanchey', patterns: [/banteay[\s,/-]*meanchey/] },
    { province: 'Kampong Cham', patterns: [/kampong[\s,/-]*cham/] },
    { province: 'Kampong Chhnang', patterns: [/kampong[\s,/-]*chhnang/] },
    { province: 'Kampong Speu', patterns: [/kampong[\s,/-]*speu/] },
    { province: 'Kampong Thom', patterns: [/kampong[\s,/-]*thom/] },
    { province: 'Koh Kong', patterns: [/koh[\s,/-]*kong/] },
    { province: 'Oddar Meanchey', patterns: [/oddar[\s,/-]*meanchey/] },
    { province: 'Preah Vihear', patterns: [/preah[\s,/-]*vihear/] },
    { province: 'Prey Veng', patterns: [/prey[\s,/-]*veng/] },
    { province: 'Siem Reap', patterns: [/siem[\s,/-]*reap/] },
    { province: 'Stung Treng', patterns: [/stung[\s,/-]*treng/] },
    { province: 'Svay Rieng', patterns: [/svay[\s,/-]*rieng/] },
    { province: 'Tboung Khmum', patterns: [/tboung[\s,/-]*khmum/, /tbong[\s\s]*khmum/] },
  ]

  for (const entry of flexibleMatches) {
    if (entry.patterns.some((pattern) => pattern.test(normalized))) {
      return entry.province
    }
  }

  return CAMBODIA_PROVINCES.find((province) => normalized.includes(province.toLowerCase())) || ''
}

const PROVINCE_BOUNDS = {
  'Phnom Penh': { latMin: 11.48, latMax: 11.62, lngMin: 104.82, lngMax: 104.95 },
  'Kandal': { latMin: 11.20, latMax: 11.55, lngMin: 104.85, lngMax: 105.00 },
  'Siem Reap': { latMin: 13.30, latMax: 13.45, lngMin: 103.80, lngMax: 104.00 },
  'Preah Sihanouk': { latMin: 10.55, latMax: 10.70, lngMin: 103.90, lngMax: 104.05 },
  'Battambang': { latMin: 13.05, latMax: 13.20, lngMin: 103.15, lngMax: 103.35 },
  'Kampot': { latMin: 10.55, latMax: 10.70, lngMin: 104.15, lngMax: 104.30 },
  'Kampong Cham': { latMin: 11.90, latMax: 12.10, lngMin: 105.20, lngMax: 105.50 },
  'Takeo': { latMin: 10.80, latMax: 11.00, lngMin: 104.70, lngMax: 104.90 },
}

const inferProvinceFromCoordinates = (lat, lng) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return ''
  for (const [province, bounds] of Object.entries(PROVINCE_BOUNDS)) {
    if (
      lat >= bounds.latMin &&
      lat <= bounds.latMax &&
      lng >= bounds.lngMin &&
      lng <= bounds.lngMax
    ) {
      return province
    }
  }
  return ''
}

const parseArrayPayload = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  return []
}

const calculateDistanceKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (deg) => (deg * Math.PI) / 180
  const earthRadiusKm = 6371

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c
}

const formatDistance = (km) => {
  if (km === null || km === undefined || !Number.isFinite(km)) return ''
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

const normalizeShop = (shop) => {
  const province = normalizeProvinceName(
    shop?.province ||
      shop?.city?.name ||
      extractProvinceFromText(shop?.location) ||
      extractProvinceFromText(shop?.address) ||
      extractProvinceFromText(shop?.map_url) ||
      inferProvinceFromCoordinates(Number(shop?.latitude), Number(shop?.longitude))
  )

  return {
    id: Number(shop.id),
    name: shop.name || `Shop #${shop.id}`,
    address: shop.address || t('address'),
    province,
    latitude: Number(shop.latitude ?? shop.lat),
    longitude: Number(shop.longitude ?? shop.lng),
    location: shop.location || shop.address || t('address'),
    map_url: shop.map_url || shop.location || shop.address || '',
    status: shop.status || 'active',
    img_url: shop.img_url || '',
    total_reviews: Number(shop.total_reviews || 0),
    vehicleCount: Number(shop.vehicle_count ?? shop.vehicleCount ?? 0),
    vehicleTypes: Array.isArray(shop.vehicle_types) ? shop.vehicle_types : [],
  }
}

const provinceOptions = computed(() => {
  const dynamic = shops.value.map((shop) => shop.province).filter(Boolean)
  return Array.from(new Set([...CAMBODIA_PROVINCES, ...dynamic])).sort((a, b) => a.localeCompare(b))
})

// Province chips randomized with search history priority
const provinceChips = computed(() => {
  const history = getSearchHistory()
  const allProvinces = [...provinceOptions.value]

  // Separate: history provinces first, then shuffle the rest
  const historySet = new Set(history)
  const historyProvinces = history.filter((p) => allProvinces.includes(p))
  const remaining = allProvinces.filter((p) => !historySet.has(p))

  // Shuffle remaining using Fisher-Yates
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[remaining[i], remaining[j]] = [remaining[j], remaining[i]]
  }

  return [ALL_PROVINCES_KEY, ...historyProvinces, ...remaining]
})

const selectedCategory = ref('all')
const loadedImages = ref(new Set())
const onImageLoad = (id) => { loadedImages.value = new Set([...loadedImages.value, id]) }
const activeShopTab = ref(null) // null = show all shops
const categories = computed(() => [
  { key: 'all', label: t('all') },
  { key: 'motorbikes', label: t('motorbikes') },
  { key: 'bicycles', label: t('bicycles') },
  { key: 'cars', label: t('cars') },
])

const vehiclesByShop = (shopId) => provinceVehicles.value.filter(v => v.shop_id === shopId)

const shopVehicleTypeSummary = (shopId) => {
  const list = vehiclesByShop(shopId)
  if (!list.length) return ''
  const counts = {}
  list.forEach((v) => {
    const type = (v.type || '').trim()
    if (!type) return
    counts[type] = (counts[type] || 0) + 1
  })
  return Object.entries(counts)
    .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
    .join(', ')
}

const displayedVehicles = computed(() => {
  let list = provinceVehicles.value
  // Filter by shop tab
  if (activeShopTab.value) {
    list = list.filter(v => v.shop_id === activeShopTab.value)
  }
  // Filter by category
  if (selectedCategory.value !== 'all') {
    const cat = selectedCategory.value.replace(/s$/, '') // motorbikes → motorbike
    list = list.filter(v => v.type.includes(cat))
  }
  return list
})

const goToVehicle = (v) => {
  router.push({ name: 'vehicle-detail', params: { id: String(v.id) } })
}

const selectedProvinceShops = computed(() => {
  let inProvince

  if (isAllMode.value) {
    inProvince = [...shops.value]
  } else {
    const normalized = normalizeProvinceName(selectedProvince.value)
    inProvince = shops.value.filter((shop) => normalizeProvinceName(shop.province) === normalized)
  }

  // Category filter (placeholder - actual vehicle category filtering would need backend data)
  if (selectedCategory.value !== 'all') {
    // In a real app, this would check if the shop has vehicles of this category
  }

  const withDistance = inProvince.map((shop) => {
    let distanceKm = null
    if (userLocation.value && Number.isFinite(shop.latitude) && Number.isFinite(shop.longitude)) {
      distanceKm = calculateDistanceKm(userLocation.value.lat, userLocation.value.lng, shop.latitude, shop.longitude)
    }
    return { ...shop, distanceKm }
  })

  withDistance.sort((a, b) => {
    if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm
    return a.name.localeCompare(b.name)
  })

  return withDistance.map((shop, idx) => ({
    ...shop,
    isNearest: shop.distanceKm !== null && idx === 0,
  }))
})

const findProvinceByInput = (input) => {
  const normalizedInput = normalizeProvinceName(input)
  const exact = provinceOptions.value.find(
    (province) => normalizeProvinceName(province) === normalizeProvinceName(normalizedInput)
  )
  if (exact) return exact
  return provinceOptions.value.find((province) => province.toLowerCase().includes(String(input).toLowerCase())) || ''
}

const searchProvince = () => {
  const query = provinceQuery.value.trim()
  if (!query) {
    searchMessage.value = t('typeProvinceSearch')
    return
  }

  const matched = findProvinceByInput(query)
  if (!matched) {
    searchMessage.value = t('provinceNotFound')
    return
  }

  selectedProvince.value = matched
  provinceQuery.value = matched
  searchMessage.value = t('showingShopsIn', { province: matched })
  saveToSearchHistory(matched)
  activeShopTab.value = null
}

const selectProvince = (province) => {
  if (province === ALL_PROVINCES_KEY) {
    selectedProvince.value = ALL_PROVINCES_KEY
    provinceQuery.value = ''
    searchMessage.value = t('showingAllBranches')
    activeShopTab.value = null
    return
  }
  selectedProvince.value = province
  provinceQuery.value = province
  searchMessage.value = t('showingShopsIn', { province })
  saveToSearchHistory(province)
  activeShopTab.value = null
}

const normalizeType = (raw) => {
  const t = String(raw || '').trim().toLowerCase()
  if (!t) return ''
  if (t.includes('car') || t.includes('suv')) return 'car'
  if (t.includes('bicy')) return 'bicycle'
  if (['motorbike', 'motorbikes', 'motor', 'moto', 'motorcycle', 'motorcycles', 'scooter', 'scooters', 'bike'].some(k => t.includes(k))) {
    return 'motorbike'
  }
  return t
}

const normalizeVehicle = (vehicle) => {
  const parsedPhotos = (() => {
    try {
      if (Array.isArray(vehicle.photos)) return vehicle.photos
      if (typeof vehicle.photos === 'string') return JSON.parse(vehicle.photos)
      return []
    } catch { return [] }
  })()

  let imageUrl = ''
  if (vehicle.image_url_full) imageUrl = vehicle.image_url_full
  else if (vehicle.photo_urls?.length) imageUrl = vehicle.photo_urls[0]
  else if (vehicle.image_url) imageUrl = vehicle.image_url
  else if (parsedPhotos.length) imageUrl = parsedPhotos[0]

  return {
    id: vehicle.id,
    name: vehicle.name || 'Unnamed',
    brand: vehicle.brand || '',
    model: vehicle.model || '',
    type: normalizeType(vehicle.type || vehicle.category || ''),
    price_per_day: Number(vehicle.price_per_day || vehicle.price || 0),
    fuel_type: vehicle.fuel_type || '',
    transmission: vehicle.transmission || '',
    status: vehicle.status || 'Available',
    imageUrl: resolveImageUrl(imageUrl),
    shop_id: Number(vehicle.shop_id),
    rating: Number(vehicle.rating ?? vehicle.average_rating ?? 0)
  }
}

const getApiOrigin = () => {
  try {
    const origin = window.location.origin
    return origin.includes('5173') || origin.includes('3000') ? 'http://127.0.0.1:8000' : origin
  } catch { return 'http://127.0.0.1:8000' }
}

const resolveImageUrl = (value) => {
  if (!value || typeof value !== 'string') return ''
  if (/^(https?:\/\/|data:|blob:)/i.test(value)) return value
  const clean = value.replace(/^\/+/, '')
  const origin = getApiOrigin()
  if (clean.startsWith('storage/')) return `${origin}/${clean}`
  return `${origin}/storage/${clean}`
}

// Map shop_id → shop for quick lookup
const shopMap = computed(() => {
  const map = {}
  shops.value.forEach(s => { map[s.id] = s })
  return map
})

// Vehicles grouped by shop within the selected province
const provinceVehicles = computed(() => {
  let provinceShopIdSet

  if (isAllMode.value) {
    // All shops
    provinceShopIdSet = new Set(shops.value.map(s => s.id))
  } else {
    const normalized = normalizeProvinceName(selectedProvince.value)
    // Get all shop IDs in this province
    const provinceShopIds = shops.value
      .filter(s => normalizeProvinceName(s.province) === normalized)
      .map(s => s.id)
    provinceShopIdSet = new Set(provinceShopIds)
  }

  // Filter vehicles belonging to those shops
  return vehicles.value
    .filter(v => provinceShopIdSet.has(v.shop_id))
    .map(v => ({ ...v, shop: shopMap.value[v.shop_id] || null }))
})

const availableVehiclesCount = computed(() => provinceVehicles.value.filter(v => String(v.status || '').toLowerCase() === 'available').length)

const loadShops = async () => {
  isLoading.value = true
  dataError.value = ''

  try {
    const response = await shopApi.getAll({ active_only: true })
    shops.value = parseArrayPayload(response.data)
      .map((shop) => normalizeShop(shop))
      .filter((shop) => shop.status === 'active')

    if (!isAllMode.value && !shops.value.some((shop) => normalizeProvinceName(shop.province) === normalizeProvinceName(selectedProvince.value))) {
      selectedProvince.value = shops.value[0]?.province || ALL_PROVINCES_KEY
      provinceQuery.value = isAllMode.value ? '' : selectedProvince.value
    }
  } catch (error) {
    console.error(error)
    dataError.value = t('error') + ': ' + t('noBranches')
  } finally {
    isLoading.value = false
  }
}

const loadVehicles = async () => {
  isLoadingVehicles.value = true
  try {
    const response = await vehicleApi.getAll()
    const data = parseArrayPayload(response.data)
    vehicles.value = data.map(normalizeVehicle)
  } catch (error) {
    console.error('Failed to load vehicles:', error)
  } finally {
    isLoadingVehicles.value = false
  }
}

const enableLocation = () => {
  if (locating.value) return
  if (!navigator?.geolocation) {
    locationStatus.value = t('locationNotSupported')
    return
  }

  locating.value = true
  locationStatus.value = t('locationDetecting')


  navigator.geolocation.getCurrentPosition(
    (position) => {
      const nextLocation = {
        lat: Number(position.coords.latitude),
        lng: Number(position.coords.longitude),
      }
      const saved = saveLocationAccess(nextLocation)
      if (!saved) {
        locating.value = false
        locationStatus.value = t('locationCouldNotSave')
        return
      }
      userLocation.value = { lat: saved.lat, lng: saved.lng }
      locationStatus.value = t('locationDetected')
      locating.value = false
    },
    () => {
      locating.value = false
      locationStatus.value = t('locationCouldNotDetect')
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  )
}

const dashboardNavItems = computed(() => [
  { label: t('home'), route: '/view_shop' },
  { label: t('myBookings'), route: '/my-bookings' },
  { label: t('setting'), route: '/user/profile' },
])

const onLogout = async () => {
  await logoutUser()
  router.push('/login')
}

// Province banner images
const provinceBanners = {
  'Phnom Penh': 'https://images.pexels.com/photos/33871002/pexels-photo-33871002.jpeg',
  'Siem Reap': 'https://images.pexels.com/photos/11844578/pexels-photo-11844578.jpeg',
  'Preah Sihanouk': 'https://images.pexels.com/photos/1379944/pexels-photo-1379944.jpeg',
  'Kampot': 'https://images.pexels.com/photos/19525920/pexels-photo-19525920.jpeg',
  'Kep': 'https://images.pexels.com/photos/14774679/pexels-photo-14774679.png',
  'Battambang': 'https://images.pexels.com/photos/33529396/pexels-photo-33529396.jpeg',
  'Mondulkiri': 'https://images.pexels.com/photos/32257927/pexels-photo-32257927.jpeg',
  'Ratanakiri': 'https://images.pexels.com/photos/36416532/pexels-photo-36416532.jpeg',
  'Koh Kong': 'https://images.pexels.com/photos/12001663/pexels-photo-12001663.jpeg',
  'Kratie': 'https://images.pexels.com/photos/19063405/pexels-photo-19063405.jpeg',
  'Kandal': 'https://images.pexels.com/photos/36235065/pexels-photo-36235065.jpeg',
  'Kampong Cham': 'https://images.pexels.com/photos/34809450/pexels-photo-34809450.jpeg',
  'Stung Treng': 'https://images.pexels.com/photos/19063383/pexels-photo-19063383.jpeg',
  'Pursat': 'https://images.pexels.com/photos/34814739/pexels-photo-34814739.png',
  'Prey Veng': 'https://images.pexels.com/photos/34814741/pexels-photo-34814741.png',
  'default': 'https://images.pexels.com/photos/19063354/pexels-photo-19063354.jpeg'
}

const currentBanner = computed(() => isAllMode.value ? provinceBanners['default'] : (provinceBanners[selectedProvince.value] || provinceBanners['default']))

const scrollChips = (direction) => {
  if (chipScrollContainer.value) {
    const scrollAmount = 200
    chipScrollContainer.value.scrollBy({
      left: direction === 'right' ? scrollAmount : -scrollAmount,
      behavior: 'smooth',
    })
  }
}

onMounted(async () => {
  await Promise.all([loadShops(), loadVehicles()])
  provinceQuery.value = isAllMode.value ? '' : selectedProvince.value
})
</script>

<template>
  <MobileCustomerLayout :show-back="false" :show-fab="false">
    <div class="customer-page">
      <UserNavbar
      :nav-items="dashboardNavItems"
      :show-back-button="false"
      :show-fallback-message="false"
      @logout-request="onLogout"
    />

    <main class="customer-main">
      <!-- Hero Banner -->
      <section class="hero-banner-section" :style="{ backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${currentBanner})` }">
        <div class="hero-banner-content">
          <div class="hero-badge">
            <i class="fa-solid fa-map-location-dot"></i>
            <span>{{ isAllMode ? 'Cambodia' : selectedProvince }}</span>
          </div>
          <h1>{{ isAllMode ? $t('allCambodia') : selectedProvince }}</h1>
          <p>{{ isAllMode ? $t('browseAllBranches') : $t('userDashboardDesc') }}</p>
          <div class="hero-stats">
            <div class="hero-stat">
              <span class="hero-stat-value">{{ selectedProvinceShops.length }}</span>
              <span class="hero-stat-label">{{ $t('branches') }}</span>
            </div>
            <div class="hero-stat-divider"></div>
            <div class="hero-stat">
              <span class="hero-stat-value">{{ provinceVehicles.length }}</span>
              <span class="hero-stat-label">{{ $t('vehicles') }}</span>
            </div>
            <div class="hero-stat-divider"></div>
            <div class="hero-stat">
              <span class="hero-stat-value">{{ availableVehiclesCount }}</span>
              <span class="hero-stat-label">{{ $t('available') }}</span>
            </div>
          </div>
        </div>
        <div class="hero-scroll-hint">
          <i class="fa-solid fa-chevron-down"></i>
        </div>
      </section>

      <!-- Search Explorer Card -->
      <section class="search-explorer-section">
        <div class="search-explorer-card">
          <div class="search-card-header">
            <div class="search-card-title">
              <i class="fa-solid fa-magnifying-glass"></i>
              <h3>{{ $t('searchProvince') }}</h3>
            </div>
            <div class="location-status-inline">
              <div class="location-status-box" v-if="locationStatus">
                <i class="fa-solid fa-location-dot"></i>
                <span>{{ locationStatus }}</span>
              </div>
              <button class="location-btn-sm" :disabled="locating" @click="enableLocation">
                <i class="fa-solid fa-crosshairs"></i>
                {{ locating ? $t('detecting') : $t('useMyLocation') }}
              </button>
            </div>
          </div>

          <div class="search-card-body">
            <div class="search-input-row">
              <div class="search-input-container">
                <i class="fa-solid fa-magnifying-glass search-icon"></i>
                <input
                  v-model="provinceQuery"
                  type="text"
                  :placeholder="$t('typeProvinceSearch')"
                  class="search-input"
                  @input="onSearchInput"
                  @keydown.enter="searchProvince"
                  @blur="hideSuggestions"
                  ref="provinceSearchInput"
                />
                <transition name="fade">
                  <div v-if="showSuggestions && suggestions.length" class="suggestions-dropdown">
                    <button
                      v-for="province in suggestions"
                      :key="province"
                      class="suggestion-item"
                      @mousedown.prevent="selectSuggestion(province)"
                    >
                      <i class="fa-solid fa-location-dot"></i>
                      {{ province }}
                    </button>
                  </div>
                </transition>
              </div>
              <button class="province-search-btn" @click="searchProvince" :aria-label="$t('searchProvince')">
                <i class="fa-solid fa-magnifying-glass"></i>
              </button>
            </div>

            <div v-if="searchMessage" class="search-message">{{ searchMessage }}</div>
            <div v-if="dataError" class="error-note">{{ dataError }}</div>

            <!-- Province chips row -->
            <div class="province-chips-row">
              <button class="chip-scroll-btn chip-scroll-left" @click="scrollChips('left')" :aria-label="$t('scrollLeft')">
                <i class="fa-solid fa-chevron-left"></i>
              </button>
              <div ref="chipScrollContainer" class="province-chips-scroll">
                <button
                  v-for="province in provinceChips"
                  :key="province"
                  class="province-chip"
                  :class="{ active: selectedProvince === province }"
                  @click="selectProvince(province)"
                >
                  <span v-if="province === ALL_PROVINCES_KEY" class="province-chip-all-icon">
                    <i class="fa-solid fa-globe"></i>
                  </span>
                  <span class="province-chip-label">
                    {{ province === ALL_PROVINCES_KEY ? $t('all') : province }}
                  </span>
                  <span v-if="province !== ALL_PROVINCES_KEY" class="province-chip-count">
                    {{ shops.filter(s => normalizeProvinceName(s.province) === normalizeProvinceName(province)).length }}
                  </span>
                </button>
              </div>
              <button class="chip-scroll-btn chip-scroll-right" @click="scrollChips('right')" :aria-label="$t('scrollRight')">
                <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Cambodia SVG Map -->
        <div class="map-wrapper">
          <CambodiaMap
            :shops="shops"
            :selectedProvince="selectedProvince"
            @select-province="selectProvince"
          />
        </div>
      </section>

      <!-- Vehicles Results (Grouped by Shop in Province) -->
      <section class="shop-result-section">
        <div class="section-header">
          <div class="section-header-left">
            <h2>{{ isAllMode ? $t('allBranches') : $t('ourBranchesIn', { province: selectedProvince }) }}</h2>
            <span class="vehicle-result-count">{{ provinceVehicles.length }} {{ $t('vehicles') }} {{ $t('across') }} {{ selectedProvinceShops.length }} {{ $t('branches') }}</span>
          </div>
          <div class="category-filters">
            <button
              v-for="cat in categories"
              :key="cat.key"
              class="category-btn"
              :class="{ active: selectedCategory === cat.key }"
              @click="selectedCategory = cat.key"
            >
              {{ cat.label }}
            </button>
          </div>
        </div>

        <p v-if="isLoading || isLoadingVehicles" class="empty-state">{{ $t('findingBranches') }}</p>
        <p v-else-if="selectedProvinceShops.length === 0" class="empty-state">
          {{ isAllMode ? $t('noBranchesAtAll') : $t('noBranchesYet', { province: selectedProvince }) }}
        </p>

        <template v-else>
          <!-- Shop Summary Bar -->
          <div class="province-shops-bar">
            <button
              class="shop-tab"
              :class="{ active: activeShopTab === null }"
              @click="activeShopTab = null"
            >
              <span class="shop-tab-all-icon"><i class="fa-solid fa-th"></i></span>
              <span class="shop-tab-name">{{ $t('all') }}</span>
              <span class="shop-tab-count">{{ provinceVehicles.length }}</span>
            </button>
            <button
              v-for="shop in selectedProvinceShops"
              :key="shop.id"
              class="shop-tab"
              :class="{ active: activeShopTab === shop.id }"
              @click="activeShopTab = shop.id"
            >
              <span class="shop-tab-avatar">
                <img v-if="shop.img_url" :src="shop.img_url" :alt="shop.name" class="shop-tab-img" @error="(e) => e.target.src = '/Images/default-avatar.svg'" />
                <i v-else class="fa-solid fa-store"></i>
              </span>
              <span class="shop-tab-info">
                <span class="shop-tab-name">{{ shop.name }}</span>
                <span v-if="shop.distanceKm !== null && Number.isFinite(shop.distanceKm)" class="shop-tab-distance">
                  <i class="fa-solid fa-location-dot"></i> {{ formatDistance(shop.distanceKm) }}
                </span>
              </span>
              <span v-if="vehiclesByShop(shop.id).length" class="shop-tab-count">{{ vehiclesByShop(shop.id).length }}</span>
              <span v-if="shopVehicleTypeSummary(shop.id)" class="shop-tab-types">{{ shopVehicleTypeSummary(shop.id) }}</span>
            </button>
          </div>

          <!-- Vehicles Grid -->
          <div v-if="provinceVehicles.length === 0" class="empty-state">
            {{ isAllMode ? $t('noBranchesAtAll') : $t('noBranchesYet', { province: selectedProvince }) }}
          </div>
          <div v-else class="vehicle-grid">
            <article
              v-for="v in displayedVehicles"
              :key="v.id"
              class="vehicle-card"
              @click="goToVehicle(v)"
            >
              <div class="vehicle-card-img">
                <!-- Loading Skeleton -->
                <div v-if="v.imageUrl && !loadedImages.has(v.id)" class="vehicle-card-skeleton">
                  <div class="skeleton-pulse"></div>
                </div>
                <img
                  v-if="v.imageUrl"
                  :src="v.imageUrl"
                  :alt="v.name"
                  :class="{ 'img-loaded': loadedImages.has(v.id) }"
                  @load="onImageLoad(v.id)"
                  @error="(e) => { e.target.src = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800'; onImageLoad(v.id) }"
                />
                <div v-else class="vehicle-card-img-placeholder">
                  <i class="fa-solid fa-motorcycle"></i>
                </div>
                <!-- Favorite heart button -->
                <button
                  class="vehicle-card-fav-btn"
                  :class="{ favorited: isFavorite(v.id) }"
                  @click.stop="toggleFavorite($event, v.id)"
                  :aria-label="isFavorite(v.id) ? 'Remove from favorites' : 'Add to favorites'"
                >
                  <i :class="isFavorite(v.id) ? 'fa-solid fa-heart' : 'fa-regular fa-heart'"></i>
                </button>
                <!-- Image gradient overlay for readability -->
                <div class="vehicle-card-img-overlay"></div>
                <!-- Price badge pinned to bottom-left of image -->
                <div class="vehicle-card-price-badge">
                  <span class="price-badge-value">${{ v.price_per_day }}</span>
                  <span class="price-badge-unit">/day</span>
                </div>
                <!-- Status badge -->
                <span class="vehicle-card-status" :class="`status-${String(v.status).toLowerCase()}`">
                  {{ v.status }}
                </span>
                <!-- Hover overlay with quick action -->
                <div class="vehicle-card-hover-overlay">
                  <button class="hover-book-btn" @click.stop="goToVehicle(v)">
                    <i class="fa-solid fa-eye"></i> View Details
                  </button>
                </div>
              </div>
              <div class="vehicle-card-body">
                <div class="vehicle-card-top">
                  <h3>{{ v.name }}</h3>
                  <div class="vehicle-card-shop">
                    <i class="fa-solid fa-store"></i>
                    <span>{{ v.shop?.name || 'Shop' }}</span>
                  </div>
                </div>
                <div class="vehicle-card-meta">
                  <span v-if="v.fuel_type"><i class="fa-solid fa-gas-pump"></i> {{ v.fuel_type }}</span>
                  <span v-if="v.transmission"><i class="fa-solid fa-gear"></i> {{ v.transmission }}</span>
                  <span v-if="v.rating > 0"><i class="fa-solid fa-star"></i> {{ v.rating.toFixed(1) }}</span>
                </div>
              </div>
            </article>
          </div>
        </template>
      </section>
    </main>

    <CommonFooter />
  </div>
  </MobileCustomerLayout>
</template>

<style scoped>
/* ── Hero Banner ── */
.hero-banner-section {
  position: relative;
  min-height: 320px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: flex-end;
  padding: 32px 24px 48px;
  color: #fff;
}
.hero-banner-content {
  position: relative;
  z-index: 2;
  max-width: 720px;
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-radius: 20px;
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.25);
  font-size: 0.78rem;
  font-weight: 600;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.hero-banner-content h1 {
  font-size: 2.6rem;
  font-weight: 800;
  margin: 0 0 10px;
  line-height: 1.15;
  letter-spacing: -0.03em;
  text-shadow: 0 2px 12px rgba(0,0,0,0.35);
}
.hero-banner-content p {
  font-size: 1.05rem;
  opacity: 0.92;
  margin: 0 0 24px;
  line-height: 1.5;
  text-shadow: 0 1px 8px rgba(0,0,0,0.3);
  max-width: 560px;
}
.hero-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.hero-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.hero-stat-value {
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1;
}
.hero-stat-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.85;
}
.hero-stat-divider {
  width: 1px;
  height: 36px;
  background: rgba(255,255,255,0.35);
  border-radius: 1px;
}
.hero-scroll-hint {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  animation: bounce-down 2s ease-in-out infinite;
  opacity: 0.8;
  font-size: 0.9rem;
}
@keyframes bounce-down {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(6px); }
}

/* ── Search Explorer Card ── */
.search-explorer-section {
  margin-top: -28px;
  position: relative;
  z-index: 10;
  padding: 0 20px 28px;
}
.search-explorer-card {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04);
  border: 1px solid #e2e8f0;
  overflow: hidden;
}
.search-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px 14px;
  border-bottom: 1px solid #f1f5f9;
  gap: 12px;
  flex-wrap: wrap;
}
.search-card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ud-primary, #2563eb);
}
.search-card-title i {
  font-size: 1.1rem;
}
.search-card-title h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
}
.location-status-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.location-status-box {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: #475569;
}
.location-status-box i {
  color: #ef4444;
}
.location-btn-sm {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #334155;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.location-btn-sm:hover:not(:disabled) {
  border-color: var(--ud-primary, #2563eb);
  color: var(--ud-primary, #2563eb);
  background: var(--ud-primary-bg, #eff6ff);
}
.location-btn-sm:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.search-card-body {
  padding: 18px 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.search-input-row {
  display: flex;
  gap: 10px;
}
.search-input-container {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 16px;
  color: #94a3b8;
  font-size: 0.95rem;
  pointer-events: none;
  z-index: 2;
}
.search-input {
  width: 100%;
  padding: 14px 44px 14px 44px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  font-size: 0.95rem;
  font-family: inherit;
  outline: none;
  transition: all 0.2s ease;
  background: #f8fafc;
  color: #0f172a;
}
.search-input:focus {
  border-color: var(--ud-primary, #2563eb);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
}
.search-clear-btn {
  position: absolute;
  right: 10px;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: #e2e8f0;
  color: #475569;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  transition: all 0.15s ease;
}
.search-clear-btn:hover {
  background: #cbd5e1;
  color: #1e293b;
}
.suggestions-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06);
  z-index: 50;
  overflow: hidden;
}
.suggestion-item {
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: #fff;
  color: #334155;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background 0.15s ease;
}
.suggestion-item:hover,
.suggestion-item:focus {
  background: var(--ud-primary-bg, #eff6ff);
  color: var(--ud-primary, #2563eb);
  outline: none;
}
.suggestion-item i {
  color: #94a3b8;
  font-size: 0.85rem;
}
.suggestion-item:hover i {
  color: var(--ud-primary, #2563eb);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
.province-search-btn {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  border: none;
  background: var(--ud-primary, #2563eb);
  color: #fff;
  font-size: 1.05rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.province-search-btn:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37,99,235,0.3);
}
.search-message {
  margin: 0;
  font-size: 0.85rem;
  color: #475569;
  font-weight: 500;
}
.error-note {
  margin: 0;
  font-size: 0.85rem;
  color: #dc2626;
}
.province-chips-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.chip-scroll-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.chip-scroll-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}
.province-chips-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
  flex: 1;
}
.province-chips-scroll::-webkit-scrollbar { display: none; }
.province-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #334155;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  font-size: 0.82rem;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}
.province-chip:hover {
  border-color: var(--ud-primary, #2563eb);
  background: var(--ud-primary-bg, #eff6ff);
  color: var(--ud-primary, #2563eb);
}
.province-chip.active {
  border-color: var(--ud-primary, #2563eb);
  background: var(--ud-primary, #2563eb);
  color: #fff;
  box-shadow: 0 2px 8px rgba(37,99,235,0.2);
}
.province-chip-all-icon {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  opacity: 0.85;
}
.province-chip-label {
  font-weight: 600;
}
.province-chip-count {
  font-size: 0.62rem;
  font-weight: 700;
  background: rgba(0,0,0,0.06);
  padding: 1px 8px;
  border-radius: 20px;
  min-width: 20px;
  text-align: center;
  line-height: 1.45;
}
.province-chip.active .province-chip-count {
  background: rgba(255,255,255,0.25);
  color: #fff;
}

/* ── Map Wrapper ── */
.map-wrapper {
  margin-top: 16px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

/* ── Section Header ── */
.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.section-header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.section-header-left h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
}
.vehicle-result-count {
  font-size: 0.88rem;
  color: #64748b;
  font-weight: 500;
}
.category-filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.category-btn {
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}
.category-btn:hover {
  border-color: var(--ud-primary, #2563eb);
  color: var(--ud-primary, #2563eb);
  background: var(--ud-primary-bg, #eff6ff);
}
.category-btn.active {
  background: var(--ud-primary, #2563eb);
  color: #fff;
  border-color: var(--ud-primary, #2563eb);
  box-shadow: 0 2px 8px rgba(37,99,235,0.2);
}

/* ── Province Shop Tabs ── */
.province-shops-bar {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 4px 0 16px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.province-shops-bar::-webkit-scrollbar { display: none; }

.shop-tab {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px 10px 10px;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  background: #fff;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  font-family: inherit;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  position: relative;
}
.shop-tab:hover {
  border-color: var(--ud-primary, #2563eb);
  background: var(--ud-primary-bg, #eff6ff);
  box-shadow: 0 2px 8px rgba(37,99,235,0.08);
  transform: translateY(-1px);
}
.shop-tab.active {
  border-color: var(--ud-primary, #2563eb);
  background: var(--ud-primary, #2563eb);
  color: #fff;
  box-shadow: 0 4px 16px rgba(37,99,235,0.25);
  transform: translateY(0);
}

.shop-tab-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #f1f5f9;
  color: #94a3b8;
  flex-shrink: 0;
  border: 1px solid #f1f5f9;
}
.shop-tab.active .shop-tab-avatar {
  background: rgba(255,255,255,0.2);
  border-color: rgba(255,255,255,0.3);
  color: rgba(255,255,255,0.95);
}
.shop-tab-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shop-tab-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
}
.shop-tab-name {
  font-size: 0.88rem;
  font-weight: 700;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.25;
}
.shop-tab-distance {
  font-size: 0.7rem;
  color: #16a34a;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 3px;
}
.shop-tab.active .shop-tab-distance {
  color: rgba(255,255,255,0.9);
}
.shop-tab-distance i {
  font-size: 0.6rem;
}
.shop-tab-count {
  font-size: 0.72rem;
  font-weight: 700;
  background: #f1f5f9;
  color: #475569;
  padding: 3px 10px;
  border-radius: 20px;
  min-width: 22px;
  text-align: center;
  line-height: 1.4;
}
.shop-tab.active .shop-tab-count {
  background: rgba(255,255,255,0.2);
  color: #fff;
}
.shop-tab-types {
  font-size: 0.62rem;
  color: #64748b;
  line-height: 1.3;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.shop-tab.active .shop-tab-types {
  color: rgba(255,255,255,0.85);
}
.shop-tab-all-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.9rem;
  flex-shrink: 0;
  border: 1px solid #f1f5f9;
}
.shop-tab.active .shop-tab-all-icon {
  background: rgba(255,255,255,0.2);
  color: #fff;
  border-color: rgba(255,255,255,0.3);
}

/* ── Vehicle Card Grid ── */
.vehicle-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.vehicle-card {
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.vehicle-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 50px rgba(0,0,0,0.12);
  border-color: var(--ud-primary, #2563eb);
}

.vehicle-card-img {
  position: relative;
  height: 220px;
  background: #f1f5f9;
  overflow: hidden;
}
.vehicle-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease;
  opacity: 0;
}
.vehicle-card-img img.img-loaded {
  opacity: 1;
}
.vehicle-card:hover .vehicle-card-img img.img-loaded {
  transform: scale(1.08);
}
.vehicle-card-img-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3.5rem;
  color: #cbd5e1;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
}

/* ── Image Gradient Overlay ── */
.vehicle-card-img-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(0,0,0,0.45) 0%,
    rgba(0,0,0,0.12) 45%,
    transparent 65%
  );
  pointer-events: none;
  z-index: 1;
}

/* ── Price Badge on Image ── */
.vehicle-card-price-badge {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 4;
  display: flex;
  align-items: baseline;
  gap: 3px;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(6px);
  padding: 5px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
}
.price-badge-value {
  font-size: 1.15rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
}
.price-badge-unit {
  font-size: 0.68rem;
  color: rgba(255,255,255,0.85);
  font-weight: 600;
}

/* ── Image Loading Skeleton ── */
.vehicle-card-skeleton {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}
.skeleton-pulse {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    #f1f5f9 25%,
    #e2e8f0 50%,
    #f1f5f9 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}
@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.vehicle-card-status {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  z-index: 4;
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255,255,255,0.2);
}
.status-available {
  background: rgba(220, 252, 231, 0.95);
  color: #16a34a;
}
.status-rented {
  background: rgba(254, 243, 199, 0.95);
  color: #d97706;
}
.status-maintenance {
  background: rgba(254, 226, 226, 0.95);
  color: #dc2626;
}

/* ── Hover Overlay ── */
.vehicle-card-hover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 5;
  backdrop-filter: blur(1px);
}
.vehicle-card:hover .vehicle-card-hover-overlay {
  opacity: 1;
}
.hover-book-btn {
  padding: 12px 28px;
  border-radius: 12px;
  border: none;
  background: rgba(255,255,255,0.95);
  color: #1e293b;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 8px;
  transform: translateY(10px);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 6px 20px rgba(0,0,0,0.18);
  border: 1px solid rgba(255,255,255,0.4);
}
.vehicle-card:hover .hover-book-btn {
  transform: translateY(0);
}
.hover-book-btn:hover {
  background: #fff;
  transform: scale(1.05);
  box-shadow: 0 8px 24px rgba(0,0,0,0.22);
}
.hover-book-btn i {
  font-size: 0.95rem;
}

.vehicle-card-body {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.vehicle-card-top h3 {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0 0 4px;
  color: #0f172a;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-line-orient: vertical;
  overflow: hidden;
}
.vehicle-card-shop {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 500;
}
.vehicle-card-shop i {
  color: var(--ud-primary, #2563eb);
  font-size: 0.72rem;
}

.vehicle-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
}
.vehicle-card-meta span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  color: #475569;
  background: #f8fafc;
  padding: 4px 10px;
  border-radius: 8px;
  font-weight: 500;
  border: 1px solid #f1f5f9;
}
.vehicle-card-meta i {
  font-size: 0.68rem;
  color: #94a3b8;
}
.vehicle-card-meta span i.fa-star {
  color: #f59e0b;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .hero-banner-section {
    min-height: 260px;
    padding: 24px 18px 36px;
  }
  .hero-banner-content h1 {
    font-size: 2rem;
  }
  .hero-stats {
    gap: 12px;
  }
  .hero-stat-value {
    font-size: 1.25rem;
  }
  .search-explorer-section {
    margin-top: -20px;
    padding: 0 14px 20px;
  }
  .search-card-header {
    padding: 14px 18px 12px;
  }
  .search-card-body {
    padding: 14px 18px 16px;
  }
  .province-shops-bar {
    gap: 8px;
    padding-bottom: 12px;
  }
  .shop-tab {
    padding: 8px 12px 8px 8px;
    gap: 8px;
  }
  .shop-tab-name {
    font-size: 0.8rem;
    max-width: 80px;
  }
  .shop-tab-avatar,
  .shop-tab-all-icon {
    width: 30px;
    height: 30px;
  }
  .vehicle-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .vehicle-card-img {
    height: 200px;
  }
  .section-header {
    flex-direction: column;
    gap: 12px;
  }
}
@media (max-width: 480px) {
  .hero-banner-section {
    min-height: 220px;
    padding: 20px 16px 28px;
  }
  .hero-banner-content h1 {
    font-size: 1.7rem;
  }
  .hero-banner-content p {
    font-size: 0.9rem;
  }
  .vehicle-card-img {
    height: 190px;
  }
  .vehicle-card-body {
    padding: 14px 16px;
  }
  .shop-tab-name {
    max-width: 60px;
  }
}
</style>
