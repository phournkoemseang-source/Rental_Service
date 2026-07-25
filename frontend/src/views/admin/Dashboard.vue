<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAdminStore } from '../../stores/adminStore.js'
import { useToast } from '../../composables/useToast.js'
import userService from '../../services/userService.js'
import CountUp from '../../components/CountUp.vue'

const { t } = useI18n()

const toast = useToast()
const router = useRouter()
const admin = useAdminStore()

// Fast access helpers (non-reactive for core logic)
const getArr = (v) => v || []
const getObj = (v, d = {}) => ({ ...d, ...v })

const currentUser = computed(() => userService.getCurrentUser())
const isAdmin = computed(() => {
  const role = String(currentUser.value?.role || currentUser.value?.user_type || '').toLowerCase()
  return role === 'admin'
})
const adminName = computed(() => {
  const name = currentUser.value?.name
  return name ? name.split(' ')[0] : 'Admin'
})


const animated = ref(false)
const hoveredRevenueIndex = ref(null)
const money0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

// Optimized stats computation (Direct access, no spread if possible)
const stats = computed(() => {
  const totals = admin.totals
  const tr = admin.trends
  const fmtNumber = admin.formatted.fmtNumber
  const fmtMoney = admin.formatted.fmtMoneyCompact

  return [
    { key: 'users', label: t('totalUsers').toUpperCase(), raw: totals.totalUsers, formatter: fmtNumber, trend: tr.users, icon: 'fa-solid fa-users', tint: 'tint-blue', to: '/admin/users' },
    { key: 'shops', label: t('totalShops').toUpperCase(), raw: totals.totalShops, formatter: fmtNumber, trend: tr.shops, icon: 'fa-regular fa-building', tint: 'tint-purple', to: '/admin/shops' },
    { key: 'vehicles', label: t('totalVehicles').toUpperCase(), raw: totals.totalVehicles, formatter: fmtNumber, trend: tr.vehicles, icon: 'fa-solid fa-motorcycle', tint: 'tint-orange', to: '/admin/vehicles' },
    { key: 'bookings', label: t('totalBookings').toUpperCase(), raw: totals.totalBookings, formatter: fmtNumber, trend: tr.bookings, icon: 'fa-regular fa-calendar-check', tint: 'tint-green', to: '/admin/bookings' },
    { key: 'revenue', label: t('totalRevenue').toUpperCase(), raw: admin.paymentTotal, formatter: fmtMoney, trend: tr.revenue, icon: 'fa-solid fa-sack-dollar', tint: 'tint-cyan', to: '/admin/reports' }
  ]
})

const buildFallbackRevenueDays = () => {
  const today = new Date()
  const days = []
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    days.push({
      key: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      value: 0
    })
  }
  return days
}

const commissionRate = computed(() => Number(admin.state?.commission_rate || 0.15))
const revenueDailySeries = computed(() => {
  const raw = getArr(admin.bookingGrossByDay)
  const points = raw.length ? raw : buildFallbackRevenueDays()
  return points.map((point) => {
    const earnings = Number(point.value || 0)
    const commission = Math.round(earnings * commissionRate.value)
    return {
      key: point.key,
      label: point.label,
      earnings,
      commission,
      net: Math.max(0, earnings - commission)
    }
  })
})

const niceMax = (value, floor = 1000) => {
  if (value <= 0) return floor
  if (value < 2000) return Math.ceil(value / 250) * 250
  return Math.ceil(value / 500) * 500
}

const revenueBarMax = computed(() => {
  const peak = Math.max(...revenueDailySeries.value.flatMap((row) => [row.earnings, row.commission, row.net]), 0)
  return niceMax(peak, 1000)
})

const revenueTooltipData = computed(() => {
  const idx = hoveredRevenueIndex.value
  if (idx == null || idx < 0 || idx >= revenueDailySeries.value.length) return null
  const row = revenueDailySeries.value[idx]
  const centerX = 92 + (idx * 92)
  const width = 202
  const height = 96
  const peak = Math.max(row.earnings, row.commission, row.net)
  const peakY = 246 - ((peak / (revenueBarMax.value || 1)) * 210)
  const x = Math.max(20, Math.min(centerX - (width / 2), 716 - width))
  const y = Math.max(12, peakY - height - 10)
  return { row, x, y, width, height }
})

const fleetTypes = computed(() => {
  const c = admin.vehicleTypeCounts
  const total = c.motorbike + c.bicycle + c.car + c.other || 1
  const getPct = (v) => Math.round((v / total) * 100)
  return [
    { key: 'motorbikes', label: 'Motorbikes', value: getPct(c.motorbike), icon: 'fa-solid fa-motorcycle', bar: 'bar-cyan' },
    { key: 'bicycles', label: 'Bicycles', value: getPct(c.bicycle), icon: 'fa-solid fa-person-biking', bar: 'bar-green' },
    { key: 'cars', label: 'Cars', value: getPct(c.car), icon: 'fa-solid fa-car-side', bar: 'bar-orange' }
  ]
})

// Lightweight status mapping
const statusStyles = {
  VERIFIED: 'badge badge-green', ACTIVE: 'badge badge-green',
  INACTIVE: 'badge badge-yellow', PENDING: 'badge badge-yellow',
  SUSPENDED: 'badge badge-red', BLOCKED: 'badge badge-red'
}
const statusBadgeClass = (s) => statusStyles[String(s || '').toUpperCase()] || 'badge'

const vehicleIcon = (type) => {
  const t = String(type || '').toLowerCase()
  if (t.includes('bike') && !t.includes('bicycle')) return 'fa-solid fa-motorcycle'
  if (t.includes('bicycle')) return 'fa-solid fa-person-biking'
  if (t.includes('car')) return 'fa-solid fa-car-side'
  return 'fa-solid fa-shop'
}

const statusLabel = (s) => {
  const r = String(s || '').toUpperCase()
  if (['VERIFIED', 'ACTIVE'].includes(r)) return 'ACTIVE'
  if (['INACTIVE', 'PENDING'].includes(r)) return 'PENDING'
  if (['SUSPENDED', 'BLOCKED'].includes(r)) return 'SUSPENDED'
  return r || '—'
}

const ownerName = (s) => s?.owner?.name || s?.owner_name || s?.owner || '—'
const shopLocation = (s) => s?.location || s?.address || s?.city || '—'

const resolveShopImageUrl = (value) => {
  // Use userService helper to build full URL for stored images (handles storage/, absolute URLs, data URIs)
  try {
    return userService.getAvatarUrl(value) || ''
  } catch (e) {
    const image = value ? String(value).trim() : ''
    if (!image) return ''
    if (/^(https?:\/\/|data:|blob:)/i.test(image)) return image
    const normalized = image.replace(/\\/g, '/').replace(/^\/+/, '')
    if (normalized.startsWith('storage/')) return `/${normalized}`
    return `/storage/${normalized.replace(/^storage\//, '')}`
  }
}

const shopImage = (shop) => {
  const value = shop?.img_url_full || shop?.img_url || shop?.image_url || shop?.image || shop?.photo || ''
  if (typeof value !== 'string') return ''
  return resolveShopImageUrl(value)
}

// Optimized fleet mapping using a simple object instead of Map for faster lookups in template
const fleetCountMap = computed(() => {
  const res = {}
  getArr(admin.state.vehicles).forEach(v => {
    const id = String(v.shop_id || v.shop?.id || '')
    if (id) res[id] = (res[id] || 0) + 1
  })
  return res
})

const statusUpdatingShopId = ref(null)
const editSaving = ref(false)
const editImageFile = ref(null)
const editImagePreview = ref('')

const onVerify = async (shop) => {
  if (!shop?.id || statusUpdatingShopId.value) return
  try {
    statusUpdatingShopId.value = shop.id
    await admin.setShopStatus(shop.id, 'active')
    toast.success('Shop verified.')
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to verify shop.')
  } finally {
    statusUpdatingShopId.value = null
  }
}

const onReactivate = async (shop) => {
  if (!shop?.id || statusUpdatingShopId.value) return
  try {
    statusUpdatingShopId.value = shop.id
    await admin.setShopStatus(shop.id, 'active')
    toast.success('Shop reactivated.')
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to reactivate shop.')
  } finally {
    statusUpdatingShopId.value = null
  }
}

const openStat = (c) => c.to && router.push(c.to)
const openShops = () => router.push('/admin/shops')
const addNewShop = () => router.push('/admin/shops?create=1')

const showView = ref(false)
const showEdit = ref(false)
const selectedShop = ref(null)
const editForm = ref({ id: null, name: '', location: '', status: 'inactive', img_url: '' })

const openView = (s) => { selectedShop.value = s; showView.value = true }
const openEdit = (s) => {
  editForm.value = {
    id: s.id,
    name: s.name || '',
    location: s.location || '',
    status: String(s.status || 'inactive').toLowerCase(),
    img_url: s.img_url || ''
  }
  editImageFile.value = null
  editImagePreview.value = ''
  showEdit.value = true
}
const closeView = () => { showView.value = false; selectedShop.value = null }
const closeEdit = () => {
  showEdit.value = false
  editSaving.value = false
  editImageFile.value = null
  editImagePreview.value = ''
}

const onEditImageChange = (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  if (!file.type?.startsWith('image/')) {
    toast.error('Please select a valid image file.')
    return
  }
  editImageFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => {
    editImagePreview.value = String(e.target?.result || '')
  }
  reader.readAsDataURL(file)
}

const submitEdit = async () => {
  if (editSaving.value) return
  const id = editForm.value.id
  if (!id || !editForm.value.name.trim()) {
    if (!editForm.value.name.trim()) toast.error('Shop name is required.')
    return
  }
  try {
    editSaving.value = true
    let payload = {
      name: editForm.value.name.trim(),
      location: editForm.value.location || null,
      status: editForm.value.status || 'inactive',
      img_url: editForm.value.img_url || null
    }
    if (editImageFile.value) {
      const formData = new FormData()
      formData.append('name', editForm.value.name.trim())
      if (editForm.value.location) formData.append('location', editForm.value.location)
      formData.append('status', editForm.value.status || 'inactive')
      formData.append('img_url', editImageFile.value)
      payload = formData
    }
    await admin.updateShop(id, payload)
    toast.success('Shop updated.')
    closeEdit()
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Update failed.')
  } finally {
    editSaving.value = false
  }
}

const showRevenueTooltip = (idx) => { hoveredRevenueIndex.value = idx }
const hideRevenueTooltip = () => { hoveredRevenueIndex.value = null }

const triggerAnimation = () => {
  animated.value = false
  nextTick(() => { requestAnimationFrame(() => { animated.value = true }) })
}

onMounted(() => {
  admin.load().then(triggerAnimation).catch(() => {})
})

// Fast watch using stringified key to avoid deep watch overhead
watch(
  () => getArr(admin.bookingGrossByDay).map((d) => `${d.key}:${d.value || 0}`).join('|'),
  triggerAnimation
)
</script>

<template>
  <section class="admin-page" :class="{ 'hide-status-overlay': isAdmin }">
    <header class="page-head">
      <div>
        <h1 class="page-title">{{ t('adminDashboard') }}</h1>
        <p class="page-subtitle">{{ t('welcomeBack', { name: adminName }) }}. {{ t('adminDashboardDesc') }}</p>
      </div>
    </header>

    <div class="stat-grid">
      <article v-for="card in stats" :key="card.key" class="stat-card" role="button" tabindex="0" @click="openStat(card)">
        <div class="stat-top">
          <div class="stat-icon" :class="card.tint" aria-hidden="true"><i :class="card.icon"></i></div>
          <div class="stat-trend" :class="card.trend >= 0 ? 'trend-up' : 'trend-down'">
            <span>{{ card.trend >= 0 ? '+' : '' }}{{ card.trend }}%</span>
          </div>
        </div>
        <div class="stat-value"><CountUp :value="card.raw" :formatter="card.formatter" /></div>
        <div class="stat-label">{{ card.label }}</div>
      </article>
    </div>

    <section class="card">
      <div class="card-head">
        <div>
          <h2 class="card-title">{{ t('recentShops') }}</h2>
          <p class="card-subtitle">{{ t('adminDashboardDesc') }}</p>
        </div>
        <button type="button" class="btn btn-ghost" @click="openShops">{{ t('viewAll') }}</button>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t('shopName').toUpperCase() }}</th>
              <th>{{ t('shopOwner').toUpperCase() }}</th>
              <th>{{ t('shopLocation').toUpperCase() }}</th>
              <th class="num">{{ t('totalVehicles').toUpperCase() }}</th>
              <th>{{ t('status').toUpperCase() }}</th>
              <th class="actions">{{ t('actions').toUpperCase() }}</th>
            </tr>
          </thead>
          <tbody v-if="admin.recentShops.length">
            <tr v-for="shop in admin.recentShops" :key="shop.id">
              <td class="shop-cell">
                <span class="shop-icon square" aria-hidden="true">
                  <img v-if="shopImage(shop)" class="shop-photo" :src="shopImage(shop)" :alt="shop.name" />
                  <i v-else :class="vehicleIcon(shop.vehicle_type)"></i>
                </span>
                <div class="shop-meta">
                  <div class="shop-name">{{ shop.name }}</div>
                  <div class="shop-id">ID: #{{ shop.id }}</div>
                </div>
              </td>
              <td>{{ ownerName(shop) }}</td>
              <td class="muted">{{ shopLocation(shop) }}</td>
              <td class="num">
                <strong>{{ fleetCountMap[String(shop.id)] || shop.fleet_size || 0 }}</strong> <span class="muted">{{ t('vehicles').toUpperCase() }}</span>
              </td>
              <td><span :class="statusBadgeClass(shop.status)">{{ statusLabel(shop.status) }}</span></td>
              <td class="actions">
                <button type="button" class="icon-action" title="View" @click="openView(shop)"><i class="fa-regular fa-eye"></i></button>
                <button type="button" class="icon-action" title="Edit" :disabled="statusUpdatingShopId === shop.id || editSaving" @click="openEdit(shop)"><i class="fa-regular fa-pen-to-square"></i></button>
                <button v-if="statusLabel(shop.status) === 'PENDING'" type="button" class="btn btn-soft" :disabled="statusUpdatingShopId === shop.id || editSaving" @click="onVerify(shop)">
                  {{ statusUpdatingShopId === shop.id ? 'Verifying...' : 'Verify' }}
                </button>
                <button v-else-if="statusLabel(shop.status) === 'SUSPENDED'" type="button" class="btn btn-soft warn" :disabled="statusUpdatingShopId === shop.id || editSaving" @click="onReactivate(shop)">
                  {{ statusUpdatingShopId === shop.id ? 'Updating...' : 'Reactivate' }}
                </button>
                <span v-else class="muted">—</span>
              </td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr><td colspan="6" style="text-align:center; padding: 30px; color: var(--mp-muted);">No shops registered yet.</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="grid-2">
      <section class="card">
        <div class="card-head">
          <h2 class="card-title">{{ t('revenueOverview') }}</h2>
          <div class="card-chip">{{ t('last7Days') }}</div>
        </div>
        <svg class="daily-revenue-chart" viewBox="0 0 740 300" @mouseleave="hideRevenueTooltip">
          <line
            v-for="n in 5"
            :key="`daily-grid-${n}`"
            x1="44"
            :y1="18 + (n - 1) * 57"
            x2="720"
            :y2="18 + (n - 1) * 57"
            class="daily-grid"
          />
          <text
            v-for="n in 5"
            :key="`daily-label-${n}`"
            x="36"
            :y="24 + (5 - n) * 57"
            class="daily-axis-label"
            text-anchor="end"
          >{{ money0.format((revenueBarMax / 4) * (n - 1)) }}</text>

          <g
            v-for="(row, idx) in revenueDailySeries"
            :key="row.key"
            @mouseenter="showRevenueTooltip(idx)"
          >
            <rect
              :x="72 + idx * 92"
              :y="246 - ((row.earnings / revenueBarMax) * 210)"
              width="16"
              :height="(row.earnings / revenueBarMax) * 210"
              class="daily-bar earnings"
              :style="{ animationDelay: `${animated ? idx * 70 : 0}ms`, transformOrigin: `${72 + idx * 92 + 8}px 246px` }"
            />
            <rect
              :x="92 + idx * 92"
              :y="246 - ((row.commission / revenueBarMax) * 210)"
              width="16"
              :height="(row.commission / revenueBarMax) * 210"
              class="daily-bar commission"
              :style="{ animationDelay: `${animated ? idx * 70 : 0}ms`, transformOrigin: `${92 + idx * 92 + 8}px 246px` }"
            />
            <rect
              :x="112 + idx * 92"
              :y="246 - ((row.net / revenueBarMax) * 210)"
              width="16"
              :height="(row.net / revenueBarMax) * 210"
              class="daily-bar net"
              :style="{ animationDelay: `${animated ? idx * 70 : 0}ms`, transformOrigin: `${112 + idx * 92 + 8}px 246px` }"
            />
            <rect :x="66 + idx * 92" y="18" width="68" height="230" fill="transparent" />
            <text :x="100 + idx * 92" y="280" class="daily-axis-label x" text-anchor="middle">{{ row.label }}</text>
          </g>

          <g v-if="revenueTooltipData" class="daily-tooltip">
            <rect :x="revenueTooltipData.x" :y="revenueTooltipData.y" :width="revenueTooltipData.width" :height="revenueTooltipData.height" rx="11" />
            <text :x="revenueTooltipData.x + 12" :y="revenueTooltipData.y + 20" class="daily-tooltip-title">{{ revenueTooltipData.row.label }}</text>
            <text :x="revenueTooltipData.x + 12" :y="revenueTooltipData.y + 44" class="daily-tooltip-net">Net Payout : {{ money0.format(revenueTooltipData.row.net) }}</text>
            <text :x="revenueTooltipData.x + 12" :y="revenueTooltipData.y + 67" class="daily-tooltip-commission">Platform Commission : {{ money0.format(revenueTooltipData.row.commission) }}</text>
            <text :x="revenueTooltipData.x + 12" :y="revenueTooltipData.y + 90" class="daily-tooltip-earnings">Total Earnings : {{ money0.format(revenueTooltipData.row.earnings) }}</text>
          </g>
        </svg>
        <div class="daily-legend">                <span class="daily-legend-item"><i class="dot earnings"></i>{{ t('totalRevenue') }}</span>
          <span class="daily-legend-item"><i class="dot commission"></i>{{ t('navFinancials') }}</span>
          <span class="daily-legend-item"><i class="dot net"></i>{{ t('payments') }}</span>
        </div>
      </section>

      <section class="card">
        <div class="card-head">          <h2 class="card-title">{{ t('fleetTypes') }}</h2></div>
        <div class="fleet-list">
          <div v-for="item in fleetTypes" :key="item.key" class="fleet-row">
            <div class="fleet-left">
              <span class="fleet-icon" aria-hidden="true"><i :class="item.icon"></i></span>
              <span class="fleet-name">{{ item.label }}</span>
            </div>
            <div class="fleet-right">
              <div class="fleet-bar"><div class="fleet-bar-fill" :class="item.bar" :style="{ width: `${item.value}%` }"></div></div>
              <div class="fleet-pct">{{ item.value }}%</div>
            </div>
          </div>
        </div>
      </section>
    </section>

    <!-- View Modal -->
    <div v-if="showView" class="modal-backdrop" role="dialog" aria-modal="true" @click.self="closeView">
      <div class="modal">
        <div class="modal-head">
          <div><div class="modal-title">{{ selectedShop?.name }}</div><div class="modal-sub">Read-only view</div></div>
          <button type="button" class="icon-action" @click="closeView"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <label class="field"><span class="field-label">ID</span><input :value="selectedShop?.id" readonly /></label>
            <label class="field"><span class="field-label">Name</span><input :value="selectedShop?.name" readonly /></label>
            <label class="field"><span class="field-label">Owner</span><input :value="ownerName(selectedShop)" readonly /></label>
            <label class="field"><span class="field-label">Location</span><input :value="shopLocation(selectedShop)" readonly /></label>
            <label class="field"><span class="field-label">Status</span><input :value="statusLabel(selectedShop?.status)" readonly /></label>
            <label class="field span-2"><span class="field-label">Fleet Size</span><input :value="fleetCountMap[String(selectedShop?.id)] || selectedShop?.fleet_size || 0" readonly /></label>
          </div>
        </div>
        <div class="modal-actions"><button type="button" class="btn btn-primary" @click="closeView">Close</button></div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="showEdit" class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal">
        <div class="modal-head">
          <div><div class="modal-title">Edit Shop</div><div class="modal-sub">Update shop information.</div></div>
          <button type="button" class="icon-action" @click="closeEdit"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body form-grid">
          <label class="field"><span class="field-label">Shop ID</span><input v-model="editForm.id" readonly /></label>
          <label class="field"><span class="field-label">Name *</span><input v-model="editForm.name" type="text" /></label>
          <label class="field"><span class="field-label">Location</span><input v-model="editForm.location" type="text" /></label>
          <label class="field">
            <span class="field-label">Status</span>
            <select v-model="editForm.status">
              <option value="inactive">Pending</option>
              <option value="active">Active</option>
            </select>
          </label>
          <label class="field span-2">
            <span class="field-label">Shop Image</span>
            <input type="file" accept="image/*" @change="onEditImageChange" />
            <div v-if="editImagePreview || shopImage(editForm)" class="image-preview">
              <img :src="editImagePreview || shopImage(editForm)" alt="Shop preview" />
            </div>
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" :disabled="editSaving" @click="closeEdit">Cancel</button>
          <button type="button" class="btn btn-primary" :disabled="editSaving" @click="submitEdit">
            {{ editSaving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Hide any status overlay placed on top of shop icon only for admin dashboard view.
   The dashboard already shows status in the STATUS column; this removes duplicate overlay. */
.hide-status-overlay .shop-cell .status-badge {
  display: none !important;
}

.daily-revenue-chart {
  width: 100%;
  display: block;
}

.daily-grid {
  stroke: rgba(148, 163, 184, 0.28);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.daily-axis-label {
  font-size: 11px;
  font-weight: 600;
  fill: #6b7f98;
}

.daily-axis-label.x {
  font-size: 12px;
}

.daily-bar {
  animation: daily-bar-grow 620ms cubic-bezier(.22, 1, .36, 1) both;
  cursor: pointer;
}

.daily-bar.earnings {
  fill: #1f7bff;
}

.daily-bar.commission {
  fill: #f97316;
}

.daily-bar.net {
  fill: #2bc96b;
}

.daily-tooltip {
  pointer-events: none;
  animation: daily-tooltip-pop 180ms ease;
}

.daily-tooltip rect {
  fill: rgba(15, 23, 42, 0.94);
  stroke: rgba(148, 163, 184, 0.25);
  stroke-width: 1;
  filter: drop-shadow(0 12px 22px rgba(2, 8, 23, 0.35));
}

.daily-tooltip-title {
  fill: #e2e8f0;
  font-size: 12.5px;
  font-weight: 700;
}

.daily-tooltip-net {
  fill: #22c55e;
  font-size: 12px;
  font-weight: 700;
}

.daily-tooltip-commission {
  fill: #f97316;
  font-size: 12px;
  font-weight: 700;
}

.daily-tooltip-earnings {
  fill: #3b82f6;
  font-size: 12px;
  font-weight: 700;
}

.daily-legend {
  margin-top: .3rem;
  display: flex;
  justify-content: center;
  gap: .8rem;
  flex-wrap: wrap;
}

.daily-legend-item {
  display: inline-flex;
  align-items: center;
  gap: .35rem;
  font-size: .78rem;
  font-weight: 700;
  color: #43607f;
  background: #eef4ff;
  border-radius: 999px;
  padding: .3rem .62rem;
}

.daily-legend .dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  display: inline-block;
}

.daily-legend .dot.earnings {
  background: #1f7bff;
}

.daily-legend .dot.commission {
  background: #f97316;
}

.daily-legend .dot.net {
  background: #2bc96b;
}

@keyframes daily-bar-grow {
  from {
    transform: scaleY(.08);
    opacity: .5;
  }
  to {
    transform: scaleY(1);
    opacity: 1;
  }
}

@keyframes daily-tooltip-pop {
  from {
    opacity: 0;
    transform: translateY(4px) scale(.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
