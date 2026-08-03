<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { cityApi, shopApi } from '../../services/api.js'
import { useToast } from '../../composables/useToast.js'
import ConfirmModal from '../../components/ConfirmModal.vue'

const toast = useToast()
const route = useRoute()

const loading = ref(false)
const items = ref([])

const page = ref(1)
const perPage = 8

const showCreate = ref(false)
const showEdit = ref(false)
const showView = ref(false)
const showDeleteConfirm = ref(false)

const selected = ref(null)
const deleteTarget = ref(null)

const form = ref({ id: null, name: '' })

const query = computed(() => String(route.query.q || '').trim().toLowerCase())

const load = async () => {
  loading.value = true
  try {
    const [citiesRes, shopsRes] = await Promise.allSettled([cityApi.getAll(), shopApi.getAll()])
    const cityPayload = citiesRes.status === 'fulfilled' ? citiesRes.value.data : null
    const shopPayload = shopsRes.status === 'fulfilled' ? shopsRes.value.data : null
    const cityList = Array.isArray(cityPayload)
      ? cityPayload
      : Array.isArray(cityPayload?.data)
        ? cityPayload.data
        : Array.isArray(cityPayload?.data?.data)
          ? cityPayload.data.data
          : []
    const shopList = Array.isArray(shopPayload)
      ? shopPayload
      : Array.isArray(shopPayload?.data)
        ? shopPayload.data
        : Array.isArray(shopPayload?.data?.data)
          ? shopPayload.data.data
          : []

    const shopCountByCity = new Map()
    shopList.forEach((shop) => {
      const cityId = shop.city_id || null
      const key = cityId != null ? String(cityId) : shop.city || shop.location || 'unknown'
      const arr = shopCountByCity.get(key) || []
      arr.push(shop)
      shopCountByCity.set(key, arr)
    })

    const cityIdSet = new Set()
    const merged = cityList.map((city) => {
      cityIdSet.add(String(city.id))
      return {
        ...city,
        shopCount: (shopCountByCity.get(String(city.id)) || []).length,
      }
    })

    shopCountByCity.forEach((shops, key) => {
      if (!cityIdSet.has(key)) {
        merged.push({
          id: null,
          name: shops[0]?.city || shops[0]?.location || `City ${key}`,
          created_at: shops[0]?.created_at,
          shopCount: shops.length,
          derived: true,
        })
      }
    })

    items.value = merged
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to load cities.')
    items.value = []
  } finally {
    loading.value = false
  }
}

const filtered = computed(() => {
  const q = query.value
  if (!q) return items.value
  return items.value.filter((c) => `${c.name || ''} ${c.id || ''}`.toLowerCase().includes(q))
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
  form.value = { id: null, name: '' }
}

const openView = (c) => { selected.value = c; showView.value = true }

const openEdit = (c) => {
  selected.value = c
  showEdit.value = true
  showCreate.value = false
  form.value = { id: c.id, name: c.name || '' }
}

const formatDate = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
}

const closeModals = () => {
  showCreate.value = false
  showEdit.value = false
  showView.value = false
}

const submitCreate = async () => {
  const name = String(form.value.name || '').trim()
  if (!name) { toast.error('City name is required.'); return }
  try {
    await cityApi.create({ name })
    toast.success('City created successfully.')
    closeModals()
    await load()
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to create city.')
  }
}

const submitEdit = async () => {
  const id = form.value.id
  if (!id) return
  const name = String(form.value.name || '').trim()
  if (!name) { toast.error('City name is required.'); return }
  try {
    await cityApi.update(id, { name })
    toast.success('City updated successfully.')
    closeModals()
    await load()
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to update city.')
  }
}

const requestDelete = (c) => { deleteTarget.value = c; showDeleteConfirm.value = true }

const deleteMessage = computed(() => {
  const name = String(deleteTarget.value?.name || '').trim()
  return name ? `Are you sure you want to delete "${name}"?` : 'Are you sure you want to delete this city?'
})

const confirmDelete = async () => {
  const c = deleteTarget.value
  if (!c?.id) return
  try {
    await cityApi.delete(c.id)
    toast.success('City deleted.')
    await load()
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to delete city.')
  } finally {
    showDeleteConfirm.value = false
    deleteTarget.value = null
  }
}

onMounted(load)
</script>

<template>
  <section class="admin-page">
    <header class="page-head">
      <div>
        <h1 class="page-title">{{ $t('cityManagement2') }}</h1>
        <p class="page-subtitle">{{ $t('manageSupportedCitiesUsedForShopsAndFiltering') }}</p>
      </div>
      <button type="button" class="btn btn-primary btn-block" @click="openCreate">
        <i class="fa-solid fa-plus" aria-hidden="true"></i>
        <span>{{ $t('addCity') }}</span>
      </button>
    </header>


    <section class="card">
      <div class="card-head">
        <div>
          <h2 class="card-title">{{ $t('cities') }}</h2>
          <p class="card-subtitle">{{ filtered.length }} total</p>
        </div>
      </div>

      <div v-if="loading" class="muted">{{ $t('loading') }}</div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
          <tr>
            <th>{{ $t('city') }}</th>
            <th>{{ $t('shops2') }}</th>
            <th>{{ $t('created') }}</th>
            <th class="actions">{{ $t('actions2') }}</th>
          </tr>
          </thead>
          <tbody>
            <tr v-for="c in paged" :key="c.id">
              <td class="shop-cell">
                <span class="shop-icon square" aria-hidden="true"><i class="fa-solid fa-location-dot"></i></span>
                <div class="shop-meta">
                  <div class="shop-name">
                    {{ c.name }}
                    <span v-if="c.derived" class="badges">{{ $t('auto') }}</span>
                  </div>
                  <div class="shop-id">ID: {{ c.id ?? '—' }}</div>
                </div>
              </td>
              <td>
                <span class="badge" :class="{ 'badge--accent': c.shopCount > 0 }">
                  {{ c.shopCount || 0 }} shop{{ c.shopCount === 1 ? '' : 's' }}
                </span>
              </td>
              <td class="muted">{{ String(c.created_at || '').slice(0, 10) || '—' }}</td>
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
          SHOWING {{ (page - 1) * perPage + 1 }} TO {{ Math.min(page * perPage, filtered.length) }} OF {{ filtered.length }} CITIES
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
            <div class="modal-title">{{ showEdit ? 'Edit City' : 'Create City' }}</div>
            <div class="modal-sub">{{ $t('cityNameMustBeUnique') }}</div>
          </div>
          <button type="button" class="icon-action" title="Close" @click="closeModals"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div class="modal-body form-grid">
          <label class="field span-2">
            <span class="field-label">{{ $t('name') }}</span>
            <input v-model="form.name" type="text" placeholder="Phnom Penh" />
          </label>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="closeModals">{{ $t('cancel') }}</button>
          <button v-if="showEdit" type="button" class="btn btn-primary" @click="submitEdit">{{ $t('saveChanges') }}</button>
          <button v-else type="button" class="btn btn-primary" @click="submitCreate">{{ $t('createCity') }}</button>
        </div>
      </div>
    </div>

    <div v-if="showView" class="modal-backdrop" role="dialog" aria-modal="true" @click.self="showView = false">
      <div class="modal">
        <div class="modal-head">
          <div>
            <div class="modal-title">{{ $t('cityDetails') }}</div>
            <div class="modal-sub">{{ $t('readOnlyView') }}</div>
          </div>
          <button type="button" class="icon-action" title="Close" @click="showView = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body city-details-grid">
          <div class="detail-card">
            <span class="detail-label">{{ $t('name') }}</span>
            <strong>{{ selected?.name || '—' }}</strong>
          </div>
          <div class="detail-card">
            <span class="detail-label">{{ $t('createdAt2') }}</span>
            <strong>{{ formatDate(selected?.created_at) }}</strong>
          </div>
        </div>
      </div>
    </div>


    <ConfirmModal
      v-model="showDeleteConfirm"
      title="Delete City"
      :message="deleteMessage"
      cancel-text="Cancel"
      confirm-text="Yes"
      variant="danger"
      @confirm="confirmDelete"
    />
  </section>
</template>

<style scoped>
.city-details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.detail-card {
  background: #f9fafb;
  border: 1px solid var(--mp-border);
  border-radius: 12px;
  padding: 14px;
}

.detail-label {
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #64748b;
  display: block;
  margin-bottom: 4px;
}
</style>
