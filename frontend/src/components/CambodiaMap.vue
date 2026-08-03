<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({
  shops: { type: Array, default: () => [] },
  selectedProvince: { type: String, default: '' },
})

const emit = defineEmits(['select-province', 'view-shop'])

// GeoJSON province name -> English name mapping
const PROVINCE_NAME_MAP = {
  'BântéayMéanchey': 'Banteay Meanchey',
  'Batdâmbâng': 'Battambang',
  'KâmpóngCham': 'Kampong Cham',
  'KâmpóngChhnang': 'Kampong Chhnang',
  'KâmpóngSpœ': 'Kampong Speu',
  'KâmpóngThum': 'Kampong Thom',
  'Kâmpôt': 'Kampot',
  'Kândal': 'Kandal',
  'KaôhKong': 'Koh Kong',
  'Kep': 'Kep',
  'Krâchéh': 'Kratie',
  'KrongPailin': 'Pailin',
  'KrongPreahSihanouk': 'Preah Sihanouk',
  'MôndólKiri': 'Mondulkiri',
  'OtdarMeanChey': 'Oddar Meanchey',
  'PhnomPenh': 'Phnom Penh',
  'Pouthisat': 'Pursat',
  'PreahVihéar': 'Preah Vihear',
  'PreyVêng': 'Prey Veng',
  'Rôtânôkiri': 'Ratanakiri',
  'Siemréab': 'Siem Reap',
  'StœngTrêng': 'Stung Treng',
  'SvayRieng': 'Svay Rieng',
  'Takêv': 'Takeo',
  'TbongKhmum': 'Tboung Khmum',
}

// Province center coordinates [lat, lng]
const PROVINCE_CENTERS = {
  'Banteay Meanchey': [13.71, 103.04],
  'Battambang': [12.88, 103.08],
  'Kampong Cham': [12.18, 105.24],
  'Kampong Chhnang': [12.16, 104.58],
  'Kampong Speu': [11.60, 104.31],
  'Kampong Thom': [12.63, 105.06],
  'Kampot': [10.73, 104.31],
  'Kandal': [11.49, 104.94],
  'Koh Kong': [11.34, 103.36],
  'Kep': [10.46, 104.35],
  'Kratie': [12.48, 106.20],
  'Pailin': [12.95, 102.57],
  'Preah Sihanouk': [10.68, 103.58],
  'Mondulkiri': [12.72, 107.09],
  'Oddar Meanchey': [14.16, 103.81],
  'Phnom Penh': [11.54, 104.83],
  'Pursat': [12.34, 103.58],
  'Preah Vihear': [13.96, 105.08],
  'Prey Veng': [11.44, 105.44],
  'Ratanakiri': [13.99, 107.14],
  'Siem Reap': [13.58, 103.83],
  'Stung Treng': [13.86, 106.19],
  'Svay Rieng': [11.25, 105.85],
  'Takeo': [11.03, 104.77],
  'Tboung Khmum': [11.93, 106.04],
}

const geoData = ref(null)
const svgWidth = 800
const svgHeight = 600
const hoveredProvince = ref(null)
const tooltipInfo = ref(null)
const tooltipPos = ref({ x: 0, y: 0 })

// Cambodia bounding box
const bounds = {
  minLng: 102.3,
  maxLng: 107.65,
  minLat: 10.35,
  maxLat: 14.75,
}

const padding = 20

const project = (lng, lat) => {
  const x = padding + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * (svgWidth - 2 * padding)
  const y = padding + ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * (svgHeight - 2 * padding)
  return [x, y]
}

const provincePaths = computed(() => {
  if (!geoData.value) return []
  return geoData.value.features.map((feature) => {
    const geoName = feature.properties.NAME_1
    const englishName = PROVINCE_NAME_MAP[geoName] || geoName
    const polygons = feature.geometry.coordinates
    const pathParts = []

    for (const multiPoly of polygons) {
      for (const ring of multiPoly) {
        const points = ring.map(([lng, lat]) => project(lng, lat))
        if (points.length > 0) {
          pathParts.push('M' + points.map((p) => p.join(',')).join('L') + 'Z')
        }
      }
    }

    return {
      name: englishName,
      d: pathParts.join(' '),
    }
  })
})

// Shops grouped by province with pin positions
const shopPins = computed(() => {
  const pins = []
  const provinceShopCounts = {}

  // Helper: find nearest province by lat/lng
  const findNearestProvince = (lat, lng) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    let best = null
    let bestDist = Infinity
    for (const [prov, center] of Object.entries(PROVINCE_CENTERS)) {
      const dLat = center[0] - lat
      const dLng = center[1] - lng
      const dist = dLat * dLat + dLng * dLng
      if (dist < bestDist) {
        bestDist = dist
        best = prov
      }
    }
    return best
  }

  for (const shop of props.shops) {
    let province = shop.province


    // If no province provided, attempt to derive from coordinates
    if (!province && (shop.latitude || shop.lat) && (shop.longitude || shop.lng)) {
      const lat = Number(shop.latitude ?? shop.lat)
      const lng = Number(shop.longitude ?? shop.lng)
      const nearest = findNearestProvince(lat, lng)
      if (nearest) province = nearest
    }

    if (!province) continue
    if (!provinceShopCounts[province]) provinceShopCounts[province] = 0
    provinceShopCounts[province]++
  }

  for (const [province, count] of Object.entries(provinceShopCounts)) {
    const center = PROVINCE_CENTERS[province]
    if (!center) continue
    const [x, y] = project(center[1], center[0])
    pins.push({ province, count, x, y })
  }

  return pins
})

const isSelected = (name) => {
  return name.toLowerCase() === props.selectedProvince?.toLowerCase()
}

const isHovered = (name) => {
  return hoveredProvince.value === name
}

const onProvinceClick = (name) => {
  emit('select-province', name)
}

const onProvinceHover = (name, event) => {
  hoveredProvince.value = name
  const shopCount = shopPins.value.find((p) => p.province === name)?.count || 0
  tooltipInfo.value = { name, shopCount }
  updateTooltipPos(event)
}

const onProvinceLeave = () => {
  hoveredProvince.value = null
  tooltipInfo.value = null
}

const updateTooltipPos = (event) => {
  const rect = event.currentTarget.closest('svg')?.getBoundingClientRect()
  if (rect) {
    tooltipPos.value = {
      x: event.clientX - rect.left + 10,
      y: event.clientY - rect.top - 30,
    }
  }
}

const onPinClick = (pin) => {
  emit('select-province', pin.province)
}

onMounted(async () => {
  try {
    const module = await import('@/assets/cambodia-provinces.json')
    geoData.value = module.default || module
  } catch (err) {
    console.error('Failed to load Cambodia GeoJSON:', err)
  }
})
</script>

<template>
  <div class="cambodia-map-wrapper">
    <svg
      :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
      class="cambodia-svg"
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- Province polygons -->
      <g class="provinces-layer">
        <path
          v-for="prov in provincePaths"
          :key="prov.name"
          :d="prov.d"
          :class="[
            'province-path',
            { selected: isSelected(prov.name), hovered: isHovered(prov.name) },
          ]"
          @click="onProvinceClick(prov.name)"
          @mouseenter="(e) => onProvinceHover(prov.name, e)"
          @mousemove="updateTooltipPos"
          @mouseleave="onProvinceLeave"
        />
      </g>

      <!-- Shop pins -->
      <g class="pins-layer">
        <g
          v-for="pin in shopPins"
          :key="pin.province"
          :transform="`translate(${pin.x}, ${pin.y})`"
          class="shop-pin-group"
          :class="{ 'pin-selected': isSelected(pin.province) }"
          @click.stop="onPinClick(pin)"
        >
          <!-- Pin shadow -->
          <ellipse cx="0" cy="2" rx="6" ry="3" class="pin-shadow" />
          <!-- Pin body -->
          <path
            d="M0,-22 C-8,-22 -12,-16 -12,-11 C-12,-4 0,2 0,2 C0,2 12,-4 12,-11 C12,-16 8,-22 0,-22 Z"
            class="pin-body"
          />
          <!-- Pin dot -->
          <circle cx="0" cy="-12" r="4" class="pin-dot" />
        </g>
      </g>
    </svg>

    <!-- Tooltip -->
    <div
      v-if="tooltipInfo"
      class="map-tooltip"
      :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }"
    >
      <strong>{{ tooltipInfo.name }}</strong>
      <span v-if="tooltipInfo.shopCount > 0">
        {{ tooltipInfo.shopCount }} {{ tooltipInfo.shopCount === 1 ? 'shop' : 'shops' }}
      </span>
      <span v-else>{{ $t('noShopsYet') }}</span>
    </div>
  </div>
</template>

<style module>
/* Using CSS Modules as per guidelines */
</style>

<style scoped>
.cambodia-map-wrapper {
  position: relative;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

.cambodia-svg {
  width: 100%;
  height: auto;
  display: block;
}


.province-path {
  fill: #e8edf3;
  stroke: #c5cdd8;
  stroke-width: 0.8;
  cursor: pointer;
  transition: fill 0.25s ease, stroke 0.25s ease;
}

.province-path:hover,
.province-path.hovered {
  fill: #d4dce8;
  stroke: #94a3b8;
}

.province-path.selected {
  fill: #dbeafe;
  stroke: #2563eb;
  stroke-width: 1.5;
}

.shop-pin-group {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.shop-pin-group:hover {
  transform: scale(1.2);
}

.shop-pin-group.pin-selected {
  filter: drop-shadow(0 2px 6px rgba(37, 99, 235, 0.5));
}

.pin-shadow {
  fill: rgba(0, 0, 0, 0.15);
}

.pin-body {
  fill: #2563eb;
  stroke: #fff;
  stroke-width: 1.5;
  transition: fill 0.2s ease;
}

.shop-pin-group:hover .pin-body {
  fill: #1d4ed8;
}

.pin-dot {
  fill: #fff;
}

.map-tooltip {
  position: absolute;
  background: #fff;
  border-radius: 10px;
  padding: 8px 14px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  pointer-events: none;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.85rem;
  white-space: nowrap;
}

.map-tooltip strong {
  color: #1e293b;
  font-weight: 700;
}

.map-tooltip span {
  color: #64748b;
  font-size: 0.8rem;
}
</style>
