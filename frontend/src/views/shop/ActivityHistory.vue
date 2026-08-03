<script setup>
import { ref, onMounted } from 'vue'
import { historiesApi } from '@/services/api'
import '../../css/ActivityHistory.css'

const loading = ref(true)
const error = ref(null)
const histories = ref([])

const fetchHistories = async () => {
  try {
    loading.value = true
    const response = await historiesApi.getAll()
    const data = response.data.data || response.data || []
    histories.value = data
  } catch (err) {
    console.error('Error fetching histories:', err)
    error.value = 'Failed to load activity history'
  } finally {
    loading.value = false
  }
}

onMounted(fetchHistories)

const formatDate = (date) => {
  if (!date) return '—'
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return date
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return date
  }
}
</script>

<template>
  <div class="history-container">
    <h1 class="page-title">{{ $t('activityHistory') }}</h1>

    <div class="table-container">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>{{ $t('loadingActivityHistory') }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <p>{{ error }}</p>
        <button class="retry-btn" @click="fetchHistories">{{ $t('retry') }}</button>
      </div>

      <!-- Data Table -->
      <table v-else class="history-table">
        <thead>
          <tr>
            <th>{{ $t('id') }}</th>
            <th>{{ $t('userId') }}</th>
            <th>{{ $t('shopId2') }}</th>
            <th>{{ $t('bookingId3') }}</th>
            <th>{{ $t('rating2') }}</th>
            <th>{{ $t('comment') }}</th>
            <th>{{ $t('createdAt3') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="histories.length === 0">
            <td colspan="7" class="empty-state">
              <div class="empty-content">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M3 12a9 9 0 1 0 3-6.7"/>
                  <path d="M3 4v5h5"/>
                  <path d="M12 7v5l3 2"/>
                </svg>
                <p>{{ $t('noActivityHistoryFound') }}</p>
              </div>
            </td>
          </tr>
          <tr v-for="h in histories" :key="h.id">
            <td class="id-cell">{{ h.id }}</td>
            <td class="user-cell">{{ h.user_id }}</td>
            <td class="shop-cell">{{ h.shop_id || '—' }}</td>
            <td class="booking-cell">{{ h.booking_id || '—' }}</td>
            <td class="rating-cell">
              <span v-if="h.rating" class="rating-badge">⭐ {{ h.rating }}</span>
              <span v-else class="no-data">—</span>
            </td>
            <td class="comment-cell">{{ h.comment || '—' }}</td>
            <td class="date-cell">{{ formatDate(h.created_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

