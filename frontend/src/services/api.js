import axios from 'axios';
import axiosRetry from 'axios-retry';

const api = axios.create({
  // Overridable via VITE_API_BASE_URL at build time (e.g. https://chongchoul.online/api).
  // Defaults to a same-origin relative path: works in dev through the Vite proxy
  // and in production because the Laravel backend is served from the same domain.
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

const getStoredToken = () => {
  return localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
};

api.interceptors.request.use((config) => {
  const nextConfig = { ...config };
  const authToken = getStoredToken();

  console.log('API Interceptor: Token from localStorage:', authToken ? 'present' : 'missing');

  if (authToken) {
    nextConfig.headers = nextConfig.headers || {};
    nextConfig.headers.Authorization = `Bearer ${authToken}`;
    console.log('API Interceptor: Authorization header set');
  } else {
    console.log('API Interceptor: No token found, skipping Authorization header');
  }

  // Add timeout for performance
nextConfig.timeout = 30000; // 30s

  // Let browser set correct multipart boundary automatically.
  if (typeof FormData !== 'undefined' && nextConfig.data instanceof FormData && nextConfig.headers) {
    delete nextConfig.headers['Content-Type'];
  }

  return nextConfig;
});

// Add automatic retry for network errors
axiosRetry(api, {
retries: 5,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return error.code === 'ECONNABORTED' || 
           error.message === 'Network Error' || 
           error.response?.status >= 500;
  },
  onRetry: (retryCount, error) => {
    console.log(`Retrying API call (${retryCount}/3):`, error.message);
  }
});

// Vehicle API calls
export const vehicleApi = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/vehicles?${queryString}` : '/vehicles';
    return api.get(url);
  },
  getById: (id) => api.get(`/vehicles/${id}`),
  create: (data) => api.post('/vehicles', data),
  update: (id, data) => api.put(`/vehicles/${id}`, data),
  delete: (id) => api.delete(`/vehicles/${id}`)
};

// Shop API calls
export const shopApi = {
  getAll: () => api.get('/shops'),
  getMyShop: () => api.get('/my-shop'),
  getById: (id) => api.get(`/shops/${id}`),
  create: (data) => api.post('/shops', data),
  update: (id, data) => {
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      data.append('_method', 'PUT');
      return api.post(`/shops/${id}`, data);
    }
    return api.put(`/shops/${id}`, data);
  },
  delete: (id) => api.delete(`/shops/${id}`)
};

// City API calls
export const cityApi = {
  getAll: () => api.get('/cities')
};

// Category API calls
export const categoryApi = {
  getAll: () => api.get('/categories'),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`)
};

// Payment API calls
export const paymentApi = {
  getAll: () => api.get('/payments'),
  getById: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  delete: (id) => api.delete(`/payments/${id}`)
};

export const userApi = {
  getAll: (params = {}) => api.get('/users', { params }),
  create: (payload) => api.post('/users', payload),
  update: (id, payload) => api.put(`/users/${id}`, payload),
  delete: (id) => api.delete(`/users/${id}`)
};

// Coupon API calls
export const couponApi = {
  getAll: (params = {}) => api.get('/coupons', { params }),
  getById: (id) => api.get(`/coupons/${id}`),
  create: (data) => api.post('/coupons', data),
  update: (id, data) => api.put(`/coupons/${id}`, data),
  delete: (id) => api.delete(`/coupons/${id}`),
  getByShop: (shopId) => api.get('/coupons/by-shop', { params: { shop_id: shopId } }),
  validate: (code, totalAmount, shopId = null) => {
    const params = { code, total_amount: totalAmount };
    if (shopId != null && shopId !== '') {
      params.shop_id = shopId;
    }
    return api.get('/coupons/check', { params });
  }
};

// Feedback API calls
export const feedbackApi = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/feedback?${queryString}` : '/feedback';
    return api.get(url);
  },
  getById: (id) => api.get(`/feedback/${id}`),
  create: (data) => api.post('/feedback', data),
  update: (id, data) => api.put(`/feedback/${id}`, data),
  delete: (id) => api.delete(`/feedback/${id}`)
};

// Histories (Activity) API calls
export const historiesApi = {
  getAll: () => api.get('/histories'),
  getById: (id) => api.get(`/histories/${id}`),
  create: (data) => api.post('/histories', data),
  update: (id, data) => api.put(`/histories/${id}`, data),
  delete: (id) => api.delete(`/histories/${id}`)
};

// Loyalty Points API calls
export const loyaltyPointApi = {
  getAll: () => api.get('/loyalty-points'),
  getById: (id) => api.get(`/loyalty-points/${id}`),
  create: (data) => api.post('/loyalty-points', data),
  update: (id, data) => api.put(`/loyalty-points/${id}`, data),
  delete: (id) => api.delete(`/loyalty-points/${id}`)
};

// Bookings API calls
export const bookingApi = {
  getAll: () => api.get('/bookings'),
  getById: (id) => api.get(`/bookings/${id}`),
  create: (data) => api.post('/bookings', data),
  update: (id, data) => api.put(`/bookings/${id}`, data),
  delete: (id) => api.delete(`/bookings/${id}`),
  getMyBookings: () => api.get('/my-bookings')
};

// Rating API calls
export const ratingApi = {
  getVehicleRatings: (params) => api.get('/vehicle-ratings', { params }),
  getVehicleRatingsSummary: (params) => api.get('/vehicle-ratings-summary', { params }),
  getVehicleSummary: (vehicleId) => api.get('/vehicle-ratings-summary', { params: { vehicle_id: vehicleId } }),
  create: (bookingId, data) => api.post(`/bookings/${bookingId}/rating`, data)
};

export default api;
