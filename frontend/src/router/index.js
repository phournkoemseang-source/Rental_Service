import { createRouter, createWebHistory } from 'vue-router';

const ChooseRole = () => import('../views/ChooseRole.vue');
const Login = () => import('../views/auth/Login.vue');
const Register = () => import('../views/auth/Register.vue');
const HomeView = () => import('../views/HomeView.vue');
const ShopDashboard = () => import('../views/shop/DashboardLayout.vue');
const UserDashboard = () => import('../views/users/Dashboard.vue');
const UserBookings = () => import('../views/users/MyBookings.vue');

const SettingUser = () => import('../views/users/Setting_user.vue');
const AdminDashboard = () => import('../views/admin/Dashboard.vue');
const ShopVehicles = () => import('../views/users/ShopVehicles.vue');
const VehiclesByShop = () => import('../views/users/VehiclesByShop.vue');
const Booking = () => import('../views/users/Booking.vue');
const VehicleDetail = () => import('../views/vehicle/VehicleDetail.vue');
const AdminLayout = () => import('../views/admin/AdminLayout.vue');
const UserNotifications = () => import('../views/users/Notification.vue');

// Check if user is authenticated
const isAuthenticated = () => {
  return Boolean(localStorage.getItem('auth_token') || localStorage.getItem('token'));
};

// Get user role from localStorage
const getUserRole = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    return user.role || 'customer';
  }
  return null;
};

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: false }
    },
    {
      path: '/home',
      name: 'landing',
      component: HomeView,
      meta: { requiresAuth: true, allowedRoles: ['customer', 'user', 'admin'] }
    },
    {
      path: '/chooserole',
      name: 'chooserole',
      component: ChooseRole,
      meta: { requiresAuth: false }
    },
    {
      path: '/register',
      name: 'register',
      component: Register,
      meta: { requiresAuth: false }
    },
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: { guest: true, allowAuthenticated: true }
    },
    // Admin routes should be defined BEFORE shop routes to ensure proper matching
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true, allowedRoles: ['admin'] },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: AdminDashboard
        },
        {
          path: 'dashboard',
          redirect: { name: 'admin-dashboard' }
        },
        {
          path: 'users',
          name: 'admin-users',
          component: () => import('../views/admin/UserManagement.vue')
        },
        {
          path: 'shops',
          name: 'admin-shops',
          component: () => import('../views/admin/ShopManagement.vue')
        },
        {
          path: 'vehicles',
          name: 'admin-vehicles',
          component: () => import('../views/admin/VehicleManagement.vue')
        },
        {
          path: 'bookings',
          name: 'admin-bookings',
          component: () => import('../views/admin/BookingManagement.vue')
        },
        {
          path: 'coupons',
          name: 'admin-coupons',
          component: () => import('../views/admin/CouponManagement.vue')
        },
        {
          path: 'categories',
          name: 'admin-categories',
          component: () => import('../views/admin/CategoryManagement.vue')
        },
        {
          path: 'cities',
          name: 'admin-cities',
          component: () => import('../views/admin/CityManagement.vue')
        },
        {
          path: 'financials',
          name: 'admin-financials',
          component: () => import('../views/admin/FinancialManagement.vue')
        },
        {
          path: 'reports',
          name: 'admin-reports',
          component: () => import('../views/admin/ReportManagement.vue')
        },
        {
          path: 'notifications',
          name: 'admin-notifications',
          component: () => import('../views/admin/Notification_admin.vue')
        },
        {
          path: 'settings',
          name: 'admin-settings',
          component: () => import('../views/admin/Admins_setting.vue')
        },
        {
          path: 'profile',
          name: 'admin-profile',
          component: () => import('../views/admin/Update_profile_admin.vue')
        }
      ]
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: ShopDashboard,
      meta: { requiresAuth: true, allowedRoles: ['shop_owner'] }
    },
    {
      path: '/shop/notifications',
      name: 'shop-notifications',
      component: ShopDashboard,
      meta: {
        requiresAuth: true,
        allowedRoles: ['shop_owner'],
        defaultSection: 'notifications'
      }
    },
    {
      path: '/view_shop',
      name: 'view_shop',
      component: UserDashboard,
      meta: { requiresAuth: true, allowedRoles: ['customer', 'user', 'admin'] }
    },
    {
      path: '/booking/:id?',
      name: 'booking',
      component: Booking,
      meta: { requiresAuth: true, allowedRoles: ['customer', 'user', 'admin'] }
    },
    {
      path: '/bookings/:id?',
      name: 'user-booking',
      component: UserBookings,
      meta: { requiresAuth: true, allowedRoles: ['customer', 'user', 'admin'] }
    },
    {
      path: '/my-bookings',
      name: 'my-bookings',
      component: UserBookings,
      meta: { requiresAuth: true, allowedRoles: ['customer', 'user', 'admin'] }
    },
    {
      path: '/user/profile',
      name: 'user-profile',
      component: SettingUser,
      meta: { requiresAuth: true, allowedRoles: ['customer', 'user', 'admin'] }
    },

    {
      path: '/settings',
      name: 'settings',
      component: SettingUser,
      meta: { requiresAuth: true, allowedRoles: ['customer', 'user', 'admin'] }
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: UserNotifications,
      meta: { requiresAuth: true, allowedRoles: ['customer', 'user', 'admin'] }
    },
    {
      path: '/vehicles',
      name: 'vehicles-by-shop',
      component: VehiclesByShop,
      meta: { requiresAuth: false, allowedRoles: ['customer', 'user', 'admin'] }
    },
    {
      path: '/vehicles/:id',
      name: 'vehicle-detail',
      component: VehicleDetail,
      meta: { requiresAuth: true, allowedRoles: ['customer', 'shop_owner', 'admin'] }
    },
    {
      path: '/shop/:id/vehicles',
      name: 'shop-vehicles',
      component: ShopVehicles,
      meta: { requiresAuth: false, allowedRoles: ['customer', 'user', 'admin'] }
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/login'
    }
  ]
});

// Navigation guard
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const isGuestOnly = to.matched.some(record => record.meta.guest);
  // Get allowedRoles from the LAST matched record (most specific route)
  const allowedRoles = [...to.matched].reverse().find(record => record.meta.allowedRoles)?.meta.allowedRoles || [];
  const isAuth = isAuthenticated();
  const userRole = getUserRole();

  if (requiresAuth && !isAuth) {
    next('/login');
    return;
  }

  if (isGuestOnly && isAuth) {
    const allowAuthenticated = to.matched.some(record => record.meta.allowAuthenticated);
    if (allowAuthenticated) {
      next();
      return;
    }
    if (userRole === 'admin') {
      next('/admin');
    } else if (userRole === 'shop_owner') {
      next('/dashboard');
    } else {
      next('/view_shop');
    }
    return;
  }

  if (requiresAuth && isAuth && allowedRoles.length > 0) {
    if (!allowedRoles.includes(userRole)) {
      if (userRole === 'admin') {
        next('/admin');
      } else if (userRole === 'shop_owner') {
        next('/dashboard');
      } else {
        next('/view_shop');
      }
      return;
    }
  }

  next();
});

export default router;
