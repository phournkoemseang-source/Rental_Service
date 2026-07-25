<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { vehicleApi, shopApi, api } from '@/services/api'
import { getSessionUser } from '@/services/auth'
import UserNavbar from '@/components/UserNavbar.vue'
import CommonFooter from '@/components/CommonFooter.vue'
import '../../css/Vehicles.css'

const { t } = useI18n()

const router = useRouter()

const navItems = [
  { label: 'Home', route: '/view_shop' },
  { label: 'My Bookings', route: '/my-bookings' },
  { label: 'Profile', route: '/user/profile' }
]

const route = useRoute()

const activeNavLabel = computed(() => {
  const matched = navItems.find((item) => item.route && route.path.startsWith(item.route))
  return matched?.label || 'Home'
})

const handleLogout = () => {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user')
  router.push('/login')
}

const categories = ['Car','Moto', 'Bike']
const statuses = ['Available', 'Rented', 'Maintenance']

// Status labels for display
const statusLabels = {
  'Available': () => t('available'),
  'Rented': () => t('rented'),
  'Maintenance': () => t('maintenance')
}

const search = ref('')
const categoryFilter = ref('All Categories')
const statusFilter = ref('All Status')
const modal = ref(false)
const editId = ref(null)
const loading = ref(false)

// Current shop data
const currentShop = ref(null)
const currentShopId = ref(null)

// Get current user
const sessionUser = ref(getSessionUser() || {})

console.log('=== Vehicles.vue Init ===')
console.log('User from session:', sessionUser.value)
console.log('User ID:', sessionUser.value?.id)

// Shop cache utilities (same as DashboardLayout)
const SHOP_CACHE_PREFIX = "settings_shop_"

const shopCacheKey = (ownerId) => `${SHOP_CACHE_PREFIX}${ownerId}`

const getCachedShop = (ownerId) => {
  if (!ownerId) return null
  try {
    const raw = localStorage.getItem(shopCacheKey(ownerId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    return null
  }
}

const setCachedShop = (ownerId, shopData) => {
  if (!ownerId) return
  console.log('=== setCachedShop ===')
  console.log('ownerId:', ownerId)
  console.log('shopData:', shopData)
  try {
    if (!shopData) {
      localStorage.removeItem(shopCacheKey(ownerId))
      return
    }
    localStorage.setItem(shopCacheKey(ownerId), JSON.stringify(shopData))
    console.log('Shop cached successfully')
  } catch (e) {
    console.log('Error caching shop:', e)
  }
}

// Delete confirmation modal
const showDeleteModal = ref(false)
const deleteId = ref(null)
const deleteVehicleName = ref('')

const confirmDelete = (v) => {
    deleteId.value = v.id
    deleteVehicleName.value = v.name ? `${v.name} - ${v.plate || t('noPlate')}` : v.plate || t('unknownVehicle')
    showDeleteModal.value = true
}

const cancelDelete = () => {
    deleteId.value = null
    deleteVehicleName.value = ''
    showDeleteModal.value = false
}

// Toast notification
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
    toast.value = { show: true, message, type }
    setTimeout(() => toast.value.show = false, 3000)
}

const khTime = () => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Phnom_Penh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(new Date()).map(x => [x.type, x.value]))
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`
}

const vehicles = ref([])

// Fetch vehicles from database
const fetchVehicles = async () => {
    // Wait for shop ID to be available
    if (!currentShopId.value) {
        console.log('Waiting for shop ID before fetching vehicles. currentShopId:', currentShopId.value)
        return
    }
    
    try {
        loading.value = true
        // Pass shop_id to filter vehicles by current shop
        const params = { shop_id: currentShopId.value }
        console.log('Fetching vehicles with shop_id:', currentShopId.value, 'params:', params)
        const response = await vehicleApi.getAll(params)
        console.log('Vehicles API response:', response.data)
        // Handle paginated response
        let vehiclesData = response.data.data || response.data || []
        
        // If no vehicles found with shop_id filter, try without filter (fallback)
        if (vehiclesData.length === 0) {
            console.log('No vehicles found with shop_id, trying without filter...')
            const fallbackResponse = await vehicleApi.getAll()
            vehiclesData = fallbackResponse.data.data || fallbackResponse.data || []
            // Filter client-side by shop_id
            vehiclesData = vehiclesData.filter(v => {
                const vShopId = v.shop_id || v.data?.attributes?.shop_id
                return Number(vShopId) === Number(currentShopId.value)
            })
            console.log('Fallback vehicles after client-side filter:', vehiclesData.length)
        }
        
        console.log('Vehicles data:', vehiclesData.length, 'vehicles')
        vehicles.value = vehiclesData
        // Handle paginated response
        vehicles.value = response.data.data || response.data || []
        // Map database fields to frontend fields
        vehicles.value = vehicles.value.map(v => {
            let parsedPhotos = []
            try {
                if (v.photos) {
                    if (Array.isArray(v.photos)) {
                        parsedPhotos = v.photos
                    } else if (typeof v.photos === 'string') {
                        parsedPhotos = JSON.parse(v.photos)
                    }
                }
            } catch {
                parsedPhotos = []
            }

            const source = v?.data?.attributes ? v.data.attributes : v
            const imageUrl = source.image_url_full || source.image_url || ''
            const baseUrl = api.defaults.baseURL?.replace(/\/api\/?$/, '') || ''
            const resolvedPreview = imageUrl
                ? (/^(https?:\/\/|data:|blob:)/i.test(imageUrl)
                    ? imageUrl
                    : `${baseUrl}/${imageUrl}`.replace(/\/+/g, '/'))
                : (parsedPhotos[0] || sampleThumb)

            return {
                ...source,
                shop_id: source.shop_id,
                type: source.type,
                category: source.category || source.type,
                stock: Number(source.total_vehicles ?? source.totalVehiclesInput ?? 1),
                plate: source.plate_number || source.plate,
                price: Number(source.price_per_day ?? source.price) || 0,
                status: (source.status || 'Available').trim(),
                createdAt: source.created_at || source.create_at,
                updatedAt: source.updated_at,
                previewUrl: resolvedPreview,
                photos: parsedPhotos,
                base64Photos: parsedPhotos,
                riderDetails: source.rider_details ?? '',
                insuranceFee: source.insurance_fee ?? '',
                taxesFee: source.taxes_fee ?? ''
            }
        })
    } catch (error) {
        console.error('Error fetching vehicles:', error)
    } finally {
        loading.value = false
    }
}

// Load vehicles and shop on mount
onMounted(async () => {
    console.log('=== onMounted ===')
    // Re-read session user on mount to ensure we have the latest data
    sessionUser.value = getSessionUser() || {}
    console.log('Session user after init:', sessionUser.value)
    await fetchUserShop()
    await fetchVehicles()
})

// Watch for shop ID changes and refetch vehicles when shop is loaded
watch(currentShopId, async (newShopId, oldShopId) => {
    if (newShopId && newShopId !== oldShopId) {
        console.log('Shop ID changed, refetching vehicles:', newShopId)
        await fetchVehicles()
    }
})

const sampleThumb = 'https://images.unsplash.com/photo-1549924231-f129b911e442?auto=format&fit=crop&w=900&q=80'
const photoPreview = ref(sampleThumb)
const form = reactive({ name: '', brand: '', model: '', category: '', shop: '', plate: '', description: '', fuel: '', transmission: '', price: '', status: 'Available', updatedAt: '', photos: [], base64Photos: [], riderDetails: '', insuranceFee: '', taxesFee: '', totalVehiclesInput: 1 })

const normalizeOptionalNumber = (value) => {
    if (value === '' || value === null || value === undefined) {
        return null
    }

    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

// Fetch user's shop
const fetchUserShop = async () => {
    try {
        const ownerId = Number(sessionUser.value?.id || 0)
        console.log('=== fetchUserShop ===')
        console.log('ownerId:', ownerId)
        if (!ownerId) {
            console.log('No ownerId, returning early')
            return
        }

        // First try to get from cache
        let cachedShop = getCachedShop(ownerId)
        console.log('Cached shop:', cachedShop)
        if (cachedShop) {
            console.log('Using cached shop:', cachedShop.id)
            currentShop.value = cachedShop
            currentShopId.value = cachedShop.id
            form.shop = cachedShop.name
            // Trigger vehicle fetch immediately since we have shop
            await fetchVehicles()
            return
        }

        // Fetch from API if not in cache
        console.log('Fetching shop from API...')
        const response = await api.get('/shops')
        const shops = response.data.data || response.data || []
        console.log('All shops:', shops.length)
        const myShops = shops.filter((s) => Number(s.owner_id) === ownerId)
        console.log('My shops:', myShops.length)

        if (myShops.length > 0) {
            // Sort by creation date, newest first
            myShops.sort((a, b) => {
                const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
                const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
                return bTime - aTime
            })
            console.log('Selected shop:', myShops[0].id, myShops[0].name)
            currentShop.value = myShops[0]
            currentShopId.value = myShops[0].id
            form.shop = myShops[0].name
            // Cache the shop for future use
            setCachedShop(ownerId, myShops[0])
        } else {
            console.log('No shop found for this user!')
        }
    } catch (error) {
        console.error('Error fetching shop:', error)
    }
}

// Format date to show only day, month, year
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  } catch (e) {
    return dateStr
  }
}

// Status icons
const getStatusIcon = (status) => {
  if (status === 'Available') {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10b981" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
  } else if (status === 'Rented') {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
  } else if (status === 'Maintenance') {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#f59e0b" stroke-width="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>'
  }
  return ''
}

const categoryIconMap = {
  car: 'fa-solid fa-car-side',
  moto: 'fa-solid fa-motorcycle',
  bike: 'fa-solid fa-bicycle',
  default: 'fa-solid fa-car'
}

const getCategoryIcon = (category) => {
  const key = (category || '').toString().trim().toLowerCase()
  return categoryIconMap[key] || categoryIconMap.default
}

// Get status badge class
const getStatusClass = (status) => {
  if (status === 'Available') return 'status-available'
  if (status === 'Rented') return 'status-rented'
  if (status === 'Maintenance') return 'status-maintenance'
  return ''
}

const filteredVehicles = computed(() => {
    const s = search.value.trim().toLowerCase()
    return vehicles.value.filter(v => {
        const sOk = !s ||
            (v.name && v.name.toLowerCase().includes(s)) ||
            (v.category && v.category.toLowerCase().includes(s)) ||
            (v.brand && v.brand.toLowerCase().includes(s)) ||
            (v.model && v.model.toLowerCase().includes(s)) ||
            (v.plate && v.plate.toLowerCase().includes(s))
        const cOk = categoryFilter.value === t('allCategories') || v.category === categoryFilter.value
        const stOk = statusFilter.value === t('allStatus') || v.status === statusFilter.value
        return sOk && cOk && stOk
    })
})

const totalVehicles = computed(() => vehicles.value.length)
const availableVehicles = computed(() => vehicles.value.filter(v => v.status === 'Available').length)
const maintenanceVehicles = computed(() => vehicles.value.filter(v => v.status === 'Maintenance').length)
const potentialPerDay = computed(() => vehicles.value.reduce((a, b) => a + Number(b.price || 0), 0))

const openCreate = async () => {
    editId.value = null
    // Ensure we have the latest shop data
    await fetchUserShop()
    Object.assign(form, {
        name: '', brand: '', model: '', category: categories[0] || '',
        shop: currentShop.value?.name || '',
        plate: '', description: '', fuel: '', transmission: '',
        price: '', status: 'Available', updatedAt: khTime(),
        photos: [], base64Photos: [],
        riderDetails: '', insuranceFee: '', taxesFee: '',
        totalVehiclesInput: 1
    })
    photoPreview.value = sampleThumb
    modal.value = true
}

const openEdit = (v) => {
    editId.value = v.id
    // Parse photos to get base64 data
    let photosData = v.photos || []
    if (typeof v.photos === 'string') {
        try {
            photosData = JSON.parse(v.photos)
        } catch (e) {
            photosData = []
        }
    }

    // Use image_url_full if available, otherwise fall back to previewUrl
    const imageUrl = v.image_url_full || v.previewUrl || ''

    Object.assign(form, {
        name: v.name || '',
        brand: v.brand || '',
        model: v.model || '',
        category: v.category || v.type || categories[0] || '',
        shop: v.shop || currentShop.value?.name || '',
        plate: v.plate || '',
        description: v.description || '',
        fuel: v.fuel || '',
        transmission: v.transmission || '',
        price: v.price || '',
        status: v.status || 'Available',
        updatedAt: khTime(),
        photos: Array.isArray(photosData) ? photosData.map((_, i) => `Photo ${i + 1}`) : [],
        base64Photos: photosData || [],
        riderDetails: v.riderDetails || '',
        insuranceFee: v.insuranceFee ?? '',
        taxesFee: v.taxesFee ?? '',
        totalVehiclesInput: v.stock ?? 1
    })
    // Use the stored full URL or fall back to sampleThumb
    photoPreview.value = imageUrl || sampleThumb
    modal.value = true
}

const saveVehicle = async () => {
    const nameValue = String(form.name || '').trim()
    const categoryValue = String(form.category || form.type || categories[0] || '').trim()
    if (!nameValue || !categoryValue || form.price === '' || form.price === null || form.price === undefined) {
        showToast('Please fill in all required fields: Name, Category, and Price', 'error')
        return
    }

    // Validate price is a valid number
    const priceValue = Number(form.price)
    if (isNaN(priceValue) || priceValue <= 0) {
        showToast('Please enter a valid price per day', 'error')
        return
    }

    // Ensure form has a category value for the backend and UI
    form.category = categoryValue

    // Ensure we have shop data
    if (!currentShopId.value) {
        showToast('Please create a shop first before adding vehicles', 'error')
        return
    }

    const payload = {
        name: nameValue,
        brand: form.brand,
        model: form.model,
        category: categoryValue,
        plate: form.plate || `AUTO-${Date.now().toString().slice(-5)}`,
        price: priceValue,
        status: form.status,
        shop: form.shop,
        shop_id: currentShopId.value,  // Include shop_id for proper association
        description: form.description,
        fuel: form.fuel,
        transmission: form.transmission,
        photos: form.base64Photos || [],
        previewUrl: photoPreview.value,
        rider_details: form.riderDetails,
        insurance_fee: normalizeOptionalNumber(form.insuranceFee),
        taxes_fee: normalizeOptionalNumber(form.taxesFee),
        total_vehicles: normalizeOptionalNumber(form.totalVehiclesInput) ?? 1
    }
    console.log('=== Form Data ===', form)
    console.log('=== Payload ===', payload)

    try {
        if (editId.value) {
            // Update existing vehicle
            const response = await vehicleApi.update(editId.value, payload)
            const updatedData = response.data
            const index = vehicles.value.findIndex(v => v.id === editId.value)
            if (index >= 0) {
                // Use image_url_full from API response if available
                const imageUrl = updatedData.image_url_full || updatedData.image_url || ''
                vehicles.value[index] = {
                    ...vehicles.value[index],
                    name: updatedData.name,
                    brand: updatedData.brand,
                    model: updatedData.model,
                    category: updatedData.type,
                    type: updatedData.type,
                    plate: updatedData.plate_number,
                    price: updatedData.price_per_day,
                    status: updatedData.status,
                    description: updatedData.description,
                    fuel: updatedData.fuel_type,
                    transmission: updatedData.transmission,
                    shop_id: updatedData.shop_id,
                    previewUrl: imageUrl || (form.base64Photos && form.base64Photos[0]) || sampleThumb,
                    image_url_full: updatedData.image_url_full,
                    photos: form.base64Photos || [],
                    base64Photos: form.base64Photos || [],
                    riderDetails: updatedData.rider_details ?? '',
                    insuranceFee: updatedData.insurance_fee ?? '',
                    taxesFee: updatedData.taxes_fee ?? '',
                    updatedAt: khTime()
                }
            }
            modal.value = false
            showToast('Vehicle updated successfully!', 'success')
            // Re-fetch vehicles to ensure the list stays in sync with the database
            await fetchVehicles()
        } else {
            // Create new vehicle - wait for API response first
            const response = await vehicleApi.create(payload)
            const newData = response.data

            modal.value = false
            showToast('Vehicle created successfully!', 'success')
            // Re-fetch vehicles to ensure the list stays in sync with the database
            await fetchVehicles()
        }
    } catch (error) {
        console.error('Error saving vehicle:', error)
        console.error('Error response:', error.response)

        let errorMessage = 'Failed to save vehicle. Please try again.'

        if (error.response) {
            if (error.response.status === 401) {
                errorMessage = 'You are not authenticated. Please login again.'
            } else if (error.response.status === 403) {
                errorMessage = error.response.data?.message || 'You do not have permission.'
            } else if (error.response.status === 422) {
                const errors = error.response.data?.errors
                if (errors) {
                    const firstError = Object.values(errors)[0]
                    errorMessage = Array.isArray(firstError) ? firstError[0] : firstError
                } else {
                    errorMessage = error.response.data?.message || 'Validation failed.'
                }
            } else {
                errorMessage = error.response.data?.message || errorMessage
            }
        } else if (error.request) {
            errorMessage = 'No response from server. Please check your connection.'
        }

        showToast(errorMessage, 'error')
    }
}

const removeVehicle = async () => {
    if (!deleteId.value) return
    try {
        await vehicleApi.delete(deleteId.value)
        vehicles.value = vehicles.value.filter(v => v.id !== deleteId.value)
        showToast('Vehicle deleted successfully!', 'success')
    } catch (error) {
        console.error('Error deleting vehicle:', error)
        showToast('Failed to delete vehicle. Please try again.', 'error')
    } finally {
        cancelDelete()
    }
}

const onPhotos = async (e) => {
    const files = Array.from(e.target.files || [])

    // Convert files to base64 for persistent storage
    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(file)
        })
    }

    try {
        const base64Images = await Promise.all(files.map(f => convertToBase64(f)))
        const names = files.map(f => f.name)
        form.photos = [...form.photos, ...names].slice(0, 8)

        // Store base64 data for persistence
        if (!form.base64Photos) form.base64Photos = []
        form.base64Photos = [...form.base64Photos, ...base64Images].slice(0, 8)

        if (files.length) photoPreview.value = base64Images[0]
    } catch (error) {
        console.error('Error converting images:', error)
        // Fallback to old behavior
        const names = files.map(f => f.name)
        form.photos = [...form.photos, ...names].slice(0, 8)
        if (files.length) photoPreview.value = URL.createObjectURL(files[0])
    }
}
const onPhotoDrop = async (e) => {
    const files = Array.from(e.dataTransfer?.files || [])

    // Convert files to base64 for persistent storage
    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(file)
        })
    }

    try {
        const base64Images = await Promise.all(files.map(f => convertToBase64(f)))
        const names = files.map(f => f.name)
        form.photos = [...form.photos, ...names].slice(0, 8)

        // Store base64 data for persistence
        if (!form.base64Photos) form.base64Photos = []
        form.base64Photos = [...form.base64Photos, ...base64Images].slice(0, 8)

        if (files.length) photoPreview.value = base64Images[0]
    } catch (error) {
        console.error('Error converting images:', error)
        // Fallback to old behavior
        const names = files.map(f => f.name)
        form.photos = [...form.photos, ...names].slice(0, 8)
        if (files.length) photoPreview.value = URL.createObjectURL(files[0])
    }
}
</script>

<template>
  <UserNavbar
    :nav-items="navItems"
    :active-label="activeNavLabel"
    :show-fallback-message="false"
    @logout-request="handleLogout"
  />

  <main class="vehicles-main">
    <div class="panel vehicles-page">
    <div class="line top-line">
      <div>
        <h3>{{ $t('manageVehicles') }}</h3>
        <p class="muted">{{ $t('manageVehiclesDesc') }}</p>
      </div>
      <div class="controls">
        <div class="search">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="#64748b"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="7"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            v-model="search"
            :placeholder="$t('searchVehicle')"
          />
        </div>
        <div class="select-wrap">
          <select v-model="categoryFilter" class="select">
            <option>{{ $t('allCategories') }}</option>
            <option v-for="c in categories" :key="c">{{ c }}</option>
          </select>
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="#94a3b8"
            stroke-width="2"
          >
            <path d="M6 9l6 6 6-6"></path>
          </svg>
        </div>
        <div class="select-wrap">
          <select v-model="statusFilter" class="select">
            <option>{{ $t('allStatus') }}</option>
            <option v-for="s in statuses" :key="s">{{ statusLabels[s] ? statusLabels[s]() : s }}</option>
          </select>
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="#94a3b8"
            stroke-width="2"
          >
            <path d="M6 9l6 6 6-6"></path>
          </svg>
        </div>
        <button class="primary add-btn" @click="openCreate">
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="#fff"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          {{ $t('addNewVehicle') }}
        </button>
      </div>
    </div>

    <div class="cards">
      <article>
        <div class="icon-box blue">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 13v-2a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v2"></path>
            <circle cx="7.5" cy="17.5" r="1.5"></circle>
            <circle cx="16.5" cy="17.5" r="1.5"></circle>
          </svg>
        </div>
        <div>
          <h3>{{ totalVehicles }}</h3>
          <span>{{ $t('totalVehicles') }}</span>
        </div>
      </article>
      <article>
        <div class="icon-box green">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M8 12.5l2.4 2.4L16 9.3"></path>
          </svg>
        </div>
        <div>
          <h3>{{ availableVehicles }}</h3>
          <span>{{ $t('available') }}</span>
        </div>
      </article>
      <article>
        <div class="icon-box yellow">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M14.7 6.3l3 3"></path>
            <path d="M3 21l3.8-.7L19 8a2.1 2.1 0 0 0-3-3L3.8 17.3z"></path>
          </svg>
        </div>
        <div>
          <h3>{{ maintenanceVehicles }}</h3>
          <span>{{ $t('maintenance') }}</span>
        </div>
      </article>
    </div>

    <div class="table">
      <table>
        <thead>
          <tr>
            <th>{{ $t('image') }}</th>
            <th>{{ $t('vehicle') }}</th>
            <th>{{ $t('stock') }}</th>
            <th>{{ $t('category') }}</th>
            <th>{{ $t('plateNumber') }}</th>
            <th>{{ $t('stock') }}</th>
            <th>{{ $t('pricePerDay') }}</th>
            <th>{{ $t('status') }}</th>
            <th>{{ $t('createdAt') }}</th>
            <th>{{ $t('actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in filteredVehicles" :key="v.id">
            <td>
              <img
                :src="v.previewUrl || sampleThumb"
                alt="Vehicle"
                @error="$event.target.src = sampleThumb"
                style="
                  width: 60px;
                  height: 40px;
                  object-fit: cover;
                  border-radius: 4px;
                "
              />
            </td>
            <td class="vehicle-name-cell">
              <i
                :class="['vehicle-category-icon', getCategoryIcon(v.category)]"
                aria-hidden="true"
              ></i>
              <span>{{ v.name }}</span>
            </td>
            <td>{{ v.stock }}</td>
            <td>{{ v.category }}</td>
            <td>{{ v.plate }}</td>
            <td>{{ v.total_vehicles ?? 1 }}</td>
            <td>${{ v.price }}</td>
            <td>
              <span :class="['status-badge', getStatusClass(v.status)]">
                <span v-html="getStatusIcon(v.status)"></span> {{ statusLabels[v.status] ? statusLabels[v.status]() : v.status }}
              </span>
            </td>
            <td>{{ formatDate(v.createdAt) }}</td>
            <td class="actions">
              <button class="icon-btn" @click="openEdit(v)">
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="#000000"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"></path>
                </svg>
              </button>
              <button class="danger icon-btn" @click="confirmDelete(v)">
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="#000000"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M3 6h18"></path>
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="filteredVehicles.length === 0" class="empty">
        <div class="empty-card">
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="#94a3b8"
            stroke-width="1.8"
          >
            <path d="M3 13v-2a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v2"></path>
            <circle cx="7.5" cy="17.5" r="1.5"></circle>
            <circle cx="16.5" cy="17.5" r="1.5"></circle>
          </svg>
          <p>{{ $t('noVehiclesFound') }}</p>
        </div>
      </div>
    </div>

    <div v-if="modal" class="add-vehicle-overlay" @click.self="modal = false">
      <div class="add-vehicle-modal">
        <!-- Header -->
        <div class="add-vehicle-header">
          <h2>{{ editId ? $t('editVehicle') : $t('addNewVehicle') }}</h2>
          <button class="close-btn" @click="modal = false">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="add-vehicle-content">
          <!-- Left Column -->
          <div class="add-vehicle-left">
            <!-- Vehicle Identification -->
            <div class="form-card">
              <h3 class="card-title">{{ $t('vehicleIdentification') }}</h3>
              <div class="form-group">
                <label>{{ $t('vehicleName') }}</label>
                <input
                  v-model="form.name"
                  placeholder="e.g. 2023 Luxury Sedan White"
                />
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label>{{ $t('category') }}</label>
                  <select v-model="form.category">
                    <option value="" disabled>{{ $t('selectCategory') }}</option>
                    <option v-for="c in categories" :key="c">{{ c }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>{{ $t('shopLocation') }}</label>
                  <select v-model="form.shop">
                    <option value="" disabled>{{ $t('selectShop') }}</option>
                    <option v-if="currentShop" :value="currentShop.name">
                      {{ currentShop.name }}
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Description -->
            <div class="form-card">
              <h3 class="card-title">{{ $t('description') }}</h3>
              <div class="form-row">
                <div class="form-group">
                  <label>{{ $t('plateNumber') }}</label>
                  <input v-model="form.plate" placeholder="e.g. ABC-1234" />
                </div>
                <div class="form-group">
                  <label>{{ $t('fuelType') }}</label>
                  <select v-model="form.fuel">
                    <option value="" disabled>{{ $t('selectFuel') }}</option>
                    <option>{{ $t('petrol') }}</option>
                    <option>{{ $t('diesel') }}</option>
                    <option>{{ $t('electric') }}</option>
                    <option>{{ $t('hybrid') }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>{{ $t('transmission') }}</label>
                  <select v-model="form.transmission">
                    <option value="" disabled>{{ $t('selectTransmission') }}</option>
                    <option>{{ $t('automatic') }}</option>
                    <option>{{ $t('manual') }}</option>
                  </select>
                </div>
              </div>
              <div class="form-group mt-12">
                <label>{{ $t('description') }}</label>
                <textarea
                  v-model="form.description"
                  :placeholder="$t('manageVehiclesDesc')"
                ></textarea>
              </div>
            </div>
          </div>            <!-- Right Column -->
          <div class="add-vehicle-right">
            <!-- Pricing & Status -->
            <div class="form-card">
              <h3 class="card-title">{{ $t('pricingAndStatus') }}</h3>
              <div class="form-row">
                <div class="form-group">
                  <label>{{ $t('pricePerDayLabel') }}</label>
                  <input
                    v-model="form.price"
                    type="number"
                    placeholder="$ 0.00"
                  />
                </div>
                <div class="form-group">
                  <label>{{ $t('status') }}</label>
                  <select v-model="form.status">
                    <option>{{ $t('available') }}</option>
                    <option>{{ $t('rented') }}</option>
                    <option>{{ $t('maintenance') }}</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>{{ $t('riderDetails') }}</label>
                  <select v-model="form.riderDetails">
                    <option value="" disabled>{{ $t('selectRiderDetails') }}</option>
                    <option>{{ $t('oneRider') }}</option>
                    <option>{{ $t('twoRiders') }}</option>
                    <option>{{ $t('threeRiders') }}</option>
                    <option>{{ $t('fourRiders') }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>{{ $t('totalVehiclesLabel') }}</label>
                  <input
                    v-model="form.totalVehiclesInput"
                    type="number"
                    min="1"
                    placeholder="1"
                  />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>{{ $t('insuranceFee') }}</label>
                  <input
                    v-model="form.insuranceFee"
                    type="number"
                    placeholder="$ 0.00"
                  />
                </div>
                <div class="form-group">
                  <label>{{ $t('taxesFees') }}</label>
                  <input
                    v-model="form.taxesFee"
                    type="number"
                    placeholder="$ 0.00"
                  />
                </div>
              </div>
            </div>

            <!-- Vehicle Photos -->
            <div class="form-card">
              <h3 class="card-title">{{ $t('vehiclePhotos') }}</h3>
              <div
                class="photo-upload-area"
                @click="$refs.photos && $refs.photos.click()"
                @dragover.prevent
                @drop.prevent="onPhotoDrop"
              >
                <input
                  ref="photos"
                  type="file"
                  multiple
                  accept="image/png, image/jpeg"
                  @change="onPhotos"
                  style="display: none"
                />
                <div
                  v-if="!photoPreview || photoPreview === sampleThumb"
                  class="upload-placeholder"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="40"
                    height="40"
                    fill="none"
                    stroke="#94a3b8"
                    stroke-width="1.5"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 5 17 10"></polyline>
                    <line x1="12" y1="5" x2="12" y2="16"></line>
                  </svg>
                  <p>{{ $t('clickToUpload') }}</p>
                  <span>{{ $t('uploadHint') }}</span>
                </div>
                <div v-else class="photo-preview">
                  <img :src="photoPreview" alt="Vehicle preview" />
                  <div class="photo-overlay">
                    <span>{{ $t('clickToChange') }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="add-vehicle-footer">
          <button class="discard-btn" @click="modal = false">
            {{ $t('discardDraft') }}
          </button>
          <button class="store-btn" @click="saveVehicle">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
              ></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            {{ editId ? $t('updateVehicle') : $t('storeProduct') }}
          </button>
        </div>
      </div>
    </div>
  <!-- Delete Confirmation Modal -->
  <div v-if="showDeleteModal" class="delete-overlay" @click.self="cancelDelete">
    <div class="delete-modal">
      <div class="delete-icon-wrapper">
        <svg
          viewBox="0 0 24 24"
          width="48"
          height="48"
          fill="none"
          stroke="#e74c3c"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="3 6 5 6 21 6"></polyline>
          <path
            d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
          ></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </div>
      <h3 class="delete-title">{{ $t('deleteVehicle') }}</h3>
      <p class="delete-message">
        {{ $t('deleteVehicleConfirm') }}
      </p>
      <p class="delete-vehicle-name">{{ deleteVehicleName }}</p>
      <p class="delete-warning">
        {{ $t('deleteVehicleWarning') }}
      </p>
      <div class="delete-actions">
        <button class="delete-cancel-btn" @click="cancelDelete">{{ $t('cancel') }}</button>
        <button class="delete-confirm-btn" @click="removeVehicle">
          {{ $t('delete') }}
        </button>
      </div>
    </div>
  </div>

  <!-- Toast Notification -->
  <div v-if="toast.show" :class="['toast', toast.type]">
    {{ toast.message }}
  </div>
</div>
  </main>

  <CommonFooter />
</template>
