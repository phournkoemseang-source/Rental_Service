<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAdminStore } from '../../stores/adminStore.js'
import { useToast } from '../../composables/useToast.js'
import ConfirmModal from '../../components/ConfirmModal.vue'

const admin = useAdminStore()
const route = useRoute()
const toast = useToast()

const page = ref(1)
const perPage = 8
const animated = ref(false)

const showView = ref(false)
const selectedBooking = ref(null)

const query = computed(() => String(route.query.q || '').trim().toLowerCase())

const statusLabel = (booking) => {
  const raw = String(booking?.status || booking?.deposit_status || 'pending').trim().toUpperCase()
  if (raw === 'COMPLETE') return 'COMPLETED'
  if (raw === 'CANCELED') return 'CANCELLED'
  if (raw === 'PAID') return 'COMPLETED'
  if (raw === 'APPROVED') return 'CONFIRMED'
  return raw || 'PENDING'
}

const normalizedBookings = computed(() => {
  return (admin.state.bookings || []).map((booking) => ({
    ...booking,
    _userName: booking.user?.name || booking.customer_name || 'Unknown User',
    _userEmail: booking.user?.email || booking.customer_email || '',
    _vehicleName: `${booking.vehicle?.brand || booking.brand || ''} ${booking.vehicle?.model || booking.model || ''}`.trim(),
    _plate: booking.vehicle?.plate_number || booking.plate_number || booking.vehicle_plate || 'No Plate',
    _days: Number(booking.total_days ?? booking.days ?? 1) || 1,
    _total: Number(booking.total_amount ?? booking.total_price ?? booking.price ?? 0) || 0,
    _statusLabel: statusLabel(booking),
  }))
})

const filteredBookings = computed(() => {
  const all = normalizedBookings.value
  if (!query.value) return all
  
  return all.filter(b => {
    const hay = `${b.id} ${b._userName || ''} ${b._vehicleName || ''} ${b._statusLabel || ''}`.toLowerCase()
    return hay.includes(query.value)
  })
})

const paginatedBookings = computed(() => {
  const start = (page.value - 1) * perPage
  return filteredBookings.value.slice(start, start + perPage)
})

const totalPages = computed(() => Math.ceil(filteredBookings.value.length / perPage))

const statusBadgeClass = (status) => {
  const s = String(status || '').toUpperCase()
  if (s === 'COMPLETED') return 'badge badge-green'
  if (s === 'PENDING') return 'badge badge-yellow'
  if (s === 'CANCELLED') return 'badge badge-red'
  if (s === 'CONFIRMED') return 'badge badge-blue'
  return 'badge'
}

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0)
}

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const openView = (booking) => {
  selectedBooking.value = booking
  showView.value = true
}

const closeView = () => {
  showView.value = false
  selectedBooking.value = null
}

onMounted(async () => {
  await admin.load().catch(() => {})
  animated.value = true
})

// Reset page when query changes
watch(query, () => {
  page.value = 1
})
</script>

<template>
  <section class="admin-page">
    <header class="page-head">
      <div>
        <div class="breadcrumb">
          <span>Admin</span> <span class="dot">•</span> <span>Management</span>
        </div>
        <h1 class="page-title">Booking Management</h1>
        <p class="page-subtitle">View and monitor all customer rental bookings across the platform.</p>
      </div>
    </header>

    <div class="card">
      <div class="card-toolbar">
        <div class="filters">
          <div class="tabs">
            <button class="tab active">All Bookings</button>
          </div>
        </div>
        <div class="toolbar-right">
          <span class="muted small">{{ filteredBookings.length }} Bookings Found</span>
        </div>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>CUSTOMER</th>
              <th>VEHICLE</th>
              <th>RENTAL PERIOD</th>
              <th class="num">TOTAL</th>
              <th>STATUS</th>
              <th class="actions">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="booking in paginatedBookings" :key="booking.id">
              <td><span class="muted">#{{ booking.id }}</span></td>
              <td>
                <div class="shop-meta">
                  <div class="shop-name">{{ booking._userName }}</div>
                  <div class="shop-id">{{ booking._userEmail }}</div>
                </div>
              </td>
              <td>
                <div class="shop-meta">
                  <div class="shop-name">{{ booking._vehicleName || 'Vehicle not assigned' }}</div>
                  <div class="shop-id">{{ booking._plate }}</div>
                </div>
              </td>
              <td>
                <div class="shop-meta">
                  <div class="shop-name">{{ formatDate(booking.start_date) }}</div>
                  <div class="shop-id">{{ booking._days }} Days</div>
                </div>
              </td>
              <td class="num"><strong>{{ formatCurrency(booking._total) }}</strong></td>
              <td class="status-col"><span :class="statusBadgeClass(booking._statusLabel)">{{ booking._statusLabel }}</span></td>
              <td class="actions">
                <button type="button" class="icon-action" title="View Details" @click="openView(booking)">
                  <i class="fa-regular fa-eye"></i>
                </button>
              </td>
            </tr>
            <tr v-if="!paginatedBookings.length">
              <td colspan="7" class="table-empty">
                No bookings found matching your criteria.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="table-footer" v-if="totalPages > 1">
        <div class="muted small">Showing {{ paginatedBookings.length }} of {{ filteredBookings.length }}</div>
        <div class="pager">
          <button 
            v-for="p in totalPages" 
            :key="p" 
            class="pager-btn" 
            :class="{ 'is-active': page === p }"
            @click="page = p"
          >
            {{ p }}
          </button>
        </div>
      </div>
    </div>

    <!-- View Details Modal -->
    <div v-if="showView" class="modal-backdrop" @click.self="closeView">
      <div class="modal">
        <div class="modal-head">
          <div>
            <div class="modal-title">Booking Details #{{ selectedBooking?.id }}</div>
            <div class="modal-sub">Comprehensive overview of the rental transaction.</div>
          </div>
          <button type="button" class="icon-action" @click="closeView"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="field span-2">
              <span class="field-label">Customer Information</span>
              <div class="pill-input pill-input--loose">
                <strong>{{ selectedBooking?.user?.name }}</strong><br/>
                <span class="muted">{{ selectedBooking?.user?.email }}</span><br/>
                <span class="muted">{{ selectedBooking?.user?.phone || 'No phone provided' }}</span>
              </div>
            </div>
            
            <div class="field">
              <span class="field-label">Vehicle</span>
              <input :value="`${selectedBooking?.vehicle?.brand} ${selectedBooking?.vehicle?.model}`" readonly />
            </div>
            
            <div class="field">
              <span class="field-label">Rental Shop</span>
              <input :value="selectedBooking?.shop?.name || 'N/A'" readonly />
            </div>

            <div class="field">
              <span class="field-label">Start Date</span>
              <input :value="formatDate(selectedBooking?.start_date)" readonly />
            </div>

            <div class="field">
              <span class="field-label">Duration</span>
              <input :value="`${selectedBooking?._days || 1} Days`" readonly />
            </div>

            <div class="field">
              <span class="field-label">Total Amount</span>
               <input :value="formatCurrency(selectedBooking?._total)" readonly />
            </div>

            <div class="field">
              <span class="field-label">Status</span>
              <input :value="selectedBooking?._statusLabel || 'PENDING'" readonly />
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-primary" @click="closeView">Close</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.status-col {
  vertical-align: middle;
}
</style>
