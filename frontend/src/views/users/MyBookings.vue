<script setup>
import { computed, ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { vehicleService, userService } from '../../services/database.js'
import CommonFooter from '../../components/CommonFooter.vue'
import UserNavbar from '@/components/UserNavbar.vue'
import '../../css/MyBookings.css'
import '@/css/customer-responsive.css'

const router = useRouter()
const route = useRoute()

const navItems = [
  { label: 'Home', route: '/view_shop' },
  { label: 'My Bookings', route: '/my-bookings' },
  { label: 'Profile', route: '/user/profile' }
]

const activeNavLabel = computed(() => {
  const matchedItem = navItems.find((item) => item.route && route.path.startsWith(item.route))
  return matchedItem?.label || 'My Bookings'
})

const handleLogout = async () => {
  await userService.logout()
  router.push('/login')
}

const activeTab = ref('all')
const searchQuery = ref('')
const visibleCount = ref(4)
const showDetailModal = ref(false)
const detailLoading = ref(false)
const cancelModal = ref({
  visible: false,
  booking: null
})
const cancelLoading = ref(false)
const cancelError = ref('')
const detailError = ref('')
const selectedBooking = ref(null)
const selectedVehicle = ref(null)

const bookings = ref([])
const loading = ref(true)
const error = ref('')
// Load skipped ratings from localStorage
const loadSkippedRatings = () => {
  try {
    const stored = localStorage.getItem('ratingSkipped')
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

// Save skipped ratings to localStorage
const saveSkippedRatings = (data) => {
  try {
    localStorage.setItem('ratingSkipped', JSON.stringify(data))
  } catch {
    // Ignore storage errors
  }
}

const ratingSkipped = reactive(loadSkippedRatings())
const ratingStars = [1, 2, 3, 4, 5]
const ratingOverlay = ref({
  visible: false,
  booking: null
})
const overlayRatingValue = ref(0)
const overlayComment = ref('')
const overlayLoading = ref(false)
const overlayError = ref('')
const pollingTimer = ref(null)
const normalizeStatus = (status) => {
  if (status === null || status === undefined) return ''
  return String(status).toLowerCase().trim()
}

const isCompletedStatus = (status) => {
  const normalized = normalizeStatus(status)
  return normalized === 'completed' || normalized === 'complete'
}

const isBookingCompleted = (booking) => isCompletedStatus(booking?.status)
const bookingStatusMap = ref({})
const initialLoadDone = ref(false)

const getStoredToken = () => localStorage.getItem('auth_token') || localStorage.getItem('token') || ''

const getStoredUserRole = () => {
  const userStr = localStorage.getItem('user')
  if (!userStr) return null

  try {
    return JSON.parse(userStr)?.role ?? null
  } catch {
    return null
  }
}

const fetchBookings = async () => {
  loading.value = true
  error.value = ''
  try {
    const token = getStoredToken()
    const headers = { Accept: 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    
    const response = await fetch('/api/my-bookings', { headers })
    if (!response.ok) {
      throw new Error('Failed to fetch bookings')
    }
    const raw = await response.json()
    const parsed = Array.isArray(raw) ? raw : raw.data || []
    bookings.value = parsed.map((entry) => {
      const vehicle = entry.vehicle || entry.vehicle_details || {}
      const vehicleName =
        entry.vehicle_name ||
        entry.vehicle?.name ||
        vehicle.name ||
        `${vehicle.brand || ''} ${vehicle.model || ''}`
          .trim()
          .replace(/\s+/g, ' ')
      const shop = entry.shop || entry.shop_details || {}
      return {
        ...entry,
        vehicle_name: vehicleName || 'Vehicle',
        shop_name: entry.shop_name || shop.name || 'N/A',
      }
    })
    handleBookingStatusUpdates(bookings.value)
  } catch (e) {
    error.value = e.message || 'Unable to load bookings'
    console.error('Error fetching bookings:', e)
  } finally {
    loading.value = false
  }
}

const POLL_INTERVAL_MS = 15000


const startBookingPolling = () => {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
  }
  fetchBookings()
  pollingTimer.value = setInterval(fetchBookings, POLL_INTERVAL_MS)
}

const activeMenuId = ref(null)

const toggleMenu = (event, bookingId) => {
  event.stopPropagation()
  if (activeMenuId.value === bookingId) {
    activeMenuId.value = null
  } else {
    activeMenuId.value = bookingId
  }
}

const closeAllMenus = () => {
  activeMenuId.value = null
}

const handleClickOutside = (event) => {
  if (!event.target.closest('.card-menu-container')) {
    closeAllMenus()
  }
}

onMounted(() => {
  startBookingPolling()
  window.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
  window.removeEventListener('click', handleClickOutside)
})

const filteredBookings = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return bookings.value.filter((b) => {
    const statusMatch = activeTab.value === 'all' || b.status === activeTab.value
    if (!statusMatch) return false
    if (!q) return true

    const haystack = [
      getBookingVehicleName(b),
      b.booking_code,
      b.shop_name,
      b.status,
      formatDate(b.start_date),
      formatDate(b.end_date),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(q)
  })
})

const displayedBookings = computed(() => {
  return filteredBookings.value.slice(0, visibleCount.value)
})

const hasMoreBookings = computed(() => {
  return filteredBookings.value.length > visibleCount.value
})

const showMore = () => {
  visibleCount.value += 4
}

const showLess = () => {
  visibleCount.value = 4
}

const resetVisibleCount = () => {
  visibleCount.value = 4
}

// Reset visible count when filters change
watch([activeTab, searchQuery], () => {
  resetVisibleCount()
})

const getStatusClass = (status) => {
  const statusMap = {
    pending: 'status-pending',
    confirmed: 'status-confirmed',
    completed: 'status-completed',
    cancelled: 'status-cancelled',
  }
  return statusMap[status?.toLowerCase()] || 'status-pending'
}

const getStatusLabel = (status) => {
  const labels = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }
  return labels[status?.toLowerCase()] || 'Pending'
}

const paymentStatusLabelMap = {
  paid: 'Paid',
  completed: 'Paid',
  settled: 'Paid',
  captured: 'Paid',
  pending: 'Unpaid',
  failed: 'Failed',
  refunded: 'Refunded'
}

const normalizePaymentStatus = (status) => (status || '').toString().trim().toLowerCase()

const getPaymentStatusLabel = (status) => {
  const normalized = normalizePaymentStatus(status)
  return paymentStatusLabelMap[normalized] || 'Unpaid'
}

const getPaymentStatusClass = (status) => {
  const normalized = normalizePaymentStatus(status)
  if (['paid', 'completed', 'settled', 'captured'].includes(normalized)) {
    return 'payment-pill--paid'
  }
  if (normalized === 'failed') {
    return 'payment-pill--failed'
  }
  if (normalized === 'refunded') {
    return 'payment-pill--refunded'
  }
  return 'payment-pill--pending'
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatCurrency = (value) => {
  const amount = Number(value || 0)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const getTotalDays = (start, end) => {
  if (!start || !end) return 0
  const startDate = new Date(start)
  const endDate = new Date(end)
  const diffTime = Math.abs(endDate - startDate)
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1
}

const getBookingImage = (booking) => {
  if (!booking) return ''
  return booking.vehicle_image || booking.image_url || booking.image || ''
}

const getBookingVehicleName = (booking) => {
  const explicitName = String(booking?.vehicle_custom_name || booking?.name || '').trim()
  if (explicitName) return explicitName

  const fallbackName = [
    booking?.vehicle_brand || booking?.brand,
    booking?.vehicle_model || booking?.model,
  ]
    .filter((part) => String(part || '').trim())
    .join(' ')
    .trim()

  if (fallbackName) return fallbackName

  const legacyName = String(booking?.vehicle_name || '').trim()
  return legacyName && legacyName !== 'N/A' ? legacyName : 'Unnamed Vehicle'
}


const normalizeVehicle = (vehicle) => {
  if (!vehicle) return null
  return {
    id: vehicle.id || null,
    name: vehicle.name || '',
    brand: vehicle.brand || '',
    model: vehicle.model || '',
    category: vehicle.category || vehicle.type || '',
    year: vehicle.year || '',
    fuel_type: vehicle.fuel_type || vehicle.fuel || '',
    transmission: vehicle.transmission || '',
    seats: vehicle.seats || '',
    plate: vehicle.plate_number || vehicle.plate || '',
    price_per_day: Number(vehicle.price_per_day || vehicle.price || 0),
    status: vehicle.status || '',
    image_url: vehicle.image_url || vehicle.image || '',
    description: vehicle.description || '',
  }
}

const fetchVehicleFromApi = async (id) => {
  const token = getStoredToken()
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`/api/vehicles/${id}`, { headers })
  if (!response.ok) {
    throw new Error('Failed to load vehicle from API')
  }
  const data = await response.json()
  return normalizeVehicle(data?.data || data)
}

const closeDetails = () => {
  showDetailModal.value = false
  selectedBooking.value = null
  selectedVehicle.value = null
  detailError.value = ''
}

const openCancelModal = (booking) => {
  cancelModal.value = {
    visible: true,
    booking
  }
  cancelError.value = ''
}

const closeCancelModal = () => {
  cancelModal.value = {
    visible: false,
    booking: null
  }
  cancelError.value = ''
}

const confirmCancelBooking = async () => {
  const booking = cancelModal.value.booking
  if (!booking?.id) return

  cancelLoading.value = true
  cancelError.value = ''

  try {
    const token = getStoredToken()
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(`/api/bookings/${booking.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status: 'cancelled' })
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || data.error || 'Failed to cancel booking')
    }

    // Update the booking in the local list
    bookings.value = bookings.value.map((b) =>
      b.id === booking.id ? { ...b, status: 'cancelled' } : b
    )

    closeCancelModal()
  } catch (err) {
    cancelError.value = err.message || 'Unable to cancel booking'
  } finally {
    cancelLoading.value = false
  }
}

const goHome = () => {
  const role = getStoredUserRole()

  if (role === 'admin') {
    router.push({ name: 'admin-dashboard' })
    return
  }

  if (role === 'shop_owner') {
    router.push({ name: 'dashboard' })
    return
  }

  router.push({ name: 'view_shop' })
}

const handleBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    goHome()
  }
}

const openDetails = async (booking) => {
  selectedBooking.value = booking
  selectedVehicle.value = null
  detailError.value = ''
  detailLoading.value = true

  try {
    const vehicleId = Number(booking?.vehicle_id || 0)
    if (vehicleId) {
      try {
        selectedVehicle.value = await fetchVehicleFromApi(vehicleId)
      } catch {
        selectedVehicle.value = normalizeVehicle(await vehicleService.getVehicle(vehicleId))
      }
    } else {
      detailError.value = 'Vehicle ID not found for this booking.'
    }
  } catch {
    detailError.value = 'Unable to load vehicle details.'
  } finally {
    detailLoading.value = false
    showDetailModal.value = true
  }
}

const detailTitle = computed(() => {
  if (selectedVehicle.value?.name) {
    return selectedVehicle.value.name
  }
  if (selectedVehicle.value?.brand || selectedVehicle.value?.model) {
    return `${selectedVehicle.value.brand || ''} ${selectedVehicle.value.model || ''}`.trim()
  }
  return getBookingVehicleName(selectedBooking.value)
})

const detailDays = computed(() => {
  if (!selectedBooking.value) return 1
  return getTotalDays(selectedBooking.value.start_date, selectedBooking.value.end_date) || 1
})


const detailPricePerDay = computed(() => {
  const fromVehicle = Number(selectedVehicle.value?.price_per_day || 0)
  if (fromVehicle > 0) return fromVehicle
  const total = Number(selectedBooking.value?.total_price || 0)
  const days = Number(detailDays.value || 1)
  return days > 0 ? total / days : total
})

const detailTotalAmount = computed(() => Number(selectedBooking.value?.total_price || 0))

const getAuthHeaders = () => {
  const token = getStoredToken()
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

const openRatingOverlay = (booking) => {
  overlayRatingValue.value = 0
  overlayComment.value = ''
  overlayError.value = ''
  overlayLoading.value = false
  ratingOverlay.value = {
    visible: true,
    booking
  }
}

const closeRatingOverlay = (markSkip = false) => {
  const bookingId = ratingOverlay.value.booking?.id
  ratingOverlay.value = {
    visible: false,
    booking: null
  }
  overlayRatingValue.value = 0
  overlayComment.value = ''
  overlayError.value = ''
  overlayLoading.value = false
  if (markSkip && bookingId) {
    ratingSkipped[bookingId] = true
  }
}

const maybeShowRatingOverlay = () => {
  if (ratingOverlay.value.visible) return
  const nextBooking = bookings.value.find(
    (b) => isBookingCompleted(b) && !b.rating && !ratingSkipped[b.id]
  )
  if (nextBooking) {
    openRatingOverlay(nextBooking)
  }
}

const handleBookingStatusUpdates = (allBookings) => {
  const previousStatuses = { ...bookingStatusMap.value }
  
  // Find bookings that just changed to completed status
  const newlyCompleted = initialLoadDone.value
    ? allBookings.find((booking) => {
        const prevStatus = previousStatuses[booking.id]
        return (
          !isCompletedStatus(prevStatus) &&
          isCompletedStatus(booking.status) &&
          !booking.rating &&
          !ratingSkipped[booking.id]
        )
      })
    : null

  bookingStatusMap.value = allBookings.reduce((map, booking) => {
    map[booking.id] = booking.status
    return map
  }, {})

  if (!initialLoadDone.value) {
    initialLoadDone.value = true
    // Show rating immediately for already completed bookings that haven't been rated/skipped
    maybeShowRatingOverlay()
    return
  }

  // Show rating when booking status changes TO completed
  if (newlyCompleted) {
    openRatingOverlay(newlyCompleted)
  }
  // Don't keep prompting for other completed bookings
}

const selectOverlayRating = (value) => {
  overlayRatingValue.value = value
  overlayError.value = ''
}

const submitRating = async () => {
  const booking = ratingOverlay.value.booking
  if (!booking?.id) return

  if (!overlayRatingValue.value) {
    overlayError.value = 'Please choose 1-5 stars'
    return
  }

  overlayLoading.value = true
  overlayError.value = ''

  try {
    const response = await fetch(`/api/bookings/${booking.id}/rating`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        rating: overlayRatingValue.value,
        comment: overlayComment.value || ''
      })
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      overlayError.value = data.message || data.error || 'Unable to submit rating'
      return
    }

    const data = await response.json()
    markBookingRated(booking, data)
    closeRatingOverlay()
    // Don't call maybeShowRatingOverlay() - rating is optional, don't prompt for more
  } catch (err) {
    overlayError.value = err.message || 'Unable to submit rating'
  } finally {
    overlayLoading.value = false
  }
}

const markBookingRated = (booking, ratingData) => {
  if (!booking?.id) return
  ratingSkipped[booking.id] = true
  saveSkippedRatings(ratingSkipped) // Persist to localStorage
  bookings.value = bookings.value.map((b) =>
    b.id === booking.id ? { ...b, rating: ratingData } : b
  )
}


const skipRating = () => {
  const booking = ratingOverlay.value.booking
  if (!booking?.id) return
  ratingSkipped[booking.id] = true
  saveSkippedRatings(ratingSkipped) // Persist to localStorage
  closeRatingOverlay()
  // Don't call maybeShowRatingOverlay() - stop prompting after skip
}

</script>

<template>
  <UserNavbar
    :nav-items="navItems"
    :active-label="activeNavLabel"
    :show-fallback-message="false"
    @logout-request="handleLogout"
  />

  <div class="bookings-page">
    <!-- Back Button -->
    <div class="bookings-back-bar">
      <button class="btn-back-top" @click="handleBack">
        <i class="fa-solid fa-arrow-left"></i>
        <span>Back</span>
      </button>
    </div>

    <section class="bookings-panel">
      <div class="panel-head">
        <div class="panel-head-text">
          <h1>My Bookings</h1>
          <p>View and manage your vehicle rentals.</p>
        </div>
      </div>

      <div class="controls-row">
        <div class="tabs-row">
          <button class="tab-btn" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">All Bookings</button>
          <button class="tab-btn" :class="{ active: activeTab === 'pending' }" @click="activeTab = 'pending'">Pending</button>
          <button class="tab-btn" :class="{ active: activeTab === 'confirmed' }" @click="activeTab = 'confirmed'">Confirmed</button>
          <button class="tab-btn" :class="{ active: activeTab === 'completed' }" @click="activeTab = 'completed'">Completed</button>
          <button class="tab-btn" :class="{ active: activeTab === 'cancelled' }" @click="activeTab = 'cancelled'">Cancelled</button>
        </div>

        <div class="search-row">
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="Search booking, shop, status, or date..."
          />
          <button type="button" class="search-btn" aria-label="Search">
            <svg class="search-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7"></circle>
              <line x1="16.65" y1="16.65" x2="21" y2="21"></line>
            </svg>
          </button>
        </div>
      </div>
    </section>

    <section class="booking-list-wrap">
      <div class="booking-list-header">
        <span class="booking-list-title">Bookings</span>
        <!-- <button class="bookings-home-btn" type="button" @click="goHome">
          Back to Home
        </button> -->
      </div>
      <div v-if="loading" class="empty-state">
        Loading bookings...
      </div>
      <div v-else-if="error" class="empty-state" style="color: red;">
        {{ error }}
      </div>
      <div v-else-if="filteredBookings.length === 0" class="empty-state">
        No bookings found for your search.
      </div>
      <article v-for="booking in displayedBookings" :key="booking.id" class="booking-card">
        <div class="booking-image">
          <img :src="getBookingImage(booking)" :alt="getBookingVehicleName(booking)" class="vehicle-img" />
        </div>


        <div class="booking-info">
          <div class="booking-header">
            <h3 class="vehicle-name">{{ getBookingVehicleName(booking) }}</h3>
            <div class="card-top-right">
              <span :class="['status-pill', getStatusClass(booking.status)]">{{ getStatusLabel(booking.status) }}</span>
              
              <div class="card-menu-container">
                <button class="menu-trigger" @click.stop="toggleMenu($event, booking.id)">
                  <i class="fa-solid fa-ellipsis-vertical"></i>
                </button>
                <div v-if="activeMenuId === booking.id" class="menu-dropdown">
                  <button class="menu-item" @click="openDetails(booking)">
                    <i class="fa-solid fa-eye"></i>
                    View Details
                  </button>
                  <button 
                    v-if="booking.status === 'pending' || booking.status === 'confirmed'" 
                    class="menu-item danger" 
                    @click="openCancelModal(booking)"
                  >
                    <i class="fa-solid fa-xmark"></i>
                    Cancel Booking
                  </button>
                  <button 
                    v-if="isBookingCompleted(booking) && !booking.rating" 
                    class="menu-item" 
                    @click="openRatingOverlay(booking)"
                  >
                    <i class="fa-solid fa-star"></i>
                    Rate Vehicle
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p><span class="meta-label">Booking ID:</span> {{ booking.booking_code }}</p>
          <p><span class="meta-label">Shop:</span> {{ booking.shop_name }}</p>
          <p>
            <span class="meta-label">Date:</span>
            {{ formatDate(booking.start_date) }} to {{ formatDate(booking.end_date) }}
            ({{ getTotalDays(booking.start_date, booking.end_date) }} days)
          </p>
          <p>
            <span class="meta-label">Payment:</span>
            <span class="payment-pill" :class="getPaymentStatusClass(booking.payment_status)">
              {{ getPaymentStatusLabel(booking.payment_status) }}
            </span>
          </p>
        </div>

        <div class="booking-price">
          <span class="price-value">{{ formatCurrency(booking.total_price) }}</span>
          <div v-if="booking.rating" class="rating-stars-right" aria-label="Rated stars">
            <span
              v-for="star in ratingStars"
              :key="`history-star-${booking.id}-${star}`"
              class="rating-star"
              :class="{ filled: booking.rating.rating >= star }"
            >
              ★
            </span>
          </div>
        </div>
      </article>
      
      <div class="see-more-container">
        <button v-if="hasMoreBookings" class="see-more-btn" type="button" @click="showMore">
          See More ({{ filteredBookings.length - visibleCount }} more)
        </button>
        <button v-else-if="visibleCount > 4" class="see-more-btn" type="button" @click="showLess">
          Show Less
        </button>
      </div>
    </section>

    <div v-if="showDetailModal" class="detail-overlay" @click.self="closeDetails">
      <div class="detail-modal">
        <button class="detail-close" type="button" @click="closeDetails" aria-label="Close details">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <line x1="6" y1="6" x2="18" y2="18"></line>
            <line x1="18" y1="6" x2="6" y2="18"></line>
          </svg>
        </button>


        <div v-if="detailError" class="detail-state detail-error">{{ detailError }}</div>
        <div v-else-if="selectedVehicle" class="detail-content detail-grid-layout">
          <div class="detail-left">
            <div class="detail-image-wrap detail-image-main">
              <img
                class="detail-image"
                :src="getBookingImage(selectedBooking) || selectedVehicle.image_url"
                :alt="detailTitle"
              />
            </div>
            
            <div class="history-section">
              <h3 class="history-title">
                <i class="fa-solid fa-clock-rotate-left"></i>
                Booking History
              </h3>
              <div class="history-timeline">
                <div v-for="log in selectedBooking?.booking_status_logs" :key="log.id" class="history-item">
                  <div class="history-dot" :class="{ active: log.status === selectedBooking.status }"></div>
                  <div class="history-content">
                    <span class="history-status">{{ getStatusLabel(log.status) }}</span>
                    <span class="history-time">{{ formatDate(log.changed_at) }}</span>
                  </div>
                </div>
                <!-- Fallback if no logs -->
                <div v-if="!selectedBooking?.booking_status_logs?.length" class="history-item">
                  <div class="history-dot active"></div>
                  <div class="history-content">
                    <span class="history-status">Created</span>
                    <span class="history-time">{{ formatDate(selectedBooking?.created_at) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="detail-rating-row" v-if="selectedBooking?.rating?.rating">
              <span class="detail-rating-label">Rating</span>
              <strong>{{ selectedBooking.rating.rating.toFixed(1) }}</strong>
              <div class="detail-rating-stars">
                <span
                  v-for="star in 5"
                  :key="`rating-${star}`"
                  :class="{ filled: star <= Math.round(selectedBooking.rating.rating) }"
                >★</span>
              </div>
            </div>
          </div>

          <div class="detail-right">
            <div class="detail-title-row">
              <div>
                <h2>{{ detailTitle }}</h2>
                <p class="detail-booking-code">{{ selectedBooking?.booking_code || `BK-${selectedBooking?.id || ''}` }}</p>
              </div>
              <span class="detail-status-badge" :class="getStatusClass(selectedBooking?.status)">
                {{ getStatusLabel(selectedBooking?.status) }}
              </span>
            </div>

            <div class="detail-price-row">
              <div class="detail-total-box">
                <span>Total</span>
                <strong>{{ formatCurrency(detailTotalAmount) }}</strong>
              </div>
              <div>
                <p class="detail-price-label">Price per day</p>
                <strong class="detail-price">{{ formatCurrency(detailPricePerDay) }}</strong>
                <span class="detail-price-suffix">USD</span>
              </div>
            </div>

            <div class="detail-section detail-section--compact">
              <div class="detail-row"><span>Status</span><strong>{{ getStatusLabel(selectedBooking?.status) }}</strong></div>
              <div class="detail-row"><span>Shop</span><strong>{{ selectedBooking?.shop_name || 'N/A' }}</strong></div>
              <div class="detail-row"><span>Rental Date</span><strong>{{ formatDate(selectedBooking?.start_date) }} - {{ formatDate(selectedBooking?.end_date) }}</strong></div>
              <div class="detail-row"><span>Duration</span><strong>{{ detailDays }} day(s)</strong></div>
            </div>


            <div class="detail-section detail-section--full">
              <div class="detail-grid detail-grid--info">
                <div class="detail-item detail-item--info">
                  <span>Type</span>
                  <strong>{{ selectedVehicle.category || 'N/A' }}</strong>
                </div>
                <div class="detail-item detail-item--info">
                  <span>Brand</span>
                  <strong>{{ selectedVehicle.brand || 'N/A' }}</strong>
                </div>
                <div class="detail-item detail-item--info">
                  <span>Fuel</span>
                  <strong>{{ selectedVehicle.fuel_type || 'N/A' }}</strong>
                </div>
                <div class="detail-item detail-item--info">
                  <span>Transmission</span>
                  <strong>{{ selectedVehicle.transmission || 'N/A' }}</strong>
                </div>
                <div class="detail-item detail-item--info">
                  <span>Plate</span>
                  <strong>{{ selectedVehicle.plate || selectedVehicle.plate_number || 'N/A' }}</strong>
                </div>
                <div class="detail-item detail-item--info">
                  <span>Status</span>
                  <strong>{{ selectedVehicle.status || 'N/A' }}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>


    <div
      v-if="ratingOverlay.visible && isBookingCompleted(ratingOverlay.booking)"
      class="rating-overlay-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Rate your completed booking"
      @click.self="skipRating"
    >
    <div class="rating-alert-card">
      <div class="rating-alert-hero">
        <div class="rating-alert-icon">
          <i class="fa-solid fa-star"></i>
        </div>
      </div>
      <p class="rating-alert-title">Rate your experience</p>
      <p class="rating-alert-subtitle">
        {{ getBookingVehicleName(ratingOverlay.booking) || 'Your rental' }} finished successfully.
      </p>
      <div class="rating-alert-stars">
        <button
          v-for="star in ratingStars"
          :key="`overlay-${star}`"
          type="button"
          :class="{ active: overlayRatingValue >= star }"
          @click="selectOverlayRating(star)"
        >
          ★
        </button>
      </div>
      <textarea
        v-model="overlayComment"
        class="rating-alert-comment"
        rows="3"
        placeholder="Tell us what you enjoyed or how we can improve"
      ></textarea>
      <div class="rating-alert-actions">
        <button
          type="button"
          class="rating-alert-submit"
          :disabled="overlayLoading"
          @click="submitRating"
        >
          {{ overlayLoading ? 'Submitting...' : 'Submit' }}
        </button>
        <button type="button" class="rating-alert-skip" @click="skipRating">
          No, thanks
        </button>
      </div>
      <p v-if="overlayError" class="rating-alert-error">{{ overlayError }}</p>
    </div>
  </div>


  <!-- Cancel Booking Modal -->
  <div v-if="cancelModal.visible" class="cancel-modal-backdrop" @click.self="closeCancelModal">
    <div class="cancel-modal-card">
      <div class="cancel-modal-header">
        <h2>Cancel Booking</h2>
        <button type="button" class="cancel-modal-close" @click="closeCancelModal">
          &times;
        </button>
      </div>
      <div class="cancel-modal-body">
        <p>Are you sure you want to cancel this booking?</p>
        <div class="cancel-modal-details">
          <p><strong>Vehicle:</strong> {{ getBookingVehicleName(cancelModal.booking) }}</p>
          <p><strong>Booking ID:</strong> {{ cancelModal.booking?.booking_code }}</p>
          <p><strong>Date:</strong> {{ formatDate(cancelModal.booking?.start_date) }} to {{ formatDate(cancelModal.booking?.end_date) }}</p>
          <p><strong>Total:</strong> {{ formatCurrency(cancelModal.booking?.total_price) }}</p>
        </div>
        <p class="cancel-warning">Note: Cancellation may be subject to the shop's refund policy.</p>
        <p v-if="cancelError" class="cancel-error">{{ cancelError }}</p>
      </div>
      <div class="cancel-modal-actions">
        <button type="button" class="cancel-modal-cancel" @click="closeCancelModal">
          Keep Booking
        </button>
        <button 
          type="button" 
          class="cancel-modal-confirm" 
          :disabled="cancelLoading"
          @click="confirmCancelBooking"
        >
          {{ cancelLoading ? 'Cancelling...' : 'Yes, Cancel Booking' }}
        </button>
      </div>
    </div>
  </div>
  
  <CommonFooter />
</template>
