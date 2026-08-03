<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UserProfileMenu from '@/components/UserProfileMenu.vue'
import NotificationMenu from '@/components/NotificationMenu.vue'
import { useNotifications } from '@/composables/useNotifications'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

const baseNavItems = [{ label: 'Home', route: '/' }]
const defaultNavItems = [
  ...baseNavItems,
  { label: 'My Bookings', route: '/my-bookings' },
  { label: 'Profile', route: '/user/profile' }
]

const props = defineProps({
  navItems: Array,
  activeLabel: {
    type: String,
    default: ''
  },
  showBackButton: {
    type: Boolean,
    default: false
  },
  backTo: {
    type: String,
    default: ''
  },
  backLabel: {
    type: String,
    default: 'Back'
  },
  showFallbackMessage: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['logout-request', 'nav-click'])
const router = useRouter()
const route = useRoute()
const { unreadCount, loadNotifications } = useNotifications()
const notificationMenuOpen = ref(false)
const notificationMenuRef = ref(null)
const mobileMenuOpen = ref(false)

const resolvedNavItems = computed(() => {
  return props.navItems && props.navItems.length > 0 ? props.navItems : defaultNavItems
})

const activeNav = computed(() => {
  if (props.activeLabel) return props.activeLabel
  // Try to find the item that matches the current route
  const matchedItem = resolvedNavItems.value.find(item => 
    item.route && route.path.startsWith(item.route)
  )
  return matchedItem?.label || resolvedNavItems.value[0]?.label || 'Home'
})

const shouldShowBackButton = computed(() => {
  if (!props.showBackButton) return false
  return !route.path.startsWith('/view_shop')
})

const notify = (message) => {
  window.alert(message)
}

const handleNavClick = (item) => {
  const hasRoute = item.route && item.route !== '#'
  if (hasRoute) {
    router.push(item.route)
  } else if (props.showFallbackMessage) {
    notify(item.fallbackMessage || 'This page is not available yet.')
  }

  emit('nav-click', item)
  mobileMenuOpen.value = false
}

const openProfile = () => {
  router.push('/user/profile')
}

const requestLogout = () => {
  emit('logout-request')
}

const toggleNotifications = () => {
  notificationMenuOpen.value = !notificationMenuOpen.value
}

const closeNotifications = () => {
  notificationMenuOpen.value = false
}

const handleDocumentClick = (event) => {
  if (!notificationMenuOpen.value) return
  if (notificationMenuRef.value && !notificationMenuRef.value.contains(event.target)) {
    closeNotifications()
  }
}

const goToNotificationsPage = () => {
  closeNotifications()
  router.push('/notifications')
}

const goBack = () => {
  if (props.backTo) {
    router.push(props.backTo)
    return
  }
  router.push('/view_shop')
}

onMounted(() => {
  loadNotifications().catch(() => {})
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <header class="user-navbar-shell">
    <div class="user-navbar">
      <div class="brand">
        <div class="brand-icon">
          <img src="/Images/logo-removebg.png" alt="Chong Choul logo" class="brand-icon-image" />
        </div>
        <span>Chong Choul</span>
      </div>

      <nav class="nav-links" :class="{ open: mobileMenuOpen }">
        <button
          v-for="item in resolvedNavItems"
          :key="item.label"
          class="btn-reset nav-link"
          :class="{ active: activeNav === item.label }"
          @click="handleNavClick(item)"
        >
          {{ item.label }}
        </button>
      </nav>

      <button
        type="button"
        class="btn-reset nav-toggle"
        :class="{ open: mobileMenuOpen }"
        @click="mobileMenuOpen = !mobileMenuOpen"
        aria-label="Toggle navigation"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>


      <div class="top-actions">
        <!-- Language Toggle -->
        <LanguageSwitcher />
        <div ref="notificationMenuRef" class="notification-bell-wrap">
          <button
            type="button"
            class="btn-reset notification-bell"
            :class="{ active: notificationMenuOpen || route.path.startsWith('/notifications') }"
            aria-label="Notifications"
            @click.stop="toggleNotifications"
          >
            <i class="fa-solid fa-bell" aria-hidden="true"></i>
            <span v-if="unreadCount > 0" class="notification-bell__badge">
              {{ unreadCount > 99 ? '99+' : unreadCount }}
            </span>
          </button>

          <div v-if="notificationMenuOpen" class="notification-bell-popover">
            <NotificationMenu />
          </div>
        </div>
        <UserProfileMenu @settings="openProfile" @logout="requestLogout" />
      </div>
    </div>

    <div v-if="shouldShowBackButton" class="navbar-back-row">
      <button type="button" class="btn-reset navbar-back-btn" @click="goBack">
        <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
        <span>{{ backLabel }}</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.user-navbar-shell {
  position: sticky;
  top: 0;
  z-index: 220;
  background: #f9fbff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
}

.user-navbar {
  min-height: 80px;
  padding: 0 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 36px;
}

.user-navbar .brand {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 22px;
  font-weight: 800;
  color: #245bd4;
  text-transform: none;
}

.user-navbar .brand-icon {
  width: 60px;
  height: 60px;
  border-radius: 0;
  background: transparent;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.user-navbar .brand-icon-image {
  width: 56px;
  height: 56px;
  object-fit: contain;
}

.user-navbar .nav-links {
  display: flex;
  align-items: center;
  gap: 28px;
}

.user-navbar .nav-links.open {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #ffffff;
  flex-direction: column;
  padding: 14px 12px 18px;
  border: 1px solid #e5ecff;
  border-radius: 0 0 16px 16px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.15);
}

.user-navbar .nav-link {
  padding: 12px 0;
  color: #1f3657;
  font-size: 15px;
  font-weight: 600;
  background: transparent;
  cursor: pointer;
  transition: color 0.2s ease, font-weight 0.2s ease, border-color 0.2s ease;
  border: none;
  outline: none;
}

.user-navbar .nav-link.active {
  color: #1d4ed8;
  font-weight: 800;
  border-bottom: 3px solid #2563eb;
  padding-bottom: 10px;
}

.user-navbar .nav-link:hover {
  color: #2563eb;
}

.user-navbar .top-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.notification-bell-wrap {
  position: relative;
}

.notification-bell {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f8fbff;
  border: 1px solid #dbe7f5;
  color: #1f3657;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.notification-bell:hover {
  background: #eaf2ff;
  border-color: #bfd4f5;
  color: #2563eb;
  transform: translateY(-1px);
}

.notification-bell.active {
  background: #eaf2ff;
  border-color: #bfd4f5;
  color: #2563eb;
}

.notification-bell i {
  font-size: 1rem;
}

.notification-bell__badge {
  position: absolute;
  top: -4px;
  right: -2px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 0.68rem;
  font-weight: 800;
  line-height: 18px;
  text-align: center;
  box-shadow: 0 6px 14px rgba(239, 68, 68, 0.32);
}

.notification-bell-popover {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  z-index: 260;
}

.user-navbar .nav-toggle {
  display: none;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid #dbe7f5;
  background: #f8fbff;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.user-navbar .nav-toggle span {
  height: 2px;
  width: 18px;
  background: #1f3657;
  border-radius: 999px;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.user-navbar .nav-toggle.open span:nth-child(1) {
  transform: translateY(5px) rotate(45deg);
}

.user-navbar .nav-toggle.open span:nth-child(2) {
  opacity: 0;
}

.user-navbar .nav-toggle.open span:nth-child(3) {
  transform: translateY(-5px) rotate(-45deg);
}

.navbar-back-row {
  padding-inline: calc(34px + (50vw - 50%));
  padding-bottom: 12px;
  display: flex;
  align-items: center;
}


.navbar-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 18px;
  border-radius: 999px;
  background: #f1f5f9;
  border: 1px solid #dbe4ef;
  color: #1e3a8a;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1;
  transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.navbar-back-btn:hover {
  background: #e7f0ff;
  border-color: #bfd4f5;
  transform: translateY(-1px);
}

.navbar-back-btn i {
  font-size: 0.9rem;
}

@media (max-width: 1080px) {
  .user-navbar {
    flex-direction: column;
    padding: 12px 28px;
    gap: 14px;
  }

  .user-navbar .nav-links {
    width: 100%;
    justify-content: center;
    gap: 18px;
  }

  .user-navbar .top-actions {
    justify-content: center;
  }

  .navbar-back-row {
    padding-inline: 28px;
  }
}

  @media (max-width: 640px) {
    .user-navbar {
      padding: 12px 18px;
    }

  .user-navbar .nav-links {
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
  }

  .user-navbar .top-actions {
    gap: 10px;
  }

  .notification-bell-popover {
    position: fixed;
    top: 88px;
    right: 12px;
    left: 12px;
  }

  .user-navbar .brand {
    font-size: 16px;
  }

  .user-navbar .brand-icon {
    width: 48px;
    height: 48px;
  }

  .user-navbar .brand-icon-image {
    width: 44px;
    height: 44px;
    transform: scale(1.1);
  }

  .navbar-back-row {
    padding-inline: 18px;
    padding-bottom: 10px;
  }

    .navbar-back-btn {
      min-height: 38px;
      padding: 0 14px;
      font-size: 0.95rem;
    }
  }

  @media (max-width: 960px) {
    .user-navbar {
      position: relative;
    }
    .user-navbar .nav-toggle {
      display: inline-flex;
    }
    .user-navbar .nav-links {
      display: none;
    }
    .user-navbar .nav-links.open {
      display: flex;
    }
  }
</style>
