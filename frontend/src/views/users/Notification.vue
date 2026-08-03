<template>
  <MobileCustomerLayout :show-back="false" :show-fab="false">
    <div class="notification-screen">
      <UserNavbar
        :nav-items="navItems"
        :show-back="false"
        :show-fallback-message="false"
        @logout-request="handleLogout"
      />

    <main class="notification-screen__body">
      <section class="notification-shell">
        <header class="notification-shell__header">
          <div>
            <p class="notification-shell__eyebrow">{{ $t('notifications') }}</p>
            <h1>{{ $t('notificationCenter') }}</h1>
          </div>
          <div class="notification-shell__meta">
            <span>{{ unreadCount }} unread</span>
          </div>
        </header>

        <div class="notification-shell__filters">
          <button
            v-for="option in filterOptions"
            :key="option.value"
            :class="['filter-pill', { active: activeFilter === option.value }]"
            type="button"
            @click="activeFilter = option.value"
          >
            {{ option.label }}
          </button>
        </div>

    <div class="notification-list">
          <div v-if="isLoading" class="notification-list__state">{{ $t('loadingNotifications') }}</div>
          <div v-else-if="error" class="notification-list__state notification-list__state--error">
            {{ error }}
          </div>
          <template v-else>
            <article
              v-for="item in displayedNotifications"
              :key="item.id"
              :class="['notification-row', { unread: item.status === 'unread' }]"
              @click="handleNotificationClick(item)"
            >
              <img :src="item.user.avatar" :alt="item.user.name" class="notification-row__avatar" />
              <div class="notification-row__content">
                <div class="notification-row__heading">
                  <p class="notification-row__title">
                    <span class="notification-row__name">{{ item.user.name }}</span>
                    {{ item.action }}
                  </p>
                </div>
                <p class="notification-row__message">{{ item.message }}</p>
                <div class="notification-row__footer">
                  <span>{{ formatRelativeTime(item.timestamp) }}</span>
                <button class="link-btn" type="button" @click.stop="toggleReadStatus(item.id)">
                    {{ item.status === 'unread' ? 'Mark as read' : 'Mark as unread' }}
                  </button>
                </div>
              </div>
              <span class="notification-row__dot" :class="{ unread: item.status === 'unread' }" />
            </article>
            <p v-if="!filteredNotifications.length" class="notification-list__empty">{{ $t('nothingNewHereYetStartABookingOrSendAMessageToSeeUpdates') }}</p>
            <div v-if="canToggleView" class="notification-list__actions">
              <button type="button" class="link-btn" @click="toggleNotificationView">
                {{ showAllNotifications ? 'See less' : 'See more' }}
              </button>
            </div>
          </template>
        </div>

  </section>
</main>


  <div
    v-if="detailModalVisible"
    class="notification-detail-dialog"
    role="dialog"
    aria-modal="true"
    @click.self="closeDetailModal"
  >
    <div class="notification-detail-dialog__panel">
      <header class="notification-detail-dialog__header">
        <div>
          <p class="notification-detail-dialog__title">{{ detailNotificationInfo.subject }}</p>
          <p class="notification-detail-dialog__subtitle">{{ detailNotificationInfo.subtitle }}</p>
        </div>
        <button class="icon-btn notification-detail-dialog__close" type="button" @click="closeDetailModal">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          <span class="sr-only">{{ $t('close') }}</span>
        </button>
      </header>
      <div class="notification-detail-dialog__meta">
        <span>{{ formatFullDate(detailNotificationInfo.timestamp) }}</span>
        <span>{{ detailNotificationInfo.categoryLabel }}</span>
      </div>
      <p class="notification-detail-dialog__body">{{ detailNotificationInfo.body || 'No additional details provided.' }}</p>
    </div>
  </div>

      <CommonFooter />
    </div>
  </MobileCustomerLayout>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { userService } from '@/services/database.js'
import UserNavbar from '@/components/UserNavbar.vue'
import MobileCustomerLayout from '@/components/MobileCustomerLayout.vue'
import CommonFooter from '@/components/CommonFooter.vue'
import { useNotifications } from '@/composables/useNotifications'
import { navigateFromNotification } from '@/utils/notificationNavigation'
import '@/css/customer-responsive.css'

const router = useRouter()

const navItems = [
  { label: 'Home', route: '/view_shop' },
  { label: 'My Bookings', route: '/my-bookings' },
  { label: 'Profile', route: '/user/profile' }
]

const handleLogout = async () => {
  await userService.logout()
  router.push('/login')
}

const filterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' }
]

const activeFilter = ref('all')
const {
  notifications,
  unreadCount,
  isLoading,
  error,
  loadNotifications,
  toggleReadStatus,
  markAllAsRead
} = useNotifications()

const hasUnread = computed(() => unreadCount.value > 0)

onMounted(() => {
  loadNotifications()
})

const detailModalVisible = ref(false)
const detailNotification = ref(null)

const detailNotificationInfo = computed(() => {
  const item = detailNotification.value
  if (!item) {
    return {
      subject: '',
      subtitle: '',
      body: '',
      timestamp: null,
      categoryLabel: ''
    }
  }

  return {
    subject: item.detailSubject || item.action || 'Notification',
    subtitle: `From ${item.user?.name || 'a user'}`,
    body: item.detailBody || item.message || '',
    timestamp: item.timestamp,
    categoryLabel: item.type || 'general'
  }
})

const handleNotificationClick = async (item) => {
  if (!item) return
  if (item.status === 'unread') {
    try {
      await toggleReadStatus(item.id)
    } catch (e) {
      console.error('Failed to mark notification as read', e)
    }
  }

  const navigated = navigateFromNotification(router, item)
  if (navigated) {
    detailModalVisible.value = false
    detailNotification.value = null
    return
  }

  detailNotification.value = item
  detailModalVisible.value = true
}

const closeDetailModal = () => {
  detailModalVisible.value = false
  detailNotification.value = null
}

const filteredNotifications = computed(() => {
  const list = notifications.value || []
  if (activeFilter.value === 'unread') {
    return list.filter((item) => item.status === 'unread')
  }
  return list
})

const MAX_VISIBLE_NOTIFICATIONS = 4
const showAllNotifications = ref(false)

const displayedNotifications = computed(() => {
  if (showAllNotifications.value) return filteredNotifications.value
  return filteredNotifications.value.slice(0, MAX_VISIBLE_NOTIFICATIONS)
})

const canToggleView = computed(() => filteredNotifications.value.length > MAX_VISIBLE_NOTIFICATIONS)

const toggleNotificationView = () => {
  showAllNotifications.value = !showAllNotifications.value
}


watch(filteredNotifications, () => {
  if (showAllNotifications.value && filteredNotifications.value.length <= MAX_VISIBLE_NOTIFICATIONS) {
    showAllNotifications.value = false
  }
})

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return ''
  const now = Date.now()
  const target = new Date(timestamp).getTime()
  const diffMs = now - target
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const formatFullDate = (timestamp) => {
  if (!timestamp) return ''
  const value = new Date(timestamp)
  return value.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

</script>

<style scoped>
.notification-screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f4f7fb;
  overflow: hidden;
}

.notification-screen__body {
  flex: 1;
  padding: 24px 20px;
}

.notification-shell {
  max-width: 960px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.notification-shell__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.notification-shell__eyebrow {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 600;
}

.notification-shell__header h1 {
  margin: 6px 0 0;
  font-size: 1.25rem;
  color: #0f172a;
  font-weight: 700;
}

.notification-shell__filters {
  display: flex;
  gap: 8px;
}

.filter-pill {
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  padding: 6px 14px;
  background: #fff;
  color: #475569;
  font-weight: 600;
  font-size: 0.78rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-pill.active {
  background: #2563eb;
  color: #fff;
  border-color: transparent;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notification-list__actions {
  display: flex;
  justify-content: center;
}

.notification-list__state {
  padding: 12px;
  border-radius: 12px;
  background: #f8fafc;
  color: #475569;
  font-size: 0.82rem;
  text-align: center;
}

.notification-list__state--error {
  background: #fee2e2;
  color: #7f1d1d;
}

.notification-row {
  display: grid;
  grid-template-columns: 44px 1fr 10px;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #f8fafc;
  align-items: center;
  position: relative;
  min-width: 0;
  border: 1px solid #e2e8f0;
}

.notification-row.unread {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.notification-row__avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  object-fit: cover;
}

.notification-row__content {
  background: #fff;
  border-radius: 12px;
  padding: 12px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid #f1f5f9;
}

.notification-row__heading {
  min-width: 0;
}

.notification-row__title {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 600;
  color: #111827;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  line-height: 1.35;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.notification-row__name {
  color: #2563eb;
  font-weight: 700;
}

.notification-row__message {
  margin: 0;
  color: #475569;
  font-size: 0.8rem;
  line-height: 1.4;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.notification-row__footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px;
  font-size: 0.72rem;
  color: #94a3b8;
  align-items: center;
}

.link-btn {
  background: none;
  border: none;
  color: #2563eb;
  font-weight: 600;
  font-size: 0.72rem;
  cursor: pointer;
}


.notification-detail-dialog {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 70;
}

.notification-detail-dialog__panel {
  background: #fff;
  border-radius: 16px;
  width: min(520px, 100%);
  padding: 1.25rem;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.35);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.notification-detail-dialog__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.notification-detail-dialog__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.notification-detail-dialog__subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  color: #6b7280;
}

.notification-detail-dialog__meta {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: #475569;
}

.notification-detail-dialog__body {
  margin: 0;
  line-height: 1.5;
  color: #111827;
  white-space: pre-wrap;
  font-size: 0.88rem;
}

.notification-detail-dialog__close {
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 1rem;
  padding: 0;
  cursor: pointer;
}

.notification-row__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(99, 102, 241, 0.5);
}

.notification-row__dot.unread {
  background: #a855f7;
}

.notification-list__empty {
  text-align: center;
  color: #94a3b8;
  margin: 12px 0;
  font-size: 0.82rem;
}

.notification-shell__footer {
  display: flex;
  gap: 10px;
}

.mark-read,
.view-all {
  flex: 1;
  border-radius: 10px;
  padding: 10px 0;
  font-weight: 600;
  font-size: 0.82rem;
  border: none;
  cursor: pointer;
}

.mark-read {
  background: #fff;
  border: 1px solid #cbd5e1;
  color: #2563eb;
}

.mark-read:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.view-all {
  background: #2563eb;
  color: #fff;
  text-align: center;
  text-decoration: none;
}

.notification-shell__meta {
  font-size: 0.8rem;
  color: #94a3b8;
}

@media (max-width: 860px) {
  .notification-shell {
    padding: 20px;
  }

  .notification-row {
    grid-template-columns: 40px 1fr 8px;
  }

  .notification-row__avatar {
    width: 40px;
    height: 40px;
  }
}

@media (max-width: 640px) {
  .notification-shell__filters {
    flex-direction: column;
  }

  .notification-shell__header {
    flex-direction: column;
  }

  .notification-shell__footer {
    flex-direction: column;
  }

  .notification-row {
    grid-template-columns: 1fr;
  }

  .notification-row__dot {
    display: none;
  }
}
</style>
