<template>
  <section class="admin-notifications-page">
    <header class="admin-notifications-page__header">
      <div>
        <p class="eyebrow">Notifications</p>
        <h1>System activity</h1>
        <p class="subhead">
          Receive real-time updates when users register, shops go live, or reports land so you can manage the
          platform with confidence.
        </p>
      </div>
      <div class="admin-notifications-page__header-actions">
        <div class="unread-pill" aria-live="polite">
          <span class="unread-pill__count">{{ unreadCountLabel }}</span>
        </div>
      </div>
    </header>

    <div class="admin-notifications-page__toolbar">
      <div class="notification-search">
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <input
          v-model="searchText"
          class="notification-search__input"
          type="search"
          placeholder="Search notifications (title, message, type)"
        />
        <button v-if="hasSearchTerm" type="button" class="ghost-pill ghost-pill--mini" @click="clearSearch">
          Clear
        </button>
      </div>
      <button
        type="button"
        class="ghost-pill ghost-pill--mini"
        :class="{ active: showRecentOnly }"
        @click="toggleRecentView"
      >
        {{ showRecentOnly ? 'Showing last 24h' : 'Showing full history' }}
      </button>
    </div>

    <div class="admin-notifications-page__tabs">
      <div class="category-filters">
        <span class="category-filters__label">Filter</span>
        <button
          v-for="option in categoryFilters"
          :key="option.value"
          type="button"
          class="category-chip"
          :class="{ active: activeCategory === option.value }"
          @click="activeCategory = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div class="admin-notifications-page__list">
      <template v-if="isLoading">
        <div class="empty-state">Loading notifications…</div>
      </template>
      <template v-else-if="error">
        <div class="empty-state error">{{ error }}</div>
      </template>
      <template v-else-if="!filteredNotifications.length">
        <div class="empty-state">
          No notifications yet. Once the platform registers a user, creates a shop, or receives a report, the
          activity appears here.
        </div>
      </template>
      <template v-else>
        <article
          v-for="item in displayedNotifications"
          :key="item.id"
          class="notification-card"
          :class="[{ unread: item.status === 'unread' }, 'notification-card--clickable']"
          @click="handleNotificationClick(item)"
          @dblclick.prevent="openNotificationDetail(item)"
        >
          <div class="notification-card__avatar">
            <img v-if="item.user?.avatar" :src="item.user.avatar" :alt="`${senderName(item)} avatar`" />
            <span v-else>{{ getInitials(senderName(item)) }}</span>
            <span v-if="item.status === 'unread'" class="status-dot" />
          </div>
          <div class="notification-card__body">
            <p class="notification-card__title">Notification from {{ senderName(item) }}</p>
            <p class="notification-card__text">{{ notificationDetailText(item) }}</p>
            <div class="notification-card__meta">
              <span>{{ formatRelativeTime(item.timestamp) }}</span>
            </div>
          </div>
        </article>
          </template>
          <div v-if="canToggleView" class="notification-list__actions">
            <button type="button" class="ghost-pill" @click="toggleNotificationView">
              {{ showAllNotifications ? 'See less' : 'See more' }}
            </button>
          </div>
        </div>
  </section>
  <div v-if="platformPopupVisible" class="platform-popup" role="dialog" aria-modal="true">
    <div class="platform-popup__panel">
      <header class="platform-popup__header">
        <div>
          <p class="platform-popup__title">Share platform updates</p>
          <p class="platform-popup__subtitle">Send a direct message to the selected recipient.</p>
        </div>
        <button class="icon-btn platform-popup__close" type="button" @click="handlePlatformCancel">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          <span class="sr-only">Close</span>
        </button>
      </header>
      <p class="platform-popup__summary">
        Choose whether to notify a specific user or a shop owner, then pick the recipient from the list. If
        you want to send a ping to multiple recipients, repeat the action for each one.
      </p>
      <div class="platform-popup__selectors">
        <div class="platform-popup__selector-card">
          <span class="platform-popup__selector-label">Recipient type</span>
          <select v-model="platformTargetType" class="platform-popup__select">
            <option value="user">User</option>
            <option value="shop">Shop owner</option>
          </select>
          <span class="platform-popup__selector-hint">
            Selecting “Shop owner” lets you notify a specific shop instead of a single account.
          </span>
        </div>
        <div class="platform-popup__selector-card">
          <span class="platform-popup__selector-label">Recipient</span>
          <select
            id="platform-recipient-popup"
            v-model="platformSelectedKey"
            :disabled="!platformOptionsForType.length"
            class="platform-popup__select"
          >
            <option value="" disabled>Select recipient</option>
            <option
              v-for="recipient in platformOptionsForType"
              :key="`${recipient.type}-${recipient.id}`"
              :value="`${recipient.type}:${recipient.id}`"
            >
              {{ recipient.label }}
            </option>
          </select>
          <span class="platform-popup__selector-hint">
            {{ platformOptionsForType.length ? 'Use the dropdown to find the right recipient.' : 'No recipients available yet.' }}
          </span>
        </div>
      </div>
      <label class="platform-popup__field">
        <span>Title</span>
        <input
          v-model="platformTitle"
          type="text"
          maxlength="128"
          placeholder="E.g. Welcome to the platform"
        />
        <small class="platform-popup__helper">Keep it short—aim for 5-7 words so recipients can scan quickly.</small>
      </label>
      <label class="platform-popup__field">
        <span>Message</span>
        <textarea
          v-model="platformMessage"
          rows="4"
          placeholder="Enter the details you want to share."
        ></textarea>
        <small class="platform-popup__helper">Share the key updates and next steps; recipients will see this in their inbox.</small>
      </label>
      <div class="platform-popup__actions">
        <button
          type="button"
          class="ghost-pill platform-popup__cancel"
          :disabled="isSendingInfo"
          @click="handlePlatformCancel"
        >
          Cancel
        </button>
        <button
          type="button"
          class="primary-pill platform-popup__send"
          :disabled="!canSendPlatformMessage || isSendingInfo"
          @click="handlePlatformSendClick"
        >
          {{ isSendingInfo ? 'Sending…' : 'Send' }}
        </button>
      </div>
    </div>
  </div>
  <div
    v-if="detailModalVisible"
    class="notification-detail-modal"
    role="dialog"
    aria-modal="true"
    @click.self="closeDetailModal"
  >
    <div class="notification-detail-modal__panel">
      <header class="notification-detail-modal__header">
        <div>
          <p class="notification-detail-modal__title">{{ detailNotificationInfo.subject }}</p>
          <p class="notification-detail-modal__subtitle">
            Message from {{ detailNotificationInfo.senderName }}
          </p>
        </div>
        <button class="icon-btn notification-detail-modal__close" type="button" @click="closeDetailModal">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          <span class="sr-only">Close</span>
        </button>
      </header>
      <div class="notification-detail-modal__meta">
        <span>{{ formatFullDate(detailNotificationInfo.timestamp) }}</span>
        <span>{{ detailNotificationInfo.categoryLabel }}</span>
      </div>
      <p class="notification-detail-modal__body">{{ detailNotificationInfo.body || 'No additional details provided.' }}</p>
      <div class="notification-detail-modal__extras">
        <div class="detail-extra-card">
          <span class="detail-extra-label">Type</span>
          <strong>{{ notificationContextInfo(detailNotification.value).badge }}</strong>
        </div>
        <div class="detail-extra-card">
          <span class="detail-extra-label">Context</span>
          <p>{{ notificationContextInfo(detailNotification.value).body }}</p>
        </div>
      </div>
      <div class="notification-detail-modal__actions">
        <button
          class="primary-pill notification-detail-modal__goto"
          type="button"
          @click="handleNotificationClick(detailNotification.value)"
        >
          View related data
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNotifications } from '@/composables/useNotifications'
import { useToast } from '@/composables/useToast'
import api from '@/services/api'
import {
  categorizeNotificationType,
  getNotificationCategoryLabel,
  PLATFORM_CATEGORY_KEY,
  DISCOUNT_CATEGORY_KEY
} from '@/utils/notificationHelpers'
import { useAdminStore } from '@/stores/adminStore'
import { useRoute } from 'vue-router'

const toast = useToast()
const {
  notifications,
  unreadCount,
  isLoading,
  error,
  loadNotifications,
  toggleReadStatus
} = useNotifications()
const adminStore = useAdminStore()
const route = useRoute()
const router = useRouter()

const categoryFilters = [
  { label: 'All', value: 'all' },
  { label: 'Users', value: 'user' },
  { label: 'Shops', value: 'shop' },
  { label: 'Discount', value: DISCOUNT_CATEGORY_KEY },
  { label: 'Platform', value: PLATFORM_CATEGORY_KEY }
]

const activeCategory = ref('all')
const searchText = ref('')
const showRecentOnly = ref(true)
const platformTargetType = ref('user')
const platformSelectedKey = ref('')
const platformTitle = ref('')
const platformMessage = ref('')
const isSendingInfo = ref(false)
const platformPopupVisible = ref(false)
const detailModalVisible = ref(false)
const detailNotification = ref(null)

const detailNotificationInfo = computed(() => {
  const item = detailNotification.value
  if (!item) {
    return {
      senderName: '',
      subject: '',
      body: '',
      timestamp: null,
      categoryLabel: ''
    }
  }

  return {
    senderName: item.relatedSender?.name || item.user?.name || 'Sender',
    subject: item.detailSubject || item.action || 'Notification',
    body: item.detailBody || item.message || '',
    timestamp: item.timestamp,
    categoryLabel: getNotificationCategoryLabel(item.type)
  }
})

const notificationContextInfo = (item) => {
  if (!item) return { badge: 'General', body: item?.message || 'No details' }
  const typeKey = normalizeTypeKey(item)
  const shopLabel = item.shopId ? `Shop #${item.shopId}` : null
  const relatedLabel = item.related?.id ? `ID ${item.related.id}` : null
  switch (typeKey) {
    case 'payment':
      return {
        badge: 'Payment',
        body: `Payment notification${shopLabel ? ` for ${shopLabel}` : ''}${relatedLabel ? ` (${relatedLabel})` : ''}`,
      }
    case 'booking':
      return {
        badge: 'Booking',
        body: `Booking ${relatedLabel || ''} is mentioned${shopLabel ? ` for ${shopLabel}` : ''}`.trim(),
      }
    case 'message':
      return {
        badge: 'Message',
        body: 'New message thread, open the board to view chat',
      }
    case 'report':
      return {
        badge: 'Report',
        body: `Complaint related to ${shopLabel || 'a shop'}${relatedLabel ? ` (${relatedLabel})` : ''}`,
      }
    case 'shop':
      return {
        badge: 'Shop',
        body: `Shop update${shopLabel ? `: ${shopLabel}` : ''}`,
      }
    default:
      return {
        badge: item.type || 'General',
        body: item.message || 'Notification delivered',
      }
  }
}

const senderName = (item) =>
  item.relatedSender?.name || item.user?.name || 'System'

const notificationDetailText = (item) =>
  item.detailBody || item.message || item.action || 'No additional details provided.'

const getInitials = (value) => {
  const text = String(value || '').trim()
  if (!text) return 'S'
  const parts = text.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

const openNotificationDetail = (item) => {
  detailNotification.value = item
  detailModalVisible.value = true
}

const normalizeTypeKey = (item) => {
  const raw = item.related?.type || item.relatedModel?.type || item.type || ''
  const segments = raw.split('\\').filter(Boolean)
  const base = segments.length ? segments.at(-1) : raw
  return String(base || '').toLowerCase()
}

const resolveAdminNotificationRoute = (item) => {
  const typeKey = normalizeTypeKey(item)
  const targetId = item.related?.id || item.relatedModel?.id || item.related?.shop_id || ''
  const shopId = item.shopId || item.related?.shop_id || item.relatedModel?.shop_id
  switch (typeKey) {
    case 'booking':
      return { name: 'admin-bookings', query: { bookingId: targetId || '' } }
    case 'report':
    case 'damagereport':
      return { name: 'admin-reports', query: { reportId: targetId || '' } }
    case 'shop':
      return { name: 'admin-shops', query: { shopId: targetId || shopId || '' } }
    case 'payment':
      return { name: 'admin-financials', query: shopId ? { shopId } : {} }
    case 'user':
      return { name: 'admin-users', query: { userId: targetId || '' } }
    case 'message':
      return { name: 'admin-notifications' }
    default:
      return null
  }
}

const handleNotificationClick = (item) => {
  const target = resolveAdminNotificationRoute(item)
  if (target) {
    router.push(target)
  } else {
    openNotificationDetail(item)
  }
}

const closeDetailModal = () => {
  detailModalVisible.value = false
  detailNotification.value = null
}

const NEW_WINDOW_MS = 1000 * 60 * 60 * 24

const normalizedSearchTerm = computed(() => String(searchText.value || '').trim().toLowerCase())
const hasSearchTerm = computed(() => Boolean(normalizedSearchTerm.value))

const matchesSearch = (item) => {
  if (!normalizedSearchTerm.value) return true
  const haystack = `${item.action || ''} ${item.message || ''} ${item.type || ''}`
  return haystack.toLowerCase().includes(normalizedSearchTerm.value)
}

const discountKeywordRegex = /\b(?:discount|coupon|promo|promotion|offer|sale|deal)\b/i
const hasDiscountKeyword = (item) => {
  const haystack = `${item.action || ''} ${item.message || ''} ${item.title || ''} ${item.type || ''}`.toLowerCase()
  return discountKeywordRegex.test(haystack)
}

const isShopRelatedNotification = (item) => {
  const identifier = categorizeNotificationType(item.type)
  if (identifier === 'shop') return true
  const relatedType = String(item.related_type || '').toLowerCase()
  if (item.shop_id || relatedType.includes('shop')) return true
  if (String(item.role || '').toLowerCase().includes('shop')) return true
  return false
}

const isUserRelatedNotification = (item) => {
  const identifier = categorizeNotificationType(item.type)
  if (identifier === 'user') return true
  const relatedType = String(item.related_type || '').toLowerCase()
  if (item.user_id || relatedType.includes('user')) return true
  if (String(item.role || '').toLowerCase().includes('user')) return true
  return false
}

function matchesCategory(item) {
  if (activeCategory.value === 'all') return true
  const identifier = categorizeNotificationType(item.type)
  if (activeCategory.value === DISCOUNT_CATEGORY_KEY) {
    return identifier === DISCOUNT_CATEGORY_KEY || hasDiscountKeyword(item)
  }
  if (activeCategory.value === 'shop') {
    return isShopRelatedNotification(item)
  }
  if (activeCategory.value === 'user') {
    return isUserRelatedNotification(item)
  }
  return identifier === activeCategory.value
}

const unreadCountLabel = computed(() => {
  const unread = unreadCount.value || 0
  if (unread === 0) return 'You have no unread notifications'
  return unread === 1 ? '1 unread notification' : `${unread} unread notifications`
})

const MAX_VISIBLE_NOTIFICATIONS = 4
const showAllNotifications = ref(false)
const shouldHideOlder = computed(() => showRecentOnly.value && !hasSearchTerm.value)
const filteredNotifications = computed(() => {
  let list = notifications.value || []
  if (shouldHideOlder.value) {
    list = list.filter((item) => isWithinNewWindow(item.timestamp))
  }
  return list.filter((item) => matchesCategory(item) && matchesSearch(item))
})
const displayedNotifications = computed(() => {
  if (showAllNotifications.value) return filteredNotifications.value
  return filteredNotifications.value.slice(0, MAX_VISIBLE_NOTIFICATIONS)
})
const canToggleView = computed(
  () => filteredNotifications.value.length > MAX_VISIBLE_NOTIFICATIONS
)
const toggleNotificationView = () => {
  showAllNotifications.value = !showAllNotifications.value
}
watch(filteredNotifications, () => {
  if (showAllNotifications.value && filteredNotifications.value.length <= MAX_VISIBLE_NOTIFICATIONS) {
    showAllNotifications.value = false
  }
})

const canManageReadState = (item) => item?.role === 'admin'

function isWithinNewWindow(timestamp) {
  const value = Number(new Date(timestamp)) || 0
  return value > 0 && Date.now() - value <= NEW_WINDOW_MS
}

const isNewNotification = (item) => item.status === 'unread' && isWithinNewWindow(item.timestamp)

const formatRelativeTime = (timestamp) => {
  const value = Number(new Date(timestamp))
  if (!Number.isFinite(value)) return 'Just now'
  const diff = Date.now() - value
  if (diff < 60000) return 'Moments ago'
  if (diff < 3600000) return `${Math.round(diff / 60000)} min ago`
  if (diff < 86400000) return `${Math.round(diff / 3600000)} hr ago`
  return `${Math.round(diff / 86400000)} day${Math.round(diff / 86400000) === 1 ? '' : 's'} ago`
}

const formatFullDate = (timestamp) => {
  const value = Number(new Date(timestamp))
  if (!Number.isFinite(value)) return '—'
  return new Date(value).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

const platformRecipientOptions = computed(() => {
  const users = new Map()
  const shops = new Map()

  const ensureUserEntry = (entry) => {
    if (!entry?.id) return
    const id = Number(entry.id)
    if (!id || users.has(id)) return
    users.set(id, {
      id,
      type: 'user',
      label: entry.name || entry.title || `User #${id}`,
      secondary: entry.email || entry.message || ''
    })
  }

  const ensureShopEntry = (entry) => {
    if (!entry?.id) return
    const id = Number(entry.id)
    if (!id || shops.has(id)) return
    const ownerName = entry.owner?.name || entry.owner_name
    const displayTitle = ownerName ? `${ownerName} (${entry.name || `Shop #${id}`})` : entry.name || `Shop #${id}`
    shops.set(id, {
      id,
      type: 'shop',
      label: displayTitle,
      secondary: entry.message || entry.description || ''
    })
  }

  ;(notifications.value || []).forEach((item) => {
    const category = categorizeNotificationType(item.type)
    if (category === 'user') {
      ensureUserEntry({
        id: item.related?.id || item.user?.id || item.user_id,
        name: item.user?.name || item.action,
        email: item.user?.email,
        message: item.message
      })
    }
    if (category === 'shop') {
      ensureShopEntry({
        id: item.shopId || item.related?.id,
        name: item.action,
        owner_name: item.user?.name,
        description: item.message
      })
    }
  })

  ;(adminStore.state.users || []).forEach((user) => ensureUserEntry(user))
  ;(adminStore.state.shops || []).forEach((shop) => ensureShopEntry(shop))

  return {
    user: Array.from(users.values()),
    shop: Array.from(shops.values())
  }
})

const platformOptionsForType = computed(() => platformRecipientOptions.value[platformTargetType.value] || [])
const selectedPlatformRecipient = computed(() => {
  if (!platformSelectedKey.value) return null
  const [type, rawId] = platformSelectedKey.value.split(':')
  const pool = platformRecipientOptions.value[type] || []
  return pool.find((entry) => String(entry.id) === rawId) || null
})

watch(
  [() => platformTargetType.value, () => platformOptionsForType.value],
  ([type, options]) => {
    const pool = options || []
    platformSelectedKey.value = pool.length ? `${type}:${pool[0].id}` : ''
  },
  { immediate: true }
)

watch(
  () => platformRecipientOptions.value,
  () => {
    if (!platformOptionsForType.value.length) {
      platformSelectedKey.value = ''
    }
  }
)

const canSendPlatformMessage = computed(
  () => Boolean(selectedPlatformRecipient.value && platformTitle.value.trim() && platformMessage.value.trim())
)

const handlePlatformSendClick = async () => {
  if (!selectedPlatformRecipient.value) {
    toast.info('Select a recipient before sending an update.')
    return
  }
  const recipient = selectedPlatformRecipient.value
  const payload = {
    title: String(platformTitle.value || '').trim(),
    message: String(platformMessage.value || '').trim(),
    target: recipient.type === 'shop' ? 'shop_owner' : 'user'
  }
  if (recipient.type === 'shop') {
    payload.shop_id = recipient.id
  } else {
    payload.user_id = recipient.id
  }

  if (!payload.title || !payload.message) {
    toast.error('Please provide a title and message.')
    return
  }

  isSendingInfo.value = true
  try {
    await api.post('/notifications', payload)
    toast.success(`Information sent to ${recipient.label}.`)
    platformTitle.value = ''
    platformMessage.value = ''
    loadNotifications(null, { include_all: true })
    platformPopupVisible.value = false
    activeCategory.value = 'all'
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || 'Failed to send information.')
  } finally {
    isSendingInfo.value = false
  }
}

const handlePlatformReset = () => {
  platformTitle.value = ''
  platformMessage.value = ''
}

const handlePlatformCancel = () => {
  platformPopupVisible.value = false
  activeCategory.value = 'all'
  handlePlatformReset()
}

watch(
  () => activeCategory.value,
  (value) => {
    platformPopupVisible.value = value === PLATFORM_CATEGORY_KEY
    if (!platformPopupVisible.value) {
      handlePlatformReset()
    }
  }
)

const toggleRecentView = () => {
  showRecentOnly.value = !showRecentOnly.value
}

const clearSearch = () => {
  searchText.value = ''
  showRecentOnly.value = true
}

const refreshNotifications = () => loadNotifications(null, { include_all: true }).catch(() => {})

const handleToggleRead = async (item) => {
  if (!canManageReadState(item)) return
  try {
    await toggleReadStatus(item.id)
  } catch (err) {
    toast.error('Unable to change notification status.')
  }
}

onMounted(() => {
  adminStore.load().catch(() => {})
})

watch(
  () => route.name,
  (name) => {
    if (name === 'admin-notifications') {
      refreshNotifications()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.admin-notifications-page {
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.admin-notifications-page__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.eyebrow {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #6b7280;
  margin: 0 0 2px;
}

.admin-notifications-page__header h1 {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
  color: #111827;
}

.subhead {
  font-size: 0.78rem;
  color: #6b7280;
  margin: 2px 0 0;
  max-width: 32rem;
}

.admin-notifications-page__header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.unread-pill {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  padding: 4px 12px;
  font-weight: 600;
  font-size: 0.75rem;
  color: #374151;
  white-space: nowrap;
}

.unread-pill__count {
  color: #2563eb;
}

/* ─── Toolbar ────────────────────────────────────────────────── */
.admin-notifications-page__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.notification-search {
  flex: 1;
  min-width: 180px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e5e7eb;
  transition: border-color 0.15s ease;
}

.notification-search:focus-within {
  border-color: #2563eb;
}

.notification-search__input {
  border: none;
  flex: 1;
  font-size: 0.78rem;
  background: transparent;
  color: #1e293b;
}

.notification-search__input:focus {
  outline: none;
}

.notification-search i {
  color: #94a3b8;
  font-size: 0.75rem;
}

/* ─── Tabs / Filters ─────────────────────────────────────────── */
.admin-notifications-page__tabs {
  margin-bottom: 0;
}

.category-filters {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.category-filters__label {
  font-size: 0.7rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-right: 4px;
}

.category-chip {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.12s ease;
}

.category-chip:hover {
  border-color: #2563eb;
  color: #2563eb;
}

.category-chip.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #2563eb;
  font-weight: 600;
}

/* ─── Notification List ──────────────────────────────────────── */
.admin-notifications-page__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notification-list__actions {
  display: flex;
  justify-content: center;
  padding-top: 4px;
}

.notification-list__actions .ghost-pill {
  font-size: 0.75rem;
  padding: 5px 14px;
}

.empty-state {
  padding: 24px 16px;
  border-radius: 12px;
  background: #fff;
  text-align: center;
  color: #94a3b8;
  font-size: 0.82rem;
  border: 1px dashed #e2e8f0;
}

.empty-state.error {
  color: #dc2626;
  border-color: #fecaca;
}

/* ─── Notification Card ──────────────────────────────────────── */
.notification-card {
  background: #fff;
  border-radius: 10px;
  padding: 10px 14px;
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 10px;
  align-items: flex-start;
  border: 1px solid #f1f5f9;
  transition: all 0.15s ease;
}

.notification-card:hover {
  border-color: #e2e8f0;
  background: #fafbfc;
}

.notification-card.unread {
  border-color: #dbeafe;
  background: #f8faff;
}

.notification-card.unread:hover {
  border-color: #bfdbfe;
}

.notification-card--clickable {
  cursor: pointer;
}

.notification-card__avatar {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  background: #eef2ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.75rem;
  color: #1d4ed8;
  overflow: hidden;
  position: relative;
}

.notification-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}

.status-dot {
  position: absolute;
  top: 1px;
  right: 1px;
  width: 7px;
  height: 7px;
  background: #ef4444;
  border-radius: 50%;
  border: 1.5px solid #fff;
}

.notification-card__body {
  min-width: 0;
}

.notification-card__title {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.3;
}

.notification-card.unread .notification-card__title {
  font-weight: 700;
  color: #0f172a;
}

.notification-card__text {
  margin: 2px 0 0;
  color: #64748b;
  font-size: 0.75rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notification-card__meta {
  margin-top: 3px;
  font-size: 0.68rem;
  color: #94a3b8;
}

/* ─── Shared Buttons ─────────────────────────────────────────── */
.ghost-pill {
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  padding: 5px 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.72rem;
  color: #64748b;
  transition: all 0.12s ease;
  font-family: inherit;
}

.ghost-pill:hover:not(:disabled) {
  border-color: #2563eb;
  color: #2563eb;
}

.ghost-pill.active {
  background: #eff6ff;
  border-color: #2563eb;
  color: #2563eb;
}

.ghost-pill:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ghost-pill--mini {
  padding: 3px 10px;
  font-size: 0.68rem;
}

.primary-pill {
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 7px 16px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
  font-family: inherit;
}

.primary-pill:hover:not(:disabled) {
  background: #1d4ed8;
}

.primary-pill:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

/* ─── Platform Popup Modal ───────────────────────────────────── */
.platform-popup {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 65;
  padding: 16px;
}

.platform-popup__panel {
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  width: min(440px, 100%);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.25);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.platform-popup__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.platform-popup__title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: #111827;
}

.platform-popup__subtitle {
  margin: 2px 0 0;
  font-size: 0.75rem;
  color: #6b7280;
}

.platform-popup__close {
  border: none;
  background: transparent;
  font-size: 1rem;
  color: #94a3b8;
  padding: 2px;
  cursor: pointer;
  border-radius: 6px;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
}

.platform-popup__close:hover {
  background: #f1f5f9;
  color: #475569;
}

.platform-popup__summary {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0;
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  line-height: 1.4;
}

.platform-popup__selectors {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.platform-popup__selector-card {
  background: #fff;
  border-radius: 8px;
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.platform-popup__selector-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
  font-weight: 600;
}

.platform-popup__select {
  border: 1px solid #e2e8f0;
  font-size: 0.78rem;
  padding: 6px 8px;
  border-radius: 6px;
  background: #f8fafc;
  appearance: none;
  width: 100%;
  color: #1e293b;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394a3b8' fill='none' stroke-width='1.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 24px;
}

.platform-popup__select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.platform-popup__selector-hint {
  font-size: 0.65rem;
  color: #94a3b8;
  line-height: 1.3;
}

.platform-popup__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.platform-popup__field > span {
  font-size: 0.72rem;
  font-weight: 600;
  color: #64748b;
}

.platform-popup__field input,
.platform-popup__field textarea {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 0.82rem;
  font-family: inherit;
  background: #f8fafc;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.platform-popup__field input:focus,
.platform-popup__field textarea:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  background: #fff;
}

.platform-popup__field textarea {
  resize: vertical;
  min-height: 60px;
}

.platform-popup__helper {
  font-size: 0.68rem;
  color: #94a3b8;
  margin: 0;
}

.platform-popup__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  align-items: center;
  padding-top: 4px;
}

.platform-popup__actions button {
  padding: 6px 16px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.78rem;
}

.primary-pill.platform-popup__send {
  background: #2563eb;
  color: #fff;
  border: none;
}

.primary-pill.platform-popup__send:disabled {
  background: #93c5fd;
}

.ghost-pill.platform-popup__cancel {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.ghost-pill.platform-popup__cancel:hover:not(:disabled) {
  background: #fee2e2;
}

/* ─── Detail Modal ───────────────────────────────────────────── */
.notification-detail-modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 65;
  padding: 16px;
}

.notification-detail-modal__panel {
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  width: min(480px, 100%);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.3);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notification-detail-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.notification-detail-modal__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
}

.notification-detail-modal__subtitle {
  margin: 2px 0 0;
  font-size: 0.75rem;
  color: #6b7280;
}

.notification-detail-modal__close {
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 0.9rem;
  padding: 2px;
  cursor: pointer;
  border-radius: 6px;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
}

.notification-detail-modal__close:hover {
  background: #f1f5f9;
  color: #475569;
}

.notification-detail-modal__meta {
  display: flex;
  gap: 12px;
  font-size: 0.72rem;
  color: #94a3b8;
}

.notification-detail-modal__body {
  margin: 0;
  color: #334155;
  font-size: 0.82rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.notification-detail-modal__extras {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.detail-extra-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 10px;
}

.detail-extra-label {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
  display: block;
  margin-bottom: 2px;
  font-weight: 600;
}

.detail-extra-card strong {
  font-size: 0.78rem;
  color: #1e293b;
}

.detail-extra-card p {
  margin: 2px 0 0;
  font-size: 0.75rem;
  color: #64748b;
}

.notification-detail-modal__actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}

.notification-detail-modal__goto {
  font-size: 0.78rem;
  padding: 7px 16px;
}

/* ─── Responsive ─────────────────────────────────────────────── */
@media (max-width: 768px) {
  .admin-notifications-page {
    gap: 12px;
  }

  .admin-notifications-page__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .platform-popup__selectors {
    grid-template-columns: 1fr;
  }

  .notification-detail-modal__extras {
    grid-template-columns: 1fr;
  }
}
</style>
