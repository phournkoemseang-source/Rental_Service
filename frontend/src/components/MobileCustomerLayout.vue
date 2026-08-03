<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { userService } from '@/services/database.js'

const props = defineProps({
  title: {
    type: String,
    default: 'Chong Choul'
  },
  showBack: {
    type: Boolean,
    default: false
  },
  backTo: {
    type: String,
    default: ''
  },
  showFab: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['fab-click', 'back-click'])
const router = useRouter()
const route = useRoute()

const bottomNavItems = [
  { label: 'Home', icon: 'fa-solid fa-house', route: '/view_shop' },
  { label: 'Bookings', icon: 'fa-solid fa-calendar-check', route: '/my-bookings' },
  { label: 'Notifications', icon: 'fa-solid fa-bell', route: '/notifications' },
  { label: 'Profile', icon: 'fa-solid fa-user', route: '/user/profile' }
]

const activeNav = computed(() => {
  const path = route.path
  if (path.startsWith('/view_shop')) return 'Home'
  if (path.startsWith('/my-bookings')) return 'Bookings'
  if (path.startsWith('/notifications')) return 'Notifications'
  if (path.startsWith('/user/profile')) return 'Profile'
  return 'Home'
})

const handleNavClick = (item) => {
  router.push(item.route)
}

const handleBack = () => {
  if (props.backTo) {
    router.push(props.backTo)
  } else {
    router.back()
  }
  emit('back-click')
}

const handleFabClick = () => {
  emit('fab-click')
}

const currentUser = computed(() => userService.getCurrentUser())

const handleLogout = async () => {
  await userService.logout()
  localStorage.removeItem('auth_token')
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}
</script>

<template>
  <div class="mobile-customer-layout">
    <!-- Mobile Header -->
    <header class="mobile-header">
      <div class="mobile-header__content">
        <button 
          v-if="showBack" 
          class="mobile-header__back" 
          @click="handleBack"
        >
          <i class="fa-solid fa-arrow-left"></i>
          <span>{{ $t('back') }}</span>
        </button>
        <h1 class="mobile-header__title">{{ title }}</h1>
        <button class="mobile-header__logout" @click="handleLogout" title="Logout">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    </header>

    <!-- Slot for main content -->
    <slot></slot>

    <!-- Bottom Navigation Bar -->
    <nav class="mobile-bottom-nav">
      <ul class="mobile-bottom-nav__items">
        <li 
          v-for="item in bottomNavItems" 
          :key="item.label"
          class="mobile-bottom-nav__item"
          :class="{ active: activeNav === item.label }"
          @click="handleNavClick(item)"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </li>
      </ul>
    </nav>

    <!-- Floating Action Button -->
    <button 
      v-if="showFab" 
      class="mobile-fab"
      @click="handleFabClick"
    >
      <i class="fa-solid fa-plus"></i>
    </button>
  </div>
</template>

<style scoped>
.mobile-customer-layout {
  min-height: 100vh;
  background: #f8fafc;
}

.mobile-header {
  display: none;
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  padding: 12px 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid #e2e8f0;
}

.mobile-header__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mobile-header__title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  flex: 1;
  text-align: center;
}

.mobile-header__back {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #2563eb;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.mobile-header__back:hover {
  background: #eff6ff;
}

.mobile-header__logout {
  background: none;
  border: none;
  color: #64748b;
  font-size: 18px;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.mobile-header__logout:hover {
  background: #fee2e2;
  color: #dc2626;
}

.mobile-bottom-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 70px;
  background: #ffffff;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
  z-index: 1000;
  padding: 0 8px;
  padding-bottom: env(safe-area-inset-bottom, 8px);
}

.mobile-bottom-nav__items {
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 100%;
  list-style: none;
  margin: 0;
  padding: 0;
}

.mobile-bottom-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 8px 4px;
  color: #64748b;
  text-decoration: none;
  font-size: 11px;
  font-weight: 600;
  transition: all 0.2s ease;
  background: none;
  border: none;
  cursor: pointer;
  gap: 4px;
}

.mobile-bottom-nav__item i {
  font-size: 20px;
}

.mobile-bottom-nav__item.active {
  color: #2563eb;
}

.mobile-bottom-nav__item.active i {
  transform: scale(1.1);
}

.mobile-fab {
  display: none;
  position: fixed;
  bottom: 90px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;
  border: none;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4);
  cursor: pointer;
  z-index: 999;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  align-items: center;
  justify-content: center;
  animation: pulse 2s infinite;
}

.mobile-fab:hover {
  transform: scale(1.1) rotate(90deg);
  box-shadow: 0 12px 32px rgba(37, 99, 235, 0.5);
}

.mobile-fab i {
  font-size: 24px;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4);
  }
  50% {
    box-shadow: 0 8px 32px rgba(37, 99, 235, 0.6);
  }
}

/* Show mobile elements on small screens */
@media (max-width: 767px) {
  .mobile-header {
    display: block;
  }

  .mobile-bottom-nav {
    display: block;
  }

  .mobile-fab {
    display: flex;
  }

  /* Hide desktop navbar */
  :deep(.user-navbar-shell),
  :deep(.customer-topbar),
  :deep(.site-header),
  :deep(.topbar) {
    display: none !important;
  }

  /* Add padding to main content */
  :deep(.customer-main),
  :deep(.vehicles-content),
  :deep(.bookings-page),
  :deep(.notification-screen__body),
  :deep(.profile-section) {
    padding-top: 60px !important;
    padding-bottom: 80px !important;
  }
}
</style>