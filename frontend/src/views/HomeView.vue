<template>
  <main class="home-page">
    <!-- Top Navigation -->
    <header class="top-nav">
      <div class="brand-container">
        <img src="/Images/logo-removebg.png" :alt="$t('appName')" class="brand-logo-img" />
        <div class="brand-text">
          <span class="brand-name">Chong <span>Choul</span></span>
          <span class="brand-tagline">{{ $t('appTagline') }}</span>
        </div>
      </div>

      <div class="nav-auth">
        <!-- Language Toggle -->
        <LanguageSwitcher />
        <RouterLink class="link-login" to="/login">{{ $t('signIn') }}</RouterLink>
        <span class="nav-sep" aria-hidden="true">|</span>
        <RouterLink class="btn-signup" to="/chooserole">{{ $t('signUp') }}</RouterLink>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-bg-image"></div>
      <div class="hero-particles">
        <div class="hero-particle hero-p1"></div>
        <div class="hero-particle hero-p2"></div>
        <div class="hero-particle hero-p3"></div>
        <div class="hero-particle hero-p4"></div>
        <div class="hero-particle hero-p5"></div>
        <div class="hero-particle hero-p6"></div>
        <div class="hero-particle hero-p7"></div>
      </div>

      <div class="hero-content">
        <div class="hero-badge">
          <span class="hero-badge-dot"></span>
          <span class="hero-badge-text">{{ $t('appDescription') }}</span>
        </div>

        <h1>
          <span>{{ $t('heroTitleLine1') }}</span>
          <span class="highlight">{{ $t('heroTitleLine2') }}</span>
        </h1>

        <p class="hero-subtitle">
          {{ $t('heroSubtitle') }}
        </p>

        <div class="hero-actions">
          <RouterLink class="hero-btn primary" to="/chooserole">
            <i class="fa-solid fa-magnifying-glass"></i> {{ $t('exploreVehicles') }}
          </RouterLink>
          <RouterLink class="hero-btn ghost" to="/chooserole?role=shop_owner">
            <i class="fa-solid fa-store"></i> {{ $t('listYourShop') }}
          </RouterLink>
        </div>

        <div class="hero-stats">
          <div class="hero-stat">
            <div class="hero-stat-value">{{ totalVehicles > 0 ? totalVehicles + '+' : '0' }}</div>
            <div class="hero-stat-label">{{ $t('vehicles') }}</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-value">{{ totalShops > 0 ? totalShops + '+' : '0' }}</div>
            <div class="hero-stat-label">{{ $t('totalShops') }}</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-value">{{ $t('users') }}+</div>
            <div class="hero-stat-label">{{ $t('rating') }}</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-value">{{ totalCities > 0 ? totalCities : '0' }}</div>
            <div class="hero-stat-label">{{ $t('cities') }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Browse by Category -->
    <section class="section">
      <div class="section-head">
        <h2>{{ $t('browseByCategory') }}</h2>
        <p>{{ $t('findRightRide') }}</p>
      </div>

      <div class="category-grid">
        <article v-for="(item, idx) in categories" :key="item.title" class="category-card" :style="{ animationDelay: `${idx * 0.1}s` }">
          <img :src="item.image" :alt="item.title" />
          <div class="card-overlay"></div>
          <div class="card-text">
            <span class="card-tag">{{ item.tag }}</span>
            <h3>{{ item.title }}</h3>
            <p>{{ item.availability }}</p>
          </div>
        </article>
      </div>
    </section>

    <!-- Featured Shops -->
    <section class="section">
      <div class="section-head">
        <h2>{{ $t('viewShops') }}</h2>
        <p>{{ $t('findShopsDesc') }}</p>
      </div>

      <div v-if="isLoading" class="shops-loading">{{ $t('findingBranches') }}</div>
      <div v-else-if="error" class="shops-loading">{{ error }}</div>
      <div v-else-if="featuredShops.length === 0" class="shops-loading">{{ $t('noBranches') }}</div>

      <div v-else class="shops-grid">
        <article
          v-for="(shop, idx) in featuredShops"
          :key="shop.id"
          class="shop-card animate-fade-in-up"
          :class="`stagger-${idx + 1}`"
          @click="visitShop(shop.id)"
        >
          <div class="shop-card-image">
            <img
              v-if="getShopImage(shop)"
              :src="getShopImage(shop)"
              :alt="shop.name"
              @error="$event.target.style.display='none'"
            />
            <div v-else class="shop-card-placeholder">
              <i class="fa-solid fa-store"></i>
            </div>
          </div>
          <div class="shop-card-body">
            <div class="shop-card-header">
              <h3>{{ shop.name }}</h3>
              <span v-if="shop.status === 'active'" class="shop-badge">{{ $t('active') }}</span>
            </div>
            <p class="shop-address">
              <i class="fa-solid fa-location-dot"></i>
              {{ shop.address || shop.city?.name || '' }}
            </p>
            <div class="shop-meta">
              <span v-if="shop.rating" class="shop-rating">
                <i class="fa-solid fa-star"></i> {{ shop.rating }}
                <small v-if="shop.total_reviews">({{ shop.total_reviews }})</small>
              </span>
              <span v-if="shop.city?.name" class="shop-city">
                <i class="fa-solid fa-map-pin"></i> {{ shop.city.name }}
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- How It Works -->
    <section class="features-section">
      <div class="features-inner">
        <div class="section-head">
          <h2>{{ $t('howItWorks') }}</h2>
          <p>{{ $t('howItWorksDesc') }}</p>
        </div>

        <div class="features-grid">
          <article v-for="(feature, idx) in features" :key="feature.title" class="feature-item animate-fade-in-up" :class="`stagger-${idx + 1}`">
            <div class="feature-icon" aria-hidden="true">{{ feature.icon }}</div>
            <h4>{{ feature.title }}</h4>
            <p>{{ feature.description }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- Trending Rides -->
    <section class="section">
      <div class="section-head">
        <h2>{{ $t('trendingRides') }}</h2>
        <p>{{ $t('findRightRide') }}</p>
      </div>

      <div v-if="isLoading" class="shops-loading">{{ $t('loadingBookings') }}</div>
      <div v-else-if="error" class="shops-loading">{{ error }}</div>
      <div v-else-if="trendingRides.length === 0" class="shops-loading">{{ $t('noVehiclesYet') }}</div>

      <div v-else class="ride-grid">
        <article
          v-for="(vehicle, idx) in trendingRides"
          :key="vehicle.id"
          class="ride-card animate-fade-in-up"
          :class="`stagger-${idx + 1}`"
          @click="router.push('/vehicles/' + vehicle.id)"
        >
          <img :src="getVehicleImage(vehicle) || 'https://images.unsplash.com/photo-1549924231-f129b911e442?auto=format&fit=crop&w=600&q=80'" :alt="vehicle.name" />
          <div class="ride-body">
            <h4>{{ vehicle.name }}</h4>
            <p>{{ vehicle.shop?.name || vehicle.type || '' }} {{ vehicle.brand ? '- ' + vehicle.brand : '' }}</p>
            <div class="ride-bottom">
              <span class="rating" v-if="vehicle.rating">
                <i class="fa-solid fa-star"></i> {{ Number(vehicle.rating).toFixed(1) }}
              </span>
              <span class="price">${{ vehicle.price_per_day }} <small>/day</small></span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div style="width: min(1160px, 100%); margin: 0 auto;">
        <div class="cta-card">
          <div class="cta-text">
            <h2>{{ $t('ctaTitle') }}</h2>
            <p>{{ $t('ctaDesc') }}</p>
            <RouterLink to="/chooserole?role=shop_owner" class="cta-btn">
              {{ $t('registerYourShop') }} <i class="fa-solid fa-arrow-right"></i>
            </RouterLink>
          </div>
          <div class="cta-visual">
            <i class="fa-solid fa-store"></i>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-main">
        <div class="footer-brand">
          <img src="/Images/logo-removebg.png" alt="Chong Choul" class="footer-logo" />
          <h4>Chong <span>Choul</span></h4>
          <p class="footer-desc">{{ $t('appDescription') }}</p>
          <div class="footer-social">
            <a class="footer-social-link" href="#" @click.prevent aria-label="Facebook">
              <i class="fa-brands fa-facebook-f"></i>
            </a>
            <a class="footer-social-link" href="#" @click.prevent aria-label="Instagram">
              <i class="fa-brands fa-instagram"></i>
            </a>
            <a class="footer-social-link" href="#" @click.prevent aria-label="TikTok">
              <i class="fa-brands fa-tiktok"></i>
            </a>
          </div>
        </div>

        <div class="footer-col">
          <h5>{{ $t('home') }}</h5>
          <div class="footer-list">
            <RouterLink class="footer-link" to="/">{{ $t('home') }}</RouterLink>
            <RouterLink class="footer-link" to="/chooserole">{{ $t('exploreVehicles') }}</RouterLink>
            <RouterLink class="footer-link" to="/chooserole?role=shop_owner">{{ $t('listYourShop') }}</RouterLink>
            <RouterLink class="footer-link" to="/login">{{ $t('signIn') }}</RouterLink>
          </div>
        </div>

        <div class="footer-col">
          <h5>{{ $t('categories') }}</h5>
          <div class="footer-list">
            <span class="footer-link">{{ $t('cars') }}</span>
            <span class="footer-link">{{ $t('motorbikes') }}</span>
            <span class="footer-link">{{ $t('bicycles') }}</span>
          </div>
        </div>

        <div class="footer-col">
          <h5><i class="fa-solid fa-language" aria-hidden="true"></i> {{ $t('language') }}</h5>
          <div class="footer-list">
            <LanguageSwitcher variant="list" />
          </div>
        </div>
      </div>

      <div class="footer-divider">
        <span>{{ $t('footerCopyright') }}</span>
        <div class="footer-legal">
          <a href="#">{{ $t('privacyPolicy') }}</a>
          <a href="#">{{ $t('termsOfService') }}</a>
        </div>
      </div>
    </footer>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api, { shopApi, vehicleApi, cityApi } from '@/services/api'
import '@/css/HomeView.css'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

const router = useRouter()
const { t } = useI18n()

const shops = ref([])
const vehicles = ref([])
const cities = ref([])
const isLoading = ref(true)
const error = ref('')

// Resolve image URLs
const getPublicOrigin = () => {
  try {
    const origin = window.location.origin
    if (!origin.includes('127.0.0.1') && !origin.includes('localhost')) {
      return origin
    }
  } catch {
    // ignore
  }
  return null
}

const getApiOrigin = () => {
  try {
    const base = api.defaults.baseURL
    const apiOrigin = base.replace(/\/api\/?$/, '')
    const publicOrigin = getPublicOrigin()
    return publicOrigin || apiOrigin
  } catch {
    const publicOrigin = getPublicOrigin()
    return publicOrigin || 'http://127.0.0.1:8000'
  }
}

const resolveImageUrl = (url) => {
  if (!url) return null
  if (/^(https?:\/\/|data:|blob:)/i.test(url)) {
    const publicOrigin = getPublicOrigin()
    if (publicOrigin && /^https?:\/\/127\.0\.0\.1(:[0-9]+)?\//i.test(url)) {
      return url.replace(/^https?:\/\/[^\/]+/, publicOrigin)
    }
    return url
  }
  const clean = String(url).replace(/^\/+/, '')
  return `${getApiOrigin()}/storage/${clean}`
}

const getShopImage = (shop) => {
  if (!shop) return ''
  return resolveImageUrl(shop.img_url_full || shop.img_url || shop.image || '')
}

const getVehicleImage = (v) => {
  if (!v) return ''
  const fromPhotos = Array.isArray(v.photo_urls) && v.photo_urls.length > 0 ? v.photo_urls[0] : null
  return resolveImageUrl(v.image_url_full || fromPhotos || v.image_url || '')
}

// Fetch real data
const fetchData = async () => {
  isLoading.value = true
  error.value = ''
  try {
    const [shopsRes, vehiclesRes, citiesRes] = await Promise.all([
      shopApi.getAll(),
      vehicleApi.getAll(),
      cityApi.getAll()
    ])

    // Shops
    const shopsData = shopsRes.data?.data || shopsRes.data || []
    shops.value = Array.isArray(shopsData) ? shopsData.filter(s => s.status === 'active' || !s.status) : []

    // Vehicles
    const vehiclesData = vehiclesRes.data?.data || vehiclesRes.data || []
    vehicles.value = Array.isArray(vehiclesData) ? vehiclesData : []

    // Cities
    const citiesData = citiesRes.data?.data || citiesRes.data || []
    cities.value = Array.isArray(citiesData) ? citiesData : []
  } catch (err) {
    console.error('Error fetching home data:', err)
    error.value = 'Could not load data. Please refresh.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchData()
})

// Hero stats
const totalVehicles = computed(() => vehicles.value.length)
const totalShops = computed(() => shops.value.length)
const totalCities = computed(() => cities.value.length)

// Vehicle counts by type for category cards
const carCount = computed(() =>
  vehicles.value.filter(v => {
    const t = (v.type || v.category || '').toLowerCase()
    return ['car', 'suv', 'sedan', 'truck', 'van'].some(k => t.includes(k))
  }).length
)
const motorbikeCount = computed(() =>
  vehicles.value.filter(v => {
    const t = (v.type || v.category || '').toLowerCase()
    return ['motorbike', 'motorcycle', 'moto', 'scooter', 'bike'].some(k => t.includes(k))
  }).length
)
const bicycleCount = computed(() =>
  vehicles.value.filter(v => {
    const t = (v.type || v.category || '').toLowerCase()
    return ['bicycle', 'bicy', 'cycle'].some(k => t.includes(k))
  }).length
)

const categories = computed(() => [
  { tag: 'CITY', title: t('cars'), availability: `${carCount.value || 0}+ ${t('vehicles')}`, image: 'https://i.pinimg.com/1200x/76/4d/1e/764d1e19a2fb69a9046e53ceb4381391.jpg' },
  { tag: 'POPULAR', title: t('motorbikes'), availability: `${motorbikeCount.value || 0}+ ${t('vehicles')}`, image: 'https://i.pinimg.com/1200x/b3/a3/84/b3a384d5a8624aba2943bf7d41edd5e2.jpg' },
  { tag: 'ECO', title: t('bicycles'), availability: `${bicycleCount.value || 0}+ ${t('vehicles')}`, image: 'https://i.pinimg.com/1200x/9d/a8/87/9da8873b9c5bfdc2ac0dd4915e594d02.jpg' }
])

const features = computed(() => [
  { icon: '1', title: t('step1Title'), description: t('step1Desc') },
  { icon: '2', title: t('step2Title'), description: t('step2Desc') },
  { icon: '3', title: t('step3Title'), description: t('step3Desc') }
])

// Featured shops (limit to 6, active ones)
const featuredShops = computed(() =>
  shops.value.slice(0, 6)
)

const visitShop = (shopId) => {
  router.push(`/shop/${shopId}/vehicles`)
}

// Trending rides (limit to 8, available vehicles with images)
const trendingRides = computed(() =>
  vehicles.value
    .filter(v => v.status === 'Available' && (v.image_url_full || v.image_url))
    .slice(0, 8)
)
</script>
