<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { vehicleApi } from '../../services/api.js'
import { useAdminStore } from '../../stores/adminStore.js'
import { useToast } from '../../composables/useToast.js'
import ConfirmModal from '../../components/ConfirmModal.vue'

const admin = useAdminStore()
const toast = useToast()
const route = useRoute()

const page = ref(1)
const perPage = 8

const showCreate = ref(false)
const showEdit = ref(false)
const showView = ref(false)
const showDeleteConfirm = ref(false)

const selected = ref(null)
const deleteTarget = ref(null)

const imageFile = ref(null)
const imagePreview = ref('')

const form = ref({
  id: null,
  shop_id: null,
  name: '',
  category: '',
  brand: '',
  model: '',
  plate: '',
  price: 0,
  status: 'Available',
  fuel: '',
  transmission: '',
  description: '',
  image_url: '',
})

const query = computed(() => String(route.query.q || '').trim().toLowerCase())

const shopNameById = computed(() => {
  const map = new Map()
  admin.state.shops.forEach((s) => map.set(String(s.id), s.name))
  return map
})

const normalizedVehicles = computed(() => {
  const items = admin.state.vehicles || []
  return items.map((v) => ({
    ...v,
    shop_name: v?.shop?.name || shopNameById.value.get(String(v.shop_id)) || '—',
    image: v.image_url_full || v.image_url || (Array.isArray(v.photo_urls) && v.photo_urls[0]) || '',
    plate: v.plate_number || v.plate || '',
    price: Number(v.price_per_day ?? v.price ?? 0) || 0,
  }))
})

const shopOptions = computed(() => admin.state.shops || [])

const filteredVehicles = computed(() => {
  const q = query.value
  if (!q) return normalizedVehicles.value
  return normalizedVehicles.value.filter((v) => {
    const hay = `${v.name || ''} ${v.brand || ''} ${v.model || ''} ${v.plate || ''} ${v.shop_name || ''} ${v.id || ''}`.toLowerCase()
    return hay.includes(q)
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredVehicles.value.length / perPage)))
watch(totalPages, (next) => { if (page.value > next) page.value = next })

const pagedVehicles = computed(() => {
  const start = (page.value - 1) * perPage
  return filteredVehicles.value.slice(start, start + perPage)
})

const formatCurrency = (value) => {
  const amount = Number(value) || 0
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

const selectedVehicle = computed(() => {
  if (!selected.value) return null
  return {
    ...selected.value,
    shop_name: selected.value.shop_name || shopNameById.value.get(String(selected.value.shop_id)) || '—',
  }
})

const selectedVehicleName = computed(() => selectedVehicle.value?.name || 'Unnamed vehicle')
const selectedVehicleImage = computed(() => selectedVehicle.value?.image || selectedVehicle.value?.image_url || '')
const selectedVehicleInitials = computed(() => {
  const name = selectedVehicleName.value
  const parts = name.split(/\s+/).filter(Boolean)
  if (!parts.length) return 'VE'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
})
const selectedVehicleStatus = computed(() => selectedVehicle.value?.status || 'Status unknown')
const selectedVehicleShopName = computed(() => selectedVehicle.value?.shop_name || 'Unassigned shop')
const selectedVehicleBrand = computed(() => selectedVehicle.value?.brand || '—')
const selectedVehicleModel = computed(() => selectedVehicle.value?.model || '—')
const selectedVehicleCategory = computed(() => selectedVehicle.value?.category || selectedVehicle.value?.type || '—')
const selectedVehiclePlate = computed(() => selectedVehicle.value?.plate || '—')
const selectedVehicleFuel = computed(() => selectedVehicle.value?.fuel || selectedVehicle.value?.fuel_type || '—')
const selectedVehicleTransmission = computed(() => selectedVehicle.value?.transmission || '—')
const selectedVehiclePrice = computed(() => formatCurrency(selectedVehicle.value?.price_per_day ?? selectedVehicle.value?.price ?? 0))
const selectedVehicleDescription = computed(() => selectedVehicle.value?.description || 'No additional notes.')

const statusBadgeClass = (status) => {
  const s = String(status || '').toLowerCase()
  if (s === 'available') return 'badge badge-green'
  if (s === 'rented') return 'badge badge-yellow'
  if (s === 'maintenance') return 'badge badge-red'
  return 'badge'
}

const openCreate = () => {
  showCreate.value = true
  imageFile.value = null
  imagePreview.value = ''
  form.value = {
    id: null,
    shop_id: null,
    name: '',
    category: '',
    brand: '',
    model: '',
    plate: '',
    price: 0,
    status: 'Available',
    fuel: '',
    transmission: '',
    description: '',
    image_url: '',
  }
}

const openView = (vehicle) => {
  selected.value = vehicle
  showView.value = true
}

const openEdit = (vehicle) => {
  const v = vehicle || {}
  form.value = {
    id: v.id,
    shop_id: v.shop_id ?? null,
    name: v.name || '',
    category: v.type || v.category || '',
    brand: v.brand || '',
    model: v.model || '',
    plate: v.plate || '',
    price: Number(v.price ?? v.price_per_day ?? 0) || 0,
    status: v.status || 'Available',
    fuel: v.fuel_type || v.fuel || '',
    transmission: v.transmission || '',
    description: v.description || '',
    image_url: v.image || v.image_url_full || v.image_url || '',
  }
  imageFile.value = null
  imagePreview.value = ''
  showEdit.value = true
}

const closeModals = () => {
  showCreate.value = false
  showEdit.value = false
  showView.value = false
}

const onImageChange = (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  if (!file.type?.startsWith('image/')) {
    toast.error('Please select a valid image file.')
    return
  }
  imageFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = String(e.target?.result || '')
    form.value.image_url = imagePreview.value
  }
  reader.readAsDataURL(file)
}


const toPayload = () => ({
  name: form.value.name,
  category: form.value.category || null,
  brand: form.value.brand || null,
  model: form.value.model || null,
  plate: form.value.plate || null,
  price: Number(form.value.price || 0) || 0,
  status: form.value.status || 'Available',
  fuel: form.value.fuel || null,
  transmission: form.value.transmission || null,
  description: form.value.description || null,
  image_url: form.value.image_url || null,
  shop_id: form.value.shop_id || null,
})

const submitCreate = async () => {
  const name = String(form.value.name || '').trim()
  if (!name) {
    toast.error('Vehicle name is required.')
    return
  }

  try {
    await vehicleApi.create(toPayload())
    toast.success('Vehicle created successfully.')
    closeModals()
    await admin.load({ force: true }).catch(() => {})
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to create vehicle.')
  }
}

const submitEdit = async () => {
  const id = form.value.id
  if (!id) return
  const name = String(form.value.name || '').trim()
  if (!name) {
    toast.error('Vehicle name is required.')
    return
  }

  try {
    await vehicleApi.update(id, toPayload())
    toast.success('Vehicle updated successfully.')
    closeModals()
    await admin.load({ force: true }).catch(() => {})
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to update vehicle.')
  }
}

const requestDelete = (vehicle) => {
  deleteTarget.value = vehicle
  showDeleteConfirm.value = true
}

const deleteVehicleMessage = computed(() => {
  const name = String(deleteTarget.value?.name || '').trim()
  if (name) return `Are you sure you want to delete "${name}"?`
  return 'Are you sure you want to delete this vehicle?'
})

const confirmDelete = async () => {
  const vehicle = deleteTarget.value
  if (!vehicle?.id) return
  try {
    await vehicleApi.delete(vehicle.id)
    toast.success('Vehicle deleted.')
    await admin.load({ force: true }).catch(() => {})
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to delete vehicle.')
  } finally {
    showDeleteConfirm.value = false
    deleteTarget.value = null
  }
}

onMounted(async () => {
  await admin.load().catch(() => {})
})
</script>

<template>
  <section class="admin-page">
    <header class="page-head">
      <div>
        <h1 class="page-title">{{ $t('vehicleManagement') }}</h1>
        <p class="page-subtitle">{{ $t('manageFleetInventoryAcrossAllShops') }}</p>
      </div>
      <button type="button" class="btn btn-primary btn-block" @click="openCreate">
        <i class="fa-solid fa-plus" aria-hidden="true"></i>
        <span>{{ $t('addVehicle') }}</span>
      </button>
    </header>

    <section class="card">
      <div class="card-head">
        <div>
          <h2 class="card-title">{{ $t('vehicles') }}</h2>
          <p class="card-subtitle">{{ admin.formatted.fmtNumber(filteredVehicles.length) }} total</p>
        </div>
      </div>


      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ $t('vehicle3') }}</th>
              <th>{{ $t('shop2') }}</th>
              <th class="num">{{ $t('priceDay') }}</th>
              <th>{{ $t('status2') }}</th>
              <th class="actions">{{ $t('actions2') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in pagedVehicles" :key="v.id">
              <td class="shop-cell">
                <span class="shop-icon square" aria-hidden="true">
                  <img v-if="v.image" class="shop-photo" :src="v.image" :alt="v.name" />
                  <i v-else class="fa-solid fa-motorcycle"></i>
                </span>
                <div class="shop-meta">
                  <div class="shop-name">{{ v.name }}</div>
                  <div class="shop-id">{{ (v.brand || '—') }} • {{ v.plate || '—' }} • ID: {{ v.id }}</div>
                </div>
              </td>
              <td class="muted">{{ v.shop_name }}</td>
              <td class="num"><strong>${{ Number(v.price || 0).toFixed(0) }}</strong></td>
              <td><span :class="statusBadgeClass(v.status)">{{ v.status }}</span></td>
              <td class="actions">
                <button type="button" class="icon-action" title="View" @click="openView(v)"><i class="fa-regular fa-eye"></i></button>
                <button type="button" class="icon-action" title="Edit" @click="openEdit(v)"><i class="fa-regular fa-pen-to-square"></i></button>
                <button type="button" class="icon-action" title="Delete" @click="requestDelete(v)"><i class="fa-regular fa-trash-can"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="table-footer">
        <div class="muted">
          SHOWING {{ (page - 1) * perPage + 1 }} TO {{ Math.min(page * perPage, filteredVehicles.length) }} OF
          {{ admin.formatted.fmtNumber(filteredVehicles.length) }} VEHICLES
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
            <div class="modal-title">{{ showEdit ? 'Edit Vehicle' : 'Create Vehicle' }}</div>
            <div class="modal-sub">{{ $t('updateVehicleInformationAndImage') }}</div>
          </div>
          <button type="button" class="icon-action" title="Close" @click="closeModals"><i class="fa-solid fa-xmark"></i></button>
        </div>


        <div class="modal-body form-grid">
          <label class="field">
            <span class="field-label">{{ $t('vehicleName') }}</span>
            <input v-model="form.name" type="text" placeholder="e.g. Honda PCX 160" />
          </label>
          <label class="field">
            <span class="field-label">{{ $t('categoryType') }}</span>
            <input v-model="form.category" type="text" placeholder="motorbike, car..." />
          </label>
          <label class="field">
            <span class="field-label">{{ $t('brand') }}</span>
            <input v-model="form.brand" type="text" placeholder="Honda" />
          </label>
          <label class="field">
            <span class="field-label">{{ $t('model') }}</span>
            <input v-model="form.model" type="text" placeholder="PCX 160" />
          </label>
          <label class="field">
            <span class="field-label">{{ $t('plate') }}</span>
            <input v-model="form.plate" type="text" placeholder="1AB-2345" />
          </label>
          <label class="field">
            <span class="field-label">{{ $t('pricePerDay') }}</span>
            <input v-model.number="form.price" type="number" min="0" />
          </label>
          <label class="field">
            <span class="field-label">{{ $t('status') }}</span>
            <select v-model="form.status">
              <option>{{ $t('available') }}</option>
              <option>{{ $t('rented') }}</option>
              <option>{{ $t('maintenance') }}</option>
            </select>
          </label>
          <label class="field">
            <span class="field-label">{{ $t('shop') }}</span>
            <select v-model.number="form.shop_id">
              <option :value="null">{{ $t('unassignedSelectAShop') }}</option>
              <option v-for="shop in shopOptions" :key="shop.id" :value="shop.id">
                {{ shop.name }} (ID: {{ shop.id }})
              </option>
            </select>
          </label>
          <label class="field span-2">
            <span class="field-label">{{ $t('shopDescription') }}</span>
            <textarea v-model="form.description" rows="3" placeholder="Optional notes..."></textarea>
          </label>
          <label class="field span-2">
            <span class="field-label">{{ $t('vehicleImage') }}</span>
            <input type="file" accept="image/*" @change="onImageChange" />
            <div v-if="imagePreview || form.image_url" class="image-preview">
              <img :src="imagePreview || form.image_url" alt="Vehicle preview" />
            </div>
          </label>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="closeModals">{{ $t('cancel') }}</button>
          <button v-if="showEdit" type="button" class="btn btn-primary" @click="submitEdit">{{ $t('saveChanges') }}</button>
          <button v-else type="button" class="btn btn-primary" @click="submitCreate">{{ $t('createVehicle') }}</button>
        </div>
      </div>
    </div>

    <div v-if="showView" class="modal-backdrop" role="dialog" aria-modal="true" @click.self="showView = false">
      <div class="modal modal--profile">
        <div class="modal-head">
          <div>
            <div class="modal-title">{{ $t('vehicleDetails') }}</div>
            <div class="modal-sub">{{ $t('readOnlyView') }}</div>
          </div>
          <button type="button" class="icon-action" title="Close" @click="showView = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <div class="vehicle-details">
            <div class="vehicle-hero">
              <div class="vehicle-hero__image">
                <img v-if="selectedVehicleImage" :src="selectedVehicleImage" :alt="selectedVehicleName" />
                <span v-else>{{ selectedVehicleInitials }}</span>
              </div>
              <div class="vehicle-hero__info">
                <p class="vehicle-hero__title">{{ selectedVehicleName }}</p>
                <div class="vehicle-hero__meta">
                  <span>{{ selectedVehicleStatus }}</span>
                  <span>{{ selectedVehicleShopName }}</span>
                </div>
              </div>
            </div>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">{{ $t('brand') }}</span>
                <span class="detail-value">{{ selectedVehicleBrand }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">{{ $t('model') }}</span>
                <span class="detail-value">{{ selectedVehicleModel }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">{{ $t('category') }}</span>
                <span class="detail-value">{{ selectedVehicleCategory }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">{{ $t('plate') }}</span>
                <span class="detail-value">{{ selectedVehiclePlate }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">{{ $t('fuel') }}</span>
                <span class="detail-value">{{ selectedVehicleFuel }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">{{ $t('transmission') }}</span>
                <span class="detail-value">{{ selectedVehicleTransmission }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">{{ $t('priceDay2') }}</span>
                <span class="detail-value">{{ selectedVehiclePrice }}</span>
              </div>
              <div class="detail-row span-2">
                <span class="detail-label">{{ $t('shopDescription') }}</span>
                <span class="detail-value">{{ selectedVehicleDescription }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ConfirmModal
      v-model="showDeleteConfirm"
      title="Delete Vehicle"
      :message="deleteVehicleMessage"
      cancel-text="Cancel"
      confirm-text="Yes"
      variant="danger"
      @confirm="confirmDelete"
    />
  </section>
</template>

<style scoped>
.vehicle-details {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.vehicle-hero {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.vehicle-hero__image {
  width: 80px;
  height: 80px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.1);
  display: grid;
  place-items: center;
  overflow: hidden;
}

.vehicle-hero__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.vehicle-hero__info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.vehicle-hero__title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
}

.vehicle-hero__meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.85rem;
  color: #6b7280;
  flex-wrap: wrap;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.85rem;
  padding: 1rem;
  background: var(--mp-card);
  border: 1px solid var(--mp-border);
  border-radius: 16px;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.08);
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.detail-label {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
  font-weight: 600;
}

.detail-value {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.detail-row.span-2 {
  grid-column: span 2;
}
</style>
