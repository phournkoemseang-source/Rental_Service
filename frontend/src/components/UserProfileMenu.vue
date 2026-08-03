<script setup>
import { computed, ref, onMounted, onBeforeUnmount, useAttrs } from 'vue'
import { useRouter } from 'vue-router'
import { userService } from '@/services/database.js'

const props = defineProps({
  settingsRoute: {
    type: String,
    default: '/user/profile'
  },
  logoutRedirect: {
    type: String,
    default: '/login'
  }
})

const emit = defineEmits(['settings', 'logout'])
const attrs = useAttrs()
const router = useRouter()
const profileMenuRef = ref(null)
const isProfileMenuOpen = ref(false)
const avatarLoadFailed = ref(false)
const showLogoutConfirm = ref(false)
const currentUserState = ref(userService.getCurrentUser())

const refreshCurrentUser = () => {
  currentUserState.value = userService.getCurrentUser()
  avatarLoadFailed.value = false
}

const currentUser = computed(() => currentUserState.value)
const userDisplayName = computed(() => currentUser.value?.name ?? '')
const userEmail = computed(() => currentUser.value?.email || '')
const userRoleLabel = computed(() => {
  const roleValue = currentUser.value?.role || 'customer'
  return String(roleValue)
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ')
})

const normalizeAvatarUrl = (url) => {
  if (!url) return ''
  if (/^(https?:\/\/|data:|blob:)/i.test(url)) return url
  const normalized = String(url).replace(/\\/g, '/').replace(/^\/+/, '')
  if (normalized.startsWith('storage/')) return `/${normalized}`
  return `/storage/${normalized}`
}

const userAvatarUrl = computed(() => {
  if (avatarLoadFailed.value) return ''
  const src = currentUser.value?.avatar_url || currentUser.value?.profile_picture || currentUser.value?.img_url || ''
  return normalizeAvatarUrl(src)
})

const userInitials = computed(() => {
  const words = userDisplayName.value.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase()
})

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

const handleSettingsClick = () => {
  closeProfileMenu()
  emit('settings')
  if (!attrs.onSettings) {
    router.push(props.settingsRoute)
  }
}

const defaultLogout = async () => {
  await userService.logout()
  localStorage.removeItem('auth_token')
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push(props.logoutRedirect)
}

const requestLogoutConfirmation = () => {
  showLogoutConfirm.value = true
}

const cancelLogout = () => {
  showLogoutConfirm.value = false
}

const confirmLogout = async () => {
  showLogoutConfirm.value = false
  closeProfileMenu()
  emit('logout')
  if (!attrs.onLogout) {
    await defaultLogout()
  }
}

const onAvatarError = () => {
  avatarLoadFailed.value = true
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  window.addEventListener('user-updated', refreshCurrentUser)
  window.addEventListener('storage', refreshCurrentUser)
  refreshCurrentUser()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  window.removeEventListener('user-updated', refreshCurrentUser)
  window.removeEventListener('storage', refreshCurrentUser)
})
</script>


<template>
  <div class="profile-menu-wrapper" ref="profileMenuRef">
    <button class="btn-reset profile-trigger" type="button" @click.stop="toggleProfileMenu">
      <span class="avatar-circle">
        <img v-if="userAvatarUrl" :src="userAvatarUrl" alt="Profile photo" class="avatar-image" @error="onAvatarError" />
        <span v-else>{{ userInitials }}</span>
      </span>
      <span class="profile-trigger-name">{{ userDisplayName }}</span>
      <i class="fa-solid" :class="isProfileMenuOpen ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
    </button>
    <div v-if="isProfileMenuOpen" class="profile-dropdown">
      <div class="profile-badge">
        <div class="profile-avatar">
          <img v-if="userAvatarUrl" :src="userAvatarUrl" alt="Profile photo" class="avatar-image" @error="onAvatarError" />
          <span v-else>{{ userInitials }}</span>
        </div>
        <div class="profile-texts">
          <strong>{{ userDisplayName }}</strong>
          <span class="profile-role">{{ userRoleLabel }}</span>
          <p v-if="userEmail" class="profile-email">{{ userEmail }}</p>
        </div>
      </div>
      <div class="profile-actions">
        <button class="btn-reset profile-action" type="button" @click="handleSettingsClick">
          <i class="fa-solid fa-gear" aria-hidden="true"></i>
          <span>{{ $t('shopSettings') }}</span>
        </button>
        <button class="btn-reset profile-action" type="button" @click="requestLogoutConfirmation">
          <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
          <span>{{ $t('logout') }}</span>
        </button>
      </div>
    </div>
    <div v-if="showLogoutConfirm" class="logout-confirm-overlay" @click.self="cancelLogout">
      <div class="logout-confirm-card">
        <div class="logout-icon-wrapper">
          <i class="fa-solid fa-right-to-bracket"></i>
        </div>
        <p class="logout-title">{{ $t('logout') }}</p>
        <p class="logout-message">{{ $t('confirmLogout') }}</p>
        <div class="logout-actions">
          <button class="btn-reset logout-action cancel" type="button" @click="cancelLogout">{{ $t('no') }}</button>
          <button class="btn-reset logout-action confirm" type="button" @click="confirmLogout">{{ $t('yes') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-reset {
  border: none;
  background: transparent;
  font: inherit;
  color: inherit;
  cursor: pointer;
  padding: 0;
}

.profile-menu-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.avatar-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-trigger {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.9rem;
  justify-content: center;
  padding: 0 0.5rem;
  border-radius: 999px;
  background: transparent;
}

.profile-trigger-name {
  max-width: 160px;
  font-size: 0.98rem;
  font-weight: 800;
  color: #33435d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-trigger i {
  font-size: 0.75rem;
  color: #1f2937;
}

.profile-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 0.75rem);
  width: 260px;
  border-radius: 18px;
  background: #fefefe;
  border: 1px solid rgba(15, 23, 42, 0.12);
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.15);
  padding: 1.25rem 1.35rem;
  z-index: 150;
  overflow: hidden;
}

.profile-badge {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-bottom: 0.75rem;
}

.profile-dropdown::after {
  content: '';
  position: absolute;
  top: -10px;
  right: 26px;
  width: 18px;
  height: 18px;
  background: #fefefe;
  border-left: 1px solid rgba(15, 23, 42, 0.12);
  border-top: 1px solid rgba(15, 23, 42, 0.12);
  transform: rotate(45deg);
  box-shadow: -2px -2px 5px rgba(15, 23, 42, 0.05);
}


.profile-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid #e0e7ff;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.profile-texts strong {
  display: block;
  font-size: 1rem;
  color: #111827;
  margin-bottom: 0.15rem;
}

@media (max-width: 640px) {
  .profile-trigger-name {
    max-width: 120px;
    font-size: 0.9rem;
  }
}

.profile-role {
  display: block;
  font-size: 0.85rem;
  color: #6b7280;
}

.profile-email {
  margin: 0;
  font-size: 0.8rem;
  color: #94a3b8;
}

.profile-actions {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.profile-action {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  border-radius: 12px;
  padding: 0.65rem 0.35rem;
  font-weight: 600;
  color: #1f2937;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.profile-action i {
  color: #395ea6;
}

.profile-action:hover {
  background: #f8fafc;
}

.logout-confirm-card {
  margin: 0 auto;
  padding: 2.25rem 2.5rem;
  border-radius: 28px;
  background: #ffffff;
  box-shadow: 0 25px 60px rgba(15, 23, 42, 0.25);
  text-align: center;
  width: min(360px, 90vw);
}

.logout-icon-wrapper {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  margin: 0 auto 1.1rem;
  display: grid;
  place-items: center;
  background: #ffece5;
  color: #f97316;
  font-size: 1.6rem;
  box-shadow: inset 0 0 0 2px rgba(249, 115, 22, 0.2);
}

.logout-title {
  margin: 0;
  font-size: 1.65rem;
  font-weight: 700;
  color: #111827;
}

.logout-message {
  margin: 0.35rem 0 1.7rem;
  color: #475569;
  font-size: 0.95rem;
  line-height: 1.4;
}

.logout-actions {
  display: flex;
  gap: 0.9rem;
  justify-content: center;
}

.logout-action {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.95rem;
  transition: transform 0.15s ease;
}

.logout-action.cancel {
  border: 1px solid #d1d5db;
  background: #fff;
  color: #374151;
}

.logout-action.confirm {
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #fff;
}

.logout-action:hover {
  transform: translateY(-1px);
}

.logout-confirm-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(15, 23, 42, 0.35);
  min-height: 100vh;
  z-index: 400;
}
</style>
