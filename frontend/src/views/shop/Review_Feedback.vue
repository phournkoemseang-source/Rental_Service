<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import { feedbackApi, ratingApi } from '@/services/api'
import { getSessionUser } from '@/services/auth'
import '../../css/Feedback.css'

const toast = useToast()

const props = defineProps({
  shopId: {
    type: [String, Number],
    default: null
  }
})

const loading = ref(true)
const error = ref(null)
const activeTab = ref('feedback') // 'feedback' or 'vehicles'

// Feedback data
const feedback = ref([])
const newReply = ref('')
const selected = ref(null)

// Vehicle ratings data
const vehicleRatings = ref([])
const vehicleLoading = ref(true)
const vehicleError = ref(null)

// Fetch feedback from database
const fetchFeedback = async () => {
  try {
    loading.value = true
    // Pass shop_id if available
    const params = props.shopId ? { shop_id: props.shopId } : {}
    const response = await feedbackApi.getAll(params)
    const data = response.data.data || response.data || []
    
    // Map database fields to expected format
    feedback.value = data.map(f => ({
      id: f.id,
      shop_id: f.shop_id,
      customer: f.user_name || f.user_id || 'Anonymous',
      customerProfilePicture: f.user_profile_picture || null,
      date: f.created_at ? new Date(f.created_at).toLocaleDateString('en-GB') : '',
      rating: f.rating || 0,
      ratingCount: f.rating_count ?? 1,
      vehicleName: f.vehicle_name || f.subject || 'Vehicle',
      comment: f.message || f.subject || '',
      reply: f.admin_reply || ''
    }))
  } catch (err) {
    console.error('Error fetching feedback:', err)
    error.value = 'Failed to load feedback data'
  } finally {
    loading.value = false
  }
}

// Fetch vehicle ratings
const fetchVehicleRatings = async () => {
  try {
    vehicleLoading.value = true
    vehicleError.value = null
    
    // Build query params with shop_id if provided
    const params = props.shopId ? { shop_id: props.shopId } : {}
    const response = await ratingApi.getVehicleRatingsSummary(params)
    const data = response.data || []
    vehicleRatings.value = data
  } catch (err) {
    console.error('Error fetching vehicle ratings:', err)
    vehicleError.value = 'Failed to load vehicle ratings'
  } finally {
    vehicleLoading.value = false
  }
}

// Fetch on mount
onMounted(() => {
  fetchFeedback()
  fetchVehicleRatings()
})

// Calculate average rating for feedback
const avg = computed(() => {
  if (!combinedFeedback.value.length) return 0
  return (combinedFeedback.value.reduce((a, b) => a + b.rating, 0) / combinedFeedback.value.length).toFixed(1)
})

// Calculate overall vehicle ratings average
const vehicleAvgRating = computed(() => {
  if (!vehicleRatings.value.length) return 0
  const ratedVehicles = vehicleRatings.value.filter(v => v.total_ratings > 0)
  if (!ratedVehicles.length) return 0
  const sum = ratedVehicles.reduce((a, b) => a + b.average_rating, 0)
  return (sum / ratedVehicles.length).toFixed(1)
})

// Calculate total vehicle ratings count
const totalVehicleRatings = computed(() => {
  return vehicleRatings.value.reduce((a, b) => a + b.total_ratings, 0)
})

const openReply = (f) => { 
  selected.value = f
  newReply.value = f.reply || '' 
}

const closeReply = () => { 
  selected.value = null
  newReply.value = ''
}

const saveReply = () => { 
  if (!selected.value) return
  selected.value.reply = newReply.value
  selected.value = null
  toast.success('Reply saved successfully.')
}

// Generate stars array for rendering
const getStars = (rating) => {
  return Array(5).fill(0).map((_, i) => i < rating)
}

const formatRatingValue = (value) => {
  if (value === null || value === undefined) return '0.0'
  return Number(value).toFixed(1)
}

// Format date for vehicle ratings
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-GB')
}

// Filter ratings to only show those with comments
const getRatingsWithComments = (ratings) => {
  if (!ratings || !Array.isArray(ratings)) return []
  return ratings.filter(r => r.comment && r.comment.trim() !== '')
}

// Combined feedback and vehicle ratings for the Customer Feedback table
const combinedFeedback = computed(() => {
  const items = []
  
  // Add original feedback items
  feedback.value.forEach(f => {
    items.push({
      id: `feedback-${f.id}`,
      date: f.date,
      customer: f.customer,
      customerProfilePicture: f.customerProfilePicture || null,
      rating: f.rating,
      ratingCount: f.ratingCount,
      vehicleName: f.vehicleName,
      comment: f.comment,
      reply: f.reply,
      type: 'feedback'
    })
  })
  
  // Add vehicle ratings as reviews
  vehicleRatings.value.forEach(v => {
    if (v.ratings && Array.isArray(v.ratings)) {
      v.ratings.forEach(r => {
        if (r.comment && r.comment.trim() !== '') {
          items.push({
            id: `rating-${r.id}`,
            date: formatDate(r.created_at),
            customer: r.user_name,
            customerProfilePicture: r.user_profile_picture || null,
            rating: r.rating,
            ratingCount: 1,
            vehicleName: v.vehicle_name,
            comment: r.comment,
            reply: '',
            type: 'vehicle_rating'
          })
        }
      })
    }
  })
  
  // Sort by date (most recent first)
  return items.sort((a, b) => {
    const dateA = new Date(a.date)
    const dateB = new Date(b.date)
    return dateB - dateA
  })
})

// Search functionality
const searchQuery = ref('')

// Filtered feedback based on search
const filteredFeedback = computed(() => {
  if (!searchQuery.value.trim()) return combinedFeedback.value
  const query = searchQuery.value.toLowerCase()
  return combinedFeedback.value.filter(f => 
    (f.customer && f.customer.toLowerCase().includes(query)) ||
    (f.vehicleName && f.vehicleName.toLowerCase().includes(query)) ||
    (f.comment && f.comment.toLowerCase().includes(query))
  )
})

// Filtered vehicle ratings based on search
const filteredVehicleRatings = computed(() => {
  if (!searchQuery.value.trim()) return vehicleRatings.value
  const query = searchQuery.value.toLowerCase()
  return vehicleRatings.value.filter(v => 
    v.vehicle_name && v.vehicle_name.toLowerCase().includes(query)
  )
})

// Switch tab
const switchTab = (tab) => {
  activeTab.value = tab
}

// Get rating distribution for chart
const getRatingDistribution = (ratings) => {
  const dist = [0, 0, 0, 0, 0]
  ratings.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) {
      dist[r.rating - 1]++
    }
  })
  return dist
}
</script>

<template>
  <div class="reviews-container">
    <!-- Page Title -->
    <div class="page-header">
      <h1 class="page-title">Reviews & Feedback</h1>
      <p class="page-subtitle">Manage customer feedback and vehicle ratings</p>
    </div>
    <!-- Tab Navigation -->
    <div class="tab-navigation">
      <div class="tabs-left">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'feedback' }"
          @click="switchTab('feedback')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          Customer Feedback
          <span class="tab-badge" v-if="combinedFeedback.length">{{ combinedFeedback.length }}</span>
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'vehicles' }"
          @click="switchTab('vehicles')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 17h14v-5H5v5z"></path>
            <path d="M6 12l2-5h8l2 5"></path>
            <circle cx="7" cy="17" r="2"></circle>
            <circle cx="17" cy="17" r="2"></circle>
          </svg>
          Vehicle Ratings
          <span class="tab-badge" v-if="totalVehicleRatings">{{ totalVehicleRatings }}</span>
        </button>
      </div>
      <div class="search-bar" v-if="(activeTab === 'vehicles' && vehicleRatings.length > 0) || (activeTab === 'feedback' && combinedFeedback.length > 0)">
        <div class="search-input-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Search customer or vehicle name..." 
            class="search-input"
          />
        </div>
      </div>
    </div>

    <!-- Feedback Tab -->
    <div v-if="activeTab === 'feedback'" class="tab-content">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading reviews...</p>
      </div>
      
      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <p>{{ error }}</p>
        <button class="retry-btn" @click="fetchFeedback">Retry</button>
      </div>

      <!-- Reviews Table -->
      <div v-else class="reviews-table-wrapper">
        <div class="feedback-card">
          <div class="feedback-card-heading">
            <h2>Feedback</h2>
            <p>All reviews, starting with the most recent, are listed here.</p>
          </div>
          <div class="feedback-table">
            <div class="feedback-table-row header">
              <div class="cell date">Date</div>
              <div class="cell provider">Provider</div>
              <div class="cell vehicle">Vehicle</div>
              <div class="cell rating">Rating</div>
              <div class="cell comment">Comment</div>
            </div>
            <div v-for="f in filteredFeedback" :key="f.id" class="feedback-table-row">
              <div class="cell date">
    
                <div>{{ f.date }}</div>
              </div>
              <div class="cell provider">
                <div class="table-avatar" :class="{ 'has-image': f.customerProfilePicture }">
                  <img v-if="f.customerProfilePicture" :src="f.customerProfilePicture" :alt="f.customer" class="avatar-image" />
                  <span v-else>{{ f.customer ? f.customer.charAt(0).toUpperCase() : 'A' }}</span>
                </div>
                <div>
                  <div class="provider-name">{{ f.customer || 'Anonymous' }}</div>
                </div>
              </div>
              <div class="cell vehicle-name">
                <div>{{ f.vehicleName || 'N/A' }}</div>
              </div>
              <div class="cell rating">
                <div class="rating-pill">
                  <div class="rating-stars rating-stars-pill">
                    <span v-for="(filled, index) in getStars(f.rating)" :key="`r-${f.id}-${index}`" class="star" :class="{ filled: filled }">★</span>
                  </div>
                </div>
              </div>
              <div class="cell comment">
                <div class="comment-icon" :title="f.comment" role="button" tabindex="0" @click="openReply(f)" @keyup.enter="openReply(f)">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16v12H5.17L4 17.17z"></path>
                  </svg>
                  <span class="comment-label">View</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Vehicle Ratings Tab -->
    <div v-if="activeTab === 'vehicles'" class="tab-content">
      <!-- Loading State -->
      <div v-if="vehicleLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading vehicle ratings...</p>
      </div>
      
      <!-- Error State -->
      <div v-else-if="vehicleError" class="error-state">
        <p>{{ vehicleError }}</p>
        <button class="retry-btn" @click="fetchVehicleRatings">Retry</button>
      </div>

      <!-- Vehicle Ratings Table -->
      <div v-else class="vehicle-ratings-container">
        <!-- Summary Stats -->
        <div class="rating-stats" v-if="vehicleRatings.length > 0">
          <div class="stat-card main-stat">
            <div class="stat-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </div>
            <div class="stat-value">{{ vehicleAvgRating }}</div>
            <div class="stat-label">Average Rating</div>
            <div class="star-rating small">
              <span v-for="(filled, index) in getStars(Math.round(vehicleAvgRating))" :key="index" class="star" :class="{ filled: filled }">
                ★
              </span>
            </div>
          </div>
          <div class="stat-card border-green">
            <div class="stat-icon secondary">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <div class="stat-value">{{ totalVehicleRatings }}</div>
            <div class="stat-label">Total Reviews</div>
          </div>
          <div class="stat-card border-purple">
            <div class="stat-icon secondary">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                <line x1="9" y1="9" x2="9.01" y2="9"></line>
                <line x1="15" y1="9" x2="15.01" y2="9"></line>
              </svg>
            </div>
            <div class="stat-value">{{ vehicleRatings.filter(v => v.total_ratings > 0).length }}</div>
            <div class="stat-label">Vehicles Rated</div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="vehicleRatings.length === 0 || totalVehicleRatings === 0" class="empty-state">
          <div class="empty-content">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <p>No vehicle ratings yet</p>
            <p class="empty-subtitle">Customer ratings will appear here after completing rentals</p>
          </div>
        </div>

        <!-- Vehicle Ratings List -->
        <div v-else class="vehicle-ratings-list">
          <div v-for="vehicle in filteredVehicleRatings" :key="vehicle.id" class="vehicle-rating-card">
            <div class="vehicle-info">
              <div class="vehicle-image" v-if="vehicle.vehicle_image">
                <img :src="vehicle.vehicle_image" :alt="vehicle.vehicle_name" />
              </div>
              <div class="vehicle-image placeholder" v-else>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M5 17h14v-5H5v5z"></path>
                  <path d="M6 12l2-5h8l2 5"></path>
                  <circle cx="7" cy="17" r="2"></circle>
                  <circle cx="17" cy="17" r="2"></circle>
                </svg>
              </div>
              <div class="vehicle-details">
                <h3 class="vehicle-name">{{ vehicle.vehicle_name }}</h3>
                <div class="vehicle-rating-summary">
                  <div class="star-rating">
                    <span v-for="(filled, index) in getStars(Math.round(vehicle.average_rating))" :key="index" class="star" :class="{ filled: filled }">
                      ★
                    </span>
                  </div>
                </div>
              </div>
              <div class="vehicle-right">
                <span class="rating-number">{{ vehicle.average_rating }}</span>
                <div class="rating-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: (vehicle.average_rating / 5) * 100 + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
    <!-- Reply Modal -->
    <div v-if="selected" class="modal-overlay" @click.self="closeReply">
      <div class="modal-content">
        <div class="modal-header">
          <h2>The comment from  {{ selected.customer }}</h2>
          <button class="close-btn" @click="closeReply">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>   
        <div class="modal-body">
          <div class="original-review">
            <div class="star-rating small">
              <span v-for="(filled, index) in getStars(selected.rating)" :key="index" class="star" :class="{ filled: filled }">
                ★
              </span>
            </div>
            <p class="review-text">{{ selected.comment }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Page Header */
.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  color: #64748b;
  margin: 4px 0 0 0;
  font-size: 0.88rem;
}

/* Search Bar */
.search-bar {
  margin-bottom: 0;
}

.search-input-wrapper {
  position: relative;
  width: 250px;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: #64748b;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 44px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.85rem;
  background: #fff;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.comment{
  margin-left: 100px;
}

.search-input::placeholder {
  color: #94a3b8;
}

/* Tab Navigation */
.tab-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
  padding: 8px;
  background: #f8fafc;
  border-radius: 16px;
}

.tabs-left {
  display: flex;
  gap: 12px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-btn svg {
  width: 20px;
  height: 20px;
}

.tab-btn:hover {
  color: #1e293b;
  background: #e2e8f0;
}

.tab-btn.active {
  color: #fff;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background: #e2e8f0;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 12px;
}

.tab-btn.active .tab-badge {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

/* Rating Stats */
.rating-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.stat-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  text-align: center;
  border-radius: 18px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
}

.stat-card.main-stat {
  background: #fff;
  border: 2px solid #3b82f6;
}

.stat-card.border-green {
  border: 2px solid #22c55e;
}

.stat-card.border-purple {
  border: 2px solid #a855f7;
}

.stat-icon {
  width: 24px;
  height: 24px;
  margin: 0 auto 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 10px;
  color: #3b82f6;
}

.stat-icon.secondary {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}

.stat-card.main-stat .stat-icon {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.stat-icon svg {
  width: 24px;
  height: 24px;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1;
  color: #343b1e;
}

.stat-card.main-stat .stat-value {
  color: #1e293b;
  font-size: 1.1rem;
}

.stat-card.main-stat .stat-label {
  font-size: 0.75rem;
}

.stat-label {
  font-size: 0.8rem;
  color: #64748b;
  margin-top: 4px;
  font-weight: 700;
}

.stat-card.main-stat .stat-label {
  color: #64748b;
}

.stat-card.main-stat .star-rating {
  justify-content: center;
  margin-top: 12px;
}

/* Customer Avatar */
.customer-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.customer-avatar.small {
  width: 36px;
  height: 36px;
  font-size: 0.875rem;
}

/* Feedback Table */
.reviews-table-wrapper {
  margin-top: 24px;
}

.feedback-card {
  background: linear-gradient(180deg, #fefefe 0%, #eef2ff 100%);
  border: none;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.1);
}

.feedback-card-heading h2 {
  margin: 0;
  font-size: 1.15rem;
  color: #111827;
  font-weight: 700;
}

.feedback-card-heading p {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 0.88rem;
}

.feedback-table {
  margin-top: 18px;
  border-radius: 20px;
  overflow: hidden;
  background: #fff;
  position: relative;
  padding: 4px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.feedback-table::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  border: 1px solid rgba(59, 130, 246, 0.12);
  pointer-events: none;
}

.feedback-table-row {
  display: grid;
  grid-template-columns: 1.2fr 2.2fr 1.2fr 1fr 1.5fr 1fr;
  gap: 18px;
  padding: 12px 16px;
  align-items: center;
  background: #fff;
  position: relative;
}

.feedback-table-row:not(.header)::after {
  content: '';
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0));
}

.feedback-table-row.header {
  background: transparent;
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.feedback-table-row.header .cell {
  font-size: 0.85rem;
}

.feedback-table-row.header .cell.rating {
  background: transparent;
  padding: 0;
  color: #0f172a;
  font-weight: 700;
  justify-content: flex-start;
  border: none;
}

.cell.rating {
  border: none;
}

.feedback-table-row:last-child {
  border-bottom: none;
}

.cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cell.actions {
  justify-content: flex-end;
}

.cell.provider {
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

.cell.vehicle-name {
  justify-content: center;
}

.cell.vehicle-name div {
  font-weight: 600;
  color: #0f172a;
  font-size: 0.95rem;
}

.cell .label {
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}

.table-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #38bdf8, #6366f1);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  margin-right: 12px;
  box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);
  overflow: hidden;
}

.table-avatar.has-image {
  background: none;
  box-shadow: none;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.provider-name {
  font-weight: 600;
  color: #0f172a;
}

.provider-stars {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: #94a3b8;
}

.provider-stars .star {
  font-size: 0.9rem;
  color: #facc15;
}

.rating-score-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rating-score {
  font-weight: 700;
  color: #0f172a;
}

.rating-stars {
  display: flex;
  gap: 2px;
}


.rating-stars .star {
  font-size: 1rem;
  color: #d1d5db;
}

.rating-stars .star.filled {
  color: #f59e0b;
}

.rating-pill {
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
}

.rating-pill-title {
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #0f172a;
}

.comment-icon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #0f172a;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0;
}

.comment-icon svg {
  width: 20px;
  height: 20px;
  color: #facc15;
}

.comment-label {
  text-transform: uppercase;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  color: #0f172a;
}

.comment-icon:hover {
  color: #111827;
}

.table-action-btn {
  background: transparent;
  border: none;
  color: #1f2937;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

@media (max-width: 960px) {
  .feedback-table-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: auto auto;
  }

  .feedback-table-row.header {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .cell.actions {
    justify-content: flex-end;
  }
}

/* Reviews Table */
/* Vehicle Rating Card */
.vehicle-rating-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  transition: all 0.3s ease;
}

.vehicle-rating-card:hover {
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}

.vehicle-info {
  display: flex;
  gap: 12px;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.vehicle-image {
  width: 80px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f1f5f9;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.vehicle-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vehicle-image.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}

.vehicle-image.placeholder svg {
  width: 40px;
  height: 40px;
}

.vehicle-details {
  display: flex;
  margin-top: 13px;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.vehicle-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: #1e293b;
  display: inline;
}

.vehicle-rating-summary {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rating-value {
  font-weight: 700;
  color: #1e293b;
  font-size: 1rem;
}

.rating-count {
  color: #94a3b8;
  font-size: 0.875rem;
}

.vehicle-right {
  display: flex;
  align-items: center;
  margin-left: auto;
  gap: 12px;
}

.rating-number {
  font-size: 1rem;
  font-weight: 700;
  color: #1e293b;
}

.rating-progress {
  width: 80px;
}

.progress-bar {
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #facc15 0%, #f59e0b 100%);
  border-radius: 4px;
  transition: width 0.5s ease;
}

/* Vehicle Reviews */
.vehicle-reviews {
  margin-top: 20px;
}

.reviews-title {
  font-size: 1rem;
  font-weight: 700;
  color: #475569;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.reviews-title svg {
  width: 20px;
  height: 20px;
  color: #3b82f6;
}

.rating-item {
  padding: 18px;
  background: #fff;
  border-radius: 20px;
  margin-bottom: 14px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
}

.rating-item:last-child {
  margin-bottom: 0;
}

.rating-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.rating-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.rating-info .customer-name {
  font-size: 0.9375rem;
  margin: 0;
}

.rating-info .review-date {
  margin: 0;
}

.empty-subtitle {
  font-size: 0.875rem;
  color: #94a3b8;
  margin-top: 4px;
}

.tab-content {
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #64748b;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  border-radius: 24px;
  width: 100%;
  max-width: 500px;
  overflow: hidden;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.close-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 12px;
  background: #f8fafc;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.modal-body {
  padding: 24px;
}

.original-review {
  margin-bottom: 20px;
}

.review-text {
  color: #475569;
  font-size: 0.9375rem;
  margin: 8px 0 0;
}

.reply-form label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 8px;
}

.reply-form textarea {
  width: 100%;
  min-height: 140px;
  padding: 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.9375rem;
  color: #1e293b;
  resize: vertical;
  transition: border-color 0.2s;
}

.reply-form textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.cancel-btn {
  padding: 12px 24px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  color: #64748b;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.save-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-1px);
}
</style>
