<script setup>
import { computed, onBeforeUnmount, onMounted, ref, useAttrs, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTheme } from '../../composables/useTheme'
import { useNotifications } from '../../composables/useNotifications'
import userService from '../../services/userService.js'
import { setLanguage, getCurrentLanguage } from '@/i18n'
import { useAdminStore } from '../../stores/adminStore.js'
import { CAMBODIA_TIMEZONE, cambodiaDateTimeLabel, cambodiaYear } from '../../utils/cambodiaTime.js'
import '../../css/DashboardAdmin.css'
import ConfirmModal from '../../components/ConfirmModal.vue'
import ToastStack from '../../components/ToastStack.vue'

defineOptions({
  inheritAttrs: false,
})

const route = useRoute()
const router = useRouter()
const { isDark, toggleTheme } = useTheme()
const adminStore = useAdminStore()
const { t } = useI18n()

// Language state
const currentAdminLang = ref(getCurrentLanguage())
const switchAdminLang = (lang) => {
  if (lang !== currentAdminLang.value) {
    setLanguage(lang)
    currentAdminLang.value = lang
  }
}

// Professional Logo path from public folder
const logoUrl = '/Images/logo-removebg.png'

const searchQuery = ref('')
const showLogoutConfirm = ref(false)
let searchTimer = null
let clockTimer = null
const nowTick = ref(Date.now())

const navItems = computed(() => [
  { label: t('navDashboard'), to: '/admin', icon: 'fa-solid fa-table-cells-large' },
  { label: t('navShopManagement'), to: '/admin/shops', icon: 'fa-regular fa-building' },
  { label: t('navUserManagement'), to: '/admin/users', icon: 'fa-regular fa-user' },
  { label: t('navVehicleManagement'), to: '/admin/vehicles', icon: 'fa-solid fa-motorcycle' },
  { label: t('navBookingManagement'), to: '/admin/bookings', icon: 'fa-regular fa-calendar-check' },
  { label: t('navCategories'), to: '/admin/categories', icon: 'fa-solid fa-tags' },
  { label: t('navCities'), to: '/admin/cities', icon: 'fa-solid fa-location-dot' },
  { label: t('navFinancials'), to: '/admin/financials', icon: 'fa-solid fa-dollar-sign' },
  { label: t('navReports'), to: '/admin/reports', icon: 'fa-solid fa-chart-column' },
  { label: t('navNotifications'), to: '/admin/notifications', icon: 'fa-regular fa-bell' },
  { label: t('navSettings'), to: '/admin/settings', icon: 'fa-solid fa-gear' },
])

const profileVersion = ref(Date.now())

const refreshProfileData = () => {
  profileVersion.value = Date.now()
}

const currentUser = computed(() => {
  profileVersion.value // eslint-disable-line no-unused-expressions
  return userService.getCurrentUser()
})
const adminName = computed(() => currentUser.value?.name || 'Admin')
const adminRole = computed(() => (currentUser.value?.role || 'Admin').toString().toUpperCase())
const isAdmin = computed(() => {
  const u = currentUser.value || {}
  if (u.is_admin === true) return true
  const role = String(u.role || u.user_type || '').toLowerCase()
  return role === 'admin'
})
const adminInitials = computed(() => {
  const name = adminName.value.trim()
  if (!name) return 'A'
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase()
})

const adminProfilePicture = computed(() => {
  profileVersion.value // eslint-disable-line no-unused-expressions
  const user = currentUser.value || {}
  const stored = localStorage.getItem('user_profile_picture') || ''
  const path = user.profile_picture || user.avatar_url || stored || ''
  return userService.getAvatarUrl(path) || null
})

const activePath = computed(() => route.path)

const routerViewAttrs = useAttrs()

// Check if current page should hide search bar
const shouldShowSearch = computed(() => {
  const path = route.path
  // Hide search on all admin pages
  return !path.startsWith('/admin')
})

const isActive = (path) => {
  if (path === '/admin') return activePath.value === '/admin' || activePath.value === '/admin/'
  return activePath.value.startsWith(path)
}

const {
  notifications,
  unreadCount,
  isLoading: notificationsLoading,
  error: notificationsError,
  loadNotifications,
  markAllAsRead,
  toggleReadStatus
} = useNotifications()

const showNotificationsPopup = ref(false)
const notificationButtonRef = ref(null)
const notificationPopupRef = ref(null)

const notificationPreview = computed(() => (notifications.value || []).slice(0, 4))
const hasAnyNotifications = computed(() => (notifications.value || []).length > 0)
const hasUnreadNotifications = computed(() => (unreadCount.value || 0) > 0)
const hasAdminNotifications = computed(() => (notifications.value || []).some((item) => item.role === 'admin'))

const refreshNotifications = () => loadNotifications(null, { include_all: true }).catch(() => {})
const toggleNotificationsPopup = () => {
  showNotificationsPopup.value = !showNotificationsPopup.value
  if (showNotificationsPopup.value) {
    refreshNotifications()
  }
}

const getAvatarInitials = (item) => {
  const name = item?.relatedSender?.name || item?.user?.name || 'User'
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

const formatPopupTime = (timestamp) => {
  const value = Number(new Date(timestamp))
  if (!Number.isFinite(value)) return ''
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(value)
}

const canManageReadState = (item) => item?.role === 'admin'

const handleToggleNotificationRead = async (item) => {
  if (!canManageReadState(item)) return
  try {
    await toggleReadStatus(item.id)
  } catch (err) {
    console.error('Unable to toggle notification status', err)
  }
}

const handleMarkAllNotificationsRead = async () => {
  if (!hasAdminNotifications.value) return
  try {
    await markAllAsRead()
  } catch (err) {
    console.error('Unable to mark notifications as read', err)
  }
}

const handleDocumentClick = (event) => {
  if (!showNotificationsPopup.value) return
  if (
    notificationButtonRef.value?.contains(event.target) ||
    notificationPopupRef.value?.contains(event.target)
  ) {
    return
  }
  showNotificationsPopup.value = false
}

const handleLogout = async () => {
  try {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  } catch (error) {
    console.error('Logout failed:', error)
  }
}

const onSearchSubmit = () => {
  const q = searchQuery.value.trim()
  if (!q) return

  const path = route.path
  const searchable = [
    '/admin/shops',
    '/admin/users',
    '/admin/vehicles',
    '/admin/bookings',
  ]

  const target = searchable.find((p) => path.startsWith(p)) || '/admin/shops'
  router.push({ path: target, query: { q } })
}

watch(
  () => route.query.q,
  (q) => {
    const next = String(q || '').trim()
    if (searchQuery.value !== next) searchQuery.value = next
  },
  { immediate: true }
)

watch(searchQuery, (value) => {
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    const q = String(value || '').trim()
    const currentQ = String(route.query.q || '').trim()
    if (q === currentQ) return

    const searchable = [
      '/admin/shops',
      '/admin/users',
      '/admin/vehicles',
      '/admin/bookings',
    ]
    if (!searchable.some(p => route.path.startsWith(p))) return

    const nextQuery = { ...route.query }
    if (q) nextQuery.q = q
    else delete nextQuery.q
    router.replace({ query: nextQuery })
  }, 400)
})

watch(
  () => route.path,
  () => {
    showNotificationsPopup.value = false
  }
)

onMounted(() => {
  adminStore.load().catch(() => {})
  fetchUserProfile()
  clockTimer = window.setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)
  document.addEventListener('click', handleDocumentClick)
  window.addEventListener('storage', refreshProfileData)
  window.addEventListener('user-updated', refreshProfileData)
})

// Fetch user profile and store in localStorage
const fetchUserProfile = async () => {
  const token = localStorage.getItem('auth_token')
  if (!token) return
  try {
    const response = await fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    })
    
    // Handle 401 unauthorized - redirect to login
    if (response.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user')
      localStorage.removeItem('user_name')
      localStorage.removeItem('user_email')
      localStorage.removeItem('user_phone')
      localStorage.removeItem('user_job_title')
      localStorage.removeItem('user_bio')
      localStorage.removeItem('user_profile_picture')
      router.push('/login')
      return
    }
    
    if (!response.ok) return
    const data = await response.json()
    const user = data.user || {}
    
    // Only update if we have valid user data (name or email)
    if (user && (user.name || user.email)) {
      // Preserve existing values if new values are empty
      const existingName = localStorage.getItem('user_name')
      const existingEmail = localStorage.getItem('user_email')
      const existingPhone = localStorage.getItem('user_phone')
      const existingJobTitle = localStorage.getItem('user_job_title')
      const existingBio = localStorage.getItem('user_bio')
      const existingProfilePicture = localStorage.getItem('user_profile_picture')
      
      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('user_name', user.name || existingName || '')
      localStorage.setItem('user_email', user.email || existingEmail || '')
      localStorage.setItem('user_phone', user.phone || existingPhone || '')
      localStorage.setItem('user_job_title', user.job_title || user.role || existingJobTitle || 'Super Admin')
      localStorage.setItem('user_bio', user.bio || existingBio || '')
      localStorage.setItem('user_profile_picture', user.profile_picture || user.avatar_url || existingProfilePicture || '')
    }
  } catch (error) {
    console.error('Failed to fetch user profile:', error)
  }
}

onBeforeUnmount(() => {
  if (searchTimer) window.clearTimeout(searchTimer)
  if (clockTimer) window.clearInterval(clockTimer)
  document.removeEventListener('click', handleDocumentClick)
  window.removeEventListener('storage', refreshProfileData)
  window.removeEventListener('user-updated', refreshProfileData)
})

const cambodiaClockLabel = computed(() => cambodiaDateTimeLabel(new Date(nowTick.value)))
const cambodiaCurrentYear = computed(() => cambodiaYear(new Date(nowTick.value)))
</script>

<template>
  <div class="admin-layout-shell">
    <div class="admin-app" :class="{ 'is-admin': isAdmin }">
      <aside class="admin-sidebar">
         <div class="admin-brand">
           <div class="brand-badge" aria-hidden="true">
             <img class="brand-logo" :src="logoUrl" alt="Chong Choul" />
           </div>
           <div class="brand-text">
             <span class="brand-name">Chong <span class="brand-cyan">Choul</span></span>
           </div>
         </div>

        <nav class="admin-nav">
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="admin-nav-item"
            :class="{ active: isActive(item.to) }"
          >
            <i :class="item.icon" aria-hidden="true"></i>
            <span>{{ item.label }}</span>
          </RouterLink>
        </nav>

        <button type="button" class="admin-logout" @click="showLogoutConfirm = true">
          <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
          <span>{{ t('logout') }}</span>
        </button>
      </aside>

      <div class="admin-main">
        <header class="admin-topbar">
          <form v-if="shouldShowSearch" class="topbar-search" @submit.prevent="onSearchSubmit">
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <input
              v-model="searchQuery"
              type="search"
              :placeholder="t('searchPlaceholder')"
              aria-label="Search"
            />
          </form>
          <div v-else class="topbar-search"></div>

          <div class="topbar-actions">
            <!-- Language Toggle -->
            <div class="header-lang-toggle">
              <button
                class="hl-btn"
                :class="{ active: currentAdminLang === 'en' }"
                @click="switchAdminLang('en')"
                title="English"
              >
                EN
              </button>
              <span class="hl-sep">|</span>
              <button
                class="hl-btn"
                :class="{ active: currentAdminLang === 'kh' }"
                @click="switchAdminLang('kh')"
                title="ភាសាខ្មែរ"
              >
                KH
              </button>
            </div>
            <div class="topbar-time" :title="`Cambodia time (${CAMBODIA_TIMEZONE})`">
              <span class="topbar-time-year">{{ cambodiaCurrentYear }}</span>
              <span class="dot">•</span>
              <span class="topbar-time-clock">{{ cambodiaClockLabel }}</span>
            </div>
            <button 
              type="button" 
              class="icon-btn" 
              :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'" 
              @click="toggleTheme"
            >
              <i :class="isDark ? 'fa-regular fa-sun' : 'fa-regular fa-moon'" aria-hidden="true"></i>
            </button>
            <div class="topbar-notifications" ref="notificationButtonRef">
              <button
                type="button"
                class="icon-btn"
                title="Notifications"
                @click.stop="toggleNotificationsPopup"
              >
                <i class="fa-regular fa-bell" aria-hidden="true"></i>
                <span v-if="hasUnreadNotifications" class="notif-dot">{{ unreadCount }}</span>
              </button>
              <div
                v-if="showNotificationsPopup"
                class="notifications-popup"
                ref="notificationPopupRef"
                @click.stop
              >
                <header class="notifications-popup__header">
                  <strong>Notifications</strong>
                  <button
                    type="button"
                    class="ghost-pill ghost-pill--mini"
                    @click="handleMarkAllNotificationsRead"
                    :disabled="notificationsLoading || !hasAdminNotifications"
                  >
                    Mark all read
                  </button>
                </header>
                <section class="notifications-popup__content">
                  <div v-if="notificationsLoading" class="notifications-popup__empty">
                    Loading…
                  </div>
                  <div v-else-if="notificationsError" class="notifications-popup__empty error">
                    {{ notificationsError }}
                  </div>
                  <div v-else-if="!hasAnyNotifications" class="notifications-popup__empty">
                    No notifications found.
                  </div>
                  <ul v-else class="notifications-popup__list">
                    <li
                      v-for="item in notificationPreview"
                      :key="item.id"
                      class="notifications-popup__item"
                    >
                      <div class="notifications-popup__avatar">
                        <img v-if="item.user?.avatar" :src="item.user.avatar" :alt="item.user?.name || 'user avatar'" />
                        <span v-else>{{ getAvatarInitials(item) }}</span>
                        <span v-if="item.status === 'unread'" class="notifications-popup__status-dot" />
                      </div>
                      <div>
                        <p class="notifications-popup__title">{{ item.action }}</p>
                        <p class="notifications-popup__message">{{ item.message }}</p>
                        <span class="notifications-popup__time">
                          {{ formatPopupTime(item.timestamp) }}
                        </span>
                      </div>
                    </li>
                  </ul>
                </section>
                <footer class="notifications-popup__footer">
                  <RouterLink to="/admin/notifications" class="link-btn">View all »</RouterLink>
                </footer>
              </div>
            </div>

              <div class="topbar-user">
                <div class="user-meta">
                  <div class="user-name">{{ adminName }}</div>
                  <div class="user-status">{{ adminRole }}</div>
                </div>
                <div class="user-avatar" :aria-label="adminName">
                  <img v-if="adminProfilePicture" :src="adminProfilePicture" :alt="`${adminName} avatar`" />
                  <span v-else>{{ adminInitials }}</span>
                </div>
              </div>
          </div>
        </header>

        <main class="admin-content">
          <div class="admin-content-inner">
            <RouterView v-bind="routerViewAttrs" />
            <footer class="admin-footer">
              <span>{{ t('footerCopyright') }}</span>
            </footer>
          </div>
        </main>
      </div>
    </div>

     <ToastStack />

     <ConfirmModal
       v-model="showLogoutConfirm"
       title="Logout"
       message="Are you sure you want to logout?"
       cancel-text="Cancel"
       confirm-text="Yes, Logout"
       variant="danger"
       @confirm="handleLogout"
     />
  </div>
</template>

<style scoped>
.brand-logo {
  width: 46px;
  height: 46px;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.3));
}

/* Header Language Toggle */
.header-lang-toggle {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  background: rgba(59, 130, 246, 0.08);
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.12);
}

.hl-btn {
  background: transparent;
  border: none;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.78rem;
  color: #64748b;
  transition: all 0.2s ease;
  font-family: inherit;
  letter-spacing: 0.06em;
}

.hl-btn:hover {
  color: #2563eb;
}

.hl-btn.active {
  background: #ffffff;
  color: #2563eb;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.hl-sep {
  color: #cbd5e1;
  font-size: 0.7rem;
  user-select: none;
}

.topbar-notifications {
  position: relative;
}
.topbar-notifications .icon-btn {
  position: relative;
}
.topbar-notifications .notif-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 0.65rem;
  min-width: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: #ef4444;
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.notifications-popup {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 420px;
  background: #ffffff;
  border-radius: 18px;
  padding: 0.85rem;
  border: 1px solid #e5e7eb;
  box-shadow: 0 24px 50px rgba(15, 23, 42, 0.25);
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.notifications-popup__avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: #eef2ff;
  display: grid;
  place-items: center;
  font-weight: 700;
  color: #1d4ed8;
  font-size: 0.9rem;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}
.notifications-popup__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}
.notifications-popup__status-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
  border: 2px solid #ffffff;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.25);
}
.notifications-popup__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: #374151;
  font-weight: 600;
}
.notifications-popup__content {
  max-height: 320px;
  overflow-y: auto;
  padding-right: 0.25rem;
}
.notifications-popup__content::-webkit-scrollbar {
  width: 6px;
}
.notifications-popup__content::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.35);
  border-radius: 999px;
}
.notifications-popup__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.notifications-popup__item {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: flex-start;
  padding: 10px 8px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(37, 99, 235, 0.15);
  box-shadow: 0 12px 25px rgba(15, 23, 42, 0.08);
}
.notifications-popup__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #111827;
}
.notifications-popup__message {
  margin: 0.2rem 0;
  font-size: 0.85rem;
  color: #4b5563;
}
.notifications-popup__time {
  font-size: 0.75rem;
  color: #6b7280;
}
.notifications-popup__empty {
  text-align: center;
  color: #6b7280;
  font-size: 0.85rem;
  padding: 0.75rem 0;
}
.notifications-popup__empty.error {
  color: #dc2626;
}
.notifications-popup__footer {
  display: flex;
  justify-content: flex-end;
}
.link-btn {
  font-size: 0.85rem;
  font-weight: 600;
  color: #047857;
}
.ghost-pill--mini {
  border-radius: 999px;
  border: 1px solid #d1d5db;
  background: transparent;
  padding: 0.35rem 0.75rem;
  font-size: 0.7rem;
  cursor: pointer;
  color: #374151;
}
.ghost-pill--mini:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .notifications-popup {
    right: -10px;
    left: auto;
    width: 90vw;
  }
}
</style>
