<template>
  <div class="main-content">
    <section class="admin-page">
      <header class="page-head">
        <div>
          <h1 class="page-title">{{ $t('AdminSettings') }}</h1>
        </div>
      </header>

      <!-- Main Grid -->      <div class="content-grid">
        <!-- Profile Summary Card -->
        <div class="card profile-card">
          <div class="profile-avatar-large">
            <img v-if="profileAvatarUrl" :src="profileAvatarUrl" alt="Profile photo">
            <span v-else>{{ profileInitials }}</span>
          </div>
          <h3 class="profile-name">{{ userProfile.name || 'Admin User' }}</h3>
          <p class="profile-email">{{ userProfile.email || 'admin@chongchoul.com' }}</p>
          <p class="profile-meta">
            {{ userProfile.jobTitle || 'Super Admin' }}
            <span v-if="userProfile.phone"> · {{ userProfile.phone }}</span>
          </p>
          <p class="profile-bio" v-if="userProfile.bio">{{ userProfile.bio }}</p>
          <button class="btn-primary" @click="goToUpdateProfile">{{ $t('updateProfile') }}</button>
          <div class="profile-stats">
            <div class="stat-item">
              <span class="stat-value">{{ totalShops }}</span>
              <span class="stat-label">{{ $t('totalShops') }}</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-value">{{ averageRating }}</span>
              <span class="stat-label">{{ $t('rating') }}</span>
            </div>
          </div>
        </div>

        <!-- Right Column Cards -->
        <div class="right-column">
          <!-- General Preferences -->
          <div class="card preferences-card">
            <h3 class="card-title">{{ $t('generalPreferences') }}</h3>
            <div class="preference-section">
              <label class="preference-label">{{ $t('language') }}</label>
              <LanguageSwitcher variant="wide" />
            </div>
            <div class="preference-section">
              <label class="preference-label">{{ $t('displayTheme') }}</label>
              <div class="toggle-group">
                <button 
                  class="toggle-btn" 
                  :class="{ active: activeTheme === 'Light' }"
                  @click="setTheme('Light')"
                >{{ $t('light') }}</button>
                <button 
                  class="toggle-btn toggle-btn-dark" 
                  :class="{ active: activeTheme === 'Dark' }"
                  @click="setTheme('Dark')"
                >{{ $t('dark') }}</button>
              </div>
            </div>
          </div>

          <!-- Security Settings -->
          <div class="card security-card">
            <div class="security-header">
              <div class="security-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <span class="badge-recommended">{{ $t('recommended') }}</span>
            </div>
            <h3 class="card-title">{{ $t('securitySettings') }}</h3>
            <div class="security-row">
              <div class="security-info">
                <span class="security-title">{{ $t('twoFactorAuthentication') }}</span>
                <span class="security-desc">{{ $t('twoFactorDescription') }}</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" v-model="twoFactorEnabled" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <!-- System Roles -->
          <div class="card roles-card">
            <h3 class="card-title">{{ $t('systemRoles') }}</h3>
            <div class="roles-list">
              <div class="role-item">
                <span class="role-name">{{ $t('admin') }}</span>
                <span class="role-badge admin">{{ adminCount }} {{ $t('users') }}</span>
              </div>
              <div class="role-item">
                <span class="role-name">{{ $t('shopOwner') }}</span>
                <span class="role-badge shop">{{ shopOwnerCount }} {{ $t('users') }}</span>
              </div>
              <div class="role-item">
                <span class="role-name">{{ $t('customer') }}</span>
                <span class="role-badge customer">{{ customerCount }} {{ $t('users') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Status Dashboard -->
      <div class="status-dashboard">
        <!-- Last Login -->
        <div class="card status-card">
          <div class="status-icon last-login">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="status-content">
            <span class="status-label">{{ $t('lastLogin') }}</span>
            <span class="status-value">{{ lastLoginTime || currentDateTime }}</span>
            <span class="status-detail">192.168.1.105</span>
          </div>
        </div>

        <!-- Active Sessions -->
        <div class="card status-card">
          <div class="status-icon sessions">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <div class="status-content">
            <span class="status-label">{{ $t('activeSessions') }}</span>
            <span class="status-value">01 {{ $t('device') }}</span>
            <span class="status-detail">{{ $t('windows') }}</span>
          </div>
        </div>

        <!-- User Usage -->
        <div class="card status-card">
          <div class="status-icon storage">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="status-content">
            <span class="status-label">{{ $t('userUsage') }}</span>
            <span class="status-value">{{ userUsagePercent }}% {{ $t('used') }}</span>
            <div class="progress-container">
              <div class="progress-bar" :style="{ width: userUsagePercent + '%' }"></div>
            </div>
            <span class="status-detail">{{ userUsagePercent }}%</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import '@/css/Admin_setting.css'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

const router = useRouter()

const activeTab = ref('profile')
const activeTheme = ref(localStorage.getItem('admin_theme') || 'Light')
const currentDateTime = ref('')
const userUsagePercent = ref(0)
const twoFactorEnabled = ref(true)
// Try to get user from localStorage 'user' key first, otherwise use individual keys
const getStoredUser = () => {
  const userStr = localStorage.getItem('user')
  if (userStr) {
    try {
      const user = JSON.parse(userStr)
      return {
        name: user.name || localStorage.getItem('user_name') || '',
        email: user.email || localStorage.getItem('user_email') || '',
        phone: user.phone || localStorage.getItem('user_phone') || '',
        jobTitle: user.job_title || user.role || localStorage.getItem('user_job_title') || 'Super Admin',
        bio: user.bio || localStorage.getItem('user_bio') || '',
        profile_picture: user.profile_picture || user.avatar_url || localStorage.getItem('user_profile_picture') || ''
      }
    } catch (e) {
      // Invalid JSON, fall back to individual keys
    }
  }
  return {
    name: localStorage.getItem('user_name') || '',
    email: localStorage.getItem('user_email') || '',
    phone: localStorage.getItem('user_phone') || '',
    jobTitle: localStorage.getItem('user_job_title') || 'Super Admin',
    bio: localStorage.getItem('user_bio') || '',
    profile_picture: localStorage.getItem('user_profile_picture') || ''
  }
}

const userProfile = ref(getStoredUser())

// Refresh user data from localStorage when the component mounts
const refreshUserProfile = async () => {
  // Debug: check what user is logged in
  console.log('=== DEBUG: Checking logged in user ===');
  const userStr = localStorage.getItem('user');
  const parsedUser = userStr ? JSON.parse(userStr) : null;
  console.log('Logged in user from localStorage:', parsedUser);
  console.log('User ID:', parsedUser?.id);
  console.log('User name:', parsedUser?.name);
  // First try to get fresh data from API
  try {
    const token = localStorage.getItem('auth_token')
    const res = await fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    })
    if (res.ok) {
      const data = await res.json()
      const freshUser = data.user
      console.log('Fresh user from API:', freshUser)
      if (freshUser && freshUser.profile_picture) {
        // Update localStorage with fresh data
        localStorage.setItem('user', JSON.stringify(freshUser))
        localStorage.setItem('user_profile_picture', freshUser.profile_picture || '')
        userProfile.value = {
          name: freshUser.name || '',
          email: freshUser.email || '',
          phone: freshUser.phone || '',
          jobTitle: freshUser.job_title || freshUser.role || 'Admin',
          bio: freshUser.bio || '',
          profile_picture: freshUser.profile_picture || ''
        }
        console.log('Updated profile from API:', userProfile.value)
        return
      }
    }
  } catch (e) {
    console.log('Failed to fetch fresh data, using localStorage:', e)
  }
  
  // Fallback to localStorage
  const newProfile = getStoredUser()
  console.log('Using localStorage profile:', newProfile)
  userProfile.value = newProfile
}

onMounted(() => {
  refreshUserProfile()
  
  // Listen for storage changes (when user updates profile in another tab/component)
  window.addEventListener('storage', (e) => {
    if (e.key === 'user' || e.key === 'user_profile_picture') {
      refreshUserProfile()
    }
  })
})

const resolveImageUrl = (path) => {
  if (!path) return ''
  
  // If it's already a full URL, use it as-is
  if (path.startsWith('http')) {
    return path;
  }
  
  // Otherwise, prepend /storage/ to make it accessible
  return `/storage/${path}`;
}

// Call this after updating profile picture to force refresh
const refreshProfilePicture = () => {
  localStorage.setItem('profile_picture_timestamp', Date.now())
}

const profileAvatarUrl = computed(() => {
  const url = resolveImageUrl(userProfile.value.profile_picture)
  console.log('profileAvatarUrl:', {
    raw: userProfile.value.profile_picture,
    resolved: url
  })
  return url
})
const profileInitials = computed(() => {
  if (!userProfile.value.name) return 'AD'
  return userProfile.value.name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
})

// Stats data from API
const totalShops = ref(0)
const averageRating = ref(0)
const adminCount = ref(0)
const shopOwnerCount = ref(0)
const customerCount = ref(0)
const lastLoginTime = ref('')

// Fetch admin stats from API
const fetchAdminStats = async () => {
  try {
    const token = localStorage.getItem('auth_token')
    const headers = {
      'Accept': 'application/json'
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    const response = await fetch('/api/admin/stats', { headers })
    if (!response.ok) {
      throw new Error('Failed to fetch stats')
    }
    const data = await response.json()
    totalShops.value = data.total_shops || 0
    averageRating.value = data.average_rating || 0
    adminCount.value = data.admin_count || 0
    shopOwnerCount.value = data.shop_owner_count || 0
    customerCount.value = data.customer_count || 0
    
    // Format last login time
    if (data.last_login) {
      const loginDate = new Date(data.last_login)
      lastLoginTime.value = loginDate.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    }
    
    
  } catch (error) {
    console.error('Failed to fetch admin stats:', error)
    // Try fetching from shops directly as fallback
    try {
      const token = localStorage.getItem('auth_token')
      const headers = {
        'Accept': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const shopsResponse = await fetch('/api/shops', { headers })
      if (shopsResponse.ok) {
        const shopsData = await shopsResponse.json()
        totalShops.value = Array.isArray(shopsData) ? shopsData.length : (shopsData.data?.length || 0)
      }
    } catch (shopsError) {
      console.error('Failed to fetch shops for stats:', shopsError)
    }
  }
}

// Load current admin profile
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
      
      userProfile.value = {
        name: user.name || existingName || '',
        email: user.email || existingEmail || '',
        phone: user.phone || existingPhone || '',
        jobTitle: user.job_title || user.role || existingJobTitle || 'Super Admin',
        bio: user.bio || existingBio || '',
        profile_picture: user.profile_picture || user.avatar_url || existingProfilePicture || ''
      }
      localStorage.setItem('user_name', userProfile.value.name)
      localStorage.setItem('user_email', userProfile.value.email)
      localStorage.setItem('user_phone', userProfile.value.phone)
      localStorage.setItem('user_job_title', userProfile.value.jobTitle)
      localStorage.setItem('user_bio', userProfile.value.bio)
      localStorage.setItem('user_profile_picture', userProfile.value.profile_picture)
      
      // Also save full user object for userService.getCurrentUser()
      localStorage.setItem('user', JSON.stringify(user))
    }
  } catch (error) {
    console.error('Failed to fetch profile:', error)
  }
}

// Get current date and time in Cambodia timezone (UTC+7)
const getCurrentDateTime = () => {
  const now = new Date()
  // Cambodia is UTC+7
  const cambodiaTime = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  
  const dateOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric'
  }
  
  const timeOptions = { 
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }
  
  const date = cambodiaTime.toLocaleDateString('en-US', dateOptions)
  const time = cambodiaTime.toLocaleTimeString('en-US', timeOptions)
  
  return `${date} ${time}`
}

onMounted(() => {
  currentDateTime.value = getCurrentDateTime()
  fetchAdminStats()
  fetchUserProfile()
  
  // Apply saved theme on page load
  const savedTheme = localStorage.getItem('admin_theme')
  if (savedTheme === 'Dark') {
    document.documentElement.classList.add('dark-theme')
    document.documentElement.setAttribute('data-theme', 'dark')
    activeTheme.value = 'Dark'
  }
})

// Watch for theme changes to persist
watch(activeTheme, (newTheme) => {
  if (newTheme === 'Dark') {
    document.documentElement.classList.add('dark-theme')
    document.documentElement.setAttribute('data-theme', 'dark')
    document.body.style.backgroundColor = '#070b14'
    document.body.style.color = '#FFFFFF'
  } else {
    document.documentElement.classList.remove('dark-theme')
    document.documentElement.removeAttribute('data-theme')
    document.body.style.backgroundColor = ''
    document.body.style.color = ''
  }
})

const goToUpdateProfile = () => {
  router.push('/admin/profile')
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'shop', label: 'Shop Management', icon: 'home' },
  { id: 'users', label: 'User Management', icon: 'users' },
  { id: 'vehicles', label: 'Vehicle Management', icon: 'car' },
  { id: 'bookings', label: 'Booking Management', icon: 'calendar' },
  { id: 'coupons', label: 'Coupons', icon: 'tag' },
  { id: 'categories', label: 'Categories', icon: 'folder' },
  { id: 'cities', label: 'Cities', icon: 'map-pin' },
  { id: 'financials', label: 'Financials', icon: 'dollar' },
  { id: 'reports', label: 'Reports', icon: 'file-text' },
  { id: 'settings', label: 'Settings', icon: 'settings', active: true }
]

const setTheme = (theme) => {
  console.log('Setting theme to:', theme)
  activeTheme.value = theme
  // Store theme preference
  localStorage.setItem('admin_theme', theme)
  
  // Apply theme to the document
  if (theme === 'Dark') {
    document.documentElement.classList.add('dark-theme')
    document.documentElement.setAttribute('data-theme', 'dark')
    document.body.style.backgroundColor = '#070b14'
    document.body.style.color = '#FFFFFF'
    console.log('Added dark-theme class')
  } else {
    document.documentElement.classList.remove('dark-theme')
    document.documentElement.removeAttribute('data-theme')
    document.body.style.backgroundColor = ''
    document.body.style.color = ''
    console.log('Removed dark-theme class')
  }
}

const logout = () => {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user')
  router.push('/login')
}
</script>

