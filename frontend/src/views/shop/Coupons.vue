<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { couponApi, shopApi } from '@/services/api'
import '../../css/Coupons.css'

const { t } = useI18n()

const loading = ref(true)
const error = ref(null)
const coupons = ref([])
const ownerShops = ref([])
const activeShopId = ref('')
const shopsLoading = ref(false)
const shopLoadError = ref('')
const hasShops = computed(() => ownerShops.value.length > 0)
const shopNameMap = computed(() => {
  const map = new Map()
  ownerShops.value.forEach((shop) => {
    const label = shop.name || shop.address || `Shop #${shop.id}`
    map.set(String(shop.id), label)
  })
  return map
})

const normalizeActiveFlag = (value) => {
  if (value === undefined || value === null || value === '') return true
  if (value === false || value === 0 || value === '0' || value === 'false') return false
  return true
}

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const getOwnerId = () => {
  const user = getStoredUser()
  return user?.id ?? user?.user_id ?? null
}

const asArray = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

// Toast notification
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => (toast.value.show = false), 3000)
}

// Fetch coupons from database
const fetchCoupons = async () => {
  try {
    loading.value = true
    error.value = null
    const params = {}
    if (activeShopId.value) {
      params.shop_id = activeShopId.value
    }
    const response = await couponApi.getAll(params)
    const payload = response.data.data || response.data || []
    coupons.value = asArray(payload).map((c) => {
      const validFrom = c.valid_from || c.created_at || ''
      const validUntil = c.valid_until || ''
      const shopId = c.shop_id ?? c.shop?.id ?? ''
      const normalizedShopId = shopId ? String(shopId) : ''
      const shopName =
        c.shop?.name ||
        shopNameMap.value.get(normalizedShopId) ||
        (normalizedShopId ? `Shop #${normalizedShopId}` : 'General')
      return {
        id: c.id,
        code: c.code || '',
        discountPercent: c.discount_percent ?? null,
        discountAmount: c.discount_amount ?? null,
        validFrom,
        validUntil,
        isActive: normalizeActiveFlag(c.is_active),
        shopId: normalizedShopId,
        shopName
      }
    })
  } catch (err) {
    console.error('Error fetching coupons:', err)
    error.value = 'Failed to load coupons'
  } finally {
    loading.value = false
  }
}

const loadOwnerShops = async () => {
  try {
    shopsLoading.value = true
    shopLoadError.value = ''
    const response = await shopApi.getAll()
    const payload = response.data.data || response.data || []
    const ownerId = getOwnerId()
    const shops = asArray(payload)
    if (ownerId == null) {
      ownerShops.value = []
    } else {
      ownerShops.value = shops.filter((shop) => Number(shop.owner_id) === Number(ownerId))
    }
    if (!activeShopId.value && ownerShops.value.length) {
      activeShopId.value = String(ownerShops.value[0].id)
    }
    await fetchCoupons()
  } catch (err) {
    console.error('Failed to load shops:', err)
    shopLoadError.value = 'Unable to load your shops'
    ownerShops.value = []
  } finally {
    shopsLoading.value = false
  }
}

onMounted(async () => {
  await loadOwnerShops()
})

// Create / Edit modal
const showModal = ref(false)
const editId = ref(null)
const form = ref({
  code: '',
  discountPercent: '',
  discountAmount: '',
  validFrom: '',
  validUntil: '',
  isActive: true,
  shopId: ''
})

const openCreate = () => {
  if (shopsLoading.value) {
    showToast('Still loading your shops, please wait.', 'error')
    return
  }
  if (!ownerShops.value.length) {
    showToast('Please create a shop before adding coupons.', 'error')
    return
  }
  editId.value = null
  const today = new Date().toISOString().split('T')[0]
  const defaultShopId = activeShopId.value || ownerShops.value[0]?.id || ''
  form.value = {
    code: '',
    discountPercent: '',
    discountAmount: '',
    validFrom: today,
    validUntil: '',
    isActive: true,
    shopId: defaultShopId ? String(defaultShopId) : ''
  }
  showModal.value = true
}

const openEdit = (c) => {
  const selectedShopId = c.shopId || activeShopId.value || ownerShops.value[0]?.id || ''
  editId.value = c.id
  form.value = {
    code: c.code,
    discountPercent: c.discountPercent ?? '',
    discountAmount: c.discountAmount ?? '',
    validFrom: c.validFrom ? c.validFrom.split('T')[0] : '',
    validUntil: c.validUntil ? c.validUntil.split('T')[0] : '',
    isActive: c.isActive !== false,
    shopId: selectedShopId ? String(selectedShopId) : ''
  }
  showModal.value = true
}

const save = async () => {
  if (!form.value.code || !form.value.validUntil || !form.value.shopId) {
    showToast('Please fill in Code, Expire Date, and Shop selection.', 'error')
    return
  }
  const payload = {
    code: form.value.code.toUpperCase(),
    discount_percent: form.value.discountPercent !== '' ? Number(form.value.discountPercent) : null,
    discount_amount: form.value.discountAmount !== '' ? Number(form.value.discountAmount) : null,
    valid_from: form.value.validFrom || new Date().toISOString().split('T')[0],
    valid_until: form.value.validUntil,
    is_active: form.value.isActive ? 1 : 0,
    shop_id: form.value.shopId ? Number(form.value.shopId) : null
  }
  try {
    if (editId.value) {
      await couponApi.update(editId.value, payload)
      showToast('Coupon updated successfully!', 'success')
    } else {
      await couponApi.create(payload)
      showToast('Coupon created successfully!', 'success')
    }
    await fetchCoupons()
    showModal.value = false
  } catch (err) {
    console.error('Error saving coupon:', err)
    const message = err.response?.data?.message || err.response?.data?.errors?.code?.[0] || 'Failed to save coupon. Please try again.'
    showToast(message, 'error')
  }
}

// Delete confirmation modal
const showDeleteModal = ref(false)
const deleteId = ref(null)
const deleteCouponCode = ref('')

const confirmDelete = (c) => {
  deleteId.value = c.id
  deleteCouponCode.value = c.code || 'Unknown Coupon'
  showDeleteModal.value = true
}

const cancelDelete = () => {
  deleteId.value = null
  deleteCouponCode.value = ''
  showDeleteModal.value = false
}

const removeCoupon = async () => {
  if (!deleteId.value) return
  try {
    await couponApi.delete(deleteId.value)
    await fetchCoupons()
    showToast('Coupon deleted successfully!', 'success')
  } catch (err) {
    console.error('Error deleting coupon:', err)
    showToast('Failed to delete coupon', 'error')
  } finally {
    cancelDelete()
  }
}

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

const formatId = (id) => `C${String(id).padStart(3, '0')}`

const statusLabels = {
  active: 'Active',
  expired: 'Expired',
  inactive: 'Inactive',
  'not-started': 'Not started'
}

const couponStatusKey = (coupon) => {
  const today = new Date(new Date().toDateString())
  const from = coupon.validFrom ? new Date(coupon.validFrom) : null
  const until = coupon.validUntil ? new Date(coupon.validUntil) : null
  if (!coupon.isActive) {
    return 'inactive'
  }
  if (from && today < from) {
    return 'not-started'
  }
  if (until && today > until) {
    return 'expired'
  }
  return 'active'
}

const getStatusLabel = (key) => statusLabels[key] || statusLabels.active

const isExpired = (expireDate) => {
  if (!expireDate) return false
  return new Date(expireDate) < new Date()
}

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) return ''
  const stringValue = String(value)
  const escaped = stringValue.replace(/"/g, '""')
  if (/[",\n]/.test(escaped)) {
    return `"${escaped}"`
  }
  return escaped
}

const exportCoupons = () => {
  if (!coupons.value.length) {
    showToast('No coupons available to export.', 'error')
    return
  }

  const headers = ['ID', 'Code', 'Shop', 'Discount %', 'Discount Amount', 'Valid From', 'Expire Date', 'Status']
  const rows = coupons.value.map((c) => [
    formatId(c.id),
    c.code || '',
    c.shopName || 'General',
    c.discountPercent != null ? `${c.discountPercent}%` : '',
    c.discountAmount != null ? `$${c.discountAmount}` : '',
    formatDate(c.validFrom),
    formatDate(c.validUntil),
    getStatusLabel(couponStatusKey(c))
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvValue(cell)).join(','))
    .join('\n')

  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const fileName = `coupons_${new Date().toISOString().slice(0, 10)}.csv`
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
  showToast('Exported coupon list.', 'success')
}

</script>

<template>
  <div class="panel coupons-page">
      <div class="line top-line">
        <div>
          <h3>{{ $t('manageCoupons') }}</h3>
          <p class="muted">{{ $t('manageCouponsDesc') }}</p>
        </div>
        <div class="controls">
          <button class="primary add-btn" @click="openCreate" :disabled="shopsLoading || !hasShops">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            {{ shopsLoading ? $t('loadingShops') : $t('addNewCoupon') }}
          </button>
        </div>
        <p v-if="shopLoadError" class="shop-error">{{ shopLoadError }}</p>
      </div>

    <!-- Table Container -->
    <div class="table-container">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>{{ $t('loadingCoupons') }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <p>{{ error }}</p>
        <button class="retry-btn" @click="fetchCoupons">{{ $t('retry') }}</button>
      </div>

      <!-- Data Table -->
      <table v-else class="coupons-table">
        <thead>
          <tr>
            <th>{{ $t('id') }}</th>
            <th>{{ $t('code') }}</th>
            <th>{{ $t('shop') }}</th>
            <th>{{ $t('discountPercent') }}</th>
            <th>{{ $t('discountAmount') }}</th>
            <th>{{ $t('validFrom') }}</th>
            <th>{{ $t('expireDate') }}</th>
            <th>{{ $t('status') }}</th>
            <th>{{ $t('actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <!-- Empty State -->
          <tr v-if="coupons.length === 0">
            <td colspan="9" class="empty-state">
              <div class="empty-content">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M3 8a2 2 0 0 1 2-2h14v4a2 2 0 0 0 0 4v4H5a2 2 0 0 1-2-2z"/>
                  <path d="M9 6v12M15 6v12"/>
                </svg>
                <p>{{ $t('noCouponsYet') }}</p>
                <button class="create-btn-sm" @click="openCreate">{{ $t('createFirstCoupon') }}</button>
              </div>
            </td>
          </tr>

          <!-- Coupon Rows -->
          <tr v-for="c in coupons" :key="c.id">
            <td class="id-cell">{{ formatId(c.id) }}</td>
            <td class="code-cell">{{ c.code }}</td>
            <td class="shop-name-cell">{{ c.shopName }}</td>
            <td class="percent-cell">
              <span v-if="c.discountPercent" class="discount-percent">{{ c.discountPercent }}%</span>
              <span v-else class="no-data">—</span>
            </td>
            <td class="amount-cell">
              <span v-if="c.discountAmount" class="discount-amount">${{ c.discountAmount }}</span>
              <span v-else class="no-data">—</span>
            </td>
            <td class="date-cell">{{ formatDate(c.validFrom) }}</td>
            <td class="date-cell" :class="{ 'expired-date': isExpired(c.validUntil) }">
              {{ formatDate(c.validUntil) }}
            </td>
            <td class="status-cell">
              <span class="status-badge" :class="`status-${couponStatusKey(c)}`">
                {{ getStatusLabel(couponStatusKey(c)) }}
              </span>
            </td>
            <td class="actions-cell">
              <div class="coupon-actions">
                <button class="coupon-action edit" @click="openEdit(c)" title="Edit">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button class="coupon-action delete" @click="confirmDelete(c)" title="Delete">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create / Edit Modal - Matching Vehicles.vue Style -->
    <div v-if="showModal" class="add-vehicle-overlay" @click.self="showModal = false">
      <div class="add-vehicle-modal">
        <!-- Header -->
        <div class="add-vehicle-header">
          <h2>{{ editId ? $t('editCoupon') : $t('addNewCoupon') }}</h2>
          <button class="close-btn" @click="showModal = false">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="add-vehicle-content">
          <!-- Left Column -->
          <div class="add-vehicle-left">
            <!-- Coupon Information -->
          <div class="form-card">
            <h3 class="card-title">{{ $t('couponInformation') }}</h3>
            <div class="form-group">
              <label>{{ $t('couponCode') }}</label>
              <input v-model="form.code" placeholder="e.g., SUMMER2024" />
            </div>
            <div class="form-group">
              <label>{{ $t('shop') }}</label>
              <select v-model="form.shopId">
                <option disabled value="">{{ $t('selectAShop') }}</option>
                <option v-for="shop in ownerShops" :key="shop.id" :value="String(shop.id)">
                  {{ shop.name || shop.address || `Shop #${shop.id}` }}
                </option>
              </select>
            </div>
          </div>

            <!-- Discount -->
            <div class="form-card">
              <h3 class="card-title">{{ $t('discount') }}</h3>
              <div class="form-row">
                <div class="form-group">
                  <label>{{ $t('discountPercent') }}</label>
                  <input v-model="form.discountPercent" type="number" min="0" max="100" placeholder="0" />
                </div>
                <div class="form-group">
                  <label>{{ $t('discountAmount') }}</label>
                  <input v-model="form.discountAmount" type="number" min="0" placeholder="0" />
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column -->
          <div class="add-vehicle-right">
            <!-- Validity Period -->
            <div class="form-card">
              <h3 class="card-title">{{ $t('validityPeriod') }}</h3>
              <div class="form-row">
              <div class="form-group">
                <label>{{ $t('validFrom') }}</label>
                <input v-model="form.validFrom" type="date" />
              </div>
              <div class="form-group">
                <label>{{ $t('expireDate') }}</label>
                <input v-model="form.validUntil" type="date" />
              </div>
              </div>
            </div>

            <!-- Status -->
            <div class="form-card">
              <h3 class="card-title">{{ $t('status') }}</h3>
              <div class="form-group">
                <label>{{ $t('couponStatus') }}</label>
                <select v-model="form.isActive">
                  <option :value="true">{{ $t('active') }}</option>
                  <option :value="false">{{ $t('inactive') }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="add-vehicle-footer">
          <button class="discard-btn" @click="showModal = false">{{ $t('cancel') }}</button>
          <button class="store-btn" @click="save">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            {{ editId ? $t('updateCoupon') : $t('storeCoupon') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <div v-if="toast.show" :class="['toast', toast.type]">
      {{ toast.message }}
    </div>
  </div>

  <!-- Delete Confirmation Modal -->
  <div v-if="showDeleteModal" class="delete-overlay" @click.self="cancelDelete">
    <div class="delete-modal">
      <div class="delete-icon-wrapper">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </div>
      <h3 class="delete-title">{{ $t('deleteCoupon') }}</h3>
      <p class="delete-message">{{ $t('deleteCouponConfirm') }}</p>
      <p class="delete-coupon-code">{{ deleteCouponCode }}</p>
      <p class="delete-warning">{{ $t('thisActionCannotBeUndone') }}</p>
      <div class="delete-actions">
        <button class="delete-cancel-btn" @click="cancelDelete">{{ $t('cancel') }}</button>
        <button class="delete-confirm-btn" @click="removeCoupon">{{ $t('delete') }}</button>
      </div>
    </div>
  </div>
</template>
