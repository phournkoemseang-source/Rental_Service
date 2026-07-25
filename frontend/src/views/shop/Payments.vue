<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useToast } from '@/composables/useToast'
import api, { paymentApi } from '@/services/api'
import '../../css/Payment.css'

const toast = useToast()

// Get current user's shop
const getStoredUser = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem('user')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const getCachedShop = (userId) => {
  if (!userId || typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(`settings_shop_${userId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const currentShop = ref(null)

const loadShop = async () => {
  const storedUser = getStoredUser()
  if (!storedUser?.id) return null
  
  const cachedShop = getCachedShop(storedUser.id)
  if (cachedShop) {
    currentShop.value = cachedShop
    return cachedShop
  }
  
  try {
    const response = await api.get('/shops')
    const shops = response.data.data || response.data || []
    const userShops = shops.filter((s) => Number(s.owner_id) === Number(storedUser.id))
    if (userShops.length > 0) {
      currentShop.value = userShops[0]
      return userShops[0]
    }
  } catch (e) {
    console.error('Error fetching shops:', e)
  }
  return null
}

const mapPaymentToRow = (payment) => {
  const bookingValue = payment?.booking_id || payment?.bookingId || payment?.booking?.id
  const bookingId = bookingValue ? `BK${bookingValue}` : '-'
  const paymentId = payment?.transaction_id || payment?.payment_id || (payment?.id ? `PAY-${payment.id}` : '-')
  const amountValue = Number(payment?.amount ?? payment?.total_price ?? 0)
  const rawStatus =
    payment?.raw_status ??
    payment?.booking_status ??
    payment?.booking?.status ??
    payment?.status ??
    payment?.payment_status ??
    'pending'
  const rawStatusText = (rawStatus ?? '').toString().trim()
  const statusKey = normalizeStatus(rawStatusText || 'pending')
  const status = toStatusLabel(statusKey, rawStatusText || 'pending')
  const date = toIsoDate(payment?.paid_at || payment?.created_at)

  // Build vehicle name from brand + model or title
  const vehicleBrand = payment?.booking?.vehicle?.brand ?? ''
  const vehicleModel = payment?.booking?.vehicle?.model ?? ''
  const vehicleTitle = payment?.booking?.vehicle?.title ?? payment?.booking?.vehicle?.name ?? ''
  const vehicleName = [vehicleBrand, vehicleModel].filter(Boolean).join(' ') || vehicleTitle || 'Unknown Vehicle'
  const vehicleType = payment?.booking?.vehicle?.type ?? ''

  // Customer name and email
  const customerName = payment?.booking?.user?.name || 'Unknown'
  const customerEmail = payment?.booking?.user?.email ?? ''

  return {
    id: paymentId,
    bookingId,
    amount: Number.isFinite(amountValue) ? amountValue : 0,
    date,
    status,
    rawStatus: rawStatusText || status,
    statusKey,
    customerName,
    customerNameMissing: !customerName || customerName === 'Unknown',
    customerEmail,
    customerEmailMissing: !customerEmail,
    vehicleName,
    vehicleNameMissing: !vehicleName || vehicleName === 'Unknown Vehicle',
    vehicleType,
    vehicleTypeMissing: !vehicleType
  }
}

const toStatusLabel = (statusKey, rawStatus) => {
  const labels = {
    pending: 'Pending',
    paid: 'Paid',
    confirmed: 'Confirmed',
    completed: 'Completed',
    processing: 'Processing',
    cancelled: 'Cancelled',
    failed: 'Failed',
    refunded: 'Refunded'
  }
  if (labels[statusKey]) return labels[statusKey]
  const fallback = (rawStatus || '').toString().trim()
  if (!fallback) return 'Pending'
  return fallback
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

const filter = ref('all')
const dateFrom = ref('')
const dateTo = ref('')
const loading = ref(true)
const error = ref('')
const payments = ref([])
const deletingPaymentId = ref(null)
const actionMessage = ref('')
const actionMessageType = ref('success')
const selectedPaymentIds = ref([])
const bulkDeleting = ref(false)

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' }
]

const normalizeStatus = (status) => {
  const raw = String(status || '').trim().toLowerCase()
  if (!raw) return 'pending'
  if (raw === 'canceled') return 'cancelled'
  return raw
}

const toIsoDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().split('T')[0]
}

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(Number(amount || 0))

const formatDateLabel = (value) => {
  if (!value) return 'No date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No date'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

const buildDisplayField = (value, fallback) => {
  const text = String(value ?? '').trim()
  return {
    text: text || fallback,
    missing: text === ''
  }
}

const mapBookingToPayment = (entry) => {
  const booking = entry?.booking || {}
  const customer = booking?.user || {}
  const vehicle = booking?.vehicle || {}
  const rawStatus = entry?.payment_status || entry?.raw_status || entry?.status || booking?.payment_status || booking?.status || entry?.deposit_status
  const amount = Number(entry?.amount ?? booking?.total_price ?? 0)
  const isoDate = toIsoDate(entry?.paid_at || entry?.created_at || booking?.created_at || booking?.start_date || entry?.updated_at)
  const paymentRecordId = entry?.payment_id ?? entry?.id ?? null
  const bookingIdValue = entry?.booking_id || booking?.id || ''
  const bookingIdField = buildDisplayField(bookingIdValue ? `Booking #${bookingIdValue}` : '', 'Booking not linked')
  const transactionId = entry?.transaction_id || (paymentRecordId ? `PAY-${paymentRecordId}` : (bookingIdValue ? `PAY-${bookingIdValue}` : ''))
  const paymentIdField = buildDisplayField(transactionId, 'Payment reference pending')
  const customerNameField = buildDisplayField(customer?.name, 'Guest Customer')
  const customerEmailField = buildDisplayField(customer?.email, 'No email available')
  const vehicleNameField = buildDisplayField(vehicle?.name || vehicle?.title || [vehicle?.brand, vehicle?.model].filter(Boolean).join(' '), 'Unknown Vehicle')
  const vehicleTypeField = buildDisplayField(vehicle?.type, 'Vehicle type unavailable')
  const dateValueField = buildDisplayField(isoDate, 'No date recorded')
  const dateLabelField = buildDisplayField(formatDateLabel(isoDate), 'No date')

  return {
    paymentId: paymentRecordId,
    id: paymentIdField.text,
    idMissing: paymentIdField.missing,
    bookingId: bookingIdField.text,
    bookingIdMissing: bookingIdField.missing,
    amount: Number.isFinite(amount) ? amount : 0,
    date: dateValueField.text,
    dateMissing: dateValueField.missing,
    dateLabel: dateLabelField.text,
    dateLabelMissing: dateLabelField.missing,
    status: toStatusLabel(rawStatus),
    customerName: customerNameField.text,
    customerNameMissing: customerNameField.missing,
    customerEmail: customerEmailField.text,
    customerEmailMissing: customerEmailField.missing,
    vehicleName: vehicleNameField.text,
    vehicleNameMissing: vehicleNameField.missing,
    vehicleType: vehicleTypeField.text,
    vehicleTypeMissing: vehicleTypeField.missing
  }
}

const fetchPayments = async () => {
  try {
    loading.value = true
    error.value = null
    
    // First load the shop to get shop_id
    const shop = await loadShop()
    const shopId = shop?.id
    
    // If no shop exists, show empty payments
    if (!shopId) {
      payments.value = []
      loading.value = false
      return
    }
    
    console.log('Fetching payments from /shop-payments...')
    
    const response = await api.get('/shop-payments')
    const payload = response?.data
    const allPayments = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.data?.data)
          ? payload.data.data
          : []

    // Filter payments by shop_id
    const filteredPayments = allPayments.filter((p) => {
      const paymentShopId = p.shop_id || p.booking?.shop_id || p.booking?.vehicle?.shop_id
      return Number(paymentShopId) === Number(shopId)
    })

    console.log('Filtered payments by shop:', filteredPayments)
    payments.value = filteredPayments.map(mapPaymentToRow)
  } catch (err) {
    console.error('Error fetching payments:', err)
    error.value = 'Failed to load payment activity for this shop.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchPayments()
})

const isRevenueStatus = (status) => {
  const normalized = normalizeStatus(status)
  return normalized === 'paid' || normalized === 'confirmed' || normalized === 'completed'
}

const totalEarnings = computed(() =>
  payments.value
    .filter((payment) => isRevenueStatus(payment.status))
    .reduce((sum, payment) => sum + payment.amount, 0)
)

const monthlyIncome = computed(() => {
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  return payments.value
    .filter((payment) => isRevenueStatus(payment.status) && payment.date >= firstDayOfMonth)
    .reduce((sum, payment) => sum + payment.amount, 0)
})

const todayEarnings = computed(() => {
  const today = new Date().toISOString().split('T')[0]

  return payments.value
    .filter((payment) => isRevenueStatus(payment.status) && payment.date === today)
    .reduce((sum, payment) => sum + payment.amount, 0)
})

const successfulCount = computed(() =>
  payments.value.filter((payment) => isRevenueStatus(payment.status)).length
)

const pendingCount = computed(() =>
  payments.value.filter((payment) => normalizeStatus(payment.status) === 'pending').length
)

const averageTicket = computed(() => {
  const revenuePayments = payments.value.filter((payment) => isRevenueStatus(payment.status))
  if (!revenuePayments.length) return 0

  return revenuePayments.reduce((sum, payment) => sum + payment.amount, 0) / revenuePayments.length
})

const latestPaymentLabel = computed(() => {
  const latestWithDate = payments.value.find((payment) => payment.date)
  return latestWithDate ? latestWithDate.dateLabel : 'No activity yet'
})

const filtered = computed(() =>
  payments.value.filter((payment) => {
    if (filter.value !== 'all' && normalizeStatus(payment.status) !== filter.value) return false
    if (dateFrom.value && payment.date < dateFrom.value) return false
    if (dateTo.value && payment.date > dateTo.value) return false
    return true
  })
)

const selectableFilteredPaymentIds = computed(() =>
  filtered.value
    .map((payment) => Number(payment.paymentId))
    .filter((paymentId) => Number.isFinite(paymentId) && paymentId > 0)
)

const selectedCount = computed(() => selectedPaymentIds.value.length)

const allSelectableFilteredSelected = computed(() =>
  selectableFilteredPaymentIds.value.length > 0 &&
  selectableFilteredPaymentIds.value.every((paymentId) => selectedPaymentIds.value.includes(paymentId))
)

watch(selectableFilteredPaymentIds, (visiblePaymentIds) => {
  const allowedIds = new Set(visiblePaymentIds)
  selectedPaymentIds.value = selectedPaymentIds.value.filter((paymentId) => allowedIds.has(paymentId))
})

const filteredRevenue = computed(() =>
  filtered.value
    .filter((payment) => isRevenueStatus(payment.status))
    .reduce((sum, payment) => sum + payment.amount, 0)
)

const activeFilterLabel = computed(() => {
  if (filter.value === 'all') return 'All statuses'
  return toStatusLabel(filter.value)
})

const clearFilters = () => {
  filter.value = 'all'
  dateFrom.value = ''
  dateTo.value = ''
}

const togglePaymentSelection = (payment) => {
  const paymentId = Number(payment?.paymentId)
  if (!Number.isFinite(paymentId) || paymentId <= 0) return

  if (selectedPaymentIds.value.includes(paymentId)) {
    selectedPaymentIds.value = selectedPaymentIds.value.filter((id) => id !== paymentId)
    return
  }

  selectedPaymentIds.value = [...selectedPaymentIds.value, paymentId]
}

const toggleSelectAllFiltered = () => {
  if (!selectableFilteredPaymentIds.value.length) return

  if (allSelectableFilteredSelected.value) {
    selectedPaymentIds.value = []
    return
  }

  selectedPaymentIds.value = [...selectableFilteredPaymentIds.value]
}

const removePayment = async (payment) => {
  const paymentId = Number(payment?.paymentId)
  if (!Number.isFinite(paymentId) || paymentId <= 0) {
    actionMessageType.value = 'error'
    actionMessage.value = 'This payment record cannot be deleted.'
    toast.error(actionMessage.value)
    return
  }

  const shouldDelete = window.confirm(`Delete payment ${payment.id}?`)
  if (!shouldDelete) return

  try {
    deletingPaymentId.value = paymentId
    actionMessage.value = ''
    await paymentApi.delete(paymentId)
    payments.value = payments.value.filter((entry) => Number(entry.paymentId) !== paymentId)
    selectedPaymentIds.value = selectedPaymentIds.value.filter((id) => id !== paymentId)
    actionMessageType.value = 'success'
    actionMessage.value = 'Payment deleted successfully.'
    toast.success(actionMessage.value)
  } catch (err) {
    console.error('Error deleting payment:', err)
    actionMessageType.value = 'error'
    actionMessage.value = err?.response?.data?.message || 'Failed to delete payment.'
    toast.error(actionMessage.value)
  } finally {
    deletingPaymentId.value = null
  }
}

const removeSelectedPayments = async () => {
  const paymentIds = [...selectedPaymentIds.value]
  if (!paymentIds.length) return

  const shouldDelete = window.confirm(`Delete ${paymentIds.length} selected payment${paymentIds.length > 1 ? 's' : ''}?`)
  if (!shouldDelete) return

  try {
    bulkDeleting.value = true
    actionMessage.value = ''

    const results = await Promise.allSettled(paymentIds.map((paymentId) => paymentApi.delete(paymentId)))
    const deletedIds = []
    let failedCount = 0

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        deletedIds.push(paymentIds[index])
      } else {
        failedCount += 1
      }
    })

    if (deletedIds.length) {
      payments.value = payments.value.filter((entry) => !deletedIds.includes(Number(entry.paymentId)))
      selectedPaymentIds.value = selectedPaymentIds.value.filter((id) => !deletedIds.includes(id))
    }

    if (failedCount === 0) {
      actionMessageType.value = 'success'
      actionMessage.value = `${deletedIds.length} payment${deletedIds.length > 1 ? 's were' : ' was'} deleted successfully.`
      toast.success(actionMessage.value)
      return
    }

    actionMessageType.value = 'error'
    actionMessage.value = `${deletedIds.length} payment${deletedIds.length !== 1 ? 's' : ''} deleted, ${failedCount} failed.`
    toast.error(actionMessage.value)
  } catch (err) {
    console.error('Error deleting selected payments:', err)
    actionMessageType.value = 'error'
    actionMessage.value = 'Failed to delete selected payments.'
    toast.error(actionMessage.value)
  } finally {
    bulkDeleting.value = false
  }
}
</script>

<template>
  <div class="payments-shell">
    <section class="payments-hero">
      <div class="hero-copy">
        <span class="hero-kicker">Shop Finance</span>
        <h1>Payments Overview</h1>
        <p>Track booking revenue, monitor payment activity, and review shop collection status in one place.</p>
      </div>
    </section>

    <section class="stats-grid">
      <article class="stat-card stat-card--green">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-label">Total Earnings</span>
          <strong class="stat-number">{{ formatCurrency(totalEarnings) }}</strong>
        </div>
      </article>

      <article class="stat-card stat-card--blue">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-label">Monthly Income</span>
          <strong class="stat-number">{{ formatCurrency(monthlyIncome) }}</strong>
        </div>
      </article>

      <article class="stat-card stat-card--amber">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-label">Today's Earnings</span>
          <strong class="stat-number">{{ formatCurrency(todayEarnings) }}</strong>
        </div>
      </article>

      <article class="stat-card stat-card--slate">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-label">Average Ticket</span>
          <strong class="stat-number">{{ formatCurrency(averageTicket) }}</strong>
        </div>
      </article>
    </section>

    <section class="payments-panel">

      <div class="results-bar">
        <span class="results-count">{{ filtered.length }} records</span>
        <div class="results-actions">
          <span class="results-meta">Showing {{ activeFilterLabel.toLowerCase() }} payment activity</span>
          <button
            v-if="selectedCount > 0"
            class="bulk-delete-btn"
            :disabled="bulkDeleting || deletingPaymentId !== null"
            @click="removeSelectedPayments"
          >
            {{ bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedCount})` }}
          </button>
        </div>
      </div>
      
      <p v-if="actionMessage" :class="['payments-feedback', `payments-feedback--${actionMessageType}`]">
        {{ actionMessage }}
      </p>

      <div class="table-container">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading payment activity...</p>
        </div>

        <div v-else-if="error" class="error-state">
          <p>{{ error }}</p>
          <button class="retry-btn" @click="fetchPayments">Retry</button>
        </div>

        <table v-else class="payments-table">
          <thead>
            <tr>
              <th class="select-cell">
                <input
                  class="select-checkbox"
                  type="checkbox"
                  :checked="allSelectableFilteredSelected"
                  :indeterminate.prop="selectedCount > 0 && !allSelectableFilteredSelected"
                  :disabled="!selectableFilteredPaymentIds.length || bulkDeleting || deletingPaymentId !== null"
                  @change="toggleSelectAllFiltered"
                />
              </th>
              <th>Payment</th>
              <th>Customer</th>
              <th>Vehicle</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filtered.length === 0">
              <td colspan="8" class="empty-state">
                <div class="empty-content">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                  <h3>No payment activity found</h3>
                  <p>Try changing the filters or wait for new booking activity to appear.</p>
                </div>
              </td>
            </tr>

            <tr v-for="payment in filtered" :key="`${payment.id}-${payment.bookingId}`" class="payment-row">
              <td class="select-cell" data-label="Select">
                <input
                  class="select-checkbox"
                  type="checkbox"
                  :checked="payment.paymentId ? selectedPaymentIds.includes(Number(payment.paymentId)) : false"
                  :disabled="!payment.paymentId || bulkDeleting || deletingPaymentId === payment.paymentId"
                  @change="togglePaymentSelection(payment)"
                />
              </td>
              <td class="primary-cell" data-label="Payment">
                <div class="cell-stack">
                  <strong :class="{ 'cell-placeholder': payment.idMissing }">{{ payment.id }}</strong>
                  <span :class="{ 'cell-placeholder': payment.bookingIdMissing }">{{ payment.bookingId }}</span>
                </div>
              </td>
              <td data-label="Customer">
                <div class="cell-stack">
                  <strong :class="{ 'cell-placeholder': payment.customerNameMissing }">{{ payment.customerName }}</strong>
                  <span :class="{ 'cell-placeholder': payment.customerEmailMissing }">{{ payment.customerEmail }}</span>
                </div>
              </td>
              <td data-label="Vehicle">
                <div class="cell-stack">
                  <strong :class="{ 'cell-placeholder': payment.vehicleNameMissing }">{{ payment.vehicleName }}</strong>
                  <span :class="{ 'cell-placeholder': payment.vehicleTypeMissing }">{{ payment.vehicleType }}</span>
                </div>
              </td>
              <td data-label="Date">
                <div class="cell-stack">
                  <strong :class="{ 'cell-placeholder': payment.dateLabelMissing }">{{ payment.dateLabel }}</strong>
                  <span :class="{ 'cell-placeholder': payment.dateMissing }">{{ payment.date }}</span>
                </div>
              </td>
              <td class="amount-cell" data-label="Amount">{{ formatCurrency(payment.amount) }}</td>
              <td class="status-cell" data-label="Status">
                <span :class="['payments-status-badge', normalizeStatus(payment.status)]">
                  {{ payment.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
