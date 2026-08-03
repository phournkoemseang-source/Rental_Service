<script setup>
import { ref, onMounted } from 'vue'
import { loyaltyPointApi } from '@/services/api'
import '../../css/Loyalty.css'

const loading = ref(true)
const error = ref(null)
const loyaltyPoints = ref([])

const fetchLoyaltyPoints = async () => {
  try {
    loading.value = true
    const response = await loyaltyPointApi.getAll()
    const data = response.data.data || response.data || []
    loyaltyPoints.value = data
  } catch (err) {
    console.error('Error fetching loyalty points:', err)
    error.value = 'Failed to load loyalty points'
  } finally {
    loading.value = false
  }
}

onMounted(fetchLoyaltyPoints)

const getStatusClass = (status) => {
  if (status === null || status === undefined) return 'status-active'
  const s = String(status).toLowerCase()
  if (s === 'active' || s === '1' || s === 'true') return 'status-active'
  return 'status-inactive'
}

const getStatusLabel = (status) => {
  if (status === null || status === undefined) return 'Active'
  const s = String(status).toLowerCase()
  if (s === 'active' || s === '1' || s === 'true') return 'Active'
  if (s === 'inactive' || s === '0' || s === 'false') return 'Inactive'
  return String(status)
}

const getInitial = (lp) => {
  if (lp.user?.name) return lp.user.name.charAt(0).toUpperCase()
  if (lp.user_id) return String(lp.user_id).charAt(0)
  return 'U'
}

const getCustomerName = (lp) => {
  if (lp.user?.name) return lp.user.name
  return `Customer #${lp.user_id}`
}
</script>

<template>
  <div class="loyalty-container">
    <h1 class="page-title">{{ $t('loyaltyPoints') }}</h1>

    <div class="table-container">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>{{ $t('loadingLoyalty') }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <p>{{ error }}</p>
        <button class="retry-btn" @click="fetchLoyaltyPoints">{{ $t('retry') }}</button>
      </div>

      <!-- Data Table -->
      <table v-else class="loyalty-table">
        <thead>
          <tr>
            <th>{{ $t('customer2') }}</th>
            <th>{{ $t('totalPoints2') }}</th>
            <th>{{ $t('bookings2') }}</th>
            <th>{{ $t('status2') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loyaltyPoints.length === 0">
            <td colspan="4" class="empty-state">
              <div class="empty-content">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="9" width="18" height="12" rx="2"/>
                  <path d="M12 9v12M3 13h18"/>
                  <path d="M12 9s-3.5-1.5-4.5-3A2.2 2.2 0 0 1 11 4.2c.7 1 .9 2.3 1 4.8zM12 9s3.5-1.5 4.5-3A2.2 2.2 0 0 0 13 4.2c-.7 1-.9 2.3-1 4.8z"/>
                </svg>
                <p>{{ $t('noLoyaltyData') }}</p>
              </div>
            </td>
          </tr>
          <tr v-for="lp in loyaltyPoints" :key="lp.id">
            <td class="customer-cell">
              <div class="customer-info">
                <div class="customer-avatar">{{ getInitial(lp) }}</div>
                <span class="customer-name">{{ getCustomerName(lp) }}</span>
              </div>
            </td>
            <td class="points-cell">
              <span class="points-badge">{{ lp.points ?? lp.total_points ?? 0 }}</span>
            </td>
            <td class="bookings-cell">{{ lp.bookings_count ?? lp.total_bookings ?? '—' }}</td>
            <td>
              <span :class="['status-badge', getStatusClass(lp.status)]">
                {{ getStatusLabel(lp.status) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>


