<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminStore } from '../../stores/adminStore.js'
import { useToast } from '../../composables/useToast.js'
import ConfirmModal from '../../components/ConfirmModal.vue'

const admin = useAdminStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const activeTab = ref('all')
const sortKey = ref('newest')
const page = ref(1)
const perPage = 6

const showCreate = ref(false)
const createForm = ref({ name: '', address: '', location: '', phone: '', description: '', img_url: '' })
const createImageFile = ref(null)
const createImagePreview = ref('')

const showEdit = ref(false)
const editForm = ref({ id: null, name: '', address: '', location: '', phone: '', description: '', img_url: '' })
const editImageFile = ref(null)
const editImagePreview = ref('')

const showDeleteConfirm = ref(false)
const deleteTarget = ref(null)
const isCreating = ref(false)
const isUpdating = ref(false)
const deletingShopId = ref(null)
const statusChangingShopId = ref(null)

const normalizedQuery = computed(() => String(route.query.q || '').trim().toLowerCase())
const focusShopId = computed(() => Number(route.query.focusShop || 0))

const deleteShopMessage = computed(() => {
  const name = String(deleteTarget.value?.name || '').trim()
  if (name) return `Are you sure you want to delete "${name}"?`
  return 'Are you sure you want to delete this shop?'
})

const statusLabel = (status) => {
  const raw = String(status || '').trim()
  const upper = raw.toUpperCase()
  if (upper === 'VERIFIED' || upper === 'ACTIVE') return 'ACTIVE'
  if (upper === 'INACTIVE') return 'PENDING'
  if (upper === 'PENDING') return 'PENDING'
  if (upper === 'SUSPENDED') return 'SUSPENDED'
  if (upper === 'BLOCKED') return 'SUSPENDED'
  if (raw.toLowerCase() === 'active') return 'ACTIVE'
  if (raw.toLowerCase() === 'inactive') return 'PENDING'
  return upper || '—'
}

const matchesTab = (shop) => {
  const label = statusLabel(shop.status)
  if (activeTab.value === 'all') return true
  if (activeTab.value === 'active') return label === 'ACTIVE'
  if (activeTab.value === 'pending') return label === 'PENDING'
  return true
}

const ownerName = (shop) => shop?.owner?.name || shop?.owner_name || shop?.owner || '—'
const shopLocation = (shop) => shop?.location || shop?.address || shop?.city?.name || shop?.city || '—'
const shopProvince = (shop) => shop?.city?.name || shop?.location || shop?.address || '—'

const matchesQuery = (shop) => {
  const q = normalizedQuery.value
  if (!q) return true
  const hay = `${shop.name || ''} ${ownerName(shop)} ${shopLocation(shop)} ${shop.id || ''}`.toLowerCase()
  return hay.includes(q)
}

const sortedShops = computed(() => {
  const items = admin.state.shops.filter((s) => matchesTab(s) && matchesQuery(s))
  if (sortKey.value === 'newest') {
    return [...items].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  }
  if (sortKey.value === 'oldest') {
    return [...items].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
  }
  if (sortKey.value === 'name_asc') {
    return [...items].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }
  if (sortKey.value === 'name_desc') {
    return [...items].sort((a, b) => (b.name || '').localeCompare(a.name || ''))
  }
  return items
})

// Download functionality
const downloadShops = () => {
  const shops = sortedShops.value
  if (!shops.length) {
    toast.error('No shops to download')
    return
  }
  // Create CSV content
  const headers = ['ID', 'Name', 'Owner', 'Province/City', 'Address', 'Phone', 'Status', 'Created At']
  const rows = shops.map(s => [
    s.id,
    s.name,
    ownerName(s),
    shopProvince(s),
    s.address || '',
    s.phone || '',
    s.status || '',
    s.created_at || ''
  ])
  const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `shops_export_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
  toast.success(`Exported ${shops.length} shops`)
}


const totalPages = computed(() => Math.max(1, Math.ceil(sortedShops.value.length / perPage)))

watch(totalPages, (next) => {
  if (page.value > next) page.value = next
})

const pagedShops = computed(() => {
  const start = (page.value - 1) * perPage
  return sortedShops.value.slice(start, start + perPage)
})

const bookingCountByShop = computed(() => {
  const map = new Map()
  admin.state.bookings.forEach((b) => {
    const key = String(b.shop_id || '')
    map.set(key, (map.get(key) || 0) + 1)
  })
  return map
})

const fleetCountByShop = computed(() => {
  const map = new Map()
  admin.state.vehicles.forEach((v) => {
    const key = String(v.shop_id || v.shop?.id || '')
    if (!key) return
    map.set(key, (map.get(key) || 0) + 1)
  })
  return map
})

const revenueByShop = computed(() => {
  const map = new Map()
  admin.state.bookings.forEach((booking) => {
    const amount = Number(
      booking?.total_amount ??
      booking?.total_price ??
      booking?.price ??
      booking?.gross_amount ??
      booking?.amount ??
      0
    ) || 0
    const key = String(booking.shop_id ?? booking.shop?.id ?? '')
    if (!key) return
    map.set(key, (map.get(key) || 0) + amount)
  })
  return map
})

const statusBadgeClass = (status) => {
  const label = statusLabel(status)
  if (label === 'ACTIVE') return 'badge badge-green'
  if (label === 'PENDING') return 'badge badge-yellow'
  if (label === 'SUSPENDED') return 'badge badge-red'
  return 'badge'
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
})

const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0)

const resolveShopImageUrl = (value) => {
  const image = value ? String(value).trim() : ''
  if (!image) return ''
  if (/^(https?:\/\/|data:|blob:)/i.test(image)) return image
  const normalized = image.replace(/\\/g, '/').replace(/^\/+/, '')
  if (normalized.startsWith('storage/')) return `/${normalized}`
  return `/storage/${normalized.replace(/^storage\//, '')}`
}

const shopImage = (shop) => {
  const value = shop?.img_url_full || shop?.img_url || shop?.image_url || shop?.image || shop?.photo
  return resolveShopImageUrl(value)
}

const onCreateImageChange = (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  if (!file.type?.startsWith('image/')) {
    toast.error('Please select a valid image file.')
    return
  }
  createImageFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => {
    createImagePreview.value = String(e.target?.result || '')
    createForm.value.img_url = createImagePreview.value
  }
  reader.readAsDataURL(file)
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
    editForm.value.img_url = editImagePreview.value
  }
  reader.readAsDataURL(file)
}

const openCreate = () => {
  showCreate.value = true
}

const closeCreate = () => {
  showCreate.value = false
  createForm.value = { name: '', address: '', location: '', phone: '', description: '', img_url: '' }
  createImageFile.value = null
  createImagePreview.value = ''
  if (route.query.create) {
    const nextQuery = { ...route.query }
    delete nextQuery.create
    router.replace({ query: nextQuery })
  }
}

const submitCreate = async () => {
  if (isCreating.value) return
  const name = String(createForm.value.name || '').trim()
  const address = String(createForm.value.address || '').trim()
  if (!name || !address) {
    toast.error('Please fill required fields: Shop Name and Address.')
    return
  }

  try {
    isCreating.value = true
    let payload = {
      name,
      address,
      location: createForm.value.location || null,
      phone: createForm.value.phone || null,
      description: createForm.value.description || null,
      img_url: createForm.value.img_url || null,
      status: 'inactive',
    }


    if (createImageFile.value) {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('address', address)
      if (createForm.value.location) formData.append('location', createForm.value.location)
      if (createForm.value.phone) formData.append('phone', createForm.value.phone)
      if (createForm.value.description) formData.append('description', createForm.value.description)
      formData.append('status', 'inactive')
      formData.append('img_url', createImageFile.value)
      payload = formData
    }

    await admin.createShop(payload)
    toast.success('Shop created successfully.')
    closeCreate()
    activeTab.value = 'all'
    page.value = 1
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to create shop.')
  } finally {
    isCreating.value = false
  }
}

const openEdit = (shop) => {
  const id = shop?.id
  editForm.value = {
    id,
    name: shop?.name || '',
    address: shop?.address || '',
    location: shop?.location || '',
    phone: shop?.phone || '',
    description: shop?.description || '',
    img_url: shop?.img_url || '',
  }
  editImageFile.value = null
  editImagePreview.value = ''
  showEdit.value = true
}

const closeEdit = () => {
  showEdit.value = false
  editForm.value = { id: null, name: '', address: '', location: '', phone: '', description: '', img_url: '' }
  editImageFile.value = null
  editImagePreview.value = ''
}

const submitEdit = async () => {
  if (isUpdating.value) return
  const id = editForm.value.id
  if (!id) return
  const name = String(editForm.value.name || '').trim()
  const address = String(editForm.value.address || '').trim()
  if (!name || !address) {
    toast.error('Please fill required fields: Shop Name and Address.')
    return
  }

  try {
    isUpdating.value = true
    let payload = {
      name,
      address,
      location: editForm.value.location || null,
      phone: editForm.value.phone || null,
      description: editForm.value.description || null,
      img_url: editForm.value.img_url || null,
    }

    if (editImageFile.value) {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('address', address)
      if (editForm.value.location) formData.append('location', editForm.value.location)
      if (editForm.value.phone) formData.append('phone', editForm.value.phone)
      if (editForm.value.description) formData.append('description', editForm.value.description)
      formData.append('img_url', editImageFile.value)
      payload = formData
    }

    await admin.updateShop(id, payload)
    toast.success('Shop updated successfully.')
    closeEdit()
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to update shop.')
  } finally {
    isUpdating.value = false
  }
}

const requestDelete = (shop) => {
  deleteTarget.value = shop
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  const shop = deleteTarget.value
  if (!shop?.id) return
  if (deletingShopId.value) return
  try {
    deletingShopId.value = shop.id
    await admin.deleteShop(shop.id)
    toast.success('Shop deleted.')
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to delete shop.')
  } finally {
    deletingShopId.value = null
    showDeleteConfirm.value = false
    deleteTarget.value = null
  }
}

const approve = async (shop) => {
  if (!shop?.id || statusChangingShopId.value) return
  try {
    statusChangingShopId.value = shop.id
    await admin.setShopStatus(shop.id, 'active')
    toast.success('Shop approved.')
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to approve shop.')
  } finally {
    statusChangingShopId.value = null
  }
}

const disable = async (shop) => {
  if (!shop?.id || statusChangingShopId.value) return
  try {
    statusChangingShopId.value = shop.id
    await admin.setShopStatus(shop.id, 'inactive')
    toast.info('Shop disabled.')
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to disable shop.')
  } finally {
    statusChangingShopId.value = null
  }
}

watch(
  () => route.query.create,
  (value) => {
    showCreate.value = Boolean(value)
  },
  { immediate: true }
)

watch(
  [() => focusShopId.value, () => (admin.state.shops || []).length],
  ([focus]) => {
    if (!focus) return
    const shop = (admin.state.shops || []).find((item) => Number(item.id) === focus)
    if (!shop) return
    openEdit(shop)
    const nextQuery = { ...route.query }
    delete nextQuery.focusShop
    router.replace({ query: nextQuery })
  }
)

onMounted(() => {
  // Use cached data first, then force-refresh if empty so Admin page always tries to recover.
  admin.load()
    .then(() => {
      if ((admin.state.shops || []).length === 0) {
        return admin.load({ force: true })
      }
      return null
    })
    .catch(() => {})
})
</script>


<template>
  <section class="admin-page">
    <header class="page-head">
      <div>
        <h1 class="page-title">Shop Management</h1>
        <p class="page-subtitle">Manage, verify, and monitor all registered rental shops.</p>
      </div>
    </header>

    <section class="card">
      <div class="card-toolbar">
        <div class="tabs">
          <button type="button" class="tab" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">All Shops</button>
          <button type="button" class="tab" :class="{ active: activeTab === 'active' }" @click="activeTab = 'active'">Active</button>
          <button type="button" class="tab" :class="{ active: activeTab === 'inactive' }" @click="activeTab = 'inactive'">Inactive</button>
        </div>

    <div class="toolbar-right">
      <button type="button" class="icon-btn" title="Download" @click="downloadShops">
        <i class="fa-solid fa-download" aria-hidden="true"></i>
      </button>
    </div>
      </div>


      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>SHOP NAME</th>
              <th>OWNER</th>
              <th>PROVINCE/CITY</th>
              <th class="num">FLEET COUNT</th>
              <th class="num">TOTAL BOOKINGS</th>
              <th class="num">REVENUE</th>
              <th>STATUS</th>
              <th class="actions">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="shop in pagedShops" :key="shop.id">
              <td class="shop-cell">
                <span class="shop-icon square" aria-hidden="true">
                  <img v-if="shopImage(shop)" class="shop-photo" :src="shopImage(shop)" :alt="shop.name" />
                  <i v-else class="fa-solid fa-shop"></i>
                </span>
                <div class="shop-meta">
                  <div class="shop-name">{{ shop.name }}</div>
                  <div class="shop-id">ID: {{ shop.id }}</div>
                </div>
              </td>
              <td>{{ ownerName(shop) }}</td>
              <td class="province-cell">
                <i class="fa-solid fa-location-dot province-icon"></i>
                {{ shopProvince(shop) }}
              </td>
              <td class="num">
                <strong>{{ fleetCountByShop.get(String(shop.id)) || 0 }}</strong> <span class="muted">VEHICLES</span>
              </td>
              <td class="num">
                {{ admin.formatted.fmtNumber(bookingCountByShop.get(String(shop.id)) || 0) }}
              </td>
              <td class="num revenue-cell">
                <strong>{{ formatCurrency(revenueByShop.get(String(shop.id))) }}</strong>
              </td>
              <td><span :class="statusBadgeClass(shop.status)">{{ statusLabel(shop.status) }}</span></td>
              <td class="actions">
                <button type="button" class="icon-action" title="Edit" :disabled="isUpdating || isCreating || deletingShopId === shop.id || statusChangingShopId === shop.id" @click="openEdit(shop)"><i class="fa-regular fa-pen-to-square"></i></button>
                <button type="button" class="icon-action" title="Delete" :disabled="deletingShopId === shop.id || isUpdating || isCreating" @click="requestDelete(shop)"><i class="fa-regular fa-trash-can"></i></button>
                <button type="button" class="icon-action" title="Disable" :disabled="statusChangingShopId === shop.id || isUpdating || isCreating" @click="disable(shop)"><i class="fa-regular fa-circle-xmark"></i></button>
                <button v-if="statusLabel(shop.status) === 'PENDING'" type="button" class="btn btn-soft" :disabled="statusChangingShopId === shop.id || isUpdating || isCreating" @click="approve(shop)">
                  Approve
                </button>
              </td>
            </tr>
            <tr v-if="!pagedShops.length">
              <td colspan="8" style="text-align:center; padding: 30px; color: var(--mp-muted);">
                {{ normalizedQuery ? `No shops matched "${route.query.q}". Try clearing search.` : 'No shops found.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="table-footer">
        <div class="muted">
          SHOWING {{ (page - 1) * perPage + 1 }} TO {{ Math.min(page * perPage, sortedShops.length) }} OF
          {{ admin.formatted.fmtNumber(sortedShops.length) }} SHOPS
        </div>
        <div class="pager">
          <button type="button" class="pager-btn" :disabled="page === 1" @click="page -= 1">‹</button>
          <button type="button" class="pager-btn is-active">{{ page }}</button>
          <button type="button" class="pager-btn" :disabled="page === totalPages" @click="page += 1">›</button>
        </div>
      </div>
    </section>

    <div v-if="showCreate" class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal create-shop-modal">
        <div class="modal-head">
          <div>
            <div class="modal-title">Create New Shop</div>
            <div class="modal-sub">Add a new rental shop (pending approval by default).</div>
          </div>
          <button type="button" class="icon-action" title="Close" @click="closeCreate"><i class="fa-solid fa-xmark"></i></button>
        </div>


        <div class="modal-body create-shop-layout">
          <div class="create-shop-preview">
            <div class="create-shop-preview__image">
              <img
                v-if="createImagePreview"
                :src="createImagePreview"
                alt="Shop preview"
              />
              <div v-else class="create-shop-preview__placeholder">
                <i class="fa-solid fa-shop"></i>
              </div>
            </div>
            <div class="create-shop-preview__info">
              <p class="create-shop-preview__title">
                {{ createForm.name || 'Untitled shop' }}
              </p>
              <p class="create-shop-preview__subtitle">
                {{ createForm.address || 'Add a location and contact details' }}
              </p>
              <p class="create-shop-preview__location">
                {{ createForm.location || 'City, Country' }}
              </p>
            </div>
            <div class="create-shop-preview__meta">
              <span class="muted">Status</span>
              <strong>Pending</strong>
            </div>
          </div>

          <div class="create-shop-form">
            <label class="upload-drop">
              <input type="file" accept="image/*" @change="onCreateImageChange" />
              <div class="upload-drop__content">
                <i class="fa-solid fa-cloud-arrow-up"></i>
                <strong>Upload shop cover</strong>
                <span>Drop an image or click to browse files</span>
              </div>
            </label>
            <div class="field-grid two-column">
              <label class="field">
                <span class="field-label">Shop Name</span>
                <input
                  v-model="createForm.name"
                  type="text"
                  placeholder="e.g. Berlin Elite Rentals"
                />
              </label>
              <label class="field">
                <span class="field-label">Address</span>
                <input v-model="createForm.address" type="text" placeholder="Street, City, Country" />
              </label>
            </div>
            <div class="field-grid two-column">
              <label class="field">
                <span class="field-label">Location</span>
                <input v-model="createForm.location" type="text" placeholder="City, Country" />
              </label>
              <label class="field">
                <span class="field-label">Phone</span>
                <input v-model="createForm.phone" type="text" placeholder="+855..." />
              </label>
            </div>
            <label class="field">
              <span class="field-label">Description</span>
              <textarea
                v-model="createForm.description"
                rows="4"
                placeholder="Describe the shop, services or fleet."
              ></textarea>
            </label>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" :disabled="isCreating" @click="closeCreate">Cancel</button>
          <button type="button" class="btn btn-primary" :disabled="isCreating" @click="submitCreate">
            {{ isCreating ? 'Creating...' : 'Create Shop' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showEdit" class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal">
        <div class="modal-head">
          <div>
            <div class="modal-title">Edit Shop</div>
            <div class="modal-sub">Update shop information and image.</div>
          </div>
          <button type="button" class="icon-action" title="Close" @click="closeEdit"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div class="modal-body form-grid">
          <label class="field">
            <span class="field-label">Shop Name</span>
            <input v-model="editForm.name" type="text" />
          </label>
          <label class="field">
            <span class="field-label">Address</span>
            <input v-model="editForm.address" type="text" />
          </label>
          <label class="field">
            <span class="field-label">Location</span>
            <input v-model="editForm.location" type="text" />
          </label>
          <label class="field">
            <span class="field-label">Phone</span>
            <input v-model="editForm.phone" type="text" />
          </label>
          <label class="field span-2">
            <span class="field-label">Description</span>
            <textarea v-model="editForm.description" rows="3"></textarea>
          </label>
          <label class="field span-2">
            <span class="field-label">Shop Image</span>
            <input type="file" accept="image/*" @change="onEditImageChange" />
            <div v-if="editImagePreview || editForm.img_url" class="image-preview">
              <img :src="editImagePreview || resolveShopImageUrl(editForm.img_url)" alt="Shop preview" />
            </div>
          </label>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" :disabled="isUpdating" @click="closeEdit">Cancel</button>
          <button type="button" class="btn btn-primary" :disabled="isUpdating" @click="submitEdit">
            {{ isUpdating ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>

    <ConfirmModal
      v-model="showDeleteConfirm"
      title="Delete Shop"
      :message="deleteShopMessage"
      cancel-text="Cancel"
      confirm-text="Yes"
      variant="danger"
      @confirm="confirmDelete"
    />
  </section>
</template>

<style>
  .create-shop-layout {
    display: grid;
    grid-template-columns: minmax(240px, 320px) 1fr;
    gap: 24px;
    align-items: start;
  }

  .create-shop-preview {
    background: #f8fafc;
    border-radius: 14px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    border: 1px solid #e2e8f0;
    text-align: center;
  }

  .create-shop-preview__image {
    width: 100%;
    padding-top: 56%;
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    background: #fff;
    border: 1px solid #e5e7eb;
  }

  .create-shop-preview__image img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .create-shop-preview__placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    font-size: 32px;
  }

  .create-shop-preview__info {
    text-align: left;
  }

  .create-shop-preview__title {
    margin: 0;
    font-weight: 700;
    font-size: 1.05rem;
    color: #0f172a;
  }

  .create-shop-preview__subtitle,
  .create-shop-preview__location {
    margin: 4px 0 0;
    color: #475569;
    font-size: 0.9rem;
  }

  .create-shop-preview__meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-radius: 10px;
    background: #fff;
    border: 1px solid #e5e7eb;
    color: #475569;
    font-size: 0.85rem;
  }

  .create-shop-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
    background: #ffffff;
    padding: 22px;
    border-radius: 14px;
    border: 1px solid #e2e8f0;
  }

  .create-shop-modal {
    width: min(100%, 960px);
    border-radius: 16px;
    border: 1px solid #e2e8f0;
    padding: 24px;
    background: #ffffff;
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
  }

  .create-shop-modal .modal-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 14px;
    border-bottom: 1px solid #f1f5f9;
  }

  .create-shop-modal .modal-title {
    font-size: 1.3rem;
    font-weight: 700;
    color: #0f172a;
  }

  .create-shop-modal .modal-sub {
    margin-top: 4px;
    font-size: 0.9rem;
    color: #475569;
  }

  .modal-head .icon-action {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #475569;
    display: grid;
    place-items: center;
  }

  .modal-head .icon-action:hover {
    background: #f8fafc;
    color: #0f172a;
  }

  .upload-drop {
    border: 1px dashed #cbd5e1;
    border-radius: 12px;
    padding: 24px;
    text-align: center;
    background: #f8fafc;
    cursor: pointer;
    transition: border-color 0.15s ease;
  }

  .upload-drop:hover {
    border-color: #2563eb;
    background: #ffffff;
  }

  .upload-drop input {
    display: none;
  }

  .upload-drop__content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #475569;
  }

  .upload-drop__content i {
    font-size: 28px;
    color: #2563eb;
  }

  .field-grid {
    display: grid;
    gap: 14px;
  }

  .field-grid.two-column {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field label {
    font-size: 13px;
    font-weight: 500;
    color: #334155;
  }

  .field input,
  .field textarea {
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    padding: 11px 14px;
    font-size: 0.95rem;
    font-family: inherit;
    background: #ffffff;
    transition: all 0.15s ease;
  }

  .field input:focus,
  .field textarea:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
    background: #ffffff;
  }

  .field input::placeholder,
  .field textarea::placeholder {
    color: #94a3b8;
  }

  .field textarea {
    min-height: 100px;
    resize: vertical;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 6px;
    padding-top: 14px;
    border-top: 1px solid #f1f5f9;
  }
  .province-cell {
    color: #475569;
    font-size: 0.88rem;
    white-space: nowrap;
  }

  .province-cell .province-icon {
    color: #2563eb;
    margin-right: 5px;
    font-size: 0.8rem;
    opacity: 0.7;
  }
</style>
