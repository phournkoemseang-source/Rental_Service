<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAdminStore } from '../../stores/adminStore.js'
import { useToast } from '../../composables/useToast.js'

const admin = useAdminStore()
const toast = useToast()
const route = useRoute()

const ALL_CATEGORIES = 'All categories'
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const distributionColors = ['#1DA1F2', '#1F7BFF', '#2BC96B', '#FF9F1C', '#7A9CC6']
const statusColors = { Ready: '#27C265', Review: '#F97316', 'On Hold': '#EF4444' }

const selectedCategory = ref(ALL_CATEGORIES)
const chartReady = ref(false)
const detailModalVisible = ref(false)
const detailTitle = ref('')
const detailSubtitle = ref('')
const detailRows = ref([])
const hoveredBarIndex = ref(null)
const hoveredDonutName = ref('')

const isFinancialRoute = computed(() => route.path.startsWith('/admin/financials'))
const pageTitle = computed(() => (isFinancialRoute.value ? 'Financials Management' : 'Report Management'))

const money0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const money2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })

const parseDate = (value) => {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

const normalizeCategory = (raw) => {
  const text = String(raw || '').toLowerCase()
  if (text.includes('motor')) return 'Motorbike Rental'
  if (text.includes('car')) return 'Car Rental'
  if (text.includes('bicycle') || text.includes('cycle')) return 'Bicycle'
  return text ? String(raw) : 'Other'
}

const bookingStatus = (booking) => {
  const status = String(booking.payout_status || booking.status || '').toLowerCase()
  if (status.includes('hold') || status.includes('dispute') || status.includes('reject') || status.includes('cancel')) return 'On Hold'
  if (status.includes('review') || status.includes('pending') || status.includes('await')) return 'Review'
  return 'Ready'
}

const shopsById = computed(() => {
  const map = new Map()
  const shops = admin.state.shops || []
  shops.forEach((shop) => map.set(String(shop.id), shop))
  return map
})

const bookings = computed(() => {
  const rows = admin.state.bookings || []
  return rows.map((booking) => {
    const shop = shopsById.value.get(String(booking.shop_id || booking.shopId || ''))
    const amount = Number(
      booking.total_amount ??
      booking.total_price ??
      booking.price ??
      booking.gross_amount ??
      booking.amount ??
      0
    )
    const commissionRate = Number(admin.state.commission_rate || 0.15)
    const commission = Math.max(0, Number(booking.commission ?? amount * commissionRate))
    const date = parseDate(booking.start_date || booking.created_at || booking.date)
    return {
      ...booking,
      _shop: shop,
      _amount: amount,
      _commission: commission,
      _net: Math.max(0, amount - commission),
      _date: date,
      _category: normalizeCategory(shop?.category || shop?.type || shop?.vehicle_type),
      _status: bookingStatus(booking)
    }
  })
})

const visibleCategoryOrder = ['Motorbike Rental', 'Car Rental', 'Bicycle']
const categoryColors = {
  'Motorbike Rental': '#1F7BFF',
  'Car Rental': '#1DA1F2',
  Bicycle: '#2BC96B'
}
const fallbackCategoryAmounts = {
  'Motorbike Rental': 2800,
  'Car Rental': 4000,
  Bicycle: 800
}
const fallbackCategoryShops = {
  'Motorbike Rental': 2,
  'Car Rental': 2,
  Bicycle: 1
}
const fallbackPeriodLabels = ['Aug 1-15', 'Aug 16-31', 'Sep 1-15', 'Sep 16-30', 'Oct 1-15', 'Oct 16-31']
const fallbackCategoryProfiles = {
  'Motorbike Rental': [1200, 1260, 1580, 1490, 2110, 2800],
  'Car Rental': [1450, 1360, 1710, 1630, 2330, 4000],
  Bicycle: [210, 260, 320, 390, 530, 800]
}
const categoryTargetMax = {
  'Motorbike Rental': 2800,
  'Car Rental': 4000,
  Bicycle: 800
}
const fallbackAllCategoryAmount = Object.values(fallbackCategoryAmounts).reduce((sum, amount) => sum + amount, 0)
const spinnerColors = {
  [ALL_CATEGORIES]: '#165DFF',
  'Motorbike Rental': '#1F7BFF',
  'Car Rental': '#28A5F5',
  Bicycle: '#2BC96B'
}

const distributionData = computed(() => {
  const rows = bookings.value
  if (!rows.length) {
    const total = fallbackAllCategoryAmount || 1
    return visibleCategoryOrder.map((name, idx) => ({
      name,
      amount: fallbackCategoryAmounts[name] || 0,
      rows: [],
      share: (fallbackCategoryAmounts[name] || 0) / total,
      color: categoryColors[name] || distributionColors[idx % distributionColors.length]
    }))
  }
  const grouped = new Map()
  rows.forEach((row) => {
    if (!grouped.has(row._category)) grouped.set(row._category, { name: row._category, amount: 0, rows: [] })
    const item = grouped.get(row._category)
    item.amount += row._net
    item.rows.push(row)
  })
  const ordered = []
  visibleCategoryOrder.forEach((name) => {
    ordered.push(grouped.get(name) || { name, amount: 0, rows: [] })
  })

  const total = ordered.reduce((sum, item) => sum + item.amount, 0) || 1
  return ordered.map((item, idx) => ({
    ...item,
    share: item.amount / total,
    color: categoryColors[item.name] || distributionColors[idx % distributionColors.length]
  }))
})

watch(distributionData, () => {
  const names = distributionData.value.map((item) => item.name)
  if (selectedCategory.value !== ALL_CATEGORIES && !names.includes(selectedCategory.value)) selectedCategory.value = ALL_CATEGORIES
})

const filteredBookings = computed(() => selectedCategory.value === ALL_CATEGORIES ? bookings.value : bookings.value.filter((row) => row._category === selectedCategory.value))
const monthContext = computed(() => {
  const now = new Date()
  return {
    month: now.getMonth(),
    year: now.getFullYear(),
    label: `${monthNames[now.getMonth()]} ${now.getFullYear()}`
  }
})
const monthlyBookings = computed(() => {
  return bookings.value.filter((row) => row._date && row._date.getMonth() === monthContext.value.month && row._date.getFullYear() === monthContext.value.year)
})
const monthlyCategoryData = computed(() => {
  const rows = monthlyBookings.value
  if (!rows.length) {
    return [
      { name: ALL_CATEGORIES, amount: fallbackAllCategoryAmount, rows: [], color: spinnerColors[ALL_CATEGORIES] },
      ...visibleCategoryOrder.map((name) => ({
        name,
        amount: fallbackCategoryAmounts[name] || 0,
        rows: [],
        color: spinnerColors[name] || categoryColors[name] || '#1F7BFF'
      }))
    ]
  }
  const grouped = new Map()
  visibleCategoryOrder.forEach((name) => grouped.set(name, { name, amount: 0, rows: [], color: spinnerColors[name] || categoryColors[name] || '#1F7BFF' }))
  rows.forEach((row) => {
    if (!grouped.has(row._category)) return
    const item = grouped.get(row._category)
    item.amount += row._net
    item.rows.push(row)
  })
  const categories = visibleCategoryOrder.map((name) => grouped.get(name))
  const totalAmount = categories.reduce((sum, item) => sum + item.amount, 0)
  return [
    { name: ALL_CATEGORIES, amount: totalAmount, rows, color: spinnerColors[ALL_CATEGORIES] },
    ...categories
  ].map((item) => ({ ...item, amount: Math.round(item.amount || 0) }))
})
const buildFallbackSeries = (category) => {
  const commissionRate = Number(admin.state.commission_rate || 0.15)

  const allValues = fallbackPeriodLabels.map((_, idx) => {
    return Object.keys(fallbackCategoryProfiles).reduce((sum, key) => sum + (fallbackCategoryProfiles[key][idx] || 0), 0)
  })
  const profile = category === ALL_CATEGORIES
    ? allValues
    : (fallbackCategoryProfiles[category] || fallbackCategoryProfiles.Bicycle)

  return fallbackPeriodLabels.map((label, idx) => {
    const earnings = Number(profile[idx] || 0)
    const commission = Math.round(earnings * commissionRate)
    return {
      label,
      earnings,
      commission,
      net: Math.max(0, earnings - commission),
      rows: []
    }
  })
}

const halfLabel = (date) => date.getDate() <= 15 ? `${monthNames[date.getMonth()]} 1-15` : `${monthNames[date.getMonth()]} 16-${new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()}`

const earningsSeries = computed(() => {
  const rows = filteredBookings.value
  if (!rows.length) return buildFallbackSeries(selectedCategory.value)
  const dates = rows.map((row) => row._date).filter(Boolean).sort((a, b) => b.getTime() - a.getTime())
  const ref = dates[0] || new Date()
  const labels = []
  const cursor = new Date(ref)
  for (let i = 0; i < 6; i += 1) {
    labels.unshift(halfLabel(cursor))
    cursor.setDate(cursor.getDate() - 15)
  }
  const grouped = new Map(labels.map((label) => [label, { label, earnings: 0, commission: 0, net: 0, rows: [] }]))
  rows.forEach((row) => {
    if (!row._date) return
    const label = halfLabel(row._date)
    if (!grouped.has(label)) return
    const item = grouped.get(label)
    item.earnings += row._amount
    item.commission += row._commission
    item.net += row._net
    item.rows.push(row)
  })
  return labels.map((label) => grouped.get(label))
})

const fallbackTrend = [420, 560, 360, 780, 540, 980, 340, 6200]
const trendSeries = computed(() => {
  const rows = filteredBookings.value
  const dated = rows.filter((row) => row._date).sort((a, b) => b._date.getTime() - a._date.getTime())
  const ref = dated[0]?._date || new Date()
  const points = []
  for (let i = 7; i >= 0; i -= 1) {
    const start = new Date(ref)
    start.setDate(start.getDate() - (i * 7))
    points.push({ label: `${monthNames[start.getMonth()]} ${start.getDate()}`, amount: 0, rows: [] })
  }
  if (!rows.length && selectedCategory.value === ALL_CATEGORIES) return points.map((point, idx) => ({ ...point, amount: fallbackTrend[idx] }))
  dated.forEach((row) => {
    const diff = Math.floor((ref.getTime() - row._date.getTime()) / 86400000)
    const index = 7 - Math.floor(diff / 7)
    if (index < 0 || index > 7) return
    points[index].amount += row._net
    points[index].rows.push(row)
  })
  return points
})

const statusData = computed(() => {
  const rows = filteredBookings.value
  if (!rows.length && selectedCategory.value === ALL_CATEGORIES) {
    return [
      { status: 'Ready', percentage: 60, amount: 60, rows: [], color: statusColors.Ready },
      { status: 'Review', percentage: 20, amount: 20, rows: [], color: statusColors.Review },
      { status: 'On Hold', percentage: 20, amount: 20, rows: [], color: statusColors['On Hold'] }
    ]
  }
  const groups = {
    Ready: { status: 'Ready', amount: 0, rows: [], color: statusColors.Ready },
    Review: { status: 'Review', amount: 0, rows: [], color: statusColors.Review },
    'On Hold': { status: 'On Hold', amount: 0, rows: [], color: statusColors['On Hold'] }
  }
  rows.forEach((row) => {
    groups[row._status].amount += row._net
    groups[row._status].rows.push(row)
  })
  const ordered = [groups.Ready, groups.Review, groups['On Hold']]
  const total = ordered.reduce((sum, item) => sum + item.amount, 0) || 1
  return ordered.map((item, idx) => {
    if (idx === 2) return { ...item, percentage: Math.max(0, 100 - Math.round((ordered[0].amount / total) * 100) - Math.round((ordered[1].amount / total) * 100)) }
    return { ...item, percentage: Math.round((item.amount / total) * 100) }
  })
})

const niceMax = (value, floor = 1000) => value > 0 ? Math.ceil(value / (value < 2000 ? 250 : 500)) * (value < 2000 ? 250 : 500) : floor
const barMax = computed(() => {
  const raw = Math.max(...earningsSeries.value.flatMap((row) => [row.earnings, row.commission, row.net]), 0)
  const baseline = selectedCategory.value === ALL_CATEGORIES
    ? Math.max(...Object.values(categoryTargetMax))
    : (categoryTargetMax[selectedCategory.value] || 0)
  return niceMax(Math.max(raw, baseline))
})
const trendMax = computed(() => niceMax(Math.max(...trendSeries.value.map((row) => row.amount), 0), 500))

const donutSegments = (items, radius, field = 'amount') => {
  const circumference = 2 * Math.PI * radius
  const total = items.reduce((sum, item) => sum + Number(item[field] || 0), 0)
  let offset = 0
  return items.map((item, idx) => {
    const length = total > 0 ? (Number(item[field] || 0) / total) * circumference : 0
    const seg = { ...item, length, offset, circumference, delay: `${idx * 90}ms` }
    offset += length
    return seg
  })
}

const distributionSegments = computed(() => donutSegments(monthlyCategoryData.value, 72, 'amount'))
const statusSegments = computed(() => donutSegments(statusData.value, 56, 'percentage'))
const selectedShare = computed(() => {
  const data = monthlyCategoryData.value
  if (!data.length) return 0
  const totalEntry = data.find((item) => item.name === ALL_CATEGORIES)
  const totalAmount = totalEntry?.amount || 0
  if (!totalAmount) return 0
  if (selectedCategory.value === ALL_CATEGORIES) return 100
  const target = data.find((item) => item.name === selectedCategory.value)
  if (!target) return 0
  return Math.round((target.amount / totalAmount) * 100)
})

const selectedCategoryTitle = computed(() => selectedCategory.value === ALL_CATEGORIES ? 'All categories' : selectedCategory.value)
const totalNetAmount = computed(() => {
  if (!bookings.value.length) return fallbackAllCategoryAmount
  return Math.round(bookings.value.reduce((sum, row) => sum + row._net, 0))
})
const categoryMetrics = computed(() => {
  const items = distributionData.value.map((item) => {
    const uniqueShops = new Set((item.rows || []).map((row) => String(row._shop?.id || row.shop_id || row.shopId || '')).filter(Boolean))
    const fallbackCount = fallbackCategoryShops[item.name] || 0
    const shopsCount = item.rows?.length ? uniqueShops.size : fallbackCount
    return {
      name: item.name,
      amount: Math.round(item.amount || 0),
      shopsCount,
      color: item.color
    }
  })

  const allShops = new Set(bookings.value.map((row) => String(row._shop?.id || row.shop_id || row.shopId || '')).filter(Boolean))
  const allAmount = totalNetAmount.value
  return [
    {
      name: ALL_CATEGORIES,
      amount: allAmount,
      shopsCount: allShops.size || Object.values(fallbackCategoryShops).reduce((sum, count) => sum + count, 0),
      color: '#1F7BFF'
    },
    ...items
  ]
})

const categoryCircleFilters = computed(() => {
  const metricsMap = new Map(monthlyCategoryData.value.map((item) => [item.name, item]))
  const shortName = (name) => {
    if (name === ALL_CATEGORIES) return 'ALL'
    if (name === 'Motorbike Rental') return 'MOTO'
    if (name === 'Car Rental') return 'CAR'
    if (name === 'Bicycle') return 'BIKE'
    return String(name).slice(0, 4).toUpperCase()
  }
  return [ALL_CATEGORIES, ...visibleCategoryOrder].map((name) => {
    const item = metricsMap.get(name)
    return {
      name,
      short: shortName(name),
      amount: Math.round(item?.amount || 0),
      color: item?.color || spinnerColors[name] || categoryColors[name] || '#1F7BFF'
    }
  })
})

const activeCategoryMetric = computed(() => {
  const target = categoryMetrics.value.find((item) => item.name === selectedCategory.value)
  return target || categoryMetrics.value[0] || { amount: 0, shopsCount: 0 }
})

const kpiPendingAmount = computed(() => activeCategoryMetric.value.amount || 0)
const kpiShopsToPay = computed(() => activeCategoryMetric.value.shopsCount || 0)
const kpiLastPayout = computed(() => {
  const dates = bookings.value.map((row) => row._date).filter(Boolean).sort((a, b) => b.getTime() - a.getTime())
  const date = dates[0]
  if (!date) return 'Oct 15, 2024'
  return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
})

const donutTooltipData = computed(() => {
  if (!hoveredDonutName.value) return null
  const item = monthlyCategoryData.value.find((entry) => entry.name === hoveredDonutName.value)
  if (!item) return null
  return {
    name: item.name,
    amount: Math.round(item.amount || 0),
    color: item.color
  }
})

const barTooltipData = computed(() => {
  const idx = hoveredBarIndex.value
  if (idx == null || idx < 0 || idx >= earningsSeries.value.length) return null
  const row = earningsSeries.value[idx]
  if (!row) return null

  const centerX = 105 + (idx * 113)
  const width = 190
  const height = 94
  const peak = Math.max(Number(row.earnings || 0), Number(row.commission || 0), Number(row.net || 0))
  const peakY = 268 - ((peak / (barMax.value || 1)) * 250)
  const x = Math.max(56, Math.min(centerX - (width / 2), 740 - width))
  const y = Math.max(18, peakY - height - 12)

  return { row, x, y, width, height }
})

const openDetail = (title, subtitle, rows) => {
  detailTitle.value = title
  detailSubtitle.value = subtitle
  detailRows.value = [...rows].sort((a, b) => (b._date?.getTime() || 0) - (a._date?.getTime() || 0)).map((row) => ({
    id: row.id || '-',
    shop: row._shop?.name || row.shop_name || `Booking #${row.id || '-'}`,
    category: row._category,
    status: row._status,
    date: row._date ? `${monthNames[row._date.getMonth()]} ${row._date.getDate()}, ${row._date.getFullYear()}` : '-',
    gross: row._amount,
    commission: row._commission,
    net: row._net
  }))
  detailModalVisible.value = true
}
const closeDetail = () => { detailModalVisible.value = false; detailRows.value = [] }
const selectCategory = (category) => { selectedCategory.value = category; hoveredDonutName.value = '' }
const selectCategoryAndDetail = (category) => {
  selectCategory(category)
  const rows = category === ALL_CATEGORIES
    ? monthlyBookings.value
    : monthlyBookings.value.filter((r) => r._category === category)
  openDetail(`${category} - ${monthContext.value.label}`, `${rows.length} booking record(s) this month`, rows)
}
const showCategoryDetail = (category) => {
  const rows = category === ALL_CATEGORIES ? bookings.value : bookings.value.filter((r) => r._category === category)
  openDetail(`${category} Overview`, `${rows.length} booking record(s)`, rows)
}
const showPeriodDetail = (period, metric) => openDetail(`${period.label} - ${metric}`, `${period.rows.length} booking record(s) in ${selectedCategory.value}`, period.rows)
const showTrendDetail = (point) => openDetail(`Pending Trend - ${point.label}`, `${point.rows.length} booking record(s)`, point.rows)
const showStatusDetail = (item) => openDetail(`Payout Status - ${item.status}`, `${item.rows.length} booking record(s)`, item.rows)
const showBarTooltip = (idx) => { hoveredBarIndex.value = idx }
const hideBarTooltip = () => { hoveredBarIndex.value = null }
const showDonutTooltip = (name) => { hoveredDonutName.value = name }
const hideDonutTooltip = () => { hoveredDonutName.value = '' }

onMounted(async () => {
  try {
    await admin.load()
  } catch {
    toast.error('Unable to load report data')
  } finally {
    await nextTick()
    requestAnimationFrame(() => { chartReady.value = true })
  }
})
</script>

<template>
  <section class="report-page">
    <header class="report-head">
      <h1>{{ pageTitle }}</h1>
    </header>

    <section class="report-card category-overview">
      <div class="category-overview-head">
        <div>
          <h2>{{ $t('payoutCategories') }}</h2>
        </div>
        <div class="active-filter">{{ $t('activeFilter') }}<strong>{{ selectedCategoryTitle }}</strong></div>
      </div>
      <div class="category-metric-grid">
        <button
          v-for="item in categoryMetrics"
          :key="item.name"
          type="button"
          class="metric-card"
          :class="{ active: selectedCategory === item.name }"
          @click="selectCategory(item.name)"
          @dblclick="showCategoryDetail(item.name)"
        >
          <div class="metric-title"><span class="metric-dot" :style="{ backgroundColor: item.color }"></span>{{ item.name }}</div>
          <div class="metric-main">{{ item.shopsCount }}</div>
          <div class="metric-sub">
            <strong>{{ money0.format(item.amount) }}</strong>
          </div>
        </button>
      </div>
    </section>

    <section class="kpi-modern-grid">
      <article class="report-card kpi-card pending">
        <div class="kpi-top">
          <span class="kpi-label">{{ $t('pendingPayoutAmount2') }}</span>
          <span class="kpi-icon">$</span>
        </div>
        <div class="kpi-value">{{ money2.format(kpiPendingAmount) }}</div>
      </article>

      <article class="report-card kpi-card">
        <div class="kpi-top">
          <span class="kpi-label">{{ $t('numberOfShopsToPay') }}</span>
          <span class="kpi-icon">#</span>
        </div>
        <div class="kpi-value">{{ kpiShopsToPay }} <small>{{ $t('live') }}</small></div>
      </article>

      <article class="report-card kpi-card">
        <div class="kpi-top">
          <span class="kpi-label">{{ $t('lastPayoutDate2') }}</span>
          <span class="kpi-icon">*</span>
        </div>
        <div class="kpi-value">{{ kpiLastPayout }} <small>{{ $t('live') }}</small></div>
      </article>
    </section>
        <div class="report-grid">
      <article class="report-card span-2">
        <div class="card-head">
          <h2>{{ $t('totalEarningsNetPayoutsLast6Periods') }}</h2>
        </div>
        <svg class="chart-svg earnings-svg" viewBox="0 0 760 320" @mouseleave="hideBarTooltip">
          <line v-for="n in 5" :key="`by-${n}`" x1="56" :y1="18 + (n - 1) * 62.5" x2="740" :y2="18 + (n - 1) * 62.5"
            stroke="#E5E7EB" stroke-dasharray="4 4" />
          <text v-for="n in 5" :key="`bl-${n}`" x="48" :y="24 + (5 - n) * 62.5" class="axis-label" text-anchor="end">{{
            money0.format((barMax / 4) * (n - 1)) }}</text>
          <g v-for="(row, idx) in earningsSeries" :key="row.label" @mouseenter="showBarTooltip(idx)">
            <rect :x="72 + idx * 113" :y="268 - ((row.earnings / barMax) * 250)" width="18"
              :height="(row.earnings / barMax) * 250" fill="#1F7BFF" class="bar-shape"
              :style="{ animationDelay: `${chartReady ? idx * 80 : 0}ms`, transformOrigin: `${72 + idx * 113 + 9}px 268px` }"
              @click="showPeriodDetail(row, 'Total Earnings')" />
            <rect :x="95 + idx * 113" :y="268 - ((row.commission / barMax) * 250)" width="18"
              :height="(row.commission / barMax) * 250" fill="#F97316" class="bar-shape"
              :style="{ animationDelay: `${chartReady ? idx * 80 : 0}ms`, transformOrigin: `${95 + idx * 113 + 9}px 268px` }"
              @click="showPeriodDetail(row, 'Platform Commission')" />
            <rect :x="118 + idx * 113" :y="268 - ((row.net / barMax) * 250)" width="18"
              :height="(row.net / barMax) * 250" fill="#2BC96B" class="bar-shape"
              :style="{ animationDelay: `${chartReady ? idx * 80 : 0}ms`, transformOrigin: `${118 + idx * 113 + 9}px 268px` }"
              @click="showPeriodDetail(row, 'Net Payout')" />
            <rect :x="66 + idx * 113" y="18" width="70" height="260" fill="transparent" class="bar-hover-hit" />
            <text :x="105 + idx * 113" y="296" class="axis-label x" text-anchor="middle">{{ row.label }}</text>
          </g>
          <g v-if="barTooltipData" class="bar-tooltip">
            <rect :x="barTooltipData.x" :y="barTooltipData.y" :width="barTooltipData.width" :height="barTooltipData.height" rx="11" />
            <text :x="barTooltipData.x + 10" :y="barTooltipData.y + 18" class="tooltip-title">{{ barTooltipData.row.label }}</text>
            <text :x="barTooltipData.x + 10" :y="barTooltipData.y + 40" class="tooltip-net">Net Payout : {{ money0.format(barTooltipData.row.net) }}</text>
            <text :x="barTooltipData.x + 10" :y="barTooltipData.y + 62" class="tooltip-commission">Platform Commission : {{ money0.format(barTooltipData.row.commission) }}</text>
            <text :x="barTooltipData.x + 10" :y="barTooltipData.y + 84" class="tooltip-earnings">Total Earnings : {{ money0.format(barTooltipData.row.earnings) }}</text>
          </g>
        </svg>
        <div class="legend-row">
          <button type="button" class="legend-chip"><span class="dot net"></span>{{ $t('netPayout') }}</button>
          <button type="button" class="legend-chip"><span class="dot commission"></span>{{ $t('platformCommission') }}</button>
          <button type="button" class="legend-chip"><span class="dot earning"></span>{{ $t('totalEarnings') }}</button>
        </div>
      </article>
            <article class="report-card">
        <div class="card-head">
          <h2>{{ $t('payoutDistributionByShopCategory') }}</h2>
        </div>
        <div class="donut-wrap" @mouseleave="hideDonutTooltip">
          <svg class="chart-svg" viewBox="0 0 220 220">
            <circle cx="110" cy="110" r="72" fill="none" stroke="#E5E7EB" stroke-width="16" />
            <g transform="rotate(-90 110 110)">
              <circle v-for="segment in distributionSegments" :key="segment.name" cx="110" cy="110" r="72" fill="none"
                :stroke="segment.color" stroke-width="16" stroke-linecap="round" class="donut-segment"
                :class="{ active: selectedCategory === segment.name }"
                :style="{ strokeDasharray: `${chartReady ? segment.length : 0} ${segment.circumference}`, strokeDashoffset: -segment.offset, transitionDelay: segment.delay }"
                @mouseenter="showDonutTooltip(segment.name)"
                @click="selectCategoryAndDetail(segment.name)" />
            </g>
          </svg>
          <div v-if="donutTooltipData" class="donut-tooltip" :style="{ color: donutTooltipData.color }">
            {{ donutTooltipData.name }} : {{ money0.format(donutTooltipData.amount) }}
          </div>
          <div class="donut-center">
            <div class="donut-value">{{ selectedShare }}%</div>
            <div class="donut-label">{{ selectedCategory === ALL_CATEGORIES ? 'All categories' : 'Selected' }}</div>
            <div class="donut-month">{{ monthContext.label }}</div>
          </div>
          <div class="circle-filter-row">
            <button
              v-for="item in categoryCircleFilters"
              :key="`circle-${item.name}`"
              type="button"
              class="circle-filter-btn"
              :class="{ active: selectedCategory === item.name }"
              :title="item.name"
              @mouseenter="showDonutTooltip(item.name)"
              @click="selectCategoryAndDetail(item.name)"
            >
              <span class="circle-filter-core" :style="{ borderColor: item.color, color: item.color }">{{ item.short }}</span>
            </button>
          </div>
        </div>
        <div class="category-list">
          <button
            v-for="item in categoryCircleFilters"
            :key="item.name"
            type="button"
            class="category-chip muted"
            :class="{ active: selectedCategory === item.name, all: item.name === ALL_CATEGORIES }"
            :title="item.name"
            @mouseenter="showDonutTooltip(item.name)"
            @click="selectCategory(item.name)"
          >
            <span class="dot" :style="{ backgroundColor: item.color }"></span>
            {{ item.name === ALL_CATEGORIES ? item.name : `${item.name} (${item.amount})` }}
          </button>
        </div>
      </article>
            <article class="report-card span-2">
        <div class="card-head">
          <h2>{{ $t('pendingPayoutTrendOverTime') }}</h2>
        </div>
        <svg class="chart-svg" viewBox="0 0 760 300">
          <line v-for="n in 5" :key="`ly-${n}`" x1="56" :y1="18 + (n - 1) * 58.5" x2="740" :y2="18 + (n - 1) * 58.5"
            stroke="#E5E7EB" stroke-dasharray="4 4" />
          <text v-for="n in 5" :key="`ll-${n}`" x="48" :y="24 + (5 - n) * 58.5" class="axis-label" text-anchor="end">{{
            money0.format((trendMax / 4) * (n - 1)) }}</text>
          <path
            :d="`M 56 252 ${trendSeries.map((point, idx) => `L ${56 + idx * 97.7} ${252 - ((point.amount / trendMax) * 234)}`).join(' ')}`"
            fill="none" stroke="#1F7BFF" stroke-width="3" stroke-linecap="round" class="line-main"
            :style="{ strokeDasharray: 1800, strokeDashoffset: chartReady ? 0 : 1800 }" />
          <path
            :d="`M 56 252 ${trendSeries.map((point, idx) => `L ${56 + idx * 97.7} ${252 - ((point.amount / trendMax) * 234)}`).join(' ')} L 740 252 Z`"
            fill="rgba(31, 123, 255, 0.15)" class="line-area" />
          <g v-for="(point, idx) in trendSeries" :key="point.label">
            <circle :cx="56 + idx * 97.7" :cy="252 - ((point.amount / trendMax) * 234)" r="5" class="line-point"
              :style="{ animationDelay: `${idx * 100}ms` }" @click="showTrendDetail(point)" />
            <text :x="56 + idx * 97.7" y="284" class="axis-label x" text-anchor="middle">{{ point.label }}</text>
          </g>
        </svg>
      </article>

      <article class="report-card">
        <div class="card-head">
          <h2>{{ $t('payoutStatus') }}</h2>
        </div>
        <div class="status-wrap">
          <svg class="chart-svg" viewBox="0 0 190 190">
            <circle cx="95" cy="95" r="56" fill="none" stroke="#E5E7EB" stroke-width="16" />
            <g transform="rotate(-90 95 95)">
              <circle v-for="segment in statusSegments" :key="segment.status" cx="95" cy="95" r="56" fill="none"
                :stroke="segment.color" stroke-width="16" stroke-linecap="round" class="status-segment"
                :style="{ strokeDasharray: `${chartReady ? segment.length : 0} ${segment.circumference}`, strokeDashoffset: -segment.offset, transitionDelay: segment.delay }"
                @click="showStatusDetail(segment)" />
            </g>
          </svg>
        </div>
        <div class="status-list">
          <button v-for="item in statusData" :key="item.status" type="button" class="status-item"
            @click="showStatusDetail(item)">
            <span class="dot" :style="{ backgroundColor: item.color }"></span>
            <span class="status-name">{{ item.status }}</span>
            <span class="status-value">{{ item.percentage }}%</span>
          </button>
        </div>
      </article>
    </div>
        <transition name="modal-fade">
      <div v-if="detailModalVisible" class="detail-backdrop" @click.self="closeDetail">
        <div class="detail-modal">
          <div class="detail-head">
            <div>
              <h3>{{ detailTitle }}</h3>
              <p>{{ detailSubtitle }}</p>
            </div>
            <button class="close-btn" type="button" @click="closeDetail">x</button>
          </div>
          <div v-if="detailRows.length === 0" class="detail-empty">{{ $t('noRecordsFoundForThisChartSegment') }}</div>
          <div v-else class="detail-table-wrap">
            <table class="detail-table">
              <thead>
                <tr>
                  <th>{{ $t('shop') }}</th>
                  <th>{{ $t('category') }}</th>
                  <th>{{ $t('status') }}</th>
                  <th>{{ $t('date') }}</th>
                  <th>{{ $t('gross') }}</th>
                  <th>{{ $t('commission') }}</th>
                  <th>{{ $t('net') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in detailRows" :key="`${row.id}-${row.date}-${row.shop}`">
                  <td>{{ row.shop }}</td>
                  <td>{{ row.category }}</td>
                  <td>{{ row.status }}</td>
                  <td>{{ row.date }}</td>
                  <td>{{ money2.format(row.gross) }}</td>
                  <td>{{ money2.format(row.commission) }}</td>
                  <td>{{ money2.format(row.net) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </transition>
  </section>
</template>

<style scoped>
.report-page {
  --bg: #f6f9ff;
  --card: #fff;
  --stroke: #e6ebf3;
  --text: #153252;
  --muted: #5f7189;
  --primary: #1f7bff;
  --success: #2bc96b;
  --warning: #f97316;
  --radius: 16px;
  font-family: var(--font-sans);
  color: var(--text);
  background: radial-gradient(circle at 20% -20%, #dbeafe 0%, transparent 45%), var(--bg);
  padding-bottom: .5rem
}

.report-head {
  margin-bottom: 1rem
}

.report-head h1 {
  margin: 0;
  font-size: 1.45rem
}

.category-overview {
  margin-bottom: 1rem;
}

.category-overview-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: .75rem;
}

.category-overview-head h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #1f3657;
}

.active-filter {
  color: #64748b;
  font-size: .9rem;
}

.active-filter strong {
  color: #1f3657;
}

.category-metric-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: .75rem;
}

.metric-card {
  border: 1px solid #d8e1ef;
  background: #f8fbff;
  border-radius: 14px;
  text-align: left;
  padding: .72rem .8rem;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease;
}

.metric-card:hover {
  transform: translateY(-2px);
}

.metric-card.active {
  background: linear-gradient(135deg, #1f7bff, #0f6be8);
  border-color: #1f7bff;
  color: #fff;
  box-shadow: 0 14px 26px rgba(31, 123, 255, 0.24);
}

.metric-title {
  text-transform: uppercase;
  letter-spacing: .2em;
  font-size: .78rem;
  font-weight: 700;
  color: #56708f;
  display: inline-flex;
  align-items: center;
  gap: .4rem;
}

.metric-card.active .metric-title {
  color: #dbeafe;
}

.metric-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.metric-main {
  margin-top: .7rem;
  font-weight: 700;
  font-size: 2rem;
  line-height: 1;
}

.metric-sub {
  margin-top: .35rem;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: .5rem;
  color: #64748b;
  font-size: .88rem;
}

.metric-sub strong {
  color: #1f3657;
}

.metric-card.active .metric-sub,
.metric-card.active .metric-sub strong {
  color: #fff;
}

.kpi-modern-grid {
  margin-bottom: 1rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.kpi-card {
  padding-bottom: 1rem;
}

.kpi-card.pending {
  background: linear-gradient(180deg, rgba(253, 242, 242, 0.95), #fff);
}

.kpi-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.kpi-label {
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: .14em;
  font-size: .76rem;
  font-weight: 700;
}

.kpi-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: #eaf2ff;
  color: #1f7bff;
  font-weight: 800;
}

.kpi-value {
  margin-top: .8rem;
  font-size: 2.3rem;
  line-height: 1;
  font-weight: 700;
  color: #233f62;
}

.kpi-value small {
  font-size: 1rem;
  color: #8a9cb2;
  margin-left: .2rem;
}

.report-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
  gap: 1rem
}

.report-card {
  background: var(--card);
  border: 1px solid var(--stroke);
  border-radius: var(--radius);
  padding: 1rem 1rem .85rem;
  box-shadow: 0 14px 30px rgba(15, 36, 64, .06);
  animation: card-in .52s ease both
}

.report-card:nth-child(2) {
  animation-delay: 90ms
}

.report-card:nth-child(3) {
  animation-delay: 150ms
}

.report-card:nth-child(4) {
  animation-delay: 220ms
}

.span-2 {
  grid-column: 1
}

.card-head h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #1f3657
}

.chart-svg {
  width: 100%;
  display: block
}

.axis-label {
  font-size: 12px;
  fill: #6b7f98;
  font-weight: 500
}

.axis-label.x {
  font-size: 11px
}

.bar-shape {
  cursor: pointer;
  transition: filter .2s ease;
  animation: bar-grow .62s cubic-bezier(.22, 1, .36, 1) both
}

.bar-shape:hover {
  filter: brightness(.92)
}

.earnings-svg .bar-hover-hit {
  cursor: pointer;
}

.bar-tooltip {
  pointer-events: none;
  animation: tooltip-pop 180ms ease;
}

.bar-tooltip rect {
  fill: rgba(15, 23, 42, 0.92);
  stroke: rgba(148, 163, 184, 0.25);
  stroke-width: 1;
  filter: drop-shadow(0 10px 22px rgba(2, 8, 23, 0.34));
}

.tooltip-title {
  fill: #e2e8f0;
  font-size: 12.5px;
  font-weight: 700;
}

.tooltip-net {
  fill: #22c55e;
  font-size: 12px;
  font-weight: 600;
}

.tooltip-commission {
  fill: #f97316;
  font-size: 12px;
  font-weight: 600;
}

.tooltip-earnings {
  fill: #3b82f6;
  font-size: 12px;
  font-weight: 700;
}

.legend-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: .5rem;
  padding-bottom: .6rem
}

.legend-chip {
  border: none;
  background: #eef4ff;
  color: #2f4460;
  font-weight: 600;
  font-size: .8rem;
  border-radius: 999px;
  padding: .32rem .66rem;
  display: inline-flex;
  align-items: center;
  gap: .35rem
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block
}

.dot.net {
  background: var(--success)
}

.dot.commission {
  background: var(--warning)
}

.dot.earning {
  background: var(--primary)
}

.donut-wrap {
  position: relative;
  width: min(240px, 100%);
  margin: .2rem auto .65rem
}

.circle-filter-row {
  margin-top: .35rem;
  display: flex;
  justify-content: center;
  gap: .45rem;
  flex-wrap: wrap;
}

.circle-filter-btn {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  transition: transform 150ms ease;
}

.circle-filter-btn:hover {
  transform: translateY(-2px);
}

.circle-filter-btn.active .circle-filter-core {
  background: #eef6ff;
  box-shadow: 0 8px 18px rgba(31, 123, 255, 0.26);
}

.circle-filter-core {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  border: 2px solid #1f7bff;
  display: grid;
  place-items: center;
  font-size: .64rem;
  letter-spacing: .08em;
  font-weight: 800;
  background: #fff;
}

.donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  pointer-events: none
}

.donut-value {
  font-weight: 700;
  font-size: 1.1rem
}

.donut-label {
  color: var(--muted);
  font-size: .78rem
}

.donut-month {
  margin-top: .2rem;
  color: #94a3b8;
  font-size: .68rem;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.donut-tooltip {
  position: absolute;
  left: 50%;
  bottom: 8px;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.26);
  border-radius: 10px;
  padding: .45rem .65rem;
  font-size: 1rem;
  font-weight: 700;
  box-shadow: 0 14px 26px rgba(2, 8, 23, 0.3);
  animation: tooltip-pop 170ms ease;
  z-index: 2;
}

.donut-segment {
  cursor: pointer;
  transition: stroke-dasharray .72s ease, stroke-width .18s ease
}

.donut-segment.active {
  stroke-width: 19
}

.category-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .5rem;
  margin-top: .25rem
}

.category-chip {
  border: 1px solid transparent;
  background: var(--primary);
  color: #fff;
  padding: .5rem .66rem;
  border-radius: 999px;
  font-size: .83rem;
  font-weight: 600;
  display: inline-flex;
  gap: .42rem;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform .14s ease, box-shadow .14s ease, border-color .14s ease
}

.category-chip.muted {
  color: #47617f;
  background: #eef2f7
}

.category-chip.all {
  color: #34506f;
}

.category-chip.active {
  box-shadow: 0 8px 18px rgba(31, 123, 255, .24);
  transform: translateY(-1px);
  border-color: rgba(31, 123, 255, .35)
}

.line-main {
  transition: stroke-dashoffset .85s cubic-bezier(.22, 1, .36, 1)
}

.line-area {
  opacity: 0;
  animation: area-in .68s ease forwards;
  animation-delay: 220ms
}

.line-point {
  fill: #1f7bff;
  stroke: #fff;
  stroke-width: 2;
  cursor: pointer;
  opacity: 0;
  animation: point-pop .42s ease forwards
}

.line-point:hover {
  fill: #0b63df
}

.status-wrap {
  width: min(200px, 100%);
  margin: 0 auto .35rem
}

.status-segment {
  cursor: pointer;
  transition: stroke-dasharray .72s ease, filter .18s ease
}

.status-segment:hover {
  filter: brightness(.92)
}

.status-list {
  margin-top: .4rem
}

.status-item {
  width: 100%;
  border: none;
  background: transparent;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  column-gap: .6rem;
  padding: .34rem .2rem;
  color: #2f4768;
  cursor: pointer;
  font-weight: 500
}

.status-name {
  text-align: left
}

.status-value {
  font-weight: 700
}

.detail-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(8, 16, 28, .45);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1400;
  padding: 1rem
}

.detail-modal {
  width: min(980px, 100%);
  max-height: 85vh;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid #d9e4f3;
  background: #fff;
  box-shadow: 0 20px 48px rgba(7, 19, 34, .28)
}

.detail-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: .75rem;
  border-bottom: 1px solid #e5ecf6;
  padding: .9rem 1rem
}

.detail-head h3 {
  margin: 0;
  font-size: 1.1rem
}

.detail-head p {
  margin: .2rem 0 0;
  color: #61748d;
  font-size: .9rem
}

.close-btn {
  border: none;
  background: #edf2fa;
  color: #254566;
  font-weight: 700;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  cursor: pointer
}

.detail-empty {
  padding: 1rem;
  color: #61748d
}

.detail-table-wrap {
  overflow: auto;
  max-height: calc(85vh - 76px)
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: .9rem
}

.detail-table th,
.detail-table td {
  border-bottom: 1px solid #edf2fa;
  padding: .62rem .7rem;
  text-align: left;
  white-space: nowrap
}

.detail-table th {
  position: sticky;
  top: 0;
  background: #f7faff;
  z-index: 1;
  color: #3b5575
}

.detail-table tbody tr:hover {
  background: #fbfdff
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity .18s ease
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(10px)
  }

  to {
    opacity: 1;
    transform: translateY(0)
  }
}

@keyframes bar-grow {
  from {
    transform: scaleY(.06);
    opacity: .5
  }

  to {
    transform: scaleY(1);
    opacity: 1
  }
}
@keyframes point-pop {
  from {
    opacity: 0;
    transform: scale(.35)
  }

  to {
    opacity: 1;
    transform: scale(1)
  }
}

@keyframes tooltip-pop {
  from {
    opacity: 0;
    transform: translateY(4px) scale(.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes area-in {
  from {
    opacity: 0
  }

  to {
    opacity: 1
  }
}

@media (max-width:1100px) {
  .category-metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .kpi-modern-grid {
    grid-template-columns: 1fr;
  }

  .report-grid {
    grid-template-columns: 1fr
  }

  .span-2 {
    grid-column: auto
  }
}

@media (max-width:700px) {
  .category-overview-head {
    flex-direction: column;
  }

  .category-metric-grid {
    grid-template-columns: 1fr;
  }

  .report-card {
    padding: .85rem .72rem
  }

  .card-head h2 {
    font-size: 1rem
  }

  .category-list {
    grid-template-columns: 1fr
  }
}
</style>
