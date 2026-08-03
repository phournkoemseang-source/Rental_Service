<template>
  <section class="shop-dashboard">
    <!-- Onboarding: No Shop Yet -->
    <div v-if="!hasShop" class="onboarding-card animate-fade-in-up">
      <div class="onboarding-main">
        <div class="onboarding-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
            <path d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
          </svg>
        </div>
        <h2>{{ $t('welcomeToDashboard') }}</h2>
        <p>{{ $t('createYourShopProfileAddVehiclesAndStartReceivingBookingsInJustAFewMinutes') }}</p>
        <button type="button" class="action-btn action-btn--primary" @click="$emit('create-shop')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <path d="M12 5v14M5 12h14"/>
          </svg>{{ $t('createShop') }}</button>
      </div>
      <div class="stepper-track">
        <div class="onboarding-steps">
          <div class="step">
            <span class="step-circle">1</span>
            <span class="step-label">{{ $t('createShopProfile') }}</span>
            <span class="step-line" aria-hidden="true"></span>
          </div>
          <div class="step">
            <span class="step-circle">2</span>
            <span class="step-label">{{ $t('addVehicles') }}</span>
            <span class="step-line" aria-hidden="true"></span>
          </div>
          <div class="step">
            <span class="step-circle">3</span>
            <span class="step-label">{{ $t('receiveBookings') }}</span>
          </div>
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
  padding: 0;
  max-width: 100%;
  margin: 0;
}

/* ─── Onboarding — Clean Hero ──────────────────────────────────── */
.onboarding-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 32px 52px;
  background: #ffffff;
  border-radius: 20px;
  border: 1px solid #eef0f4;
  width: 100%;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}

.onboarding-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #2563eb, #3b82f6);
}

.onboarding-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  margin-bottom: 32px;
}

.onboarding-icon {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.25);
  margin-bottom: 20px;
}

.onboarding-icon svg {
  width: 32px;
  height: 32px;
}

.onboarding-card h2 {
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 12px;
  letter-spacing: -0.02em;
}

.onboarding-card p {
  font-size: 0.95rem;
  color: #475569;
  max-width: 460px;
  margin: 0 0 28px;
  line-height: 1.6;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 32px;
  border-radius: 14px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  border: none;
  transition: all 250ms ease;
}

.action-btn--primary {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.3);
}

.action-btn--primary:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 10px 30px rgba(37, 99, 235, 0.4);
}

.action-btn--primary:active {
  transform: translateY(-1px) scale(0.98);
}

.action-btn svg {
  transition: transform 0.2s ease;
}

.action-btn--primary:hover svg {
  transform: rotate(90deg);
}

/* ─── Stepper Track ───────────────────────────────────────────── */
.stepper-track {
  width: 100%;
  max-width: 720px;
  background: #f8fafc;
  border-radius: 16px;
  padding: 24px 20px;
  border: 1px solid #eef0f4;
}

/* ─── Stepper ─────────────────────────────────────────────────── */
.onboarding-steps {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 0;
  margin-top: 0;
  width: 100%;
  max-width: 640px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  flex: 1;
  position: relative;
}

.step-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
  z-index: 1;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
}

.step-label {
  font-size: 0.8rem;
  color: #374151;
  font-weight: 600;
  text-align: center;
  line-height: 1.4;
  padding: 0 6px;
}

.step-line {
  position: absolute;
  top: 20px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: #cbd5e1;
  z-index: 0;
}

.step:last-child .step-line {
  display: none;
}

/* ─── Stats Grid ─────────────────────────────────────────────── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  padding: 14px 16px;
  text-align: center;
  transition: transform 200ms ease, box-shadow 200ms ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.stat-icon {
  width: 32px;
  height: 32px;
  margin: 0 auto 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon--blue { background: #eff6ff; color: #2563eb; }
.stat-icon--green { background: #f0fdf4; color: #16a34a; }
.stat-icon--orange { background: #fff7ed; color: #ea580c; }
.stat-icon--purple { background: #f5f3ff; color: #7c3aed; }

.stat-value {
  font-size: 1.15rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.1;
  margin-bottom: 2px;
}

.stat-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ─── Section Title ──────────────────────────────────────────── */
.section-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 12px;
}

/* ─── Action Cards Grid ──────────────────────────────────────── */
.action-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 16px;
  background: #fff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 200ms ease;
  text-align: left;
  font-family: inherit;
}

.action-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.07);
  border-color: #2563eb;
}

.action-card-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-card-icon svg {
  width: 20px;
  height: 20px;
}

.action-card-icon--blue { background: #eff6ff; color: #2563eb; }
.action-card-icon--green { background: #f0fdf4; color: #16a34a; }
.action-card-icon--orange { background: #fff7ed; color: #ea580c; }
.action-card-icon--purple { background: #f5f3ff; color: #7c3aed; }

.action-card-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #0f172a;
}

.action-card-desc {
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.4;
}

/* ─── Activity List ──────────────────────────────────────────── */
.activity-list {
  background: #fff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  padding: 12px;
}

.activity-empty {
  text-align: center;
  padding: 24px;
  color: #94a3b8;
  font-size: 0.82rem;
}

.activity-item {
  display: flex;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #2563eb;
  margin-top: 4px;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
}

.activity-action {
  font-size: 0.8rem;
  color: #1e293b;
  margin-bottom: 2px;
}

.activity-time {
  font-size: 0.72rem;
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
  .onboarding-card {
    padding: 36px 20px 44px;
    border-radius: 20px;
  }
  .onboarding-card h2 {
    font-size: 1.3rem;
  }
  .onboarding-card p {
    font-size: 0.88rem;
  }
  .stepper-track {
    padding: 20px 14px;
    border-radius: 14px;
  }
  .onboarding-steps {
    flex-direction: column;
    align-items: center;
    gap: 14px;
    width: 100%;
    max-width: 280px;
  }
  .step {
    flex-direction: row;
    justify-content: center;
    width: 100%;
    gap: 10px;
  }
  .step-line {
    display: none;
  }
  .onboarding-icon {
    width: 64px;
    height: 64px;
  }
  .onboarding-icon svg {
    width: 28px;
    height: 28px;
  }
  .action-btn {
    padding: 12px 24px;
    font-size: 0.88rem;
  }
  .step-circle {
    width: 36px;
    height: 36px;
    font-size: 0.85rem;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  .stat-card {
    display: flex;
    align-items: center;
    gap: 12px;
    text-align: left;
    padding: 12px;
  }
  .stat-icon {
    margin: 0;
  }
  .stat-value {
    font-size: 1.05rem;
  }
  .shop-dashboard {
    padding: 10px;
  }
}
</style>
