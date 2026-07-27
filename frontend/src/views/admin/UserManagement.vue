<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminStore } from '../../stores/adminStore.js'
import { useToast } from '../../composables/useToast.js'
import ConfirmModal from '../../components/ConfirmModal.vue'
import CountUp from '../../components/CountUp.vue'
import userService from '../../services/userService.js'

const admin = useAdminStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const page = ref(1)
const perPage = 8
const animated = ref(false)
const showOnlyMe = ref(false)

const showCreate = ref(false)
const createForm = ref({ name: '', email: '', phone: '', role: 'customer', password: '' })
const isCreating = ref(false)
const isUpdating = ref(false)
const togglingUserId = ref(null)
const deletingUserId = ref(null)

const showView = ref(false)
const showEdit = ref(false)
const showDeleteConfirm = ref(false)
const deleteTarget = ref(null)
const selectedUser = ref(null)

const editForm = ref({ id: null, name: '', phone: '', role: 'customer', is_verified: false })
const currentUser = computed(() => userService.getCurrentUser())
const currentUserId = computed(() => Number(currentUser.value?.id || 0))

const todayKey = () => new Date().toISOString().slice(0, 10)

const totals = computed(() => {
  const users = admin.state.users || []
  const activeUsers = users.filter((u) => {
    const rawStatus = String(u.status || '').toUpperCase()
    if (rawStatus) return rawStatus === 'ACTIVE'
    return Boolean(u.is_verified)
  }).length
  const joinedToday = users.filter((u) => String(u.created_at || '').slice(0, 10) === todayKey()).length
  return { activeUsers, joinedToday }
})

const query = computed(() => String(route.query.q || '').trim().toLowerCase())

const canViewProfile = (user) => {
  const role = String(user?.role || '').trim().toLowerCase()
  return role === 'customer' || role === 'shop_owner'
}

const showRoleMenu = ref(false)
const showStatusMenu = ref(false)
const selectedRole = ref('')
const selectedStatus = ref('')

const closeFilterMenus = () => {
  showRoleMenu.value = false
  showStatusMenu.value = false
}

const toggleRoleMenu = () => {
  showRoleMenu.value = !showRoleMenu.value
  if (showRoleMenu.value) showStatusMenu.value = false
}

const toggleStatusMenu = () => {
  showStatusMenu.value = !showStatusMenu.value
  if (showStatusMenu.value) showRoleMenu.value = false
}

const sortedUsers = computed(() => {
  const users = [...(admin.state.users || [])]
  const meId = currentUserId.value
  return users.sort((a, b) => {
    const aIsMe = Number(a.id) === meId
    const bIsMe = Number(b.id) === meId
    if (aIsMe && !bIsMe) return -1
    if (!aIsMe && bIsMe) return 1
    return Number(b.id || 0) - Number(a.id || 0)
  })
})

const filteredUsers = computed(() => {
  const q = query.value
  const role = String(selectedRole.value || '').trim().toUpperCase()
  const status = String(selectedStatus.value || '').trim().toUpperCase()

  let items = sortedUsers.value
  if (showOnlyMe.value) items = items.filter((u) => Number(u.id) === currentUserId.value)
  if (q) items = items.filter((u) => `${u.name || ''} ${u.email || ''} ${u.phone || ''} ${u.role || ''} ${u.id || ''}`.toLowerCase().includes(q))
  if (role) items = items.filter((u) => String(u.role || '').trim().toUpperCase() === role)
  if (status) items = items.filter((u) => statusText(u) === status)

  return items
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredUsers.value.length / perPage)))
watch(totalPages, (next) => {
  if (page.value > next) page.value = next
})

watch([selectedRole, selectedStatus, showOnlyMe, query], () => {
  page.value = 1
})

const focusUserId = computed(() => Number(route.query.focusUser || 0))
watch(
  [() => focusUserId.value, () => (admin.state.users || []).length],
  ([focus]) => {
    if (!focus) return
    const user = (admin.state.users || []).find((item) => Number(item.id) === focus)
    if (!user) return
    openEdit(user)
    const nextQuery = { ...route.query }
    delete nextQuery.focusUser
    router.replace({ query: nextQuery })
  }
)

const pagedUsers = computed(() => {
  const start = (page.value - 1) * perPage
  return filteredUsers.value.slice(start, start + perPage)
})

const statusBadgeClass = (status) => {
  const value = String(status || '').toUpperCase()
  if (value === 'ACTIVE') return 'badge badge-green'
  if (value === 'BLOCKED') return 'badge badge-red'
  return 'badge'
}

const statusText = (user) => {
  const raw = String(user?.status || '').trim()
  if (raw) return raw.toUpperCase()
  return user?.is_verified ? 'ACTIVE' : 'PENDING'
}

const statusClass = (user) => statusBadgeClass(statusText(user))

const roleLabel = (value) => {
  const role = String(value || '').trim().toUpperCase()
  if (!role) return 'All Roles'
  if (role === 'SHOP_STAFF') return 'Shop Staff'
  if (role === 'SHOP_OWNER') return 'Shop Owner'
  if (role === 'CUSTOMER') return 'Customer'
  if (role === 'ADMIN') return 'Admin'
  return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase())
}

const statusLabel = (value) => {
  const s = String(value || '').trim().toUpperCase()
  if (!s) return 'Any Status'
  if (s === 'ACTIVE') return 'Active'
  if (s === 'PENDING') return 'Pending'
  if (s === 'BLOCKED') return 'Blocked'
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase())
}


const roleOptions = computed(() => {
  const seen = new Set()
  const roles = []

  const users = admin.state.users || []
  users.forEach((u) => {
    const role = String(u?.role || '').trim().toUpperCase()
    if (!role || seen.has(role)) return
    seen.add(role)
    roles.push(role)
  })

  const preferred = ['CUSTOMER', 'SHOP_OWNER', 'SHOP_STAFF', 'ADMIN']
  const orderIndex = (r) => {
    const idx = preferred.indexOf(r)
    return idx === -1 ? 999 : idx
  }
  roles.sort((a, b) => {
    const da = orderIndex(a)
    const db = orderIndex(b)
    if (da !== db) return da - db
    return a.localeCompare(b)
  })

  return ['', ...roles].map((r) => ({ value: r, label: roleLabel(r) }))
})

const statusOptions = computed(() => {
  const seen = new Set()
  const statuses = []

  const users = admin.state.users || []
  users.forEach((u) => {
    const s = statusText(u)
    if (!s || seen.has(s)) return
    seen.add(s)
    statuses.push(s)
  })

  const preferred = ['ACTIVE', 'PENDING', 'BLOCKED']
  const orderIndex = (s) => {
    const idx = preferred.indexOf(s)
    return idx === -1 ? 999 : idx
  }
  statuses.sort((a, b) => {
    const da = orderIndex(a)
    const db = orderIndex(b)
    if (da !== db) return da - db
    return a.localeCompare(b)
  })

  return ['', ...statuses].map((s) => ({ value: s, label: statusLabel(s) }))
})

const selectedUserName = computed(() => selectedUser.value?.name || 'Unnamed user')
const selectedUserEmailLabel = computed(() => selectedUser.value?.email || 'Not provided')
const selectedUserPhoneLabel = computed(() => selectedUser.value?.phone || 'Not provided')
const selectedUserRoleLabel = computed(() => {
  if (!selectedUser.value?.role) return 'Role not set'
  return roleLabel(selectedUser.value.role)
})
const selectedUserRoleClass = computed(() => roleBadgeClass(selectedUser.value?.role))
const selectedUserStatusLabel = computed(() => {
  if (!selectedUser.value) return 'Status unavailable'
  return statusText(selectedUser.value)
})
const selectedUserJoinedLabel = computed(() => {
  if (!selectedUser.value) return '—'
  return formatUserDate(selectedUser.value.created_at || selectedUser.value.joined_at)
})
const selectedUserUpdatedLabel = computed(() => formatUserDate(selectedUser.value?.updated_at))
const selectedUserAvatar = computed(() => getUserAvatar(selectedUser.value))

const selectedRoleLabel = computed(() => roleLabel(selectedRole.value))
const selectedStatusLabel = computed(() => statusLabel(selectedStatus.value))

const roleBadgeClass = (role) => {
  const value = String(role || '').toUpperCase()
  if (value === 'CUSTOMER') return 'badge badge-blue'
  if (value.includes('SHOP')) return 'badge badge-cyan'
  if (value === 'ADMIN') return 'badge badge-purple'
  return 'badge'
}

const initials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase()
}

const brokenAvatars = ref(new Set())
const getUserAvatar = (user) => {
  if (!user) return ''
  return user.avatar_url || user.profile_picture || user.img_url || ''
}
const shouldShowAvatar = (user) => {
  const id = Number(user?.id || 0)
  if (!id) return false
  const url = getUserAvatar(user)
  return Boolean(url) && !brokenAvatars.value.has(id)
}
const handleAvatarError = (user) => {
  const id = Number(user?.id || 0)
  if (!id) return
  const nextSet = new Set(brokenAvatars.value)
  nextSet.add(id)
  brokenAvatars.value = nextSet
}

const isSelf = (user) => Number(user?.id) === currentUserId.value
const isAdminRole = (user) => String(user?.role || '').trim().toLowerCase() === 'admin'

const formatUserDate = (value) => {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}


const registrationSeries = computed(() => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    return d
  })
  const buckets = days.map((d) => ({
    key: d.toISOString().slice(0, 10),
    label: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    value: 0,
  }))
  const index = new Map(buckets.map((b, i) => [b.key, i]))
  
  const users = admin.state.users || []
  users.forEach((u) => {
    const key = String(u.created_at || '').slice(0, 10)
    const i = index.get(key)
    if (i == null) return
    buckets[i].value += 1
  })
  const max = Math.max(1, ...buckets.map((b) => b.value))
  return buckets.map((b) => ({ ...b, pct: (b.value / max) * 100 }))
})

const roleDistribution = computed(() => {
  const counts = { CUSTOMER: 0, 'SHOP STAFF': 0, ADMIN: 0 }
  const users = admin.state.users || []
  users.forEach((u) => {
    const r = String(u.role || '').toUpperCase()
    if (r === 'CUSTOMER') counts.CUSTOMER += 1
    else if (r.includes('SHOP')) counts['SHOP STAFF'] += 1
    else counts.ADMIN += 1
  })
  const total = counts.CUSTOMER + counts['SHOP STAFF'] + counts.ADMIN
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0)
  return [
    { key: 'customers', label: 'CUSTOMERS', value: pct(counts.CUSTOMER), bar: 'bar-cyan' },
    { key: 'staff', label: 'SHOP STAFF', value: pct(counts['SHOP STAFF']), bar: 'bar-green' },
    { key: 'admins', label: 'ADMINS', value: pct(counts.ADMIN), bar: 'bar-blue' },
  ]
})

const triggerAnimation = async () => {
  animated.value = false
  await nextTick()
  requestAnimationFrame(() => {
    animated.value = true
  })
}

const openCreate = () => {
  showCreate.value = true
}

const closeCreate = () => {
  showCreate.value = false
  createForm.value = { name: '', email: '', phone: '', role: 'customer', password: '' }
}


const submitCreate = async () => {
  if (isCreating.value) return
  const name = String(createForm.value.name || '').trim()
  const email = String(createForm.value.email || '').trim()
  if (!name || !email) {
    toast.error('Name and email are required.')
    return
  }

  try {
    isCreating.value = true
    const password = String(createForm.value.password || '')
    if (!password) {
      toast.error('Password is required to create a user.')
      return
    }
    await admin.addUser({
      name,
      email,
      phone: createForm.value.phone || null,
      role: createForm.value.role || 'customer',
      password,
    })
    toast.success('User created successfully.')
    
    closeCreate()
    page.value = 1
    triggerAnimation()
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to create user.')
  } finally {
    isCreating.value = false
  }
}

const toggleBlock = async (user) => {
  if (!user?.id || togglingUserId.value) return
  if (isSelf(user)) {
    toast.warning('You cannot block/unverify your own account.')
    return
  }
  try {
    togglingUserId.value = user.id
    const next = !Boolean(user.is_verified)
    await admin.updateUser(user.id, { is_verified: next, status: next ? 'active' : 'blocked' })
    toast.success(next ? 'User verified.' : 'User unverified.')
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to update user.')
  } finally {
    togglingUserId.value = null
  }
}

const openView = (user) => {
  if (!canViewProfile(user)) return
  selectedUser.value = user
  showView.value = true
}

const closeView = () => {
  showView.value = false
  selectedUser.value = null
}

const openEdit = (user) => {
  if (isAdminRole(user)) return
  editForm.value = {
    id: user.id,
    name: user.name || '',
    phone: user.phone || '',
    role: String(user.role || 'customer'),
    is_verified: Boolean(user.is_verified),
  }
  showEdit.value = true
}

const closeEdit = () => {
  showEdit.value = false
  editForm.value = { id: null, name: '', phone: '', role: 'customer', is_verified: false }
}

const submitEdit = async () => {
  if (isUpdating.value) return
  const id = editForm.value.id
  if (!id) return
  const name = String(editForm.value.name || '').trim()
  if (!name) {
    toast.error('Name is required.')
    return
  }

  try {
    isUpdating.value = true
    await admin.updateUser(id, {
      name,
      phone: editForm.value.phone || null,
      role: editForm.value.role || 'customer',
      is_verified: Boolean(editForm.value.is_verified),
    })
    toast.success('User updated successfully.')

    closeEdit()
    triggerAnimation()
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to update user.')
  } finally {
    isUpdating.value = false
  }
}

const requestDelete = (user) => {
  deleteTarget.value = user
  showDeleteConfirm.value = true
}

const deleteMessage = computed(() => {
  const name = String(deleteTarget.value?.name || '').trim()
  return name ? `Are you sure you want to delete "${name}"?` : 'Are you sure you want to delete this user?'
})

const confirmDelete = async () => {
  const user = deleteTarget.value
  if (!user?.id) return
  if (isSelf(user)) {
    toast.warning('You cannot delete your own account.')
    showDeleteConfirm.value = false
    deleteTarget.value = null
    return
  }
  if (deletingUserId.value) return

  try {
    deletingUserId.value = user.id
    await admin.deleteUser(user.id)
    toast.success('User deleted.')
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to delete user.')
  } finally {
    deletingUserId.value = null
    showDeleteConfirm.value = false
    deleteTarget.value = null
  }
}

onMounted(async () => {
  await admin.load().catch(() => { })
  triggerAnimation()
})

watch(
  () => admin.state.users?.length,
  () => triggerAnimation()
)
</script>

<template>
  <section class="admin-page" @click="closeFilterMenus">
    <header class="page-head">
      <div>
        <h1 class="page-title">User Management</h1>
        <p class="page-subtitle">Manage platform participants, monitor activity, and regulate access.</p>
      </div>
      <div class="head-actions">
        <button type="button" class="btn btn-primary" @click="openCreate">
          <i class="fa-solid fa-user-plus" aria-hidden="true"></i>
          <span>Create User</span>
        </button>
      </div>
    </header>

    <div class="split-stats">
      <section class="card stat-wide">
        <div class="wide-stat">
          <div>
            <div class="stat-label">TOTAL ACTIVE USERS</div>
            <div class="wide-value">
              <CountUp :value="Number(totals.activeUsers || 0)" :formatter="(n) => admin.formatted.fmtNumber(n)" />
            </div>
            <div class="stat-trend trend-up"><span>+{{ Math.max(0, admin.trends.users) }}%</span></div>
          </div>
          <div class="stat-icon tint-cyan" aria-hidden="true"><i class="fa-solid fa-user-group"></i></div>
        </div>
      </section>

      <section class="card stat-wide">
        <div class="wide-stat">
          <div>
            <div class="stat-label">NEWLY JOINED TODAY</div>
            <div class="wide-value">
              <CountUp :value="Number(totals.joinedToday || 0)" :formatter="(n) => admin.formatted.fmtNumber(n)" />
            </div>
            <div class="stat-trend trend-up"><span>+8</span></div>
          </div>
          <div class="stat-icon tint-green" aria-hidden="true"><i class="fa-solid fa-user-check"></i></div>
        </div>
      </section>
    </div>

    <section class="card">
      <div class="card-head">
        <div>
          <h2 class="card-title">User List</h2>
          <p class="card-subtitle"><strong>94%</strong> Active Rate</p>
        </div>
        <div class="filters">
          <button
            type="button"
            class="btn btn-chip"
            :class="{ 'is-active': showOnlyMe }"
            @click="showOnlyMe = !showOnlyMe"
          >
            {{ showOnlyMe ? 'Showing: My Account' : 'My Account' }}
          </button>
          <div class="filter-dropdown" @click.stop>
            <button type="button" class="btn btn-chip" :aria-expanded="showRoleMenu" @click="toggleRoleMenu">
              {{ selectedRoleLabel }} <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
            </button>
            <div v-if="showRoleMenu" class="filter-menu" role="menu">
              <button
                v-for="opt in roleOptions"
                :key="opt.value || 'all'"
                type="button"
                :class="{ 'is-active': String(selectedRole || '') === String(opt.value || '') }"
                @click="selectedRole = opt.value; closeFilterMenus()"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>


          <div class="filter-dropdown" @click.stop>
            <button type="button" class="btn btn-chip" :aria-expanded="showStatusMenu" @click="toggleStatusMenu">
              {{ selectedStatusLabel }} <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
            </button>
            <div v-if="showStatusMenu" class="filter-menu" role="menu">
              <button
                v-for="opt in statusOptions"
                :key="opt.value || 'any'"
                type="button"
                :class="{ 'is-active': String(selectedStatus || '') === String(opt.value || '') }"
                @click="selectedStatus = opt.value; closeFilterMenus()"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>USER DETAILS</th>
              <th>EMAIL</th>
              <th>DATE JOINED</th>
              <th>ROLE</th>
              <th>STATUS</th>
              <th class="actions">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in pagedUsers" :key="user.id">
              <td class="shop-cell">
                <span class="user-bubble" aria-hidden="true">
                  <img
                    v-if="shouldShowAvatar(user)"
                    :src="getUserAvatar(user)"
                    :alt="`${user.name || 'User'} avatar`"
                    class="user-bubble__img"
                    @error="handleAvatarError(user)"
                  />
                  <span v-else>{{ initials(user.name) }}</span>
                </span>
                <div class="shop-meta">
                  <div class="shop-name">
                    {{ user.name }}
                    <span v-if="isSelf(user)" class="badge badge-blue">YOU</span>
                  </div>
                  <div class="shop-id">ID: {{ user.id }}</div>
                </div>
              </td>
              <td class="muted">{{ user.email }}</td>
              <td>{{ String(user.created_at || '').slice(0, 10) }}</td>
              <td><span :class="roleBadgeClass(user.role)">{{ String(user.role || '').toUpperCase() }}</span></td>
              <td><span :class="statusClass(user)">{{ statusText(user) }}</span></td>
              <td class="actions">
                <button v-if="canViewProfile(user)" type="button" class="icon-action" title="View" @click="openView(user)"><i class="fa-regular fa-eye"></i></button>
                <button v-if="!isAdminRole(user)" type="button" class="icon-action" title="Edit" :disabled="isUpdating || togglingUserId === user.id || deletingUserId === user.id" @click="openEdit(user)"><i
                    class="fa-regular fa-pen-to-square"></i></button>
                <button v-if="!isAdminRole(user)" type="button" class="icon-action" title="Delete" :disabled="isSelf(user) || deletingUserId === user.id || isUpdating" @click="requestDelete(user)"><i
                    class="fa-regular fa-trash-can"></i></button>
                <button v-if="statusText(user) === 'BLOCKED'" type="button" class="btn btn-soft" :disabled="isSelf(user) || togglingUserId === user.id || deletingUserId === user.id"
                  @click="toggleBlock(user)">
                  {{ togglingUserId === user.id ? 'Processing...' : 'Unblock/Verify' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="table-footer">
        <div class="muted">
          SHOWING {{ (page - 1) * perPage + 1 }} TO {{ Math.min(page * perPage, filteredUsers.length) }} OF
          {{ admin.formatted.fmtNumber(filteredUsers.length) }} USERS
        </div>
        <div class="pager">
          <button type="button" class="pager-btn" :disabled="page === 1" @click="page -= 1">‹</button>
          <button type="button" class="pager-btn is-active">{{ page }}</button>
          <button type="button" class="pager-btn" :disabled="page === totalPages" @click="page += 1">›</button>
        </div>
      </div>
    </section>

    <div
      v-if="showView"
      class="modal-backdrop modal-backdrop--center"
      role="dialog"
      aria-modal="true"
      @click.self="closeView"
    >
      <div class="modal modal--profile">
        <div class="modal-head">
          <div>
            <div class="modal-title">User Details</div>
            <div class="modal-sub">Read-only profile snapshot</div>
          </div>
          <button type="button" class="icon-action" title="Close" @click="closeView"><i
              class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <div class="user-details">
            <div class="user-details__hero">
              <div class="user-details__avatar">
                <img
                  v-if="selectedUserAvatar"
                  :src="selectedUserAvatar"
                  :alt="`Avatar for ${selectedUserName}`"
                  @error="handleAvatarError(selectedUser)"
                />
                <span v-else>{{ initials(selectedUser?.name) }}</span>
              </div>
              <div class="user-details__hero-text">
                <p class="user-details__name">{{ selectedUserName }}</p>
                <div class="user-details__meta">
                  <span>ID {{ selectedUser?.id || '—' }}</span>
                  <span>{{ selectedUserJoinedLabel }}</span>
                </div>
              </div>
            </div>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">Email</span>
                <span class="detail-value">{{ selectedUserEmailLabel }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Phone</span>
                <span class="detail-value">{{ selectedUserPhoneLabel }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Role</span>
                <span class="detail-value detail-value--badge" :class="selectedUserRoleClass">
                  {{ selectedUserRoleLabel }}
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status</span>
                <span class="detail-value">{{ selectedUserStatusLabel }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Joined</span>
                <span class="detail-value">{{ selectedUserJoinedLabel }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Last updated</span>
                <span class="detail-value">{{ selectedUserUpdatedLabel }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <section class="grid-2 wide">
      <section class="card">
        <div class="card-head">
          <h2 class="card-title">User Registration Trends</h2>
        </div>
        <div class="chart-bars small" :class="{ animated }">
          <div v-for="point in registrationSeries" :key="point.key" class="bar-col">
            <div class="bar">
              <div class="bar-fill light" :style="{ height: `${point.pct}%` }"></div>
            </div>
            <div class="bar-label">{{ point.label }}</div>
          </div>
        </div>
      </section>


      <section class="card">
        <div class="card-head">
          <h2 class="card-title">Role Distribution</h2>
        </div>
        <div class="fleet-list">
          <div v-for="row in roleDistribution" :key="row.key" class="fleet-row">
            <div class="fleet-left">
              <span class="fleet-name muted">{{ row.label }}</span>
            </div>
            <div class="fleet-right">
              <div class="fleet-bar">
                <div class="fleet-bar-fill" :class="row.bar" :style="{ width: `${row.value}%` }"></div>
              </div>
              <div class="fleet-pct">{{ row.value }}%</div>
            </div>
          </div>
        </div>

        <div class="platform-health">
          <div class="health-dot" aria-hidden="true"></div>
          <div>
            <div class="muted small">PLATFORM HEALTH</div>
            <div class="health-text">System security is stable</div>
          </div>
        </div>
      </section>
    </section>

    <div v-if="showCreate" class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal">
        <div class="modal-head">
          <div>
            <div class="modal-title">Create User</div>
            <div class="modal-sub">Add a new platform user.</div>
          </div>
          <button type="button" class="icon-action" title="Close" @click="closeCreate"><i
              class="fa-solid fa-xmark"></i></button>
        </div>

        <div class="modal-body form-grid">
          <label class="field">
            <span class="field-label">Full Name</span>
            <input v-model="createForm.name" type="text" placeholder="e.g. Marcus Weber" />
          </label>
          <label class="field">
            <span class="field-label">Email</span>
            <input v-model="createForm.email" type="email" placeholder="name@example.com" />
          </label>
          <label class="field">
            <span class="field-label">Phone</span>
            <input v-model="createForm.phone" type="text" placeholder="+855..." />
          </label>
          <label class="field">
            <span class="field-label">Role</span>
            <select v-model="createForm.role">
              <option value="customer">customer</option>
              <option value="admin">admin</option>
              <option value="shop_owner">shop_owner</option>
              <option value="shop_staff">shop_staff</option>
            </select>
          </label>
          <label class="field">
            <span class="field-label">Password</span>
            <input v-model="createForm.password" type="password" placeholder="Strong password" />
          </label>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" :disabled="isCreating" @click="closeCreate">Cancel</button>
          <button type="button" class="btn btn-primary" :disabled="isCreating" @click="submitCreate">
            {{ isCreating ? 'Creating...' : 'Create' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showEdit" class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal">
        <div class="modal-head">
          <div>
            <div class="modal-title">Edit User</div>
            <div class="modal-sub">Update user profile and role.</div>
          </div>
          <button type="button" class="icon-action" title="Close" @click="closeEdit"><i
              class="fa-solid fa-xmark"></i></button>
        </div>


        <div class="modal-body form-grid">
          <label class="field">
            <span class="field-label">Full Name</span>
            <input v-model="editForm.name" type="text" />
          </label>
          <label class="field">
            <span class="field-label">Phone</span>
            <input v-model="editForm.phone" type="text" />
          </label>
          <label class="field">
            <span class="field-label">Role</span>
            <input v-model="editForm.role" type="text" />
          </label>
          <label class="field">
            <span class="field-label">Verified</span>
            <select v-model="editForm.is_verified">
              <option :value="true">Yes</option>
              <option :value="false">No</option>
            </select>
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

    <ConfirmModal v-model="showDeleteConfirm" title="Delete User" :message="deleteMessage" cancel-text="Cancel"
      confirm-text="Yes" variant="danger" @confirm="confirmDelete" />
  </section>
</template>

<style scoped>
.user-details {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.user-details__hero {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.user-details__avatar {
  width: 64px;
  height: 64px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.12);
  display: grid;
  place-items: center;
  font-weight: 700;
  color: #1d4ed8;
  overflow: hidden;
}

.user-details__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
  display: block;
}

.user-details__hero-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.user-details__name {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
}

.user-details__meta {
  display: flex;
  gap: 0.75rem;
  color: #6b7280;
  font-size: 0.85rem;
  flex-wrap: wrap;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 0.75rem;
  background: var(--mp-card);
  border: 1px solid var(--mp-border);
  border-radius: 16px;
  padding: 1rem;
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

.detail-value--badge {
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
}

/* User Detail View Styles */
.user-detail-view {
  padding: 0;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--mp-border);
  margin-bottom: 20px;
}

.user-avatar-large {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
  flex-shrink: 0;
}

.user-main-info h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--mp-text);
}

.user-email {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: var(--mp-muted);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item label {
  font-size: 12px;
  font-weight: 500;
  color: var(--mp-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-item span {
  font-size: 14px;
  color: var(--mp-text);
  font-weight: 500;
}

.detail-item span.badge-active {
  color: #10b981;
}

.detail-item span.badge-blocked {
  color: #ef4444;
}

.detail-item span.badge-pending {
  color: #f59e0b;
}
</style>
