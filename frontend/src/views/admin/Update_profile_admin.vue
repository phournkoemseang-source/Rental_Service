<template>
  <section class="admin-page">
    <header class="page-head">
      <div>
        <h1 class="page-title">Update Profile</h1>
        <p class="page-subtitle">Manage your personal information and public profile details.</p>
      </div>
    </header>

    <!-- Main Grid -->
        <div class="content-grid">
          <!-- Left Column - Profile Photo Card -->
          <div class="profile-photo-card">
            <div class="profile-photo-container">
              <div class="profile-photo-wrapper" @click="triggerFileDialog">
                <img
                  v-if="photoPreview"
                  :src="photoPreview"
                  alt="Profile photo"
                  class="profile-photo-img"
                />
                <div v-else class="profile-photo-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
              </div>
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                class="sr-only"
                @change="onFileChange"
              />
            </div>
            <div class="profile-photo-label">Your Photo</div>
            <div class="profile-photo-hint">Recommended: 400x400px (JPG, PNG)</div>
            
            <button class="btn-primary" type="button" @click="triggerFileDialog" :disabled="loading">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload New Photo
            </button>
            
            <button class="btn-remove" type="button" @click="removePhoto" :disabled="removingPhoto || loading || !photoPreview">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              Remove
            </button>
            
            <div class="security-status">
              <svg class="shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <div class="security-info">
                <span class="security-label">Account Security</span>
                <span class="security-date">Last updated: {{ lastUpdatedLabel }}</span>
              </div>
            </div>
          </div>

          <!-- Right Column - Personal Information Card -->
          <div class="personal-info-card">
            <h2 class="card-header">Personal Information</h2>
            
            <form class="personal-form">
              <div v-if="message.text" :class="['alert', message.type === 'error' ? 'alert-error' : 'alert-success']">
                {{ message.text }}
              </div>
              <div class="form-grid">
                <div class="form-group">
                  <label>Full Name</label>
                  <input type="text" v-model="formData.fullName" placeholder="Enter your full name" />
                </div>
                
                <div class="form-group">
                  <label>Job Title/Role</label>
                  <input type="text" v-model="formData.jobTitle" placeholder="Enter your job title" />
                </div>
                
                <div class="form-group">
                  <label>Email Address</label>
                  <div class="input-with-icon">
                    <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <input type="email" v-model="formData.email" placeholder="Enter your email" />
                  </div>
                </div>
                
                <div class="form-group">
                  <label>Phone Number</label>
                  <div class="input-with-icon">
                    <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    <input type="tel" v-model="formData.phone" placeholder="Enter your phone number" />
                  </div>
                </div>
              </div>
              
              <div class="form-group full-width">
                <label>Bio/Description</label>
                <textarea v-model="formData.bio" placeholder="Describe your role and responsibilities..." rows="4"></textarea>
              </div>
              
              <div class="form-actions">
                <button type="button" class="btn-cancel" @click="navigateTo('/admin/settings')">Cancel</button>
                <button type="button" class="btn-save" :disabled="loading" @click="handleSaveClick">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Email Notifications Section -->
        <div class="email-notifications-card">
          <div class="notification-header">
            <div class="notification-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <span class="badge-enabled">Enabled</span>
          </div>
          <h3 class="card-title">{{ $t('emailNotifications') }}</h3>
          <div class="notification-row">
            <div class="notification-info">
              <span class="notification-title">{{ $t('receiveEmailUpdates') }}</span>
              <span class="notification-desc">{{ $t('emailNotificationDesc') }}</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="emailNotificationsEnabled" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
    </section>
  </template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import '@/css/DashboardAdmin.css'
import '@/css/Update_profile_admin.css'

const router = useRouter();

const formData = reactive({
  fullName: '',
  jobTitle: 'Super Admin',
  email: '',
  phone: '',
  bio: '',
});

const photoFile = ref(null);
const photoPreview = ref('');
const userId = ref(null);
const lastUpdated = ref(null);
const loading = ref(false);
const removingPhoto = ref(false);
const emailNotificationsEnabled = ref(false);
const twoFactorEnabled = ref(false);
const message = reactive({ type: '', text: '' });
const fileInput = ref(null);

const resolveImageUrl = (path) => {
  if (!path) return '';
  
  // If it's already a full URL, use it as-is
  if (path.startsWith('http')) {
    return path;
  }
  
  // Otherwise, prepend /storage/ to make it accessible
  return `/storage/${path}`;
};

const lastUpdatedLabel = computed(() => {
  if (!lastUpdated.value) return 'Not updated yet';
  const delta = Date.now() - new Date(lastUpdated.value).getTime();
  if (isNaN(delta)) return 'Not updated yet';
  const days = Math.floor(delta / 86400000);
  if (days <= 0) return 'Just now';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
});

const navigateTo = (path) => {
  router.push(path);
};

const handleSaveClick = () => {
  submitForm();
};

const setMessage = (type, text) => {
  message.type = type;
  message.text = text;
};

const handleLogout = async () => {
  try {
    const token = localStorage.getItem('auth_token');
    await fetch('/api/users/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    router.push('/login');
  }
};

const loadProfile = async () => {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    router.push('/login');
    return;
  }
  try {
    const res = await fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }
      throw new Error('Unable to load your profile');
    }

    const data = await res.json();
    console.log('Full loadProfile response:', data);
    const user = data.user || {};
    console.log('User from loadProfile:', user);

    if (!user || !user.id) {
      throw new Error('Unable to identify user. Please refresh the page and try again.');
    }

    userId.value = user.id;
    formData.fullName = user.name || '';
    formData.jobTitle = user.job_title || user.role || 'Super Admin';
    formData.email = user.email || '';
    formData.phone = user.phone || '';
    formData.bio = user.bio || '';
    
    console.log('User data loaded:', {
      profile_picture: user.profile_picture,
      avatar_url: user.avatar_url
    });
    
    photoPreview.value = resolveImageUrl(user.profile_picture) || user.avatar_url || '';
    console.log('Photo preview set to:', photoPreview.value);
    
    // Update localStorage with fresh data
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('user_profile_picture', user.profile_picture || '');
    
    lastUpdated.value = user.updated_at;
    
    // Debug log
    console.log('Profile loaded successfully, userId:', userId.value);
  } catch (error) {
    console.error('Error loading profile:', error);
    setMessage('error', error.message || 'Failed to load profile. Please refresh the page.');
  }
};

const triggerFileDialog = () => {
  fileInput.value?.click();
};

const onFileChange = (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    console.log('No file selected');
    return;
  }
  console.log('File selected:', file.name, file.type, file.size);
  photoFile.value = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    photoPreview.value = e.target?.result || '';
    console.log('Preview generated');
  };
  reader.readAsDataURL(file);
};

const persistToLocalStorage = (user) => {
  localStorage.setItem('user_name', user.name || formData.fullName);
  localStorage.setItem('user_email', user.email || formData.email);
  localStorage.setItem('user_phone', user.phone || formData.phone || '');
  localStorage.setItem('user_job_title', user.job_title || formData.jobTitle || '');
  localStorage.setItem('user_bio', user.bio || formData.bio || '');
  localStorage.setItem('user_profile_picture', user.profile_picture || '');
  
  // Also save full user object for userService.getCurrentUser()
  localStorage.setItem('user', JSON.stringify(user));
};

const submitForm = async () => {
  if (!userId.value) {
    setMessage('error', 'Unable to identify user. Please refresh the page and try again.');
    return;
  }
  loading.value = true;
  setMessage('', '');
  try {
    const token = localStorage.getItem('auth_token');
    const form = new FormData();
    form.append('name', formData.fullName);
    form.append('job_title', formData.jobTitle || '');
    form.append('email', formData.email);
    form.append('phone', formData.phone || '');
    form.append('bio', formData.bio || '');
    if (photoFile.value) {
      console.log('Uploading photo:', photoFile.value.name, photoFile.value.size);
      form.append('profile_picture', photoFile.value);
    } else {
      console.log('No photo file to upload');
    }

    // Debug: Log form data contents
    for (let [key, value] of form.entries()) {
      console.log(`FormData ${key}:`, value);
    }
    
    const res = await fetch(`/api/users/${userId.value}/update-profile`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: form,
    });

    const responseData = await res.json();
    console.log('Save response:', responseData);
    
    if (!res.ok) {
      throw new Error(responseData.message || 'Failed to save changes');
    }

    const user = responseData.user || {};
    console.log('Updated user profile_picture:', user.profile_picture);
    formData.fullName = user.name ?? formData.fullName;
    formData.jobTitle = user.job_title ?? formData.jobTitle;
    formData.email = user.email ?? formData.email;
    formData.phone = user.phone ?? formData.phone;
    formData.bio = user.bio ?? formData.bio;
    photoPreview.value = resolveImageUrl(user.profile_picture) || photoPreview.value;
    lastUpdated.value = user.updated_at || new Date().toISOString();
    photoFile.value = null;
    if (fileInput.value) fileInput.value.value = '';
    persistToLocalStorage(user);
    // Force refresh of profile picture in other components
    localStorage.setItem('profile_picture_timestamp', Date.now());
    window.dispatchEvent(new Event('user-updated'));
    setMessage('success', 'Profile updated successfully.');
    setTimeout(() => router.push('/admin/settings'), 600);
  } catch (error) {
    setMessage('error', error.message);
  } finally {
    loading.value = false;
  }
};

const removePhoto = async () => {
  if (!userId.value || !photoPreview.value) return;
  removingPhoto.value = true;
  setMessage('', '');
  try {
    const token = localStorage.getItem('auth_token');
    const res = await fetch(`/api/users/${userId.value}/avatar`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Unable to remove photo');
    }

    photoPreview.value = '';
    photoFile.value = null;
    if (fileInput.value) fileInput.value.value = '';
    persistToLocalStorage({ profile_picture: '' });
    window.dispatchEvent(new Event('user-updated'));
    lastUpdated.value = new Date().toISOString();
    setMessage('success', 'Photo removed.');
  } catch (error) {
    setMessage('error', error.message);
  } finally {
    removingPhoto.value = false;
  }
};

onMounted(() => {
  loadProfile();
  
  // Apply saved theme on page load
  const savedTheme = localStorage.getItem('admin_theme');
  if (savedTheme === 'Dark') {
    document.documentElement.classList.add('dark-theme');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.querySelector('.admin-layout')?.classList.add('dark-theme');
  }
  
  // Listen for theme changes from other pages
  window.addEventListener('storage', (e) => {
    if (e.key === 'admin_theme') {
      const layout = document.querySelector('.admin-layout');
      if (e.newValue === 'Dark') {
        document.documentElement.classList.add('dark-theme');
        document.documentElement.setAttribute('data-theme', 'dark');
        layout?.classList.add('dark-theme');
      } else {
        document.documentElement.classList.remove('dark-theme');
        document.documentElement.removeAttribute('data-theme');
        layout?.classList.remove('dark-theme');
      }
    }
  });
});
</script>


