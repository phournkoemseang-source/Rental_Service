<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useAdminStore } from '../../stores/adminStore.js'
import CountUp from '../../components/CountUp.vue'

const admin = useAdminStore()

const STORAGE_KEY = 'chong_choul_payouts_v1'
const LAST_PAYOUT_KEY = 'chong_choul_last_payout_date'
const CATEGORY_ALL = 'all'
const CATEGORY_ORDER = ['MOTORBIKE', 'CAR', 'BICYCLE', 'OTHER']
const CATEGORY_META = {
  MOTORBIKE: { label: 'Motorbike Rental', color: '#1f7bff' },
  CAR: { label: 'Car Rental', color: '#1da1f2' },
  BICYCLE: { label: 'Bicycle', color: '#2bc96b' },
  OTHER: { label: 'Other', color: '#94a3b8' },
}
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const money0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const money2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })

const state = ref({ processed_keys: [] })
const isProcessingAll = ref(false)
const page = ref(1)
const perPage = 8
const periodMode = ref('day')
const selectedCategory = ref(CATEGORY_ALL)
const chartReady = ref(false)
const hoveredDonutCategory = ref('')
const hoveredTrendIndex = ref(null)
const hoveredBarIndex = ref(null)

const toAmount = (booking) => Number(
  booking?.total_amount ??
  booking?.total_price ??
  booking?.gross_amount ??
  booking?.price ??
  booking?.amount ??
  0
) || 0

const toDate = (value) => {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

const toDateKey = (date) => {
  if (!date || Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const toMonthKey = (date) => {
  if (!date || Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const normalizeCategory = (type) => {
  const value = String(type || '').toLowerCase()
  if (value.includes('bicycle') || value.includes('cycle')) return 'BICYCLE'
  if (value.includes('car')) return 'CAR'
  if (value.includes('motor') || value.includes('bike')) return 'MOTORBIKE'
  return 'OTHER'
}

const categoryLabel = (key) => {
  if (key === CATEGORY_ALL) return 'All Categories'
  return CATEGORY_META[key]?.label || 'Other'
}

const categoryColor = (key) => CATEGORY_META[key]?.color || '#94a3b8'

const loadLocal = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      state.value = {
        processed_keys: Array.isArray(parsed?.processed_keys) ? parsed.processed_keys : [],
      }
      return
    }
  } catch {
    // Ignore bad local data.
  }
  state.value = { processed_keys: [] }
}

const persistLocal = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
}

const lastPayoutDate = computed(() => {
  const stored = localStorage.getItem(LAST_PAYOUT_KEY)
  if (stored) return stored
  return 'Oct 15, 2024'
})

const periodKey = computed(() => {
  const now = new Date()
  return periodMode.value === 'month' ? toMonthKey(now) : toDateKey(now)
})

const processedSet = computed(() => new Set(state.value.processed_keys || []))
const processedScopeKey = (shopId) => `${periodMode.value}:${periodKey.value}:${shopId}`

const shopsById = computed(() => {
  const map = new Map()
  ;(admin.state.shops || []).forEach((shop) => map.set(String(shop.id), shop))
  return map
})

const isBookingInSelectedPeriod = (booking) => {
  const d = toDate(booking?.start_date || booking?.created_at || booking?.booking_date || booking?.date)
  if (!d) return false
  if (periodMode.value === 'all') return true
  return periodMode.value === 'month'
    ? toMonthKey(d) === periodKey.value
    : toDateKey(d) === periodKey.value
}
const allPayoutRows = computed(() => {
  const commissionRate = Number(admin.state.commission_rate || 0.15)
  const byShop = new Map()
  const bookingsCount = new Map()

  ;(admin.state.bookings || []).forEach((booking) => {
    if (!isBookingInSelectedPeriod(booking)) return
    const shopId = String(booking.shop_id || booking.shop?.id || '')
    if (!shopId) return
    byShop.set(shopId, (byShop.get(shopId) || 0) + toAmount(booking))
    bookingsCount.set(shopId, (bookingsCount.get(shopId) || 0) + 1)
  })

  return (admin.state.shops || [])
    .map((shop) => {
      const gross = Number(byShop.get(String(shop.id)) || 0)
      const commission = gross * commissionRate
      const category = normalizeCategory(shop?.vehicle_type || shop?.category)
      return {
        id: shop.id,
        name: shop.name,
        category,
        gross,
        commission,
        payout: Math.max(0, gross - commission),
        bookingsCount: bookingsCount.get(String(shop.id)) || 0,
        processed: processedSet.value.has(processedScopeKey(shop.id)),
      }
    })
    .sort((a, b) => (b.gross - a.gross) || String(a.name || '').localeCompare(String(b.name || '')))
})

const categoryOptions = computed(() => {
  const set = new Set()
  allPayoutRows.value.forEach((row) => set.add(row.category))
  return [CATEGORY_ALL, ...CATEGORY_ORDER.filter((key) => set.has(key))]
})

const payoutRows = computed(() => (
  selectedCategory.value === CATEGORY_ALL
    ? allPayoutRows.value
    : allPayoutRows.value.filter((row) => row.category === selectedCategory.value)
))

const payableRows = computed(() => payoutRows.value.filter((row) => row.gross > 0 && !row.processed))

const summary = computed(() => ({
  pendingAmount: payableRows.value.reduce((sum, row) => sum + row.payout, 0),
  shopsToPay: payableRows.value.length,
}))

// Period-based income/expense aggregates for the summary bar
const commissionRate = computed(() => Number(admin.state.commission_rate || 0.15))

const periodCommission = computed(() => {
  let total = 0
  ;(admin.state.bookings || []).forEach((booking) => {
    if (!isBookingInSelectedPeriod(booking)) return
    total += toAmount(booking) * commissionRate.value
  })
  return total
})

const periodNetPayout = computed(() => {
  let total = 0
  ;(admin.state.bookings || []).forEach((booking) => {
    if (!isBookingInSelectedPeriod(booking)) return
    total += toAmount(booking) * (1 - commissionRate.value)
  })
  return total
})

const periodGrossRevenue = computed(() => {
  let total = 0
  ;(admin.state.bookings || []).forEach((booking) => {
    if (!isBookingInSelectedPeriod(booking)) return
    total += toAmount(booking)
  })
  return total
})

const totalPages = computed(() => Math.max(1, Math.ceil(payoutRows.value.length / perPage)))
const pagedRows = computed(() => {
  const start = (page.value - 1) * perPage
  return payoutRows.value.slice(start, start + perPage)
})

const pageNumbers = computed(() => {
  if (totalPages.value <= 5) return Array.from({ length: totalPages.value }, (_, i) => i + 1)
  const start = Math.max(1, page.value - 2)
  const end = Math.min(totalPages.value, start + 4)
  const adjustedStart = Math.max(1, end - 4)
  return Array.from({ length: end - adjustedStart + 1 }, (_, i) => adjustedStart + i)
})

const distributionItems = computed(() => {
  const map = new Map(CATEGORY_ORDER.map((key) => [key, 0]))
  allPayoutRows.value
    .filter((row) => row.gross > 0 && !row.processed)
    .forEach((row) => map.set(row.category, (map.get(row.category) || 0) + row.payout))

  return CATEGORY_ORDER
    .map((key) => ({ key, amount: Number(map.get(key) || 0), color: categoryColor(key), label: categoryLabel(key) }))
    .filter((item) => item.amount > 0 || categoryOptions.value.includes(item.key))
})

const distributionTotal = computed(() => distributionItems.value.reduce((sum, item) => sum + item.amount, 0))
const distributionChips = computed(() => [
  { key: CATEGORY_ALL, label: categoryLabel(CATEGORY_ALL), amount: distributionTotal.value, color: '#2563eb' },
  ...distributionItems.value,
])

const categorySummaryCards = computed(() => {
  const rows = allPayoutRows.value
  const makeCard = (key) => {
    const scoped = key === CATEGORY_ALL ? rows : rows.filter((row) => row.category === key)
    const pending = scoped.filter((row) => row.gross > 0 && !row.processed)
    return {
      key,
      label: categoryLabel(key),
      color: key === CATEGORY_ALL ? '#2563eb' : categoryColor(key),
      shopsToPay: pending.length,
      amount: pending.reduce((sum, row) => sum + row.payout, 0),
      active: selectedCategory.value === key,
    }
  }
  return [makeCard(CATEGORY_ALL), ...CATEGORY_ORDER.filter((key) => categoryOptions.value.includes(key)).map(makeCard)]
})

const bookingCategory = (booking) => {
  const shop = shopsById.value.get(String(booking.shop_id || booking.shop?.id || booking.shopId || ''))
  return normalizeCategory(
    shop?.vehicle_type ||
    shop?.category ||
    booking.vehicle_type ||
    booking.category ||
    booking.type ||
    booking.name ||
    ''
  )
}

const filteredBookings = computed(() => {
  const rows = admin.state.bookings || []
  return rows.filter((booking) => {
    const category = bookingCategory(booking)
    if (selectedCategory.value === CATEGORY_ALL) return true
    return category === selectedCategory.value
  })
})

const trendSeries = computed(() => {
  const buckets = []
  const now = new Date()
  const bucketCount = periodMode.value === 'month' ? 6 : 7
  for (let offset = bucketCount - 1; offset >= 0; offset -= 1) {
    const bucketDate = new Date(now)
    bucketDate.setHours(0, 0, 0, 0)
    if (periodMode.value === 'month') {
      bucketDate.setDate(1)
      bucketDate.setMonth(bucketDate.getMonth() - offset)
    } else {
      bucketDate.setDate(bucketDate.getDate() - offset)
    }
    const key = periodMode.value === 'month' ? toMonthKey(bucketDate) : toDateKey(bucketDate)
    const label = periodMode.value === 'month'
      ? `${monthNames[bucketDate.getMonth()]} ${bucketDate.getFullYear()}`
      : `${monthNames[bucketDate.getMonth()]} ${bucketDate.getDate()}`
    buckets.push({
      key,
      label,
      earnings: 0,
      commission: 0,
      net: 0,
      pending: 0,
      rows: [],
    })
  }

  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]))
  filteredBookings.value.forEach((booking) => {
    const shopId = String(booking.shop_id || booking.shop?.id || booking.shopId || '')
    if (!shopId) return
    if (processedSet.value.has(processedScopeKey(shopId))) return
    const date = toDate(booking.start_date || booking.created_at || booking.booking_date || booking.date)
    if (!date) return
    const bucketKey = periodMode.value === 'month' ? toMonthKey(date) : toDateKey(date)
    const bucket = bucketMap.get(bucketKey)
    if (!bucket) return
    const amount = toAmount(booking)
    const commission = amount * commissionRate.value
    const net = Math.max(0, amount - commission)
    bucket.earnings += amount
    bucket.commission += commission
    bucket.net += net
    bucket.pending += net
    bucket.rows.push(booking)
  })

  return buckets
})

const niceMax = (value, floor = 1000) => value > 0
  ? Math.ceil(value / (value < 2000 ? 250 : 500)) * (value < 2000 ? 250 : 500)
  : floor

const barMax = computed(() => {
  const raw = Math.max(...trendSeries.value.flatMap((row) => [row.earnings, row.commission, row.net]), 0)
  return niceMax(raw)
})

const trendMax = computed(() => niceMax(Math.max(...trendSeries.value.map((row) => row.pending || 0), 0), 500))

const barChart = computed(() => {
  const points = []
  const rows = trendSeries.value
  const max = barMax.value || 1
  const count = rows.length
  const xStart = 72
  const xEnd = 688
  const step = count > 1 ? (xEnd - xStart) / (count - 1) : 0
  const baseY = 268
  const chartHeight = 250
  const barWidth = 12
  const spacing = 4

  rows.forEach((row, idx) => {
    const center = xStart + (idx * step)
    const earningsValue = Number(row.earnings || 0)
    const commissionValue = Number(row.commission || 0)
    const netValue = Number(row.net || 0)
    const earningsH = (earningsValue / max) * chartHeight
    const commissionH = (commissionValue / max) * chartHeight
    const netH = (netValue / max) * chartHeight
    const earningsY = baseY - earningsH
    const commissionY = baseY - commissionH
    const netY = baseY - netH
    const peakY = Math.min(earningsY, commissionY, netY)

    points.push({
      idx,
      row,
      center,
      barWidth,
      hitX: center - 52,
      hitWidth: 104,
      labelY: baseY + 28,
      peakY,
      earningsX: center - barWidth - spacing,
      commissionX: center - (barWidth / 2),
      netX: center + spacing,
      earningsY,
      commissionY,
      netY,
      earningsH: Math.max(0, earningsH),
      commissionH: Math.max(0, commissionH),
      netH: Math.max(0, netH),
    })
  })

  return { points }
})

const trendChart = computed(() => {
  const xStart = 56
  const xEnd = 740
  const yBottom = 252
  const chartHeight = 234
  const count = Math.max(1, trendSeries.value.length - 1)
  const step = (xEnd - xStart) / count
  const points = trendSeries.value.map((row, idx) => ({
    idx,
    row,
    x: xStart + (idx * step),
    y: yBottom - ((Number(row.pending || 0) / (trendMax.value || 1)) * chartHeight),
  }))
  const linePath = points.map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${yBottom} L ${points[0].x} ${yBottom} Z`
    : ''
  return { points, linePath, areaPath }
})

const buildDonutSegments = (items, radius, field = 'amount') => {
  const circumference = 2 * Math.PI * radius
  const total = items.reduce((sum, item) => sum + Number(item[field] || 0), 0)
  let offset = 0
  return items.map((item, idx) => {
    const value = Number(item[field] || 0)
    const length = total > 0 ? (value / total) * circumference : 0
    const segment = { ...item, circumference, length, offset, delay: `${idx * 100}ms` }
    offset += length
    return segment
  })
}

const distributionSegments = computed(() => buildDonutSegments(distributionItems.value, 72, 'amount'))

const statusItems = computed(() => {
  const rows = payoutRows.value
  const ready = rows.filter((row) => row.gross > 0 && !row.processed).length
  const review = rows.filter((row) => row.processed).length
  const hold = rows.filter((row) => row.gross <= 0).length
  const total = Math.max(1, ready + review + hold)
  return [
    { key: 'ready', label: 'Ready', count: ready, percentage: Math.round((ready / total) * 100), color: '#22c55e' },
    { key: 'review', label: 'Processed', count: review, percentage: Math.round((review / total) * 100), color: '#f97316' },
    { key: 'hold', label: 'No Earnings', count: hold, percentage: Math.max(0, 100 - Math.round((ready / total) * 100) - Math.round((review / total) * 100)), color: '#ef4444' },
  ]
})

const statusSegments = computed(() => buildDonutSegments(statusItems.value, 56, 'count'))
const selectedCategoryLabel = computed(() => categoryLabel(selectedCategory.value))

const selectedShare = computed(() => {
  if (selectedCategory.value === CATEGORY_ALL) return 100
  const target = distributionItems.value.find((item) => item.key === selectedCategory.value)
  if (!target || distributionTotal.value <= 0) return 0
  return Math.round((target.amount / distributionTotal.value) * 100)
})

const donutTooltip = computed(() => {
  if (!hoveredDonutCategory.value) return null
  return distributionChips.value.find((item) => item.key === hoveredDonutCategory.value) || null
})

const barTooltip = computed(() => {
  const idx = hoveredBarIndex.value
  if (idx == null || idx < 0 || idx >= barChart.value.points.length) return null
  const point = barChart.value.points[idx]
  const width = 188
  const height = 92
  const x = Math.max(48, Math.min(point.center - (width / 2), 760 - width))
  const y = Math.max(8, point.peakY - height - 10)
  return { x, y, width, height, row: point.row }
})

const trendTooltip = computed(() => {
  const idx = hoveredTrendIndex.value
  if (idx == null || idx < 0 || idx >= trendChart.value.points.length) return null
  const point = trendChart.value.points[idx]
  const width = 124
  const height = 72
  const x = Math.max(20, Math.min(point.x - (width / 2), 760 - width - 8))
  const y = Math.max(12, point.y - height - 14)
  return { x, y, width, height, row: point.row }
})

const fmtMoney = (value) => money2.format(Number(value || 0))

const initials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'S'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase()
}
const formatDateLabel = () => {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  return dateStr
}

const safeCSV = (value) => {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

const exportCSV = () => {
  const periodLabel = periodMode.value === 'month' ? 'Monthly' : periodMode.value === 'all' ? 'All Time' : 'Daily'
  const dateLabel = formatDateLabel()
  const rows = []

  // ── Header ──
  rows.push(`"Chong Choul — Income & Expense Report (${periodLabel})"`)
  rows.push(`"Generated: ${dateLabel}"`)
  rows.push(`"Period filter: ${selectedCategoryLabel}"`)
  rows.push('')

  // ── Summary ──
  rows.push('SUMMARY')
  rows.push(`Platform Income (Commission),${Number(periodCommission).toFixed(2)}`)
  rows.push(`Shop Payouts (Net),${Number(periodNetPayout).toFixed(2)}`)
  rows.push(`Total Revenue (Gross),${Number(periodGrossRevenue).toFixed(2)}`)
  rows.push(`Pending Payout Amount,${Number(summary.pendingAmount).toFixed(2)}`)
  rows.push(`Shops to Pay,${summary.shopsToPay}`)
  rows.push('')

  // ── Daily / Period Trend ──
  if (trendSeries.value.length) {
    rows.push('TREND BREAKDOWN')
    rows.push('Period,Total Earnings,Platform Commission,Net Payout')
    trendSeries.value.forEach((b) => {
      rows.push(`${safeCSV(b.label)},${Number(b.earnings).toFixed(2)},${Number(b.commission).toFixed(2)},${Number(b.net).toFixed(2)}`)
    })
    rows.push('')
  }

  // ── Per-Shop Breakdown ──
  const allRows = allPayoutRows.value
  rows.push('SHOP BREAKDOWN')
  rows.push('Shop Name,Category,Total Earnings,Platform Commission,Net Payout,Bookings,Status')
  allRows.forEach((r) => {
    rows.push(`${safeCSV(r.name)},${safeCSV(r.category)},${Number(r.gross).toFixed(2)},${Number(r.commission).toFixed(2)},${Number(r.payout).toFixed(2)},${r.bookingsCount},${r.processed ? 'Processed' : r.gross > 0 ? 'Pending' : 'No Earnings'}`)
  })
  rows.push('')

  // ── Totals ──
  const totalGross = allRows.reduce((s, r) => s + Number(r.gross), 0)
  const totalCommission = allRows.reduce((s, r) => s + Number(r.commission), 0)
  const totalNet = allRows.reduce((s, r) => s + Number(r.payout), 0)
  const totalBookings = allRows.reduce((s, r) => s + r.bookingsCount, 0)
  rows.push(`TOTALS,,${totalGross.toFixed(2)},${totalCommission.toFixed(2)},${totalNet.toFixed(2)},${totalBookings},`)

  const csvContent = rows.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const filename = `chong-choul-report-${periodMode.value}-${new Date().toISOString().slice(0, 10)}.csv`
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const processShop = (shopId) => {
  const key = processedScopeKey(shopId)
  const set = new Set(state.value.processed_keys || [])
  set.add(key)
  state.value.processed_keys = [...set]
  persistLocal()
  localStorage.setItem(
    LAST_PAYOUT_KEY,
    new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  )
}

const processAll = async () => {
  if (isProcessingAll.value) return
  isProcessingAll.value = true
  try {
    payableRows.value.forEach((row) => processShop(row.id))
  } finally {
    isProcessingAll.value = false
  }
}

const triggerChartAnimation = async () => {
  chartReady.value = false
  await nextTick()
  requestAnimationFrame(() => { chartReady.value = true })
}

const setCategoryFilter = (category) => {
  selectedCategory.value = category
  page.value = 1
}

watch(
  categoryOptions,
  (options) => {
    if (!options.includes(selectedCategory.value)) selectedCategory.value = CATEGORY_ALL
  },
  { immediate: true }
)

watch([periodMode, selectedCategory], async () => {
  page.value = 1
  hoveredDonutCategory.value = ''
  hoveredTrendIndex.value = null
  hoveredBarIndex.value = null
  await triggerChartAnimation()
})

watch(
  () => payoutRows.value.length,
  (next) => {
    const max = Math.max(1, Math.ceil(next / perPage))
    if (page.value > max) page.value = max
  }
)

onMounted(async () => {
  loadLocal()
  await admin.load().catch(() => {})
  await triggerChartAnimation()
})
</script>

<template>
    <section class="admin-page financial-page">
      <header class="page-head clean-head">
        <h1 class="page-title">Admin Process Payouts</h1>
      </header>

    <!-- ─── Income vs Expenses Summary ─────────────────────────── -->
    <div class="income-expense-bar">
      <div class="ie-card ie-income">
        <div class="ie-icon"><i class="fa-solid fa-arrow-up"></i></div>
        <div class="ie-body">
          <span class="ie-label">Platform Income ({{ periodMode === 'month' ? 'Monthly' : 'Today' }} Commission)</span>
          <span class="ie-value">{{ fmtMoney(periodCommission) }}</span>
        </div>
      </div>
      <div class="ie-arrow">
        <i class="fa-solid fa-minus"></i>
      </div>
      <div class="ie-card ie-expense">
        <div class="ie-icon"><i class="fa-solid fa-arrow-down"></i></div>
        <div class="ie-body">
          <span class="ie-label">Shop Payouts ({{ periodMode === 'month' ? 'Monthly' : 'Today' }} Net)</span>
          <span class="ie-value">{{ fmtMoney(periodNetPayout) }}</span>
        </div>
      </div>
      <div class="ie-arrow"><i class="fa-solid fa-equals"></i></div>
      <div class="ie-card ie-total">
        <div class="ie-icon"><i class="fa-solid fa-chart-line"></i></div>
        <div class="ie-body">
          <span class="ie-label">Total Revenue ({{ periodMode === 'month' ? 'Monthly' : 'Today' }} Gross)</span>
          <span class="ie-value">{{ fmtMoney(periodGrossRevenue) }}</span>
        </div>
      </div>
    </div>

    <div class="split-stats three compact-stats">
      <section class="card stat-wide">
        <div class="wide-stat">
          <div>
            <div class="stat-label">PENDING PAYOUT AMOUNT</div>
            <div class="wide-value"><CountUp :value="Number(summary.pendingAmount || 0)" :formatter="fmtMoney" /></div>
          </div>
          <div class="stat-icon tint-red" aria-hidden="true"><i class="fa-solid fa-dollar-sign"></i></div>
        </div>
      </section>

      <section class="card stat-wide">
        <div class="wide-stat">
          <div>
            <div class="stat-label">SHOPS TO PAY</div>
            <div class="wide-value"><CountUp :value="Number(summary.shopsToPay || 0)" /></div>
          </div>
          <div class="stat-icon tint-slate" aria-hidden="true"><i class="fa-regular fa-building"></i></div>
        </div>
      </section>

      <section class="card stat-wide">
        <div class="wide-stat">
          <div>
            <div class="stat-label">LAST PAYOUT DATE</div>
            <div class="wide-value">{{ lastPayoutDate }}</div>
          </div>
          <div class="stat-icon tint-green" aria-hidden="true"><i class="fa-regular fa-calendar"></i></div>
        </div>
      </section>
    </div>
        <div class="financial-grid">
      <section class="card chart-card span-2">
        <div class="card-head chart-head">
          <h2 class="card-title">Total Earnings & Net Payouts</h2>
          <div class="card-chip">{{ selectedCategoryLabel }}</div>
        </div>

        <svg class="chart-svg earnings-svg" viewBox="0 0 760 320" @mouseleave="hoveredBarIndex = null">
          <line
            v-for="n in 5"
            :key="`bar-grid-${n}`"
            x1="58"
            :y1="18 + (n - 1) * 62.5"
            x2="742"
            :y2="18 + (n - 1) * 62.5"
            stroke="#e5ecf6"
            stroke-dasharray="4 4"
          />

          <text
            v-for="n in 5"
            :key="`bar-label-${n}`"
            x="48"
            :y="24 + (5 - n) * 62.5"
            class="axis-label"
            text-anchor="end"
          >
            {{ money0.format((barMax / 4) * (n - 1)) }}
          </text>

          <g v-for="point in barChart.points" :key="`bars-${point.idx}`">
            <rect
              class="bar-shape bar-earnings"
              :x="point.earningsX"
              :y="point.earningsY"
              :width="point.barWidth"
              :height="point.earningsH"
              rx="4"
              :style="{ animationDelay: `${chartReady ? point.idx * 70 : 0}ms`, transformOrigin: `${point.earningsX + (point.barWidth / 2)}px 268px` }"
            />
            <rect
              class="bar-shape bar-commission"
              :x="point.commissionX"
              :y="point.commissionY"
              :width="point.barWidth"
              :height="point.commissionH"
              rx="4"
              :style="{ animationDelay: `${chartReady ? point.idx * 70 : 0}ms`, transformOrigin: `${point.commissionX + (point.barWidth / 2)}px 268px` }"
            />
            <rect
              class="bar-shape bar-net"
              :x="point.netX"
              :y="point.netY"
              :width="point.barWidth"
              :height="point.netH"
              rx="4"
              :style="{ animationDelay: `${chartReady ? point.idx * 70 : 0}ms`, transformOrigin: `${point.netX + (point.barWidth / 2)}px 268px` }"
            />

            <rect
              class="bar-hover-hit"
              :x="point.hitX"
              y="18"
              :width="point.hitWidth"
              height="250"
              fill="transparent"
              @mouseenter="hoveredBarIndex = point.idx"
            />

            <text :x="point.center" :y="point.labelY" class="axis-label x" text-anchor="middle">{{ point.row.label }}</text>
          </g>

          <g v-if="barTooltip" class="bar-tooltip">
            <rect :x="barTooltip.x" :y="barTooltip.y" :width="barTooltip.width" :height="barTooltip.height" rx="12" />
            <text :x="barTooltip.x + 12" :y="barTooltip.y + 22" class="tooltip-title">{{ barTooltip.row.label }}</text>
            <text :x="barTooltip.x + 12" :y="barTooltip.y + 44" class="tooltip-earnings">Total : {{ money0.format(barTooltip.row.earnings) }}</text>
            <text :x="barTooltip.x + 12" :y="barTooltip.y + 62" class="tooltip-commission">Commission : {{ money0.format(barTooltip.row.commission) }}</text>
            <text :x="barTooltip.x + 12" :y="barTooltip.y + 80" class="tooltip-net">Net : {{ money0.format(barTooltip.row.net) }}</text>
          </g>
        </svg>

        <div class="legend-row">
          <span class="legend-chip"><span class="dot earnings"></span>Total Earnings</span>
          <span class="legend-chip"><span class="dot commission"></span>Platform Commission</span>
          <span class="legend-chip"><span class="dot net"></span>Net Payout</span>
        </div>
      </section>
      <section class="card chart-card">
        <div class="card-head chart-head">
          <h2 class="card-title">Payout Distribution</h2>
        </div>
                <div class="donut-wrap" @mouseleave="hoveredDonutCategory = ''">
          <svg class="chart-svg" viewBox="0 0 220 220">
            <circle cx="110" cy="110" r="72" fill="none" stroke="#e5e7eb" stroke-width="16" />
            <g transform="rotate(-90 110 110)">
              <circle
                v-for="segment in distributionSegments"
                :key="segment.key"
                cx="110"
                cy="110"
                r="72"
                fill="none"
                :stroke="segment.color"
                stroke-width="16"
                stroke-linecap="round"
                class="donut-segment"
                :class="{ active: selectedCategory === segment.key }"
                :style="{ strokeDasharray: `${chartReady ? segment.length : 0} ${segment.circumference}`, strokeDashoffset: -segment.offset, transitionDelay: segment.delay }"
                @mouseenter="hoveredDonutCategory = segment.key"
                @click="setCategoryFilter(segment.key)"
              />
            </g>
          </svg>

          <div v-if="donutTooltip" class="donut-tooltip" :style="{ color: donutTooltip.color }">
            {{ donutTooltip.label }} : {{ money0.format(donutTooltip.amount) }}
          </div>

          <div class="donut-center">
            <div class="donut-value">{{ selectedShare }}%</div>
            <div class="donut-label">{{ selectedCategoryLabel }}</div>
          </div>
        </div>

        <div class="category-list">
          <button
            v-for="chip in distributionChips"
            :key="chip.key"
            type="button"
            class="category-chip muted"
            :class="{ active: selectedCategory === chip.key, all: chip.key === CATEGORY_ALL }"
            @mouseenter="hoveredDonutCategory = chip.key"
            @click="setCategoryFilter(chip.key)"
          >
            <span class="dot" :style="{ backgroundColor: chip.color }"></span>
            {{ chip.key === CATEGORY_ALL ? chip.label : `${chip.label} (${Math.round(chip.amount)})` }}
          </button>
        </div>
      </section>

      <section class="card chart-card span-2">
        <div class="card-head chart-head">
          <h2 class="card-title">Pending Payout Trend</h2>
          <div class="card-chip">{{ selectedCategoryLabel }}</div>
        </div>

        <svg class="chart-svg trend-svg" viewBox="0 0 760 300" @mouseleave="hoveredTrendIndex = null">
          <line
            v-for="n in 5"
            :key="`trend-grid-${n}`"
            x1="56"
            :y1="18 + (n - 1) * 58.5"
            x2="740"
            :y2="18 + (n - 1) * 58.5"
            stroke="#e5ecf6"
            stroke-dasharray="4 4"
          />

          <text
            v-for="n in 5"
            :key="`trend-label-${n}`"
            x="48"
            :y="24 + (5 - n) * 58.5"
            class="axis-label"
            text-anchor="end"
          >
            {{ money0.format((trendMax / 4) * (n - 1)) }}
          </text>

          <path
            v-if="trendChart.linePath"
            :d="trendChart.linePath"
            fill="none"
            stroke="#1f7bff"
            stroke-width="3"
            stroke-linecap="round"
            class="line-main"
            :style="{ strokeDasharray: 1800, strokeDashoffset: chartReady ? 0 : 1800 }"
          />

          <path
            v-if="trendChart.areaPath"
            :d="trendChart.areaPath"
            fill="rgba(31, 123, 255, 0.14)"
            class="line-area"
          />

          <g v-for="point in trendChart.points" :key="`trend-${point.idx}`">
            <circle
              :cx="point.x"
              :cy="point.y"
              r="5"
              class="line-point"
              :style="{ animationDelay: `${point.idx * 90}ms` }"
              @mouseenter="hoveredTrendIndex = point.idx"
            />
            <text :x="point.x" y="284" class="axis-label x" text-anchor="middle">{{ point.row.label }}</text>
          </g>          <g v-if="trendTooltip" class="trend-tooltip">
            <rect :x="trendTooltip.x" :y="trendTooltip.y" :width="trendTooltip.width" :height="trendTooltip.height" rx="12" />
            <text :x="trendTooltip.x + 12" :y="trendTooltip.y + 28" class="tooltip-title">{{ trendTooltip.row.label }}</text>
            <text :x="trendTooltip.x + 12" :y="trendTooltip.y + 54" class="tooltip-earnings">Pending : {{ money0.format(trendTooltip.row.pending) }}</text>
          </g>
        </svg>
      </section>

      <section class="card chart-card">
        <div class="card-head chart-head">
          <h2 class="card-title">Payout Status</h2>
        </div>

        <div class="status-wrap">
          <svg class="chart-svg" viewBox="0 0 190 190">
            <circle cx="95" cy="95" r="56" fill="none" stroke="#e5e7eb" stroke-width="16" />
            <g transform="rotate(-90 95 95)">
              <circle
                v-for="segment in statusSegments"
                :key="segment.key"
                cx="95"
                cy="95"
                r="56"
                fill="none"
                :stroke="segment.color"
                stroke-width="16"
                stroke-linecap="round"
                class="status-segment"
                :style="{ strokeDasharray: `${chartReady ? segment.length : 0} ${segment.circumference}`, strokeDashoffset: -segment.offset, transitionDelay: segment.delay }"
              />
            </g>
          </svg>
        </div>

        <div class="status-list">
          <div v-for="item in statusItems" :key="item.key" class="status-item">
            <span class="dot" :style="{ backgroundColor: item.color }"></span>
            <span class="status-name">{{ item.label }}</span>
            <span class="status-value">{{ item.percentage }}%</span>
          </div>
        </div>
      </section>
    </div>

    <section class="card">
      <div class="card-head table-head-clean">
        <h2 class="card-title">Pending Payouts List</h2>
        <div class="filters">
          <button type="button" class="btn-export" @click="exportCSV" title="Download CSV report">
            <i class="fa-solid fa-download" aria-hidden="true"></i>
            <span>Export CSV</span>
          </button>
          <label class="chip-select" title="Choose day or month">
            <i class="fa-regular fa-calendar" aria-hidden="true"></i>
            <select v-model="periodMode" aria-label="Choose period mode">
              <option value="day">Per Day (Today)</option>
              <option value="month">Per Month (This Month)</option>
              <option value="all">All time</option>
            </select>
            <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
          </label>

          <label class="chip-select" title="Choose shop category">
            <i class="fa-solid fa-layer-group" aria-hidden="true"></i>
            <select v-model="selectedCategory" aria-label="Choose shop category">
              <option v-for="category in categoryOptions" :key="category" :value="category">
                {{ categoryLabel(category) }}
              </option>
            </select>
            <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
          </label>
        </div>
      </div>      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>SHOP NAME</th>
              <th class="num">TOTAL EARNINGS</th>
              <th class="num">PLATFORM COMMISSION</th>
              <th class="num">NET PAYOUT</th>
              <th class="actions">ACTION</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in pagedRows" :key="row.id">
              <td class="shop-cell">
                <span class="user-bubble" aria-hidden="true">{{ initials(row.name) }}</span>
                <div class="shop-meta">
                  <div class="shop-name">{{ row.name }}</div>
                  <div class="shop-id">{{ categoryLabel(row.category) }} - ID: {{ row.id }}</div>
                </div>
              </td>
              <td class="num">
                <strong>{{ fmtMoney(row.gross) }}</strong>
                <div class="muted small">{{ row.bookingsCount }} booking(s)</div>
              </td>
              <td class="num"><span class="money-neg">-{{ fmtMoney(row.commission) }}</span></td>
              <td class="num"><span class="money-pos">{{ fmtMoney(row.payout) }}</span></td>
              <td class="actions">
                <button
                  type="button"
                  class="btn btn-soft"
                  :disabled="row.processed || row.gross <= 0"
                  @click="processShop(row.id)"
                >
                  {{ row.processed ? 'Processed' : row.gross > 0 ? 'Process Payment' : 'No Earnings' }}
                </button>
              </td>
            </tr>
            <tr v-if="!pagedRows.length">
              <td colspan="5" class="table-empty">No shops found for this filter.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <div class="muted">
          SHOWING {{ payoutRows.length ? ((page - 1) * perPage + 1) : 0 }}
          TO {{ Math.min(page * perPage, payoutRows.length) }}
          OF {{ payoutRows.length }} SHOPS
        </div>
        <div class="pager">
          <button type="button" class="pager-btn" :disabled="page === 1" @click="page -= 1">&lt;</button>
          <button
            v-for="p in pageNumbers"
            :key="p"
            type="button"
            class="pager-btn"
            :class="{ 'is-active': p === page }"
            @click="page = p"
          >
            {{ p }}
          </button>
          <button type="button" class="pager-btn" :disabled="page === totalPages" @click="page += 1">&gt;</button>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.financial-page {
  --report-bg: #f6f9ff;
  --report-card: #ffffff;
  --report-stroke: #e6ebf3;
  --report-text: #153252;
  --report-muted: #5f7189;
  --report-primary: #1f7bff;
  background: radial-gradient(circle at 18% -25%, #dbeafe 0%, transparent 42%), var(--report-bg);
  border-radius: 18px;
  padding: 2px;
  color: var(--report-text);
}

.clean-head {
  align-items: center;
}

.clean-head .page-title {
  font-size: 2rem;
}



.metric-card.active .metric-sub,
.metric-card.active .metric-sub strong {
  color: #fff;
}

.financial-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
  gap: 1rem;
}

.chart-card {
  border: 1px solid var(--report-stroke);
  box-shadow: 0 14px 30px rgba(15, 36, 64, 0.06);
}

.span-2 {
  grid-column: 1;
}

.chart-head {
  padding-bottom: 0.7rem;
  margin-bottom: 0.7rem;
}

.chart-svg {
  width: 100%;
  display: block;
}

.axis-label {
  font-size: 12px;
  fill: #6b7f98;
  font-weight: 600;
}

.axis-label.x {
  font-size: 11px;
}
.bar-shape {
  cursor: pointer;
  animation: bar-grow 0.62s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.bar-earnings { fill: #1f7bff; }
.bar-commission { fill: #f97316; }
.bar-net { fill: #2bc96b; }

.bar-tooltip,
.trend-tooltip {
  pointer-events: none;
}

.bar-tooltip rect,
.trend-tooltip rect {
  fill: rgba(15, 23, 42, 0.92);
  stroke: rgba(148, 163, 184, 0.25);
  stroke-width: 1;
}

.tooltip-title { fill: #e2e8f0; font-size: 12.5px; font-weight: 700; }
.tooltip-net { fill: #22c55e; font-size: 12px; font-weight: 700; }
.tooltip-commission { fill: #f97316; font-size: 12px; font-weight: 700; }
.tooltip-earnings { fill: #3b82f6; font-size: 12px; font-weight: 700; }

.legend-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  padding-bottom: 0.4rem;
}

.legend-chip {
  border: none;
  background: #eef4ff;
  color: #2f4460;
  font-weight: 700;
  font-size: 0.8rem;
  border-radius: 999px;
  padding: 0.32rem 0.66rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
}

.dot.earnings { background: #1f7bff; }
.dot.commission { background: #f97316; }
.dot.net { background: #2bc96b; }

.donut-wrap {
  position: relative;
  width: min(240px, 100%);
  margin: 0 auto 0.65rem;
}

.donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  pointer-events: none;
}

.donut-value { font-weight: 800; font-size: 1.1rem; }
.donut-label { color: var(--report-muted); font-size: 0.78rem; }

.donut-tooltip {
  position: absolute;
  left: 50%;
  bottom: 8px;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.26);
  border-radius: 10px;
  padding: 0.45rem 0.65rem;
  font-size: 1rem;
  font-weight: 700;
  box-shadow: 0 14px 26px rgba(2, 8, 23, 0.3);
}

.donut-segment {
  cursor: pointer;
  transition: stroke-dasharray 0.72s ease, stroke-width 0.18s ease;
}

.donut-segment.active {
  stroke-width: 19;
}

.category-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.category-chip {
  border: 1px solid transparent;
  background: var(--report-primary);
  color: #fff;
  padding: 0.5rem 0.66rem;
  border-radius: 999px;
  font-size: 0.83rem;
  font-weight: 700;
  display: inline-flex;
  gap: 0.42rem;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.category-chip.muted {
  color: #47617f;
  background: #eef2f7;
}

.category-chip.active {
  box-shadow: 0 8px 18px rgba(31, 123, 255, 0.24);
  transform: translateY(-1px);
  border-color: rgba(31, 123, 255, 0.35);
}

.line-main {
  transition: stroke-dashoffset 0.85s cubic-bezier(0.22, 1, 0.36, 1);
}

.line-area {
  opacity: 0;
  animation: area-in 0.68s ease forwards;
  animation-delay: 220ms;
}

.line-point {
  fill: #1f7bff;
  stroke: #fff;
  stroke-width: 2;
  cursor: pointer;
  opacity: 0;
  animation: point-pop 0.42s ease forwards;
}

.income-expense-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.ie-card {
  flex: 1;
  min-width: 180px;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1rem 1.1rem;
  border-radius: 16px;
  border: 1px solid var(--report-stroke);
  background: #fff;
  box-shadow: 0 4px 12px rgba(15, 36, 64, 0.06);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.ie-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(15, 36, 64, 0.1);
}

.ie-income { border-left: 4px solid #22c55e; }
.ie-expense { border-left: 4px solid #ef4444; }
.ie-total { border-left: 4px solid #1f7bff; }

.ie-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 1rem;
  flex-shrink: 0;
}

.ie-income .ie-icon { background: #f0fdf4; color: #16a34a; }
.ie-expense .ie-icon { background: #fef2f2; color: #dc2626; }
.ie-total .ie-icon { background: #eff6ff; color: #2563eb; }

.ie-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ie-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--report-muted);
}

.ie-value {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--report-text);
}

.ie-arrow {
  font-size: 1rem;
  color: var(--report-muted);
  flex-shrink: 0;
}

.status-wrap {
  width: min(200px, 100%);
  margin: 0 auto 0.35rem;
}

.status-list {
  margin-top: 0.4rem;
}.status-item {
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  column-gap: 0.6rem;
  padding: 0.34rem 0.2rem;
  color: #2f4768;
  font-weight: 600;
}

.table-head-clean {
  align-items: center;
}

.chip-select {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  border-radius: 12px;
  border: 1px solid var(--mp-border);
  background: rgba(148, 163, 184, 0.1);
  color: var(--mp-text);
  padding: 0 12px;
}

.chip-select select {
  appearance: none;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 700;
  min-width: 180px;
  outline: none;
  cursor: pointer;
}

.chip-select i:last-child {
  color: var(--mp-muted);
  font-size: 12px;
}

.btn-export {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid var(--report-stroke);
  background: #fff;
  color: var(--report-text);
  font-weight: 700;
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.18s ease;
  white-space: nowrap;
}

.btn-export:hover {
  background: #eef4ff;
  border-color: var(--report-primary);
  color: var(--report-primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(31, 123, 255, 0.15);
}

.btn-export i {
  font-size: 0.9rem;
}

.table-empty {
  text-align: center;
  padding: 30px;
  color: var(--mp-muted);
}

@keyframes bar-grow {
  from { transform: scaleY(0.06); opacity: 0.5; }
  to { transform: scaleY(1); opacity: 1; }
}

@keyframes point-pop {
  from { opacity: 0; transform: scale(0.35); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes area-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (max-width: 1200px) {
  .category-metric-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 1100px) {
  .financial-grid { grid-template-columns: 1fr; }
  .span-2 { grid-column: auto; }
}

@media (max-width: 900px) {
  .clean-head { flex-direction: column; align-items: flex-start; }
  .category-metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .card-head { flex-wrap: wrap; }
  .filters { width: 100%; flex-wrap: wrap; }
}

@media (max-width: 680px) {
  .category-metric-grid { grid-template-columns: 1fr; }
  .category-list { grid-template-columns: 1fr; }
  .chip-select { width: 100%; justify-content: space-between; }
  .chip-select select { min-width: 0; width: 100%; }
}
</style>
