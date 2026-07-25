<template>
  <section class="shop-dashboard">
    <!-- Onboarding: No Shop Yet -->
    <div v-if="!hasShop" class="onboarding-card animate-fade-in-up">
      <div class="onboarding-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
          <path d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
        </svg>
      </div>
      <h2>{{ $t('welcomeToDashboard') }}</h2>
      <p>{{ $t('onboardingDesc') }}</p>
      <button type="button" class="action-btn action-btn--primary" @click="$emit('create-shop')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        {{ $t('createShopBtn') }}
      </button>
      <div class="onboarding-steps">
        <div class="step">
          <span class="step-num">1</span>
          <span>{{ $t('step1Onboard') }}</span>
        </div>
        <div class="step">
          <span class="step-num">2</span>
          <span>{{ $t('step2Onboard') }}</span>
        </div>
        <div class="step">
          <span class="step-num">3</span>
          <span>{{ $t('step3Onboard') }}</span>
        </div>
      </div>
    </div>

    <!-- Dashboard Content -->
    <div v-else class="dashboard-content">
      <!-- Quick Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon stat-icon--blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
              <rect x="3" y="4" width="18" height="17" rx="2"/>
              <path d="M8 2v4M16 2v4M3 10h18"/>
              <path d="m9.5 15 2 2 4-4"/>
            </svg>
          </div>
          <div class="stat-value">{{ totalBookings }}</div>
          <div class="stat-label">{{ $t('totalBookings') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
              <rect x="3" y="6" width="18" height="14" rx="2"/>
              <path d="M3 10h18"/>
              <path d="M16 14h3"/>
            </svg>
          </div>
          <div class="stat-value">${{ formatCurrency(totalEarnings) }}</div>
          <div class="stat-label">{{ $t('totalEarnings') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon--orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
              <circle cx="6.5" cy="17.5" r="3.5"/>
              <circle cx="17.5" cy="17.5" r="3.5"/>
              <path d="M7 17.5h4.5l2.5-4.5h3.5"/>
              <path d="M14 13h2.8l1.8 3.2"/>
            </svg>
          </div>
          <div class="stat-value">{{ totalVehicles }}</div>
          <div class="stat-label">{{ $t('myVehicles') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon--purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
              <path d="M12 3 5 6v6c0 4.8 3 7.8 7 9 4-1.2 7-4.2 7-9V6z"/>
              <path d="M12 9v4"/>
              <circle cx="12" cy="16.5" r=".9"/>
            </svg>
          </div>
          <div class="stat-value">{{ averageRating }}</div>
          <div class="stat-label">{{ $t('rating') }}</div>
        </div>
      </div>

      <!-- Big Action Cards -->
      <h3 class="section-title">{{ $t('quickActions') }}</h3>
      <div class="action-cards">
        <button type="button" class="action-card" @click="$emit('navigate', 'vehicles')">
          <span class="action-card-icon action-card-icon--blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28">
              <circle cx="6.5" cy="17.5" r="3.5"/>
              <circle cx="17.5" cy="17.5" r="3.5"/>
              <path d="M7 17.5h4.5l2.5-4.5h3.5"/>
              <path d="M14 13h2.8l1.8 3.2"/>
            </svg>
          </span>
          <span class="action-card-title">{{ $t('addNewVehicle') }}</span>
          <span class="action-card-desc">{{ $t('addVehicleDesc') }}</span>
        </button>

        <button type="button" class="action-card" @click="$emit('navigate', 'bookings')">
          <span class="action-card-icon action-card-icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28">
              <rect x="3" y="4" width="18" height="17" rx="2"/>
              <path d="M8 2v4M16 2v4M3 10h18"/>
              <path d="m9.5 15 2 2 4-4"/>
            </svg>
          </span>
          <span class="action-card-title">{{ $t('viewBookings') }}</span>
          <span class="action-card-desc">{{ $t('viewBookingsDesc') }}</span>
        </button>

        <button type="button" class="action-card" @click="$emit('navigate', 'my-shop')">
          <span class="action-card-icon action-card-icon--orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28">
              <rect x="5" y="3" width="14" height="18" rx="2"/>
              <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>
              <path d="M11 21v-3h2v3"/>
            </svg>
          </span>
          <span class="action-card-title">{{ $t('manageMyShop') }}</span>
          <span class="action-card-desc">{{ $t('manageShopDesc') }}</span>
        </button>

        <button type="button" class="action-card" @click="$emit('navigate', 'payments')">
          <span class="action-card-icon action-card-icon--purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28">
              <rect x="3" y="6" width="18" height="14" rx="2"/>
              <path d="M3 10h18"/>
              <path d="M16 14h3"/>
            </svg>
          </span>
          <span class="action-card-title">{{ $t('viewPayments') }}</span>
          <span class="action-card-desc">{{ $t('viewPaymentsDesc') }}</span>
        </button>
      </div>

      <!-- Recent Activity -->
      <h3 class="section-title">{{ $t('recentActivity') }}</h3>
      <div class="activity-list">
        <div v-if="isLoading" class="activity-empty">{{ $t('loadingActivity') }}</div>
        <div v-else-if="recentActivity.length === 0" class="activity-empty">
          {{ $t('noActivity') }}
        </div>
        <div v-for="item in recentActivity" :key="item.id" class="activity-item">
          <div class="activity-dot"></div>
          <div class="activity-content">
            <p class="activity-action">{{ item.action }}</p>
            <span class="activity-time">{{ item.time }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  hasShop: Boolean,
  totalBookings: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  totalVehicles: { type: Number, default: 0 },
  averageRating: { type: [String, Number], default: '-' },
  isLoading: Boolean,
  recentActivity: { type: Array, default: () => [] }
})

defineEmits(['create-shop', 'navigate'])

const formatCurrency = (value) => {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return '0'
  return number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.shop-dashboard {
  padding: 24px;
  max-width: 960px;
  margin: 0 auto;
}

/* ─── Onboarding ─────────────────────────────────────────────── */
.onboarding-card {
  text-align: center;
  padding: 48px 32px;
  background: linear-gradient(135deg, #ffffff, #f8fafc);
  border-radius: 24px;
  border: 2px dashed #cbd5e1;
  max-width: 560px;
  margin: 40px auto;
}

.onboarding-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2563eb;
}

.onboarding-card h2 {
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 12px;
}

.onboarding-card p {
  font-size: 0.95rem;
  color: #64748b;
  max-width: 400px;
  margin: 0 auto 28px;
  line-height: 1.6;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  border-radius: 14px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  border: none;
  transition: all 200ms ease;
}

.action-btn--primary {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
}

.action-btn--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
}

.onboarding-steps {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 32px;
  flex-wrap: wrap;
}

.step {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  color: #475569;
}

.step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #dbeafe;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.82rem;
}

/* ─── Stats Grid ─────────────────────────────────────────────── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  padding: 20px;
  text-align: center;
}

.stat-icon {
  width: 44px;
  height: 44px;
  margin: 0 auto 12px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon--blue { background: #eff6ff; color: #2563eb; }
.stat-icon--green { background: #f0fdf4; color: #16a34a; }
.stat-icon--orange { background: #fff7ed; color: #ea580c; }
.stat-icon--purple { background: #f5f3ff; color: #7c3aed; }

.stat-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ─── Section Title ──────────────────────────────────────────── */
.section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 16px;
}

/* ─── Action Cards Grid ──────────────────────────────────────── */
.action-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 24px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 200ms ease;
  text-align: left;
  font-family: inherit;
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border-color: #2563eb;
}

.action-card-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-card-icon--blue { background: #eff6ff; color: #2563eb; }
.action-card-icon--green { background: #f0fdf4; color: #16a34a; }
.action-card-icon--orange { background: #fff7ed; color: #ea580c; }
.action-card-icon--purple { background: #f5f3ff; color: #7c3aed; }

.action-card-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
}

.action-card-desc {
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.4;
}

/* ─── Activity List ──────────────────────────────────────────── */
.activity-list {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  padding: 16px;
}

.activity-empty {
  text-align: center;
  padding: 32px;
  color: #94a3b8;
  font-size: 0.9rem;
}

.activity-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #2563eb;
  margin-top: 5px;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
}

.activity-action {
  font-size: 0.9rem;
  color: #1e293b;
  margin-bottom: 2px;
}

.activity-time {
  font-size: 0.78rem;
  color: #94a3b8;
}

/* ─── Responsive ─────────────────────────────────────────────── */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .action-cards {
    grid-template-columns: 1fr;
  }
  .onboarding-steps {
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  .shop-dashboard {
    padding: 16px;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  .stat-card {
    display: flex;
    align-items: center;
    gap: 16px;
    text-align: left;
    padding: 16px;
  }
  .stat-icon {
    margin: 0;
  }
  .stat-value {
    font-size: 1.25rem;
  }
}
</style>
