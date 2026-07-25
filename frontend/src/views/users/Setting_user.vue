<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCssModule } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import userService from '@/services/userService.js'
import CommonFooter from '../../components/CommonFooter.vue'
import UserNavbar from '@/components/UserNavbar.vue'
import '@/css/customer-responsive.css'

const styles = useCssModule()
const router = useRouter()
const route = useRoute()

const mapUserToProfile = (user = {}) => {
    const createdAt = user.created_at || user.create_at || ''
    return {
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        profile_picture: user.avatar_url || user.profile_picture || user.img_url || null,
        role: user.role || '',
        location: user.location || user.country || '',
        country: user.country || '',
        joined_at: user.joined_at || createdAt,
        created_at: createdAt,
    }
}

const storedUser = userService.getCurrentUser() || {}

const persistCurrentUser = (nextFields = {}) => {
    try {
        const rawUser = localStorage.getItem('user')
        const localUser = rawUser ? JSON.parse(rawUser) : {}
        const nextUser = { ...localUser, ...nextFields }
        localStorage.setItem('user', JSON.stringify(nextUser))
        window.dispatchEvent(new Event('user-updated'))
        return nextUser
    } catch {
        return null
    }
}

// Get current logged-in user's ID
const getUserId = () => userService.getCurrentUserId()

// ─── State ───────────────────────────────────────────────────────────────
const profile = ref(mapUserToProfile(storedUser))
const originalProfile = ref({
    name: profile.value.name,
    email: profile.value.email,
    phone: profile.value.phone,
    profile_picture: profile.value.profile_picture,
}) // Store original values
const avatarPreview = ref(null)
const MAX_AVATAR_SIZE = 5 * 1024 * 1024
const profileFile = ref(null)
const fileInput = ref(null)

const passwordForm = ref({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
})

const showPwd = ref({ current: false, newPwd: false, confirm: false })
const loading = ref({ profile: false, password: false })
const touched = ref({ newPassword: false })

const toast = ref({ show: false, message: '', type: 'success' })
const profileErrors = ref({ name: '', email: '', phone: '' })
const passwordErrors = ref({ current_password: '', new_password: '', new_password_confirmation: '' })
let toastTimer = null

// ─── Computed ────────────────────────────────────────────────────────────
const initials = computed(() => {
    if (!profile.value.name) return '?'
    return profile.value.name
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
})

const avatarSrc = computed(() => {
    if (avatarPreview.value) return avatarPreview.value
    if (profile.value.profile_picture) return userService.getAvatarUrl(profile.value.profile_picture)
    return null
})

const userDisplayName = computed(() => profile.value.name || 'Guest User')

const pwdStrength = computed(() => {
    const p = passwordForm.value.new_password
    if (!p) return null
    const score = [
        p.length >= 8,
        /[A-Z]/.test(p),
        /[a-z]/.test(p),
        /[0-9]/.test(p),
        /[^A-Za-z0-9]/.test(p),
    ].filter(Boolean).length
    if (score <= 2) return { label: 'Weak', level: 'weak' }
    if (score <= 4) return { label: 'Medium', level: 'medium' }
    return { label: 'Strong', level: 'strong' }
})


const heroRoleLabel = computed(() => profile.value.role || 'Member')
const heroLocationLabel = computed(() => profile.value.location || profile.value.country || 'Location not set')
const heroJoinedLabel = computed(() => {
    const raw = profile.value.joined_at || profile.value.created_at
    if (raw) {
        const parsed = new Date(raw)
        if (!Number.isNaN(parsed)) {
            return `Joined ${parsed.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`
        }
    }
    return 'Joined date unavailable'
})
const heroTabs = ['Profile', 'Teams', 'Projects', 'Connections']
const aboutItems = computed(() => [
    { label: 'Full Name', value: profile.value.name || 'John Doe' },
    { label: 'Status', value: 'Active' },
    { label: 'Role', value: heroRoleLabel.value },
    { label: 'Country', value: heroLocationLabel.value },
    { label: 'Languages', value: profile.value.language || 'English' },
])

const contactItems = computed(() => [
    { label: 'Contact', value: profile.value.phone || '(123) 456-7890' },
    { label: 'Email', value: profile.value.email || 'john.doe@example.com' },
    { label: 'Skype', value: profile.value.skype || 'john.doe' },
])

const overviewMetrics = computed(() => [
    { label: 'Tasks Completed', value: '13.5k' },
    { label: 'Projects Completed', value: '146' },
    { label: 'Connections', value: '897' },
])

const navItems = [
    { label: 'Home', route: '/view_shop' },
    { label: 'My Bookings', route: '/my-bookings' },
    { label: 'Profile', route: '/user/profile' },
]

const activeNavLabel = computed(() => {
    const currentPath = route.path
    const matched = navItems.find((item) => item.route && currentPath.startsWith(item.route))
    return matched?.label || 'Profile'
})

const timelineEvents = [
    {
        id: 1,
        title: '12 Invoices have been paid',
        description: 'Invoices have been paid to the company',
        time: '12 min ago',
        color: '#16a34a',
    },
    {
        id: 2,
        title: 'Client Meeting',
        description: 'Project meeting with John @10:15am',
        time: '45 min ago',
        color: '#4f46e5',
    },
    {
        id: 3,
        title: 'Create a new project for client',
        description: '6 team members in a project',
        time: '2 days ago',
        color: '#ea580c',
    },
]

const connectionList = [
    { name: 'Cecilia Payne', info: '45 Connections', color: '#a855f7', initials: 'CP' },
    { name: 'Curtis Fletcher', info: '1.32K Connections', color: '#3b82f6', initials: 'CF' },
    { name: 'Alice Stone', info: '125 Connections', color: '#ef4444', initials: 'AS' },
    { name: 'Darrell Barnes', info: '456 Connections', color: '#f97316', initials: 'DB' },
    { name: 'Eugenia Moore', info: '1.2K Connections', color: '#0891b2', initials: 'EM' },
]

const teamList = [
    { name: 'React Developers', members: '72', label: 'Developer', badgeKey: 'developer' },
    { name: 'Support Team', members: '122', label: 'Support', badgeKey: 'support' },
    { name: 'UI Designers', members: '7', label: 'Designer', badgeKey: 'designer' },
    { name: 'Vue.js Developers', members: '289', label: 'Developer', badgeKey: 'developer' },
    { name: 'Digital Marketing', members: '24', label: 'Marketing', badgeKey: 'marketing' },
];

// ─── Toast ───────────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
    clearTimeout(toastTimer)
    toast.value = { show: true, message, type }
    toastTimer = setTimeout(() => { toast.value.show = false }, 4000)
}

// ─── Profile picture ─────────────────────────────────────────────────────
function triggerFileInput() {
    fileInput.value.click()
}


function handleFileChange(event) {
    const file = event.target.files[0]
    if (!file) return
    if (file.size > MAX_AVATAR_SIZE) {
        showToast('Image must be less than 5 MB.', 'danger')
        event.target.value = ''
        return
    }
    const reader = new FileReader()
    reader.onload = e => { avatarPreview.value = e.target.result }
    reader.readAsDataURL(file)
    // Reset input so the same file can be re-selected
    event.target.value = ''
    profileFile.value = file
}

// ─── Fetch profile ────────────────────────────────────────────────────────
async function fetchProfile() {
    const userId = getUserId()
    if (!userId) {
        showToast('Please login first.', 'danger')
        return
    }
    try {
        // Use getAuthUser to get the current authenticated user's profile
        const data = await userService.getAuthUser()
        const mappedProfile = mapUserToProfile(data)
        Object.assign(profile.value, mappedProfile)
        persistCurrentUser({
            ...data,
            profile_picture: data.avatar_url || data.profile_picture || data.img_url || null,
            avatar_url: data.avatar_url || userService.getAvatarUrl(data.profile_picture || data.img_url),
        })

        // Store original values for comparison
        originalProfile.value = {
            name: mappedProfile.name,
            email: mappedProfile.email,
            phone: mappedProfile.phone,
            profile_picture: mappedProfile.profile_picture,
        }
    } catch {
        showToast('Could not load profile data.', 'danger')
    }
}

// ─── Save profile ─────────────────────────────────────────────────────────
function validateProfile() {
    profileErrors.value = { name: '', email: '', phone: '' }
    let hasError = false
    
    // Only validate fields that have been changed from original values
    // This allows users to update only specific fields without requiring all fields
    const hasNameChange = profile.value.name.trim() !== originalProfile.value.name
    const hasEmailChange = profile.value.email.trim() !== originalProfile.value.email
    const hasPhoneChange = (profile.value.phone || '').trim() !== (originalProfile.value.phone || '')
    const hasFileChange = profileFile.value !== null

    // If nothing changed, no validation needed
    if (!hasNameChange && !hasEmailChange && !hasPhoneChange && !hasFileChange) {
        showToast('No changes detected.', 'info')
        return 'No changes detected.'
    }
    
    // Validate name only if it was changed
    if (hasNameChange && !profile.value.name.trim()) {
        profileErrors.value.name = 'Full name cannot be empty when changed.'
        hasError = true
    }
    
    // Validate email only if it was changed
    if (hasEmailChange) {
        if (!profile.value.email.trim()) {
            profileErrors.value.email = 'Email address cannot be empty when changed.'
            hasError = true
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.value.email)) {
            profileErrors.value.email = 'Please enter a valid email address.'
            hasError = true
        }
    }
    
    return hasError ? 'Please fix the errors above.' : null
}

async function saveProfile() {
    const err = validateProfile()
    if (err) { showToast(err, 'danger'); return }

    const userId = getUserId()
    if (!userId) {
        showToast('Please login first.', 'danger')
        return
    }

    loading.value.profile = true
    try {
        const fd = new FormData()
        
        // Only append fields that have been changed
        const hasNameChange = profile.value.name.trim() !== originalProfile.value.name
        const hasEmailChange = profile.value.email.trim() !== originalProfile.value.email
        const hasPhoneChange = (profile.value.phone || '').trim() !== (originalProfile.value.phone || '')
        const hasFileChange = profileFile.value !== null


        if (hasNameChange) {
            fd.append('name', profile.value.name.trim())
        }
        if (hasEmailChange) {
            fd.append('email', profile.value.email.trim())
        }
        if (hasPhoneChange) {
            fd.append('phone', profile.value.phone?.trim() || '')
        }
        if (hasFileChange && profileFile.value) {
            fd.append('profile_picture', profileFile.value)
        }

        const res = await userService.updateProfile(userId, fd)
        
        // Update original profile with new values after successful save
        if (res.user) {
            const mappedProfile = mapUserToProfile(res.user)
            originalProfile.value = {
                name: mappedProfile.name,
                email: mappedProfile.email,
                phone: mappedProfile.phone,
                profile_picture: mappedProfile.profile_picture,
            }
            const avatar = mappedProfile.profile_picture || profile.value.profile_picture
            Object.assign(profile.value, mappedProfile, { profile_picture: avatar })

            // Keep local user snapshot in sync so header/profile components refresh immediately.
            persistCurrentUser({
                ...res.user,
                profile_picture: res.user.avatar_url || res.user.profile_picture || res.user.img_url || null,
                avatar_url: res.user.avatar_url || userService.getAvatarUrl(res.user.profile_picture || res.user.img_url),
            })
        }
        
        profileFile.value = null
        avatarPreview.value = null
        showToast('Profile updated successfully!', 'success')
    } catch (e) {
        showToast(e.response?.data?.message || 'Failed to update profile.', 'danger')
    } finally {
        loading.value.profile = false
    }
}

// ─── Change password ──────────────────────────────────────────────────────
function validatePassword() {
    const p = passwordForm.value
    passwordErrors.value = { current_password: '', new_password: '', new_password_confirmation: '' }
    let hasError = false
    
    if (!p.current_password) {
        passwordErrors.value.current_password = 'Current password is required.'
        hasError = true
    }
    if (!p.new_password) {
        passwordErrors.value.new_password = 'New password is required.'
        hasError = true
    } else {
        if (p.new_password.length < 8) {
            passwordErrors.value.new_password = 'Password must be at least 8 characters.'
            hasError = true
        }
        if (!/[A-Z]/.test(p.new_password)) {
            passwordErrors.value.new_password = (passwordErrors.value.new_password ? passwordErrors.value.new_password + ' ' : '') + 'Must include uppercase letter.'
            hasError = true
        }
        if (!/[a-z]/.test(p.new_password)) {
            passwordErrors.value.new_password = (passwordErrors.value.new_password ? passwordErrors.value.new_password + ' ' : '') + 'Must include lowercase letter.'
            hasError = true
        }
        if (!/[0-9]/.test(p.new_password)) {
            passwordErrors.value.new_password = (passwordErrors.value.new_password ? passwordErrors.value.new_password + ' ' : '') + 'Must include number.'
            hasError = true
        }
        if (!/[^A-Za-z0-9]/.test(p.new_password)) {
            passwordErrors.value.new_password = (passwordErrors.value.new_password ? passwordErrors.value.new_password + ' ' : '') + 'Must include special character.'
            hasError = true
        }
    }
    if (p.new_password !== p.new_password_confirmation) {
        passwordErrors.value.new_password_confirmation = 'New passwords do not match.'
        hasError = true
    }
    return hasError ? 'Please fix the errors above.' : null
}

async function changePassword() {
    const err = validatePassword()
    if (err) { showToast(err, 'danger'); return }

    const userId = getUserId()
    if (!userId) {
        showToast('Please login first.', 'danger')
        return
    }


    loading.value.password = true
    try {
        await userService.changePassword(userId, {
            current_password: passwordForm.value.current_password,
            new_password: passwordForm.value.new_password,
            new_password_confirmation: passwordForm.value.new_password_confirmation,
        })
        showToast('Password changed successfully!', 'success')
        passwordForm.value = { current_password: '', new_password: '', new_password_confirmation: '' }
    } catch (e) {
        showToast(e.response?.data?.message || 'Failed to change password.', 'danger')
    } finally {
        loading.value.password = false
    }
}

const handleLogout = async () => {
    try {
        await userService.logout()
    } finally {
        router.push('/login')
    }
}

const handleBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/view_shop')
  }
}

const openProfile = () => {
    router.push('/user/profile')
}

onMounted(fetchProfile)
</script>
<template>
    <div class="settings-page-root">
        <UserNavbar
            :nav-items="navItems"
            :active-label="activeNavLabel"
            :show-fallback-message="true"
            @logout-request="handleLogout"
        />
        <!-- Back Button -->
        <div class="settings-back-bar">
            <button class="btn-back-top" @click="handleBack">
                <i class="fa-solid fa-arrow-left"></i>
                <span>Back</span>
            </button>
        </div>
        <div :class="styles['page']">
        <transition name="slide-right">
            <div
                v-if="toast.show"
                :class="[
                    styles['toast'],
                    toast.type === 'success'
                        ? styles['toast--success']
                        : toast.type === 'info'
                            ? styles['toast--info']
                            : styles['toast--danger']
                ]"
            >
                <svg v-if="toast.type === 'success'" :class="styles['toast__icon']" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <svg v-else :class="styles['toast__icon']" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span :class="styles['toast__msg']">{{ toast.message }}</span>
            </div>
        </transition>


        <section :class="styles['hero']">
            <div :class="styles['hero-stripes']">
                <span v-for="stripe in 5" :key="stripe" :class="styles['hero-stripe']"></span>
            </div>
            <div :class="styles['hero-content']">
            <div
                :class="[styles['hero-avatar'], loading.profile && styles['hero-avatar--loading']]"
                role="button"
                tabindex="0"
                @click="triggerFileInput"
                @keydown.enter="triggerFileInput"
                @keydown.space.prevent="triggerFileInput"
                :aria-busy="loading.profile"
            >
                <img v-if="avatarSrc" :src="avatarSrc" :class="styles['hero-avatar__img']" alt="Profile photo" />
                <span v-else :class="styles['hero-avatar__initials']">{{ initials }}</span>
                <div :class="styles['hero-avatar__overlay']">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                </div>
                <div v-if="loading.profile" :class="styles['hero-avatar__loader']">
                    <span :class="styles['hero-avatar__loader-dot']"></span>
                </div>
            </div>
                <div :class="styles['hero-text']">
                    <h1 :class="styles['hero-name']">{{ profile.name || 'John Doe' }}</h1>
                    <p :class="styles['hero-role']">{{ heroRoleLabel }}</p>
                    <div :class="styles['hero-meta']">
                        <span>{{ heroLocationLabel }}</span>
                        <span>•</span>
                        <span>{{ heroJoinedLabel }}</span>
                    </div>
                </div>
                <button type="button" :class="styles['status-btn']">
                    <i class="fa-solid fa-user-check" aria-hidden="true"></i>
                    Connected
                </button>
            </div>
            <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                style="display:none" @change="handleFileChange" />
        </section>

        <!-- <nav :class="styles['tab-nav']">
            <button v-for="tab in heroTabs" :key="tab" type="button" :class="[styles['tab'], tab === heroTabs[0] ? styles['tab--active'] : '']">
                {{ tab }}
            </button>
        </nav> -->


        <div :class="styles['content-grid']">
            <div :class="styles['left-column']">
                <!-- <div :class="styles['info-card']">
                    <div :class="styles['card-header']">
                        <p :class="styles['card-title']">About</p>
                        <p :class="styles['card-subtitle']">Profile highlights</p>
                    </div>
                    <ul :class="styles['info-list']">
                        <li v-for="item in aboutItems" :key="item.label">
                            <span :class="styles['info-label']">{{ item.label }}</span>
                            <span :class="styles['info-value']">{{ item.value }}</span>
                        </li>
                    </ul>
                </div> -->
                <div :class="styles['info-card']">
                    <!-- <div :class="styles['card-header']">
                        <p :class="styles['card-title']">Contacts</p>
                        <p :class="styles['card-subtitle']">How to reach you</p>
                    </div> -->
                    <ul :class="styles['info-list']">
                        <li v-for="item in contactItems" :key="item.label">
                            <span :class="styles['info-label']">{{ item.label }}</span>
                            <span :class="styles['info-value']">{{ item.value }}</span>
                        </li>
                    </ul>
                </div>
                <!-- <div :class="styles['info-card']">
                    <div :class="styles['card-header']">
                        <p :class="styles['card-title']">Overview</p>
                        <p :class="styles['card-subtitle']">Your impact in numbers</p>
                    </div>
                    <div :class="styles['overview-grid']">
                        <div v-for="metric in overviewMetrics" :key="metric.label" :class="styles['overview-item']">
                            <p :class="styles['overview-value']">{{ metric.value }}</p>
                            <p :class="styles['overview-label']">{{ metric.label }}</p>
                        </div>
                    </div>
                </div> -->
            </div>
            <!-- <div :class="styles['right-column']">
                <div :class="styles['activity-card']">
                    <div :class="styles['card-header']">
                        <p :class="styles['card-title']">Activity Timeline</p>
                        <p :class="styles['card-subtitle']">Latest updates</p>
                    </div>
                    <div :class="styles['timeline']">
                        <div v-for="event in timelineEvents" :key="event.id" :class="styles['timeline-event']">
                            <div :class="styles['timeline-dot']" :style="{ background: event.color }"></div>
                            <div :class="styles['timeline-content']">
                                <p :class="styles['timeline-title']">{{ event.title }}</p>
                                <p :class="styles['timeline-desc']">{{ event.description }}</p>
                            </div>
                            <span :class="styles['timeline-time']">{{ event.time }}</span>
                        </div>
                    </div>
                </div>
                <div :class="styles['activity-card']">
                    <div :class="styles['card-header']">
                        <p :class="styles['card-title']">Connections</p>
                        <p :class="styles['card-subtitle']">Your network</p>
                    </div>
                    <div :class="styles['connections-list']">
                        <div v-for="connection in connectionList" :key="connection.name" :class="styles['connection-item']">
                            <div :class="styles['connection-avatar']" :style="{ background: connection.color }">
                                {{ connection.initials }}
                            </div>
                            <div :class="styles['connection-details']">

                                <span :class="styles['connection-name']">{{ connection.name }}</span>
                                <span :class="styles['connection-info']">{{ connection.info }}</span>
                            </div>
                            <button type="button" :class="styles['connection-action']">
                                <i class="fa-solid fa-user-plus" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div :class="styles['activity-card']">
                    <div :class="styles['card-header']">
                        <p :class="styles['card-title']">Teams</p>
                        <p :class="styles['card-subtitle']">Groups you collaborate with</p>
                    </div>
                    <div :class="styles['teams-list']">
                        <div v-for="team in teamList" :key="team.name" :class="styles['team-item']">
                            <div>
                                <p :class="styles['team-name']">{{ team.name }}</p>
                                <p :class="styles['team-members']">{{ team.members }} Members</p>
                            </div>
                            <span :class="[styles['badge'], styles[`badge--${team.badgeKey}`]]">{{ team.label }}</span>
                        </div>
                    </div>
                </div>
            </div> -->
        </div>

        <div :class="styles['forms-grid']">
            <div :class="styles['form-card']">
                <div :class="styles['form-card__header']">
                    <div>
                        <p :class="styles['form-card__title']">Personal Information</p>
                        <p :class="styles['form-card__sub']">Update your contact details.</p>
                    </div>
                </div>
                <div :class="styles['form-card__content']">
                    <div :class="styles['field-group']">
                        <label :class="styles['field-label']">Full Name</label>
                        <div :class="styles['input-wrap']">
                            <svg :class="styles['input-icon']" width="16" height="16" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            <input v-model="profile.name" :class="[styles['input'], profileErrors.name && styles['input--error']]" type="text"
                                placeholder="Enter your full name" autocomplete="name" />
                        </div>
                        <p v-if="profileErrors.name" :class="styles['field-error']">{{ profileErrors.name }}</p>
                    </div>
                    <div :class="styles['field-group']">
                        <label :class="styles['field-label']">Email Address</label>
                        <div :class="styles['input-wrap']">
                            <svg :class="styles['input-icon']" width="16" height="16" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect width="20" height="16" x="2" y="4" rx="2" />
                                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                            </svg>
                            <input v-model="profile.email" :class="[styles['input'], profileErrors.email && styles['input--error']]" type="email"
                                placeholder="Enter your email address" autocomplete="email" />
                        </div>
                        <p v-if="profileErrors.email" :class="styles['field-error']">{{ profileErrors.email }}</p>
                    </div>
                    <div :class="styles['field-group']">

                        <label :class="styles['field-label']">Phone Number</label>
                        <div :class="styles['input-wrap']">
                            <svg :class="styles['input-icon']" width="16" height="16" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path
                                    d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 5.91 5.91l.82-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                            <input v-model="profile.phone" :class="styles['input']" type="tel" placeholder="+1 (555) 123-4567"
                                autocomplete="tel" />
                        </div>
                    </div>
                </div>
                <button
                    :class="[styles['btn-primary'], loading.profile && styles['btn-primary--loading']]"
                    type="button"
                    :disabled="loading.profile"
                    @click="saveProfile"
                >
                    <svg v-if="!loading.profile" width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span :class="styles['spinner']" v-if="loading.profile"></span>
                    {{ loading.profile ? 'Saving…' : 'Save Changes' }}
                </button>
            </div>
            <div :class="styles['form-card']">
                <div :class="styles['form-card__header']">
                    <div>
                        <p :class="styles['form-card__title']">Change Password</p>
                        <p :class="styles['form-card__sub']">Keep your account secure with a strong password.</p>
                    </div>
                </div>
                <div :class="styles['form-card__content']">
                    <div :class="styles['field-group']">
                        <label :class="[styles['field-label'], styles['field-label--danger']]">Current Password</label>
                        <div :class="styles['input-wrap']">
                            <svg :class="styles['input-icon']" width="16" height="16" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            <input v-model="passwordForm.current_password" :class="[styles['input'], passwordErrors.current_password && styles['input--error']]"
                                :type="showPwd.current ? 'text' : 'password'" placeholder="Enter current password"
                                autocomplete="current-password" />
                            <button :class="styles['eye-btn']" type="button" @click="showPwd.current = !showPwd.current"
                                :aria-label="showPwd.current ? 'Hide' : 'Show'">
                                <svg v-if="showPwd.current" width="17" height="17" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                                <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none"

                                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path
                                        d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                </svg>
                            </button>
                        </div>
                        <p v-if="passwordErrors.current_password" :class="styles['field-error']">{{ passwordErrors.current_password }}</p>
                    </div>
                    <div :class="styles['field-group']">
                        <label :class="[styles['field-label'], styles['field-label--danger']]">New Password</label>
                        <div :class="styles['input-wrap']">
                            <svg :class="styles['input-icon']" width="16" height="16" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            <input v-model="passwordForm.new_password" :class="styles['input']"
                                :type="showPwd.newPwd ? 'text' : 'password'" placeholder="Enter new password"
                                @blur="touched.newPassword = true" autocomplete="new-password" />
                            <button :class="styles['eye-btn']" type="button" @click="showPwd.newPwd = !showPwd.newPwd"
                                :aria-label="showPwd.newPwd ? 'Hide' : 'Show'">
                                <svg v-if="showPwd.newPwd" width="17" height="17" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                                <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path
                                        d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                </svg>
                            </button>
                        </div>
                        <div v-if="pwdStrength" :class="styles['strength']">
                            <div :class="styles['strength__bars']">
                                <span :class="[styles['strength__bar'], styles[`strength__bar--${pwdStrength.level}`]]"></span>
                                <span
                                    :class="[styles['strength__bar'], (pwdStrength.level === 'medium' || pwdStrength.level === 'strong') && styles[`strength__bar--${pwdStrength.level}`]]"></span>
                                <span
                                    :class="[styles['strength__bar'], pwdStrength.level === 'strong' && styles['strength__bar--strong']]"></span>
                            </div>
                            <span :class="[styles['strength__label'], styles[`strength__label--${pwdStrength.level}`]]">{{
                                pwdStrength.label }}</span>
                        </div>

                        <p v-else-if="touched.newPassword" :class="styles['field-hint']">Min 8 chars · Uppercase · Lowercase · Number · Special character</p>
                        <p v-if="passwordErrors.new_password" :class="styles['field-error']">{{ passwordErrors.new_password }}</p>
                    </div>
                    <div :class="styles['field-group']">
                        <label :class="[styles['field-label'], styles['field-label--danger']]">Confirm New Password</label>
                        <div :class="styles['input-wrap']">
                            <svg :class="styles['input-icon']" width="16" height="16" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            <input v-model="passwordForm.new_password_confirmation" :class="styles['input']"
                                :type="showPwd.confirm ? 'text' : 'password'" placeholder="Confirm new password"
                                autocomplete="new-password" />
                            <button :class="styles['eye-btn']" type="button" @click="showPwd.confirm = !showPwd.confirm"
                                :aria-label="showPwd.confirm ? 'Hide' : 'Show'">
                                <svg v-if="showPwd.confirm" width="17" height="17" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                                <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path
                                        d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                </svg>
                            </button>
                        </div>
                        <p v-if="passwordErrors.new_password_confirmation" :class="styles['field-error']">{{ passwordErrors.new_password_confirmation }}</p>
                    </div>
                </div>
                <button :class="[styles['btn-primary'], loading.password && styles['btn-primary--loading']]" type="button"
                    :disabled="loading.password" @click="changePassword">
                    <span :class="styles['spinner']" v-if="loading.password"></span>
                    {{ loading.password ? 'Updating…' : 'Update Password' }}
                </button>
            </div>
        </div>
    </div>
        <!-- Common Footer -->
        <CommonFooter />
    </div>
</template>
<style module>
/* ─── Page Layout ──────────────────────────────────────────── */
.page {
    min-height: 100vh;
    /* background: #eef1f7; */
    padding: 32px clamp(16px, 4vw, 48px) 60px;
    max-width: 80%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
    margin-top: 20px;
    margin-bottom: 20px;
}



.section-header__title {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--color-text-primary);
}

.section-header__sub {
    font-size: 0.82rem;
    color: var(--color-text-secondary);
    margin-top: 3px;
}



/* ─── Avatar Row ───────────────────────────────────────────── */
.avatar-row {
    display: flex;
    align-items: center;
    gap: 18px;
    margin-bottom: 24px;
}


/* The avatar circle – fixed dimensions; image never changes its size */
.avatar {
    width: 72px;
    height: 72px;
    min-width: 72px;
    border-radius: 50%;
    background: var(--color-avatar-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--color-avatar-text);
    cursor: pointer;
    position: relative;
    overflow: hidden;
    position: relative;
    box-shadow: 0 15px 35px rgba(15, 23, 42, 0.15);
}

.hero-stripes {
    display: flex;
    height: 160px;
}

.hero-stripe {
    flex: 1;
}

.hero-stripe:nth-child(1) {
    background: #33c2c8;
}

.hero-stripe:nth-child(2) {
    background: #9dddcf;
}

.hero-stripe:nth-child(3) {
    background: #f6d4c2;
}

.hero-stripe:nth-child(4) {
    background: #f8b4c4;
}

.hero-stripe:nth-child(5) {
    background: #ffd8d8;
}

.hero-content {
    background: #fff;
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding: 12px 24px 70px;
}

.hero-avatar {
    width: 145px;
    height: 145px;
    border-radius: 50%;
    background: #eef1f7;
    display: grid;
    place-items: center;
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
    position: absolute;
    margin-bottom: 8%;
    cursor: pointer;
    border: 4px solid #fff;
    box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
}

.hero-avatar__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
}

.hero-avatar__initials {
    letter-spacing: 0.3px;
}

.hero-avatar__overlay {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: rgba(249, 115, 22, 0.16);
    display: grid;
    place-items: center;
    opacity: 0;
    transition: opacity 0.2s;
    color: #f97316;
}

.hero-avatar:hover .hero-avatar__overlay,
.hero-avatar:focus-visible .hero-avatar__overlay {
    opacity: 1;
}

.hero-avatar--loading {
    cursor: wait;
}

.hero-avatar__loader {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: rgba(15, 23, 42, 0.45);
    display: grid;
    place-items: center;
    z-index: 2;
}

.hero-avatar__loader-dot {
    width: 22px;
    height: 22px;
    border: 3px solid rgba(255, 255, 255, 0.65);
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
}

.hero-text {
    flex: 1;
    position: relative;
    top: 60px;
}

.hero-name {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: #111827;
}

.hero-role {
    margin: 0.1rem 0;
    font-size: 1rem;
    color: #4b5563;
    font-weight: 600;
}

.hero-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
    color: #6b7280;
}



.status-btn {
    border: none;
    background: #2563eb;
    color: #fff;
    padding: 10px 18px;
    border-radius: 999px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    box-shadow: 0 8px 20px rgba(37, 99, 235, 0.35);
}

.tab-nav {
    background: #fff;
    border-radius: 24px;
    padding: 10px;
    display: flex;
    gap: 10px;
    box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
    flex-wrap: wrap;
}

.tab {
    border: none;
    background: transparent;
    padding: 10px 20px;
    border-radius: 12px;
    font-weight: 600;
    color: #4b5563;
    cursor: pointer;
}

.tab--active {
    background: #eef2ff;
    color: #4338ca;
}

.content-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 24px;
    margin-top: 60px;
}

.left-column,
.right-column {
    display: flex;
    flex-direction: column;
    gap: 22px;
}

.info-card,
.activity-card {
    background: #fff;
    border-radius: 20px;
    padding: 20px;
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
}

.card-header {
    margin-bottom: 16px;
}

.card-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: #111827;
}

.card-subtitle {
    margin: 2px 0 0;
    font-size: 0.85rem;
    color: #6b7280;
}


.info-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.info-label {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #9ca3af;
}

.info-value {
    font-size: 1rem;
    color: #111827;
    font-weight: 600;
}

.overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
}

.overview-item {
    background: #f9fafb;
    border-radius: 14px;
    padding: 12px 14px;
}

.overview-value {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 700;
    color: #111827;
}

.overview-label {
    margin: 4px 0 0;
    font-size: 0.8rem;
    color: #6b7280;
}

.timeline {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.timeline-event {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 12px;
    align-items: center;
}

.timeline-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
}

.timeline-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.timeline-title {
    margin: 0;
    font-weight: 600;
    color: #111827;
}

.timeline-desc {
    margin: 0;
    font-size: 0.85rem;
    color: #6b7280;
}

.timeline-time {
    font-size: 0.75rem;
    color: #9ca3af;
}

.connections-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.connection-item {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 12px;
    padding: 10px 4px;
}

.connection-avatar {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    font-weight: 600;
    color: #fff;
}

.connection-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.connection-name {
    font-weight: 600;
    color: #111827;
}

.connection-info {
    font-size: 0.78rem;
    color: #6b7280;
}

.connection-action {
    border: none;
    background: #eef2ff;
    color: #4338ca;
    width: 36px;
    height: 36px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    cursor: pointer;
}

.teams-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.team-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid #e5e7eb;
}

.team-item:last-child {
    border-bottom: none;
}

.team-name {
    margin: 0;
    font-weight: 600;
    color: #111827;
}

.team-members {
    margin: 2px 0 0;
    font-size: 0.78rem;
    color: #6b7280;
}

.badge {
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
}

.badge--developer {
    background: #ede9fe;
    color: #7c3aed;
}

.badge--support {
    background: #e0f2fe;
    color: #0369a1;
}

.badge--designer {
    background: #fce7f3;
    color: #be185d;
}

.badge--marketing {
    background: #fef3c7;
    color: #b45309;
}

.forms-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 24px;
}

.form-card {
    background: #fff;
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
}

.form-card__header {
    margin-bottom: 18px;
}

.form-card__title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
    color: #111827;
}

.form-card__sub {
    margin: 4px 0 0;
    font-size: 0.85rem;
    color: #6b7280;
}

.form-card__content {
    display: flex;
    flex-direction: column;
}

.field-group {
    margin-bottom: 18px;
}

.field-label {
    display: block;
    font-size: 0.84rem;
    font-weight: 600;
    color: #4b5563;
    margin-bottom: 6px;
}

.field-label--danger {
    color: #dc2626;
}

.input-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    border-radius: 14px;
    padding: 10px 14px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
}

.input-wrap:focus-within {
    border-color: #4338ca;
    box-shadow: 0 0 0 2px rgba(67, 56, 202, 0.15);
    background: #fff;
}


.input-icon {
    color: #94a3b8;
    flex-shrink: 0;
}

.input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 0.95rem;
    color: #111827;
}

.input::placeholder {
    color: #cbd5f5;
}

.input--error {
    border-color: #dc2626 !important;
}

.field-error {
    color: #dc2626;
    font-size: 0.78rem;
    margin-top: 6px;
}

.field-hint {
    font-size: 0.78rem;
    color: #6b7280;
    margin-top: 6px;
}

.eye-btn {
    background: none;
    border: none;
    padding: 6px 0 6px 8px;
    color: #94a3b8;
    display: flex;
    align-items: center;
    cursor: pointer;
    flex-shrink: 0;
}

.eye-btn:hover {
    color: #111827;
}

.strength {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
}

.strength__bars {
    display: flex;
    gap: 4px;
}

.strength__bar {
    width: 32px;
    height: 4px;
    border-radius: 99px;
    background: #e5e7eb;
}

.strength__bar--weak {
    background: #dc2626;
}

.strength__bar--medium {
    background: #f97316;
}

.strength__bar--strong {
    background: #16a34a;
}

.strength__label {
    font-size: 0.75rem;
    font-weight: 600;
}

.strength__label--weak {
    color: #dc2626;
}

.strength__label--medium {
    color: #f97316;
}

.strength__label--strong {
    color: #16a34a;
}

.btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    justify-content: center;
    padding: 12px 20px;
    border-radius: 999px;
    background: #2563eb;
    color: #fff;
    font-weight: 600;
    border: none;
    cursor: pointer;
    box-shadow: 0 10px 25px rgba(37, 99, 235, 0.25);
    transition: transform 0.15s ease;
}

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    box-shadow: none;
}

.btn-primary--loading {
    pointer-events: none;
}

.spinner {
    width: 15px;
    height: 15px;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

.toast {
    position: fixed;
    bottom: 30px;
    right: 30px;
    background: #fff;
    padding: 14px 18px;
    border-radius: 14px;
    box-shadow: 0 25px 50px rgba(15, 23, 42, 0.25);
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid #e5e7eb;
    font-weight: 600;
    color: #111827;
}

.toast--success {
    border-color: #22c55e;
    color: #16a34a;
}

.toast--danger {
    border-color: #ef4444;
    color: #b91c1c;
}

.toast--info {
    border-color: #f59e0b;
    color: #a16207;
}

.toast__icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
}

.toast__msg {
    font-size: 0.9rem;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

@media (max-width: 960px) {
    .hero-content {
        flex-direction: column;
        align-items: flex-start;
    }
    .status-btn {
        align-self: stretch;
        justify-content: center;
    }
}
</style>

<style>
/* Back button bar */
.settings-back-bar {
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px clamp(16px, 4vw, 48px) 0;
}

.btn-back-top {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  border-radius: 10px;
  background: #fff;
  color: #475569;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.btn-back-top:hover {
  background: #f8fafc;
  color: #2563eb;
  transform: translateX(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.btn-back-top i {
  font-size: 0.85rem;
}

.slide-right-enter-active {
    animation: slideInRight 0.35s ease;
}

.slide-right-leave-active {
    animation: slideOutRight 0.3s ease forwards;
}

@keyframes slideInRight {
    from {
        opacity: 0;
        transform: translateX(40px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes slideOutRight {
    from {
        opacity: 1;
        transform: translateX(0);
    }
    to {
        opacity: 0;
        transform: translateX(40px);
    }
}
</style>
