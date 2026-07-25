<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ratingApi, shopApi, vehicleApi } from '@/services/api'
import { haversineDistanceKm, getUserSavedLocation } from '@/utils/shopLocation'
import UserNavbar from '@/components/UserNavbar.vue'
import CommonFooter from '@/components/CommonFooter.vue'
import MobileCustomerLayout from '@/components/MobileCustomerLayout.vue'

const route = useRoute()
const router = useRouter()

const vehicle = ref(null)
const shop = ref(null)
const loading = ref(true)
const error = ref(null)

const selectedImageIdx = ref(0)
const pickupDate = ref('')
const dropoffDate = ref('')
const includeInsurance = ref(true)

// ── Helpers ──

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'
const API_ROOT = API_BASE_URL.replace(/\/api\/?$/, '')

const resolveImage = (url) => {
  if (!url || typeof url !== 'string') return ''
  if (/^(https?:\/\/|data:|blob:)/i.test(url)) return url
  const clean = url.replace(/^\/+/, '')
  if (clean.startsWith('storage/')) return `${API_ROOT}/${clean}`
  return `${API_ROOT}/storage/${clean}`
}

const getVehicleImages = () => {
  const v = vehicle.value
  if (!v) return []
  const urls = []
  // photo_urls array from backend
  if (v.photo_urls && Array.isArray(v.photo_urls)) {
    v.photo_urls.forEach(u => { if (u) urls.push(resolveImage(u)) })
  }
  // image_url_full or image_url
  const single = v.image_url_full || v.image_url
  if (single && !urls.includes(resolveImage(single))) urls.push(resolveImage(single))
  // photos JSON field
  if (v.photos) {
    try {
      const parsed = typeof v.photos === 'string' ? JSON.parse(v.photos) : v.photos
      if (Array.isArray(parsed)) {
        parsed.forEach(u => {
          const r = resolveImage(u)
          if (r && !urls.includes(r)) urls.push(r)
        })
      }
    } catch { /* ignore */ }
  }
  if (!urls.length) {
    urls.push('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800')
  }
  return urls
}

const images = computed(() => getVehicleImages())
const mainImage = computed(() => images.value[selectedImageIdx.value] || images.value[0] || '')

const minDate = computed(() => new Date().toISOString().split('T')[0])

const days = computed(() => {
  if (!pickupDate.value || !dropoffDate.value) return 0
  const s = new Date(pickupDate.value)
  const e = new Date(dropoffDate.value)
  const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
})

const dailyRate = computed(() => Number(vehicle.value?.price_per_day || vehicle.value?.price || 0))
const subtotal = computed(() => days.value * dailyRate.value)
const insuranceFee = computed(() => Number(vehicle.value?.insurance_fee || 5))
const insurance = computed(() => includeInsurance.value ? insuranceFee.value : 0)
const totalAmount = computed(() => subtotal.value + insurance.value)

const shopRating = computed(() => {
  if (!shop.value) return null
  const r = Number(shop.value?.average_rating ?? shop.value?.rating ?? 0)
  return r > 0 ? r.toFixed(1) : null
})

const shopAddress = computed(() => {
  if (!shop.value) return ''
  return shop.value?.address || shop.value?.location || shop.value?.city?.name || ''
})

const shopPhoneClean = computed(() => {
  if (!shop.value?.phone) return ''
  const digits = String(shop.value.phone).replace(/[^\d]/g, '')
  if (digits.startsWith('0')) return '855' + digits.slice(1)
  return digits
})

const userLocation = computed(() => getUserSavedLocation())

const shopDistanceText = computed(() => {
  const s = shop.value
  if (!s) return ''
  const lat = Number(s.latitude)
  const lng = Number(s.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return ''
  const ul = userLocation.value
  if (!ul) return ''
  const km = haversineDistanceKm(ul.lat, ul.lng, lat, lng)
  if (km < 1) return `${Math.round(km * 1000)} m away`
  if (km < 10) return `${km.toFixed(1)} km away`
  return `${Math.round(km)} km away`
})

// ── Map URL ──

const mapEmbedUrl = computed(() => {
  const s = shop.value
  if (!s) return ''
  const lat = Number(s.latitude)
  const lng = Number(s.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return ''
  // OpenStreetMap embed with marker pin
  const padding = 0.01
  const minLat = lat - padding
  const maxLat = lat + padding
  const minLng = lng - padding
  const maxLng = lng + padding
  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng},${minLat},${maxLng},${maxLat}&layer=mapnik&marker=${lat},${lng}`
})

const googleMapsUrl = computed(() => {
  const s = shop.value
  if (!s) return ''
  const lat = Number(s.latitude)
  const lng = Number(s.longitude)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://www.google.com/maps?q=${lat},${lng}`
  }
  if (s.address) return `https://www.google.com/maps/search/${encodeURIComponent(s.address)}`
  return ''
})

// ── Actions ──

const selectImage = (idx) => { selectedImageIdx.value = idx }

const bookNow = () => {
  if (!pickupDate.value || !dropoffDate.value) {
    // Auto-select dates if not chosen
    const today = new Date()
    const tom = new Date(today)
    tom.setDate(tom.getDate() + 1)
    pickupDate.value = today.toISOString().split('T')[0]
    dropoffDate.value = tom.toISOString().split('T')[0]
  }
  // Navigate to booking page with all params
  const params = {
    id: route.params.id,
    startDate: pickupDate.value,
    endDate: dropoffDate.value,
    includeInsurance: includeInsurance.value ? '1' : '0',
    insuranceFee: String(insuranceFee.value)
  }
  router.push({ name: 'booking', params: { id: route.params.id }, query: params })
}

const goBack = () => router.back()

// ── Related Vehicles ──

const relatedVehicles = ref([])
const relatedLoading = ref(false)

const loadRelatedVehicles = async (shopId, excludeId) => {
  if (!shopId) return
  relatedLoading.value = true
  try {
    const resp = await vehicleApi.getAll()
    const all = resp?.data?.data || resp?.data || []
    relatedVehicles.value = all
      .filter(v => Number(v.shop_id) === Number(shopId) && Number(v.id) !== Number(excludeId))
      .slice(0, 8)
      .map(v => ({
        id: v.id,
        name: v.name || `${v.brand || ''} ${v.model || ''}`.trim() || 'Vehicle',
        type: v.type || '',
        price: Number(v.price_per_day || v.price || 0),
        image: resolveImage(v.image_url_full || v.image_url || ''),
        status: v.status || 'Available'
      }))
  } catch (e) {
    console.warn('Failed to load related vehicles:', e)
  } finally {
    relatedLoading.value = false
  }
}

// ── Ratings ──

const ratings = ref([])
const ratingsLoading = ref(false)
const avgRating = ref(0)
const totalRatings = ref(0)

const ratingDistribution = computed(() => {
  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  ratings.value.forEach(r => {
    const star = Math.round(Number(r.rating))
    if (star >= 1 && star <= 5) dist[star]++
  })
  return dist
})

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return dateStr }
}

const loadRatings = async (vehicleId) => {
  ratingsLoading.value = true
  try {
    const resp = await ratingApi.getVehicleSummary(vehicleId)
    const data = resp?.data || []
    if (data.length > 0) {
      const summary = data[0]
      avgRating.value = Number(summary.average_rating || 0)
      totalRatings.value = Number(summary.total_ratings || 0)
      ratings.value = (summary.ratings || []).slice(0, 20)
    }
  } catch (e) {
    console.warn('Failed to load ratings:', e)
  } finally {
    ratingsLoading.value = false
  }
}

// ── Load Data ──

onMounted(async () => {
  const vehicleId = Number(route.params.id)
  if (!vehicleId || !Number.isFinite(vehicleId)) {
    error.value = 'Invalid vehicle ID'
    loading.value = false
    return
  }

  try {
    // Fetch vehicle
    const vResp = await vehicleApi.getById(vehicleId)
    const vData = vResp?.data?.data || vResp?.data || null
    if (!vData) throw new Error('Vehicle not found')
    vehicle.value = vData

    // Fetch shop data
    const shopId = Number(vData.shop_id || vData.shop?.id)
    if (shopId) {
      try {
        const sResp = await shopApi.getById(shopId)
        shop.value = sResp?.data?.data || sResp?.data || null
      } catch {
        // fallback: try to find shop from list
        try {
          const allResp = await shopApi.getAll()
          const allShops = allResp?.data?.data || allResp?.data || []
          shop.value = allShops.find(s => Number(s.id) === shopId) || null
        } catch { /* ignore */ }
      }
    }

    // Init dates
    const today = new Date()
    const tom = new Date(today)
    tom.setDate(tom.getDate() + 1)
    pickupDate.value = today.toISOString().split('T')[0]
    dropoffDate.value = tom.toISOString().split('T')[0]

    // Load ratings
    loadRatings(vehicleId)

    // Load related vehicles from same shop
    loadRelatedVehicles(shopId, vehicleId)
  } catch (e) {
    console.error('Failed to load vehicle:', e)
    error.value = e?.response?.data?.message || e.message || 'Failed to load vehicle details'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <MobileCustomerLayout :show-back="false" :show-fab="false">
    <div class="vehicle-detail-page">

      <!-- ── Back Button Bar (visible on all screens) ── -->
      <div class="detail-back-bar">
        <button class="btn-back" @click="goBack">
          <i class="fa-solid fa-arrow-left"></i>
          <span>Back</span>
        </button>
      </div>

      <!-- ── Loading ── -->
      <div v-if="loading" class="state-box">
        <div class="loading-spinner" />
        <p>Loading vehicle details...</p>
      </div>

      <!-- ── Error ── -->
      <div v-else-if="error" class="state-box error-state">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <p>{{ error }}</p>
        <button class="btn-primary" @click="goBack">Go Back</button>
      </div>

      <!-- ── Main Content ── -->
      <template v-else-if="vehicle">
        <div class="detail-layout">
          <!-- Left Column: Images + Map -->
          <div class="detail-left">
            <!-- Main Image -->
            <div class="main-image-wrap">
              <img :src="mainImage" :alt="vehicle.name || 'Vehicle'" class="main-image" />
              <span class="vehicle-status-badge" :class="'status-' + String(vehicle.status || '').toLowerCase()">
                {{ vehicle.status || 'Available' }}
              </span>
            </div>

            <!-- Thumbnail Strip -->
            <div v-if="images.length > 1" class="thumb-strip">
              <button
                v-for="(img, idx) in images"
                :key="idx"
                class="thumb-btn"
                :class="{ active: idx === selectedImageIdx }"
                @click="selectImage(idx)"
              >
                <img :src="img" :alt="'Photo ' + (idx + 1)" />
              </button>
            </div>

            <!-- Shop Location Map -->
            <div v-if="mapEmbedUrl" class="map-card">
              <div class="map-card-header">
                <i class="fa-solid fa-location-dot"></i>
                <span>{{ shop?.name || 'Shop Location' }}</span>
              </div>
              <div class="map-embed-wrap">
                <iframe
                  :src="mapEmbedUrl"
                  width="100%"
                  height="240"
                  style="border: 0; border-radius: 12px;"
                  loading="lazy"
                  referrerpolicy="no-referrer-when-downgrade"
                  title="Shop location map"
                ></iframe>
              </div>
              <a v-if="googleMapsUrl" :href="googleMapsUrl" target="_blank" rel="noopener" class="map-directions-link">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> Open in Google Maps
              </a>
            </div>
          </div>

          <!-- Right Column: Info + Booking -->
          <div class="detail-right">
            <!-- Vehicle Info -->
            <div class="vehicle-head">
              <h1 class="vehicle-title">{{ vehicle.name || `${vehicle.brand || ''} ${vehicle.model || ''}` }}</h1>
              <div class="vehicle-meta-tags">
                <span v-if="vehicle.type" class="meta-tag">{{ vehicle.type }}</span>
                <span v-if="vehicle.brand" class="meta-tag">{{ vehicle.brand }}</span>
                <span v-if="vehicle.transmission" class="meta-tag">{{ vehicle.transmission }}</span>
                <span v-if="vehicle.fuel_type" class="meta-tag">{{ vehicle.fuel_type }}</span>
              </div>
            </div>

            <!-- Price Display -->
            <div class="price-block">
              <span class="price-value">${{ dailyRate }}</span>
              <span class="price-unit">/ day</span>
            </div>

            <!-- Shop Info Bar -->
            <div v-if="shop" class="shop-info-bar">
              <div class="shop-info-left">
                <div class="shop-avatar-mini">
                  <img
                    v-if="shop.img_url_full || shop.img_url"
                    :src="shop.img_url_full || shop.img_url"
                    :alt="shop.name"
                    @error="e => e.target.style.display = 'none'"
                  />
                  <i v-else class="fa-solid fa-store"></i>
                </div>
                <div class="shop-info-text">
                  <strong>{{ shop.name }}</strong>
                  <span v-if="shopAddress" class="shop-address-mini">
                    <i class="fa-solid fa-location-dot"></i> {{ shopAddress }}
                  </span>
                  <span v-if="shopDistanceText" class="shop-distance-mini">
                    <i class="fa-solid fa-route"></i> {{ shopDistanceText }}
                  </span>
                  <span v-if="shop.phone" class="shop-phone-mini">
                    <i class="fa-solid fa-phone"></i> {{ shop.phone }}
                  </span>
                </div>
              </div>
              <div class="shop-info-actions">
                <div class="shop-rating-badge" v-if="shopRating">
                  <i class="fa-solid fa-star"></i> {{ shopRating }}
                </div>
                <div v-if="shop.phone" class="shop-contact-btns">
                  <a
                    :href="`https://wa.me/${shopPhoneClean}`"
                    target="_blank"
                    rel="noopener"
                    class="contact-btn whatsapp-btn"
                    title="Chat on WhatsApp"
                  >
                    <i class="fa-brands fa-whatsapp"></i>
                  </a>
                  <a
                    :href="`tel:${shop.phone}`"
                    class="contact-btn phone-btn"
                    title="Call shop"
                  >
                    <i class="fa-solid fa-phone"></i>
                  </a>
                </div>
              </div>
            </div>

            <!-- Quick Booking Pane -->
            <div class="booking-pane">
              <h3 class="pane-title">Quick Booking</h3>

              <div class="date-row">
                <div class="date-field">
                  <label>Pick-up</label>
                  <input
                    type="date"
                    v-model="pickupDate"
                    :min="minDate"
                    class="date-input"
                  />
                </div>
                <div class="date-arrow">
                  <i class="fa-solid fa-arrow-right"></i>
                </div>
                <div class="date-field">
                  <label>Drop-off</label>
                  <input
                    type="date"
                    v-model="dropoffDate"
                    :min="pickupDate || minDate"
                    class="date-input"
                  />
                </div>
              </div>

              <!-- Insurance Toggle -->
              <label class="insurance-toggle">
                <input type="checkbox" v-model="includeInsurance" />
                <span class="toggle-track">
                  <span class="toggle-thumb"></span>
                </span>
                <span class="toggle-label">Include Insurance (${{ insuranceFee }}/day)</span>
              </label>

              <!-- Price Breakdown -->
              <div v-if="days > 0" class="price-breakdown">
                <div class="breakdown-row">
                  <span>${{ dailyRate }} x {{ days }} day{{ days > 1 ? 's' : '' }}</span>
                  <span>${{ subtotal.toFixed(2) }}</span>
                </div>
                <div v-if="insurance > 0" class="breakdown-row">
                  <span>Insurance</span>
                  <span>${{ insurance.toFixed(2) }}</span>
                </div>
                <div class="breakdown-row total-row">
                  <span>Total</span>
                  <span class="total-amount">${{ totalAmount.toFixed(2) }}</span>
                </div>
              </div>
              <p v-else class="select-dates-hint">Select pickup & drop-off dates to see price</p>

              <!-- CTA Buttons -->
              <div class="cta-buttons">
                <button class="btn-book-now" @click="bookNow">
                  <i class="fa-solid fa-calendar-check"></i>
                  Book Now — ${{ totalAmount.toFixed(2) }}
                </button>
              </div>
            </div>

            <!-- Specs Grid -->
            <div class="specs-grid">
              <div v-if="vehicle.plate_number" class="spec-item">
                <span class="spec-label">Plate</span>
                <span class="spec-value">{{ vehicle.plate_number }}</span>
              </div>
              <div v-if="vehicle.total_vehicles" class="spec-item">
                <span class="spec-label">Available</span>
                <span class="spec-value">{{ vehicle.total_vehicles }} unit{{ vehicle.total_vehicles > 1 ? 's' : '' }}</span>
              </div>
              <div v-if="vehicle.rider_details" class="spec-item">
                <span class="spec-label">Riders</span>
                <span class="spec-value">{{ vehicle.rider_details }}</span>
              </div>
              <div v-if="vehicle.taxes_fee" class="spec-item">
                <span class="spec-label">Taxes fee</span>
                <span class="spec-value">${{ Number(vehicle.taxes_fee).toFixed(2) }}</span>
              </div>
            </div>

            <!-- Description -->
            <div v-if="vehicle.description" class="description-block">
              <h3>About this vehicle</h3>
              <p>{{ vehicle.description }}</p>
            </div>

            <!-- ── Reviews Section ── -->
            <div class="reviews-section">
              <div class="reviews-header">
                <h3>
                  <i class="fa-solid fa-star" style="color: #f59e0b;"></i>
                  Reviews
                </h3>
                <span v-if="!ratingsLoading && totalRatings > 0" class="reviews-summary-badge">
                  {{ avgRating.toFixed(1) }} · {{ totalRatings }} review{{ totalRatings > 1 ? 's' : '' }}
                </span>
              </div>

              <!-- Rating Distribution Bars -->
              <div v-if="totalRatings > 0" class="rating-distribution">
                <div v-for="star in [5,4,3,2,1]" :key="star" class="dist-row">
                  <span class="dist-label">{{ star }}<i class="fa-solid fa-star"></i></span>
                  <div class="dist-bar-bg">
                    <div
                      class="dist-bar-fill"
                      :style="{ width: (totalRatings > 0 ? (ratingDistribution[star] / totalRatings) * 100 : 0) + '%' }"
                    ></div>
                  </div>
                  <span class="dist-count">{{ ratingDistribution[star] }}</span>
                </div>
              </div>

              <!-- Loading -->
              <div v-if="ratingsLoading" class="reviews-loading">
                <div class="loading-spinner-sm" />
                <span>Loading reviews...</span>
              </div>

              <!-- No reviews -->
              <div v-else-if="totalRatings === 0" class="reviews-empty">
                <i class="fa-regular fa-message"></i>
                <p>No reviews yet for this vehicle.</p>
              </div>

              <!-- Review List -->
              <div v-else class="review-list">
                <div v-for="review in ratings" :key="review.id" class="review-item">
                  <div class="review-avatar">
                    <img
                      v-if="review.user_profile_picture"
                      :src="review.user_profile_picture"
                      :alt="review.user_name"
                      @error="e => e.target.style.display = 'none'"
                    />
                    <i v-else class="fa-regular fa-user"></i>
                  </div>
                  <div class="review-body">
                    <div class="review-top">
                      <strong class="review-author">{{ review.user_name || 'Anonymous' }}</strong>
                      <span class="review-date">{{ formatDate(review.created_at) }}</span>
                    </div>
                    <div class="review-stars">
                      <i
                        v-for="s in 5"
                        :key="s"
                        :class="[
                          'fa-solid fa-star',
                          { 'star-filled': s <= Math.round(Number(review.rating)), 'star-empty': s > Math.round(Number(review.rating)) }
                        ]"
                      ></i>
                    </div>
                    <p v-if="review.comment" class="review-comment">
                      {{ review.comment }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ── Related Vehicles ── -->
      <div class="related-section" v-if="!loading && vehicle">
        <template v-if="relatedLoading">
          <div class="related-header">
            <h3>More from this shop</h3>
          </div>
          <div class="related-loading">
            <div class="loading-spinner-sm" />
            <span>Loading similar vehicles...</span>
          </div>
        </template>
        <template v-else-if="relatedVehicles.length > 0">
          <div class="related-header">
            <h3>More from {{ shop?.name || 'this shop' }}</h3>
            <span class="related-count">{{ relatedVehicles.length }} vehicle{{ relatedVehicles.length > 1 ? 's' : '' }}</span>
          </div>
          <div class="related-scroll">
            <div
              v-for="rv in relatedVehicles"
              :key="rv.id"
              class="related-card"
              @click="router.push({ name: 'vehicle-detail', params: { id: String(rv.id) } })"
            >
              <div class="related-card-img">
                <img :src="rv.image" :alt="rv.name" @error="e => e.target.src = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=400'" />
                <span class="related-card-status" :class="'status-' + String(rv.status).toLowerCase()">
                  {{ rv.status }}
                </span>
              </div>
              <div class="related-card-body">
                <strong class="related-card-name">{{ rv.name }}</strong>
                <span v-if="rv.type" class="related-card-type">{{ rv.type }}</span>
                <div class="related-card-price">
                  <span class="related-price-value">${{ rv.price }}</span>
                  <span class="related-price-unit">/day</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </MobileCustomerLayout>
</template>

<style scoped>
.vehicle-detail-page {
  min-height: 100vh;
  background: #f8fafc;
  padding: 0 0 40px;
}

/* ── Loading / Error ── */
.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
  color: #475569;
}
.state-box p { font-size: 1rem; }
.error-state { color: #dc2626; }
.error-state i { font-size: 2.5rem; }
.loading-spinner {
  width: 40px; height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.btn-primary {
  padding: 10px 24px;
  border: none;
  border-radius: 10px;
  background: #2563eb;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

/* ── Back Button Bar ── */
.detail-back-bar {
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 20px 0;
}
.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  border-radius: 10px;
  background: #fff;
  color: #475569;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.btn-back:hover {
  background: #f8fafc;
  color: #2563eb;
  transform: translateX(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.btn-back i {
  font-size: 0.85rem;
}

@media (max-width: 767px) {
  .detail-back-bar {
    padding: 8px 12px 0;
  }
  .btn-back {
    padding: 6px 12px;
    font-size: 0.85rem;
    background: transparent;
    box-shadow: none;
  }
  .btn-back:hover {
    background: rgba(0,0,0,0.04);
  }
}

/* ── Layout ── */
.detail-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 20px;
}

@media (max-width: 900px) {
  .detail-layout { grid-template-columns: 1fr; gap: 24px; padding: 16px 12px; }
}

/* ── Left: Images + Map ── */
.detail-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.main-image-wrap {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  background: #f1f5f9;
  aspect-ratio: 4 / 3;
}
.main-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.vehicle-status-badge {
  position: absolute;
  top: 12px; right: 12px;
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.status-available, .status-active { background: #dcfce7; color: #16a34a; }
.status-rented { background: #fef3c7; color: #d97706; }
.status-maintenance, .status-inactive { background: #fee2e2; color: #dc2626; }

/* Thumbnails */
.thumb-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 0;
}
.thumb-btn {
  flex-shrink: 0;
  width: 72px;
  height: 54px;
  border-radius: 10px;
  border: 2px solid transparent;
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  transition: border-color 0.2s;
  background: #e2e8f0;
}
.thumb-btn:hover { border-color: #93c5fd; }
.thumb-btn.active { border-color: #2563eb; }
.thumb-btn img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Map Card */
.map-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}
.map-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-weight: 600;
  font-size: 0.9rem;
  color: #0f172a;
  border-bottom: 1px solid #f1f5f9;
}
.map-card-header i { color: #2563eb; }
.map-embed-wrap { line-height: 0; }
.map-directions-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  font-size: 0.82rem;
  color: #2563eb;
  text-decoration: none;
  border-top: 1px solid #f1f5f9;
  font-weight: 500;
}
.map-directions-link:hover { background: #f8fafc; }

/* ── Right: Info + Booking ── */
.detail-right {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.vehicle-head { }
.vehicle-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 8px;
  line-height: 1.2;
}
.vehicle-meta-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.meta-tag {
  padding: 4px 12px;
  border-radius: 20px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 0.78rem;
  font-weight: 600;
}

/* Price */
.price-block {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.price-value {
  font-size: 2.2rem;
  font-weight: 800;
  color: #2563eb;
}
.price-unit {
  font-size: 1rem;
  color: #64748b;
  font-weight: 500;
}

/* Shop Info Bar */
.shop-info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 14px 16px;
  gap: 12px;
}
.shop-info-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.shop-avatar-mini {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  color: #94a3b8;
  font-size: 1.2rem;
}
.shop-avatar-mini img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.shop-info-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.shop-info-text strong {
  font-size: 0.95rem;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.shop-address-mini,
.shop-phone-mini,
.shop-distance-mini {
  font-size: 0.78rem;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 4px;
}
.shop-address-mini i,
.shop-phone-mini i,
.shop-distance-mini i {
  color: #2563eb;
  font-size: 0.7rem;
}
.shop-info-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.shop-rating-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 20px;
  background: #fef3c7;
  color: #92400e;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}
.shop-rating-badge i { color: #f59e0b; }

.shop-contact-btns {
  display: flex;
  gap: 6px;
}
.contact-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  text-decoration: none;
  font-size: 1.05rem;
  transition: all 0.2s ease;
  cursor: pointer;
}
.whatsapp-btn {
  background: #25d366;
  color: #fff;
}
.whatsapp-btn:hover {
  background: #1da851;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(37, 211, 102, 0.35);
}
.phone-btn {
  background: #2563eb;
  color: #fff;
}
.phone-btn:hover {
  background: #1d4ed8;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
}

/* Booking Pane */
.booking-pane {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px;
}
.pane-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 16px;
}

.date-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}
.date-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.date-field label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
}
.date-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dbe3f1;
  border-radius: 10px;
  font-size: 0.9rem;
  font-family: inherit;
  color: #0f172a;
  background: #fff;
  box-sizing: border-box;
}
.date-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}
.date-arrow {
  padding-bottom: 10px;
  color: #94a3b8;
  font-size: 1rem;
}

/* Insurance Toggle */
.insurance-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  cursor: pointer;
  user-select: none;
}
.insurance-toggle input {
  position: absolute;
  opacity: 0;
  width: 0; height: 0;
}
.toggle-track {
  position: relative;
  width: 40px; height: 22px;
  background: #cbd5e1;
  border-radius: 11px;
  transition: background 0.2s;
  flex-shrink: 0;
}
.toggle-thumb {
  position: absolute;
  top: 2px; left: 2px;
  width: 18px; height: 18px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
.insurance-toggle input:checked + .toggle-track {
  background: #2563eb;
}
.insurance-toggle input:checked + .toggle-track .toggle-thumb {
  transform: translateX(18px);
}
.toggle-label {
  font-size: 0.85rem;
  color: #475569;
  font-weight: 500;
}

/* Price Breakdown */
.price-breakdown {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.breakdown-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.88rem;
  color: #475569;
}
.breakdown-row.total-row {
  padding-top: 10px;
  border-top: 1px dashed #dbe3f1;
  font-weight: 700;
  font-size: 1rem;
  color: #0f172a;
}
.total-amount {
  color: #2563eb;
  font-size: 1.2rem;
  font-weight: 800;
}

.select-dates-hint {
  margin-top: 14px;
  font-size: 0.85rem;
  color: #94a3b8;
  text-align: center;
}

/* CTA */
.cta-buttons {
  margin-top: 16px;
}
.btn-book-now {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: transform 0.15s, box-shadow 0.2s;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
}
.btn-book-now:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35);
}
.btn-book-now:active {
  transform: translateY(0);
}

/* Specs Grid */
.specs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}
.spec-item {
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: 10px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.spec-label {
  font-size: 0.72rem;
  color: #94a3b8;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.spec-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
}

/* Description */
.description-block {
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: 14px;
  padding: 16px;
}
.description-block h3 {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 8px;
  color: #0f172a;
}
.description-block p {
  font-size: 0.9rem;
  color: #475569;
  line-height: 1.6;
  margin: 0;
}

/* ── Reviews Section ── */
.reviews-section {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px;
}
.reviews-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.reviews-header h3 {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 6px;
}
.reviews-summary-badge {
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
  background: #f8fafc;
  padding: 4px 12px;
  border-radius: 20px;
  white-space: nowrap;
}

/* Distribution */
.rating-distribution {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 18px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
}
.dist-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dist-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
  min-width: 28px;
  display: flex;
  align-items: center;
  gap: 3px;
}
.dist-label i { font-size: 0.65rem; color: #f59e0b; }
.dist-bar-bg {
  flex: 1;
  height: 6px;
  background: #f1f5f9;
  border-radius: 3px;
  overflow: hidden;
}
.dist-bar-fill {
  height: 100%;
  background: #f59e0b;
  border-radius: 3px;
  transition: width 0.4s ease;
}
.dist-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  min-width: 20px;
  text-align: right;
}

/* Loading */
.reviews-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 0;
  color: #94a3b8;
  font-size: 0.88rem;
  justify-content: center;
}
.loading-spinner-sm {
  width: 18px; height: 18px;
  border: 2px solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* Empty */
.reviews-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 0;
  color: #94a3b8;
}
.reviews-empty i { font-size: 1.5rem; }
.reviews-empty p { font-size: 0.88rem; margin: 0; }

/* Review List */
.review-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.review-item {
  display: flex;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid #f8fafc;
}
.review-item:last-child { border-bottom: none; padding-bottom: 0; }
.review-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #94a3b8;
  overflow: hidden;
  font-size: 1rem;
}
.review-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.review-body {
  flex: 1;
  min-width: 0;
}
.review-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.review-author {
  font-size: 0.88rem;
  color: #0f172a;
}
.review-date {
  font-size: 0.72rem;
  color: #94a3b8;
}
.review-stars {
  display: flex;
  gap: 2px;
  margin: 4px 0 6px;
}
.review-stars i {
  font-size: 0.78rem;
}
.star-filled {
  color: #f59e0b;
}
.star-empty {
  color: #e2e8f0;
}
.review-comment {
  font-size: 0.85rem;
  color: #475569;
  line-height: 1.5;
  margin: 0;
}

/* ── Related Vehicles Section ── */
.related-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px 32px;
}
.related-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.related-header h3 {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0;
  color: #0f172a;
}
.related-count {
  font-size: 0.82rem;
  color: #64748b;
  font-weight: 500;
}

.related-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 24px 0;
  color: #94a3b8;
  font-size: 0.88rem;
  justify-content: center;
}

.related-scroll {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
  padding-bottom: 8px;
}
.related-scroll::-webkit-scrollbar {
  height: 6px;
}
.related-scroll::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}
.related-scroll::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
.related-scroll::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.related-card {
  min-width: 200px;
  max-width: 220px;
  flex-shrink: 0;
  scroll-snap-align: start;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}
.related-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  border-color: #93c5fd;
}

.related-card-img {
  position: relative;
  height: 130px;
  background: #f1f5f9;
  overflow: hidden;
}
.related-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.related-card-status {
  position: absolute;
  top: 8px; right: 8px;
  padding: 3px 10px;
  border-radius: 16px;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.related-card-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.related-card-name {
  font-size: 0.88rem;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.related-card-type {
  font-size: 0.72rem;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 6px;
  align-self: flex-start;
}
.related-card-price {
  display: flex;
  align-items: baseline;
  gap: 2px;
}
.related-price-value {
  font-size: 1.05rem;
  font-weight: 800;
  color: #2563eb;
}
.related-price-unit {
  font-size: 0.72rem;
  color: #94a3b8;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .vehicle-title { font-size: 1.35rem; }
  .price-value { font-size: 1.8rem; }
  .specs-grid { grid-template-columns: repeat(2, 1fr); }
  .shop-info-bar { flex-direction: column; align-items: flex-start; }
}
@media (max-width: 480px) {
  .date-row { flex-direction: column; align-items: stretch; }
  .date-arrow { display: none; }
  .thumb-btn { width: 56px; height: 42px; }
  .booking-pane { padding: 16px; }
}
</style>
