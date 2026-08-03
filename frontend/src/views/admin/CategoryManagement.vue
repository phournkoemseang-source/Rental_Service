<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { categoryApi } from '../../services/api.js'
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

const form = ref({ id: null, name: '', description: '', status: 'active' })

const query = computed(() => String(route.query.q || '').trim().toLowerCase())

const load = async () => {
  loading.value = true
  try {
    const { data } = await categoryApi.getAll()
    const payload = data?.data?.data || data?.data || data
    items.value = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to load categories.')
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
  form.value = { id: null, name: '', description: '', status: 'active' }
}

const openView = (c) => { selected.value = c; showView.value = true }

const openEdit = (c) => {
  selected.value = c
  showEdit.value = true
  showCreate.value = false
  form.value = { id: c.id, name: c.name || '', description: c.description || '', status: c.status || 'active' }
}

const closeModals = () => {
  showCreate.value = false
  showEdit.value = false
  showView.value = false
}

const formatDate = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
}

const submitCreate = async () => {
  const name = String(form.value.name || '').trim()
  if (!name) { toast.error('Category name is required.'); return }
  try {
    await categoryApi.create({ ...form.value, name })
    toast.success('Category created successfully.')
    closeModals()
    await load()
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to create category.')
  }
}

const submitEdit = async () => {
  const id = form.value.id
  if (!id) return
  const name = String(form.value.name || '').trim()
  if (!name) { toast.error('Category name is required.'); return }
  try {
    await categoryApi.update(id, { ...form.value, name })
    toast.success('Category updated successfully.')
    closeModals()
    await load()
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to update category.')
  }
}

const requestDelete = (c) => { deleteTarget.value = c; showDeleteConfirm.value = true }

const deleteMessage = computed(() => {
  const name = String(deleteTarget.value?.name || '').trim()
  return name ? `Are you sure you want to delete "${name}"?` : 'Are you sure you want to delete this category?'
})

const confirmDelete = async () => {
  const c = deleteTarget.value
  if (!c?.id) return
  try {
    await categoryApi.delete(c.id)
    toast.success('Category deleted.')
    await load()
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to delete category.')
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
        <h1 class="page-title">{{ $t('categoryManagement2') }}</h1>
        <p class="page-subtitle">{{ $t('manageVehicleCategoriesUsedAcrossTheSystem') }}</p>
      </div>
      <button type="button" class="btn btn-primary btn-block" @click="openCreate">
        <i class="fa-solid fa-plus" aria-hidden="true"></i>
        <span>{{ $t('addCategory') }}</span>
      </button>
    </header>

    <section class="card">
      <div class="card-head">
        <div>
          <h2 class="card-title">{{ $t('categories') }}</h2>
          <p class="card-subtitle">{{ filtered.length }} total</p>
        </div>
      </div>

      <div v-if="loading" class="muted">{{ $t('loading') }}</div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ $t('category2') }}</th>
              <th>{{ $t('status2') }}</th>
              <th class="actions">{{ $t('actions2') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in paged" :key="c.id">
              <td class="shop-cell">
                <span class="shop-icon square" aria-hidden="true"><i class="fa-solid fa-tags"></i></span>
                <div class="shop-meta">
                  <div class="shop-name">{{ c.name }}</div>
                  <div class="shop-id">ID: {{ c.id }}</div>
                </div>
              </td>
              <td><span :class="String(c.status || 'active').toLowerCase() === 'active' ? 'badge badge-green' : 'badge badge-red'">{{ String(c.status || 'active').toUpperCase() }}</span></td>
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
          SHOWING {{ (page - 1) * perPage + 1 }} TO {{ Math.min(page * perPage, filtered.length) }} OF {{ filtered.length }} CATEGORIES
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
            <div class="modal-title">{{ showEdit ? 'Edit Category' : 'Create Category' }}</div>
            <div class="modal-sub">{{ $t('nameAndOptionalDescription') }}</div>
          </div>
          <button type="button" class="icon-action" title="Close" @click="closeModals"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div class="modal-body form-grid">
          <label class="field span-2">
            <span class="field-label">{{ $t('name') }}</span>
            <input v-model="form.name" type="text" placeholder="e.g. Motorbike" />
          </label>
          <label class="field span-2">
            <span class="field-label">{{ $t('shopDescription') }}</span>
            <textarea v-model="form.description" rows="3" placeholder="Optional"></textarea>
          </label>
          <label class="field">
            <span class="field-label">{{ $t('status') }}</span>
            <select v-model="form.status">
              <option value="active">{{ $t('active2') }}</option>
              <option value="inactive">{{ $t('inactive2') }}</option>
            </select>
          </label>
        </div>


        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="closeModals">{{ $t('cancel') }}</button>
          <button v-if="showEdit" type="button" class="btn btn-primary" @click="submitEdit">{{ $t('saveChanges') }}</button>
          <button v-else type="button" class="btn btn-primary" @click="submitCreate">{{ $t('createCategory') }}</button>
        </div>
      </div>
    </div>

    <div v-if="showView" class="modal-backdrop" role="dialog" aria-modal="true" @click.self="showView = false">
      <div class="modal">
        <div class="modal-head">
          <div>
            <div class="modal-title">{{ $t('categoryDetails') }}</div>
            <div class="modal-sub">{{ $t('readOnlyView') }}</div>
          </div>
          <button type="button" class="icon-action" title="Close" @click="showView = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body category-details-grid">
          <div class="detail-card">
            <span class="detail-label">{{ $t('name') }}</span>
            <strong>{{ selected?.name || '—' }}</strong>
          </div>
          <div class="detail-card">
            <span class="detail-label">{{ $t('status') }}</span>
            <strong>{{ String(selected?.status || 'active').toUpperCase() }}</strong>
          </div>
          <div class="detail-card span-full">
            <span class="detail-label">{{ $t('shopDescription') }}</span>
            <strong>{{ selected?.description || 'No description provided.' }}</strong>
          </div>
          <div class="detail-card">
            <span class="detail-label">{{ $t('createdAt2') }}</span>
            <strong>{{ formatDate(selected?.created_at) }}</strong>
          </div>
          <div class="detail-card">
            <span class="detail-label">{{ $t('updatedAt') }}</span>
            <strong>{{ formatDate(selected?.updated_at) }}</strong>
          </div>
        </div>
      </div>
    </div>

    <ConfirmModal
      v-model="showDeleteConfirm"
      title="Delete Category"
      :message="deleteMessage"
      cancel-text="Cancel"
      confirm-text="Yes"
      variant="danger"
      @confirm="confirmDelete"
    />
  </section>
</template>

<style scoped>
.category-details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.category-details-grid .span-full {
  grid-column: 1 / -1;
}

.detail-card {
  border-radius: 12px;
  border: 1px solid var(--mp-border);
  background: #f9fafb;
  padding: 14px;
}

.detail-label {
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 4px;
  display: block;
}
</style>
