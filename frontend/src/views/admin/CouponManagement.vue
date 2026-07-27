<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { couponApi, shopApi } from '../../services/api.js'
import { useToast } from '../../composables/useToast.js'
import ConfirmModal from '../../components/ConfirmModal.vue'

const toast = useToast()
const route = useRoute()

// Format date to YYYY-MM-DD
const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toISOString().split('T')[0]
}

const getStatus = (coupon) => {
  if (!coupon.is_active) return 'Inactive';
  const today = new Date().toISOString().split('T')[0];
  if (coupon.valid_from && today < coupon.valid_from) return 'Not Started';
  if (coupon.valid_until && today > coupon.valid_until) return 'Expired';
  return 'Active';
};

const getBadgeClass = (status) => {
  switch (status) {
    case 'Active': return 'badge badge-green';
    case 'Not Started': return 'badge badge-blue';
    case 'Expired': return 'badge badge-red';
    case 'Inactive': return 'badge badge-gray';
    default: return 'badge';
  }
};

const loading = ref(false)
const items = ref([])

const page = ref(1)
const perPage = 8

const showCreate = ref(false)
const showEdit = ref(false)
const showView = ref(false)
const showDeleteConfirm = ref(false)

const deleteTarget = ref(null)
const selectedCoupon = ref(null)
const shops = ref([])
const shopsLoading = ref(false)
const shopsError = ref('')

const form = ref({
  id: null,
  code: '',
  discount_percent: null,
  discount_amount: null,
  minimum_amount: null,
  valid_from: '',
  valid_until: '',
  usage_limit: null,
  is_active: true,
  shop_id: ''
})

const query = computed(() => String(route.query.q || '').trim().toLowerCase())

const asArray = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

const shopLabel = (shop, fallbackId) => {
  if (shop) {
    if (shop.name) return shop.name
    if (shop.address) return shop.address
    if (shop.location) return shop.location
  }
  if (fallbackId) return `Shop #${fallbackId}`
  return 'General (all shops)'
}

const load = async () => {
  loading.value = true
  try {
    const { data } = await couponApi.getAll()
    const payload = data?.data?.data || data?.data || data
    items.value = asArray(payload)
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to load coupons.')
    items.value = []
  } finally {
    loading.value = false
  }
}

const loadShops = async () => {
  shopsLoading.value = true
  shopsError.value = ''
  try {
    const { data } = await shopApi.getAll()
    const payload = data?.data?.data || data?.data || data
    shops.value = asArray(payload)
  } catch (err) {
    console.error('Failed to load shops:', err)
    shopsError.value = 'Failed to load shops'
    shops.value = []
  } finally {
    shopsLoading.value = false
  }
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
})

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === '') return '—'
  return currencyFormatter.format(Number(value))
}

const parseOptionalNumber = (value) => {
  if (value === undefined || value === null || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

const toDateOnly = (value) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().split('T')[0]
}

const couponStatusKey = (coupon) => {
  if (!coupon) return 'inactive'
  const today = new Date(new Date().toDateString())
  const from = coupon.valid_from ? new Date(coupon.valid_from) : null
  const until = coupon.valid_until ? new Date(coupon.valid_until) : null
  if (!coupon.is_active) {
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

const selectedDiscountText = computed(() => {
  const coupon = selectedCoupon.value
  if (!coupon) return '—'
  if (coupon.discount_percent) return `${coupon.discount_percent}% off`
  if (coupon.discount_amount) return `${formatCurrency(coupon.discount_amount)} off`
  return '—'
})

const selectedMinimumText = computed(() => {
  const coupon = selectedCoupon.value
  if (!coupon) return '—'
  if (coupon.minimum_amount === null || coupon.minimum_amount === undefined || coupon.minimum_amount === '') return 'No minimum'
  return formatCurrency(coupon.minimum_amount)
})

const selectedUsageText = computed(() => {
  const coupon = selectedCoupon.value
  if (!coupon) return '—'
  if (coupon.usage_limit === null || coupon.usage_limit === undefined || coupon.usage_limit === '') return 'Unlimited'
  return String(coupon.usage_limit)
})

const selectedValidFrom = computed(() => formatDate(selectedCoupon.value?.valid_from))
const selectedValidUntil = computed(() => formatDate(selectedCoupon.value?.valid_until))

const normalizeDateInput = (value) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value).split('T')[0]
  return parsed.toISOString().split('T')[0]
}

const buildPayload = () => {
  const code = String(form.value.code || '').trim().toUpperCase()
  const validFrom = normalizeDateInput(form.value.valid_from)
  const validUntil = normalizeDateInput(form.value.valid_until)
  return {
    code,
    discount_percent: parseOptionalNumber(form.value.discount_percent),
    discount_amount: parseOptionalNumber(form.value.discount_amount),
    minimum_amount: parseOptionalNumber(form.value.minimum_amount),
    usage_limit: parseOptionalNumber(form.value.usage_limit),
    valid_from: validFrom,
    valid_until: validUntil,
    is_active: form.value.is_active ? 1 : 0,
    shop_id: form.value.shop_id ? Number(form.value.shop_id) : null
  }
}

const validatePayloadDates = (payload) => {
  if (!payload.valid_from || !payload.valid_until) return true
  if (payload.valid_until < payload.valid_from) {
    toast.error('Valid until must be the same day or after valid from.')
    return false
  }
  return true
}

const isSubmitting = ref(false)

const filtered = computed(() => {
  const q = query.value
  if (!q) return items.value
  return items.value.filter((c) => `${c.code || ''} ${c.id || ''}`.toLowerCase().includes(q))
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / perPage)))
watch(totalPages, (next) => { if (page.value > next) page.value = next })

const paged = computed(() => {
  const start = (page.value - 1) * perPage
  return filtered.value.slice(start, start + perPage)
})

const openCreate = () => {
  showCreate.value = true
  showEdit.value = false
  form.value = {
    id: null,
    code: '',
    discount_percent: null,
    discount_amount: null,
    minimum_amount: null,
    valid_from: '',
    valid_until: '',
    usage_limit: null,
    is_active: true,
    shop_id: shops.value[0]?.id ? String(shops.value[0].id) : ''
  }
}

const openView = (c) => {
  selectedCoupon.value = c
  showView.value = true
}

const openEdit = (c) => {
  showEdit.value = true
  showCreate.value = false
  form.value = {
    id: c.id,
    code: c.code || '',
    discount_percent: c.discount_percent ?? null,
    discount_amount: c.discount_amount ?? null,
    minimum_amount: c.minimum_amount ?? null,
    valid_from: toDateOnly(c.valid_from),
    valid_until: toDateOnly(c.valid_until),
    usage_limit: c.usage_limit ?? null,
    is_active: Boolean(c.is_active),
    shop_id: c.shop_id ? String(c.shop_id) : c.shop?.id ? String(c.shop.id) : ''
  }
}

const closeModals = () => {
  showCreate.value = false
  showEdit.value = false
  showView.value = false
  selectedCoupon.value = null
}

const submitCreate = async () => {
  const code = String(form.value.code || '').trim()
  if (!code) { toast.error('Coupon code is required.'); return }
  if (!form.value.valid_from || !form.value.valid_until) { toast.error('Valid from / until is required.'); return }
  try {
    const payload = buildPayload()
    if (!validatePayloadDates(payload)) return
    isSubmitting.value = true
    await couponApi.create(payload)
    toast.success('Coupon created successfully.')
    closeModals()
    await load()
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to create coupon.')
  } finally {
    isSubmitting.value = false
  }
}

const submitEdit = async () => {
  const id = form.value.id
  if (!id) return
  const code = String(form.value.code || '').trim()
  if (!code) { toast.error('Coupon code is required.'); return }
  if (!form.value.valid_from || !form.value.valid_until) { toast.error('Valid from / until is required.'); return }
  try {
    const payload = buildPayload()
    if (!validatePayloadDates(payload)) return
    isSubmitting.value = true
    await couponApi.update(id, payload)
    toast.success('Coupon updated successfully.')
    closeModals()
    await load()
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to update coupon.')
  } finally {
    isSubmitting.value = false
  }
}

const requestDelete = (c) => { deleteTarget.value = c; showDeleteConfirm.value = true }


const deleteMessage = computed(() => {
  const code = String(deleteTarget.value?.code || '').trim()
  return code ? `Are you sure you want to delete coupon "${code}"?` : 'Are you sure you want to delete this coupon?'
})

const confirmDelete = async () => {
  const c = deleteTarget.value
  if (!c?.id) return
  try {
    await couponApi.delete(c.id)
    toast.success('Coupon deleted.')
    await load()
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to delete coupon.')
  } finally {
    showDeleteConfirm.value = false
    deleteTarget.value = null
  }
}

onMounted(async () => {
  await loadShops()
  await load()
})
</script>

<template>
  <section class="admin-page">
    <header class="page-head">
      <div>
        <h1 class="page-title">Coupon Management</h1>
        <p class="page-subtitle">Create and manage discount coupons.</p>
      </div>
      <button type="button" class="btn btn-primary btn-block" @click="openCreate">
        <i class="fa-solid fa-plus" aria-hidden="true"></i>
        <span>Add Coupon</span>
      </button>
    </header>

    <section class="card">
      <div class="card-head">
        <div>
          <h2 class="card-title">Coupons</h2>
          <p class="card-subtitle">{{ filtered.length }} total</p>
        </div>
      </div>

      <div v-if="loading" class="muted">Loading…</div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>CODE</th>
              <th class="num">PERCENT</th>
              <th class="num">AMOUNT</th>
              <th>VALID</th>
              <th>ACTIVE</th>
              <th class="actions">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in paged" :key="c.id">
              <td class="shop-cell">
                <span class="shop-icon square" aria-hidden="true"><i class="fa-solid fa-ticket"></i></span>
                <div class="shop-meta">
                  <div class="shop-name">{{ c.code }}</div>
                  <div class="shop-id">ID: {{ c.id }}</div>
                </div>
              </td>
              <td class="num">{{ c.discount_percent !== null ? c.discount_percent + '%' : '—' }}</td>
<td class="num">{{ c.discount_amount !== null ? '$' + c.discount_amount : '—' }}</td>
<td class="muted">{{ formatDate(c.valid_from) }} → {{ formatDate(c.valid_until) }}</td>
<td><span :class="getBadgeClass(getStatus(c))">{{ getStatus(c) }}</span></td>
              <td class="actions">
                <button type="button" class="icon-action" title="View" @click="openView(c)"><i class="fa-regular fa-eye"></i></button>
                <button type="button" class="icon-action" title="Edit" @click="openEdit(c)"><i class="fa-regular fa-pen-to-square"></i></button>
                <button type="button" class="icon-action" title="Delete" @click="requestDelete(c)"><i class="fa-regular fa-trash-can"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="table-footer">
        <div class="muted">
          SHOWING {{ (page - 1) * perPage + 1 }} TO {{ Math.min(page * perPage, filtered.length) }} OF {{ filtered.length }} COUPONS
        </div>
        <div class="pager">
          <button type="button" class="pager-btn" :disabled="page === 1" @click="page -= 1">‹</button>
          <button type="button" class="pager-btn is-active">{{ page }}</button>
          <button type="button" class="pager-btn" :disabled="page === totalPages" @click="page += 1">›</button>
        </div>
      </div>
    </section>

    <div v-if="showCreate || showEdit" class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal">
        <div class="modal-head">
          <div>
            <div class="modal-title">{{ showEdit ? 'Edit Coupon' : 'Create Coupon' }}</div>
            <div class="modal-sub">Assign the coupon to a shop and control its validity.</div>
          </div>
          <button type="button" class="icon-action" title="Close" @click="closeModals"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div class="modal-body form-grid">
          <label class="field">
            <span class="field-label">Code</span>
            <input v-model="form.code" type="text" placeholder="SUMMER21" />
          </label>
          <label class="field">
            <span class="field-label">Shop</span>
            <select v-model="form.shop_id">
              <option value="">General (all shops)</option>
              <option v-for="shop in shops" :key="shop.id" :value="String(shop.id)">
                {{ shopLabel(shop, shop.id) }}
              </option>
            </select>
            <small class="muted muted-block">
              Leave blank to apply the coupon across all shops.
            </small>
          </label>
          <label class="field">
            <span class="field-label">Discount Percent</span>
            <input v-model.number="form.discount_percent" type="number" min="0" max="100" step="0.01" />
          </label>
          <label class="field">
            <span class="field-label">Discount Amount</span>
            <input v-model.number="form.discount_amount" type="number" min="0" step="0.01" />
          </label>
          <label class="field">
            <span class="field-label">Minimum Amount</span>
            <input v-model.number="form.minimum_amount" type="number" min="0" step="0.01" />
          </label>
          <label class="field">
            <span class="field-label">Usage Limit</span>
            <input v-model.number="form.usage_limit" type="number" min="0" placeholder="Unlimited" />
          </label>
          <label class="field">
            <span class="field-label">Valid From</span>
            <input v-model="form.valid_from" type="date" />
          </label>
          <label class="field">
            <span class="field-label">Valid Until</span>
            <input v-model="form.valid_until" type="date" />
          </label>
          <label class="field">
            <span class="field-label">Active</span>
            <select v-model="form.is_active">
              <option :value="true">Yes</option>
              <option :value="false">No</option>
            </select>
          </label>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="closeModals">Cancel</button>
          <button type="button" class="btn btn-primary" :disabled="isSubmitting" @click="showEdit ? submitEdit : submitCreate">
            {{ showEdit ? 'Update' : 'Create' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showView && selectedCoupon" class="modal-backdrop" role="dialog" aria-modal="true" @click.self="closeModals">
      <div class="modal coupon-view-modal">
        <div class="modal-head">
          <div>
            <div class="modal-title">Coupon Details</div>
            <div class="modal-sub">{{ shopLabel(selectedCoupon.shop, selectedCoupon.shop_id) }}</div>
          </div>
          <button type="button" class="icon-action" title="Close" @click="closeModals"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body coupon-details-grid">
          <div class="detail-card">
            <span class="detail-label">Code</span>
            <strong>{{ selectedCoupon.code }}</strong>
          </div>
          <div class="detail-card">
            <span class="detail-label">Status</span>
            <span class="badge" :class="getBadgeClass(getStatus(selectedCoupon))">{{ getStatus(selectedCoupon) }}</span>
          </div>
          <div class="detail-card">
            <span class="detail-label">Discount</span>
            <strong>{{ selectedDiscountText }}</strong>
          </div>
          <div class="detail-card">
            <span class="detail-label">Minimum Spend</span>
            <strong>{{ selectedMinimumText }}</strong>
          </div>
          <div class="detail-card">
            <span class="detail-label">Usage Limit</span>
            <strong>{{ selectedUsageText }}</strong>
          </div>
          <div class="detail-card">
            <span class="detail-label">Valid From</span>
            <strong>{{ selectedValidFrom }}</strong>
          </div>
          <div class="detail-card">
            <span class="detail-label">Valid Until</span>
            <strong>{{ selectedValidUntil }}</strong>
          </div>
        </div>
      </div>
    </div>

    <ConfirmModal
      v-model="showDeleteConfirm"
      title="Delete Coupon"
      :message="deleteMessage"
      cancel-text="Cancel"
      confirm-text="Yes"
      variant="danger"
      @confirm="confirmDelete"
    />
  </section>
</template>

<style scoped>
.code-block {
  margin: 0;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--mp-border);
  background: rgba(148, 163, 184, 0.08);
  overflow: auto;
  max-height: 52vh;
  font-size: 12px;
}

.modal-body .field select {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--mp-border);
  background: #fff;
}

.coupon-details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.detail-card {
  padding: 12px 14px;
  border-radius: 12px;
  background: #f9fafb;
  border: 1px solid var(--mp-border);
}

.coupon-view-modal {
  width: min(90vw, 640px);
}

.detail-label {
  display: block;
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 4px;
}

.badge {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}
</style>
