import axios from 'axios'

// Overridable via VITE_API_BASE_URL at build time.
// In dev it falls back to the relative /api path (handled by the Vite proxy);
// in production it points at the Render backend (e.g. https://chong-choul-backend.onrender.com/api).
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Accept': 'application/json' },
})

// Add auth token to requests if it exists
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth data
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user')
      // Optionally redirect to login
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

const userService = {
  /**
   * Get the current logged-in user from localStorage.
   * @returns {object|null}
   */
  getCurrentUser() {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      return JSON.parse(userStr)
    }
    return null
  },

  /**
   * Get current user's ID.
   * @returns {number|null}
   */
  getCurrentUserId() {
    const user = this.getCurrentUser()
    return user?.id || null
  },

  /**
   * Get current authenticated user's profile.
   */
  async getAuthUser() {
    const { data } = await http.get('/auth-user')
    return data
  },

  /**
   * Update profile fields + optional profile picture.
   * @param {number} id
   * @param {FormData} formData  (name, email, phone, profile_picture?)
   */
  async updateProfile(id, formData) {
    const { data } = await http.post(`/users/${id}/update-profile`, formData)
    return data
  },

  /**
   * Change password with secure validation.
   * @param {number} id
   * @param {{ current_password, new_password, new_password_confirmation }} payload
   */
  async changePassword(id, payload) {
    const { data } = await http.post(`/users/${id}/change-password`, payload)
    return data
  },

  /**
   * Build the full URL for a stored profile picture.
   * @param {string|null} path  e.g. "profile_pictures/abc.jpg"
   * @returns {string|null}
   */
  getAvatarUrl(path) {
    if (!path) return null
    if (/^(https?:\/\/|data:|blob:)/i.test(path)) return path

    const normalized = String(path)
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')

    const origin = (() => {
      try {
        return new URL(http.defaults.baseURL, window.location.origin).origin
      } catch {
        return window.location.origin
      }
    })()

    if (normalized.startsWith('storage/')) {
      return `${origin}/${normalized}`
    }
    return `${origin}/storage/${normalized}`
  },
}

export default userService
