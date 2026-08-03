<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import userService from '@/services/userService'

const route = useRoute()
const router = useRouter()

const DEFAULT_AVATAR = '/Images/default-avatar.svg'


const currentUser = computed(() => userService.getCurrentUser())

const profileName = computed(() => currentUser.value?.name || 'Admin Team')
const profileEmail = computed(() => currentUser.value?.email || 'admin@example.com')

const roleLabel = computed(() => {
  const role = currentUser.value?.role || 'admin'
  return role
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(' ')
})

const normalizeAvatarUrl = (path) => {
  if (!path) return ''
  if (/^(https?:\/\/|data:|blob:)/i.test(path)) return path
  const normalized = String(path).replace(/\\/g, '/').replace(/^\/+/, '')
  if (normalized.startsWith('storage/')) return `/${normalized}`
  return `/storage/${normalized}`
}

const avatarUrl = computed(() => {
  if (!currentUser.value) return DEFAULT_AVATAR
  return (
    normalizeAvatarUrl(currentUser.value.avatar_url) ||
    normalizeAvatarUrl(currentUser.value.profile_picture) ||
    normalizeAvatarUrl(currentUser.value.img_url) ||
    DEFAULT_AVATAR
  )
})

const isProfileMenuOpen = ref(false)
const profileMenuRef = ref(null)

const toggleProfileMenu = () => {
  isProfileMenuOpen.value = !isProfileMenuOpen.value
}

const closeProfileMenu = () => {
  isProfileMenuOpen.value = false
}

const handleDocumentClick = (event) => {
  if (!isProfileMenuOpen.value) return
  if (profileMenuRef.value && !profileMenuRef.value.contains(event.target)) {
    closeProfileMenu()
  }
}

const handleLogout = async () => {
  closeProfileMenu()
  try {
    const token = localStorage.getItem('auth_token')
    await fetch('/api/users/logout', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
    })
  } catch (error) {
    console.error('Logout error:', error)
  } finally {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }
}

const openSettings = () => {
  closeProfileMenu()
  router.push('/admin/settings')
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})

const displayInitials = computed(() => {
  const name = profileName.value.trim()
  if (!name) return 'AD'
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
})

const navLinks = [
  { label: 'Dashboard', to: '/admin' },
  { label: 'Users', to: '/admin/users' },
  { label: 'Bookings', to: '/bookings' },
  { label: 'Shops', to: '/dashboard' },
]
</script>


<template>
  <nav class="admin-navbar">
    <div class="admin-navbar__brand">
      <strong>{{ $t('chongChoulAdmin') }}</strong>
      <small>{{ $t('controlCenter') }}</small>
    </div>
    <div class="admin-navbar__links">
      <RouterLink
        v-for="link in navLinks"
        :key="link.label"
        :to="link.to"
        class="admin-navbar__link"
        :aria-current="route.path === link.to ? 'page' : null"
      >
        {{ link.label }}
      </RouterLink>
    </div>
    <div class="admin-navbar__profile" ref="profileMenuRef">
      <button
        type="button"
        class="admin-navbar__profile-trigger"
        @click="toggleProfileMenu"
        :aria-expanded="isProfileMenuOpen"
        aria-haspopup="true"
      >
        <div class="admin-navbar__avatar">
          <img v-if="avatarUrl" :src="avatarUrl" alt="Profile" />
          <span v-else>{{ displayInitials }}</span>
        </div>
        <div class="admin-navbar__profile-texts">
          <p>{{ profileName }}</p>
          <small>{{ profileEmail }}</small>
          <span class="admin-navbar__role-badge">{{ roleLabel }}</span>
        </div>
        <span class="admin-navbar__chevron" :class="{ open: isProfileMenuOpen }" />
      </button>
      <div v-if="isProfileMenuOpen" class="admin-navbar__dropdown" role="menu">
        <button class="admin-navbar__dropdown-item" type="button" @click="openSettings" role="menuitem">
          <div>
            <strong>{{ $t('shopSettings') }}</strong>
            <small>{{ $t('profileAccount') }}</small>
          </div>
          <span class="admin-navbar__dropdown-icon" aria-hidden="true">➜</span>
        </button>
        <button
          class="admin-navbar__dropdown-item danger"
          type="button"
          @click="handleLogout"
          role="menuitem"
        >{{ $t('logout') }}</button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.admin-navbar {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(12, 74, 110, 0.18));
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 30px;
  border: 1px solid rgba(37, 99, 235, 0.35);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.18);
  position: sticky;
  top: 8px;
  z-index: 20;
  min-height: 56px;
}

.admin-navbar__brand {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1;
}

.admin-navbar__brand strong {
  font-size: 1.15rem;
  color: #f8fafc;
}

.admin-navbar__brand small {
  color: rgba(248, 250, 252, 0.8);
  font-size: 0.75rem;
}

.admin-navbar__links {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.admin-navbar__link {
  font-weight: 600;
  color: #e2e8f0;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.08);
  transition: background 0.2s ease, color 0.2s ease;
  backdrop-filter: blur(6px);
}

.admin-navbar__link[aria-current='page'],
.admin-navbar__link:hover {
  background: rgba(255, 255, 255, 0.35);
  color: #0f172a;
}

.admin-navbar__profile {
  position: relative;
}

.admin-navbar__profile-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.16);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  color: inherit;
}

.admin-navbar__profile-trigger:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.3);
}

.admin-navbar__chevron {
  width: 10px;
  height: 10px;
  border: solid #e2e8f0;
  border-width: 0 1.5px 1.5px 0;
  display: inline-block;
  padding: 2px;
  transform: rotate(45deg);
  transition: transform 0.2s ease;
  margin-left: auto;
}

.admin-navbar__chevron.open {
  transform: rotate(-135deg);
}


.admin-navbar__dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 220px;
  background: rgba(15, 23, 42, 0.95);
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.35);
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  z-index: 10;
}

.admin-navbar__dropdown-item {
  width: 100%;
  border: none;
  background: transparent;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.95rem;
  text-align: left;
  cursor: pointer;
  color: #e2e8f0;
}

.admin-navbar__dropdown-item strong {
  font-size: 0.95rem;
}

.admin-navbar__dropdown-item small {
  display: block;
  font-size: 0.7rem;
  color: rgba(226, 232, 240, 0.7);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-top: 2px;
}

.admin-navbar__dropdown-item:not(.danger):hover {
  background: rgba(248, 250, 252, 0.08);
}

.admin-navbar__dropdown-item.danger {
  color: #f87171;
  font-weight: 600;
}

.admin-navbar__dropdown-icon {
  font-size: 1rem;
  color: #cbd5f5;
}

.admin-navbar__profile-texts {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.admin-navbar__profile-texts p {
  margin: 0;
  font-weight: 600;
  font-size: 0.8rem;
  color: #f8fafc;
}

.admin-navbar__profile-texts small {
  color: rgba(248, 250, 252, 0.7);
  font-size: 0.65rem;
}

.admin-navbar__role-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(14, 165, 233, 0.18);
  color: #bae6fd;
  font-size: 0.55rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.admin-navbar__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #38bdf8, #0ea5e9);
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 600;
  overflow: hidden;
}

.admin-navbar__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.admin-navbar__profile p {
  margin: 0;
  font-weight: 600;
  font-size: 0.85rem;
}


@media (max-width: 960px) {
  .admin-navbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .admin-navbar__links {
    gap: 8px;
  }
}

@media (max-width: 640px) {
.admin-navbar__links,
.admin-navbar__profile {
  width: 100%;
    justify-content: space-between;
  }
}
</style>
