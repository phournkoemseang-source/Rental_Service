<template>
  <div class="owner-notifications">
    <header class="owner-notifications__header">
      <div>
        <h1>Actions that need your attention</h1>
      </div>
      <div class="owner-notifications__header-actions">
        <div class="owner-notifications__unread-pill">
          <span class="unread-count">{{ unreadCountDisplay }}</span>
          <span class="unread-label">unread</span>
        </div>
      </div>
    </header>

    <div class="notification-tabs">
      <button
        v-for="tab in tabOptions"
        :key="tab.value"
        type="button"
        class="tab-pill"
        :class="{ active: activeTab === tab.value }"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <section class="notification-list">
      <template v-if="isLoading">
        <div class="empty-state">Loading notifications…</div>
      </template>
      <template v-else-if="error">
        <div class="empty-state error">{{ error }}</div>
      </template>
      <template v-else-if="!visibleNotifications.length">
        <div class="empty-state">
          No notifications yet. Once customers book, message, or cancel, you&apos;ll see the updates here.
        </div>
      </template>
      <template v-else>
        <article
          v-for="item in visibleNotifications"
          :key="item.id"
          class="notification-card"
          :class="{ unread: item.status === 'unread' }"
          @click="handleOwnerNotificationClick(item)"
          @dblclick.prevent="openReportForNotification(item)"
        >
          <header class="notification-card__top">
            <div class="notification-card__user">
              <div class="notification-card__avatar">
                <img
                  v-if="item.user?.avatar"
                  :src="item.user.avatar"
                  :alt="item.user?.name || 'Notification avatar'"
                />
                <span v-else>{{ item.user?.name?.charAt(0) || 'N' }}</span>
              </div>
              <div>
                <p class="notification-card__title">{{ formatNotificationTitle(item) }}</p>
                <p class="notification-card__subtitle">{{ item.message || 'No additional details' }}</p>
              </div>
            </div>
            <button class="toggle-read" type="button" @click.stop="toggleReadStatus(item.id)">
              {{ item.status === 'unread' ? 'Mark as read' : 'Mark as unread' }}
            </button>
          </header>

          <div class="notification-card__meta">
            <span>{{ formatRelativeTime(item.timestamp) }}</span>
            <span class="notification-card__duration">{{ formatWorkDuration(item.timestamp) }}</span>
          </div>

          
        </article>
        <button
          v-if="hasHiddenNotifications"
          type="button"
          class="see-more-btn"
          @click="showAllNotifications = !showAllNotifications"
        >
          {{ showAllNotifications ? 'See less' : 'See more' }}
        </button>
      </template>
    </section>

    <footer class="notification-footer">
      <button
        class="ghost-btn"
        type="button"
        @click="markAllAsRead(props.shopId)"
        :disabled="!filteredNotifications.length || isLoading"
      >
        See Past Notifications
      </button>
    </footer>
    <div v-if="replyModalVisible" class="reply-modal" role="dialog" aria-modal="true">
      <div class="reply-modal__panel">
        <header class="reply-modal__header">
          <div>
            <p class="reply-modal__title">Reply to customer</p>
            <p class="reply-modal__subtitle">Send a quick response to keep them informed.</p>
          </div>
          <button type="button" class="icon-btn" @click="closeReplyModal">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            <span class="sr-only">Close</span>
          </button>
        </header>
        <div class="reply-modal__body">
          <label>
            <span>Subject</span>
            <input v-model="replySubject" type="text" placeholder="Subject" />
          </label>
          <label>
            <span>Message</span>
            <textarea v-model="replyBody" rows="4" placeholder="Type your reply here..."></textarea>
          </label>
        </div>
        <div class="reply-modal__actions">
          <button type="button" class="ghost-btn" :disabled="isSendingReply" @click="closeReplyModal">Cancel</button>
          <button type="button" class="btn btn-primary" :disabled="isSendingReply" @click="sendReply">
            {{ isSendingReply ? 'Sending…' : 'Send reply' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNotifications } from '@/composables/useNotifications'
import { useToast } from '@/composables/useToast'
import api from '@/services/api'

const props = defineProps({
  shopId: {
    type: [String, Number],
    default: null
  }
})

const {
  notifications,
  unreadCount,
  isLoading,
  error,
  loadNotifications,
  toggleReadStatus,
  markAllAsRead
} = useNotifications()
const router = useRouter()

const toast = useToast()

const tabOptions = [
  { label: 'All', value: 'all' },
  { label: 'Comments', value: 'message' },
  { label: 'Submitted For Review', value: 'booking' },
  { label: 'Discount', value: 'coupon' },
  { label: 'Payments', value: 'payment' }
]

const activeTab = ref('all')
const showAllNotifications = ref(false)

const refreshNotifications = () => {
  loadNotifications(props.shopId).catch(() => {})
}

watch(
  () => props.shopId,
  () => {
    refreshNotifications()
  },
  { immediate: true }
)

const filteredNotifications = computed(() => {
  let base = notifications.value || []
  if (props.shopId) {
    base = base.filter((item) => String(item.shopId) === String(props.shopId))
  }
  if (activeTab.value !== 'all') {
    base = base.filter((item) => item.type === activeTab.value)
  }
  return base
})

const recentNotifications = computed(() => {
  const cutoff = Date.now() - (24 * 60 * 60 * 1000)
  return filteredNotifications.value.filter((item) => {
    const timestamp = Number(new Date(item.timestamp))
    if (!Number.isFinite(timestamp)) return true
    return timestamp >= cutoff
  })
})

const visibleNotifications = computed(() => {
  if (showAllNotifications.value) return recentNotifications.value
  return recentNotifications.value.slice(0, 4)
})

const hasHiddenNotifications = computed(() => recentNotifications.value.length > 4)

const replyModalVisible = ref(false)
const replyTarget = ref(null)
const replySubject = ref('')
const replyBody = ref('')
const isSendingReply = ref(false)

const openReplyModal = (item) => {
  replyTarget.value = item
  replySubject.value = item?.action || ''
  replyBody.value = ''
  replyModalVisible.value = true
}

const closeReplyModal = () => {
  replyModalVisible.value = false
  replyTarget.value = null
  replySubject.value = ''
  replyBody.value = ''
}

const replyRecipientId = computed(() => {
  const target = replyTarget.value
  if (!target) return null
  return target.relatedSender?.id || target.user?.id || null
})

const sendReply = async () => {
  if (!replyRecipientId.value) {
    toast.error('Unable to determine recipient for this notification.')
    return
  }
  const body = String(replyBody.value || '').trim()
  if (!body) {
    toast.error('Message body cannot be empty.')
    return
  }
  const payload = {
    receiver_id: replyRecipientId.value,
    subject: replySubject.value || replyTarget.value?.action || 'Reply from shop owner',
    body,
    booking_id: replyTarget.value?.related?.id ?? null
  }
  isSendingReply.value = true
  try {
    await api.post('/messages', payload)
    toast.success('Reply sent to the customer.')
    closeReplyModal()
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to send reply.')
  } finally {
    isSendingReply.value = false
  }
}

const openBookingDetail = (item) => {
  const bookingId = item?.related?.id
  if (bookingId) {
    router.push({ name: 'booking', params: { id: bookingId } })
    return
  }
  router.push({ name: 'my-bookings' })
}

const openBookingList = () => {
  router.push({ name: 'my-bookings' })
}

const openDashboard = () => {
  router.push({ name: 'dashboard' })
}

const openNotificationCenter = () => {
  router.push({ name: 'shop-notifications' })
}

const normalizeTypeKey = (item) => {
  const raw = item.related?.type || item.type || ''
  const segments = raw.split('\\').filter(Boolean)
  const base = segments.length ? segments.at(-1) : raw
  return String(base || '').toLowerCase()
}

const resolveOwnerNotificationRoute = (item) => {
  const typeKey = normalizeTypeKey(item)
  const bookingId = item.related?.id
  if (typeKey === 'booking' && bookingId) {
    return { name: 'booking', params: { id: bookingId } }
  }
  if (typeKey === 'message') {
    return { name: 'dashboard', query: { section: 'messages' } }
  }
  if (typeKey === 'payment') {
    return { name: 'shop-report', query: { reportType: 'payment' } }
  }
  return null
}

const handleOwnerNotificationClick = (item) => {
  const target = resolveOwnerNotificationRoute(item)
  if (target) {
    router.push(target)
  } else {
    openReportForNotification(item)
  }
}

const openReportForNotification = (item) => {
  if (!props.shopId) return
  const focus = String(item?.type || 'general').trim().toLowerCase()
  router.push({
    name: 'shop-report',
    query: {
      reportType: focus
    }
  })
}

const getActionButtons = (item) => {
  const buttons = []
  if (item.type === 'booking') {
    buttons.push({
      label: 'View booking',
      variant: 'primary',
      handler: () => openBookingDetail(item)
    })
    return buttons
  }
  if (item.type === 'message') {
    buttons.push({
      label: 'Open dashboard',
      variant: 'primary',
      handler: openDashboard
    })
    buttons.push({
      label: 'Reply',
      variant: 'secondary',
      handler: () => openReplyModal(item)
    })
    return buttons
  }
  buttons.push({
    label: 'View notification',
    variant: 'primary',
    handler: openNotificationCenter
  })
  return buttons
}

const formatNotificationTitle = (item) => {
  const verbMap = {
    booking: 'has pushed',
    message: 'has commented on',
    general: 'shared'
  }
  const verb = verbMap[item.type] || 'sent'
  return `${item.user?.name || 'Someone'} ${verb} ${item.action || 'an update'}`
}

const unreadCountDisplay = computed(() => {
  const count = unreadCount.value || 0
  return count > 9 ? '9+' : String(count)
})

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Just now'
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

const formatWorkDuration = (timestamp) => {
  if (!timestamp) return 'Worked 0M'
  const diff = Math.max(0, Date.now() - new Date(timestamp).getTime())
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const parts = []
  if (days) parts.push(`${days}D`)
  if (hours) parts.push(`${hours}H`)
  if (minutes) parts.push(`${minutes}M`)
  if (!parts.length) return 'Worked 0M'
  return `Worked ${parts.join(' ')}`
}

watch(
  filteredNotifications,
  () => {
    if (showAllNotifications.value && filteredNotifications.value.length <= 4) {
      showAllNotifications.value = false
    }
  },
  { deep: true }
)
</script>

<style scoped>
.owner-notifications {
  min-height: 100vh;
  padding: 24px 20px;
  background: #f4f7fb;
  color: #0f172a;
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.owner-notifications__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.owner-notifications__eyebrow {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 600;
}

.owner-notifications__header h1 {
  margin: 0.25rem 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.owner-notifications__subhead {
  margin: 0;
  max-width: 520px;
  color: #475569;
  font-size: 0.82rem;
  line-height: 1.45;
}

.owner-notifications__header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.owner-notifications__unread-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 14px;
  border-radius: 10px;
  background: #2563eb;
  color: #fff;
  font-weight: 700;
  font-size: 0.8rem;
}

.owner-notifications__unread-pill .unread-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin: 0;
}

.owner-notifications__unread-pill .unread-count {
  font-size: 1.1rem;
  line-height: 1;
}

.notification-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tab-pill {
  border-radius: 999px;
  border: 1px solid transparent;
  background: #f1f5f9;
  padding: 6px 14px;
  font-weight: 600;
  font-size: 0.78rem;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-pill.active {
  background: #ffffff;
  color: #1d4ed8;
  border-color: #bfdbfe;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.see-more-btn {
  align-self: center;
  border: none;
  background: transparent;
  color: #2563eb;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 6px 10px;
}

.see-more-btn:hover {
  text-decoration: underline;
}

.reply-modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
  padding: 20px;
}

.reply-modal__panel {
  width: min(520px, 100%);
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.3);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reply-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.reply-modal__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.reply-modal__subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 0.8rem;
}

.reply-modal__body label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.reply-modal__body input,
.reply-modal__body textarea {
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  padding: 9px 12px;
  font-family: inherit;
  font-size: 0.88rem;
  background: #f8fafc;
  resize: vertical;
}

.reply-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.empty-state {
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 28px;
  text-align: center;
  font-size: 0.82rem;
  color: #475569;
  font-weight: 600;
}

.empty-state.error {
  border-color: #fecaca;
  color: #9f1239;
}

.notification-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.notification-card.unread {
  border-color: #bfdbfe;
  background: #f8fafc;
}

.notification-card__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}

.notification-card__user {
  display: flex;
  gap: 12px;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
}

.notification-card__avatar {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: #eef2ff;
  display: grid;
  place-items: center;
  font-weight: 700;
  color: #312e81;
  font-size: 1rem;
  flex-shrink: 0;
}

.notification-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
}

.notification-card__title {
  margin: 0;
  font-weight: 600;
  font-size: 0.88rem;
  color: #0f172a;
  line-height: 1.35;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.notification-card__subtitle {
  margin: 3px 0 0;
  color: #475569;
  font-size: 0.78rem;
  line-height: 1.4;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.toggle-read {
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  padding: 4px 12px;
  font-weight: 600;
  font-size: 0.72rem;
  color: #1d4ed8;
  cursor: pointer;
  align-self: flex-start;
  transition: border-color 0.15s ease;
}

.toggle-read:hover {
  border-color: #2563eb;
}

.notification-card__meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px;
  align-items: center;
  color: #94a3b8;
  font-size: 0.75rem;
}

.notification-card__duration {
  color: #111827;
  font-weight: 600;
  font-size: 0.75rem;
}

.action-btn {
  border-radius: 10px;
  border: none;
  padding: 8px 14px;
  font-weight: 600;
  font-size: 0.82rem;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  min-width: 120px;
  text-align: center;
}

.action-btn.primary {
  background: #16a34a;
  color: #ffffff;
}

.action-btn.secondary {
  background: #eef2ff;
  color: #4338ca;
  border: 1px solid #c7d2fe;
}

.action-btn:hover {
  transform: translateY(-1px);
}

.notification-footer {
  display: flex;
  justify-content: center;
  margin-top: 6px;
}

.ghost-btn {
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  padding: 8px 22px;
  font-weight: 600;
  font-size: 0.82rem;
  color: #0f172a;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.ghost-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.ghost-btn:not(:disabled):hover {
  border-color: #2563eb;
}

/* ─── Icon Button (for reply modal close) ────────────────────── */
.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 0.9rem;
}

.icon-btn:hover {
  border-color: #2563eb;
  color: #2563eb;
}

/* ─── Screen Reader Only ─────────────────────────────────────── */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

@media (max-width: 960px) {
  .owner-notifications {
    padding: 20px;
  }

  .owner-notifications__header {
    flex-direction: column;
  }

  .owner-notifications__header-actions {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 640px) {
  .owner-notifications {
    padding: 16px;
  }

  .notification-card__top {
    flex-direction: column;
    align-items: flex-start;
  }

  .notification-card__meta {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
