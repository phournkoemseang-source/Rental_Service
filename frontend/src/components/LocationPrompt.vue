<template>
  <transition name="location-pop">
    <div
      v-if="show"
      class="location-popup-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-title"
      aria-describedby="location-message"
    >
      <div class="location-popup-card" :class="{ 'is-loading': loading }">
        <div class="status-icon" aria-hidden="true">
          <i v-if="loading" class="fa-solid fa-spinner fa-spin"></i>
          <template v-else>
            <span class="cross-line cross-line--one"></span>
            <span class="cross-line cross-line--two"></span>
          </template>
        </div>

        <h2 id="location-title">{{ $t('enableLocation') }}</h2>
        <p id="location-message" class="subtitle">{{ $t('allowLocationSoWeCanShowShopsNearYou') }}</p>
        <p class="detail-text">{{ $t('yourLocationIsOnlyUsedToImproveNearbyShopResultsAndRouteAccuracy') }}</p>

        <div class="actions">
          <button type="button" class="cancel-btn" @click="$emit('close')" :disabled="loading">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            <span>{{ $t('cancel') }}</span>
          </button>
          <button type="button" class="allow-btn" @click="$emit('confirm')" :disabled="loading">
            <i class="fa-solid fa-check" aria-hidden="true"></i>
            <span>{{ loading ? 'Allowing...' : 'Allow' }}</span>
          </button>
        </div>

        <p v-if="error" class="error-text">{{ error }}</p>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
})

defineEmits(['confirm', 'close'])
</script>

<style scoped>
.location-popup-overlay {
  position: fixed;
  inset: 0;
  z-index: 100000;
  background: radial-gradient(circle at 50% 0%, rgba(15, 23, 42, 0.32), rgba(2, 6, 23, 0.72));
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
}

.location-popup-card {
  width: min(470px, 100%);
  border-radius: 20px;
  padding: 24px 22px 20px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 24px 42px rgba(2, 6, 23, 0.34);
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 8px;
}

.status-icon {
  width: 78px;
  height: 78px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, #fce7e7 0%, #fde2e2 100%);
  color: #dc2626;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7), 0 12px 20px rgba(220, 38, 38, 0.16);
  position: relative;
}

.status-icon::after {
  content: '';
  position: absolute;
  inset: 6px;
  border-radius: 999px;
  border: 1px solid rgba(220, 38, 38, 0.18);
}

.cross-line {
  position: absolute;
  width: 30px;
  height: 4px;
  border-radius: 999px;
  background: #dc2626;
}

.cross-line--one {
  transform: rotate(45deg);
}

.cross-line--two {
  transform: rotate(-45deg);
}

.status-icon i {
  font-size: 1.45rem;
  z-index: 1;
}

h2 {
  margin: 4px 0 0;
  color: #1e293b;
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1.15;
}

.subtitle {
  margin: 0;
  color: #64748b;
  font-size: 1.02rem;
  line-height: 1.35;
  font-weight: 500;
  max-width: 390px;
}

.detail-text {
  margin: 0;
  color: #94a3b8;
  font-size: 0.94rem;
  line-height: 1.5;
  max-width: 390px;
}

.error-text {
  margin: 2px 0 0;
  width: 100%;
  color: #991b1b;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.86rem;
}

.actions {
  margin-top: 14px;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}


.cancel-btn,
.allow-btn {
  height: 54px;
  border-radius: 14px;
  border: 1px solid transparent;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.1px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
}

.cancel-btn {
  color: #ffffff;
  background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 10px 18px rgba(220, 38, 38, 0.26);
}

.allow-btn {
  color: #ffffff;
  background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
  box-shadow: 0 10px 18px rgba(22, 163, 74, 0.26);
}

.cancel-btn i,
.allow-btn i {
  font-size: 0.95rem;
}

.cancel-btn:hover:not(:disabled),
.allow-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.02);
}

.allow-btn:disabled,
.cancel-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.is-loading .status-icon {
  color: #2563eb;
  background: linear-gradient(180deg, #dbeafe 0%, #e2e8f0 100%);
}

@media (max-width: 640px) {
  .location-popup-card {
    width: min(380px, 100%);
    padding: 20px 14px 16px;
    border-radius: 18px;
  }

  .status-icon {
    width: 68px;
    height: 68px;
  }

  .cross-line {
    width: 25px;
    height: 3.4px;
  }

  .status-icon i {
    font-size: 1.25rem;
  }

  h2 {
    font-size: 1.45rem;
  }

  .subtitle {
    font-size: 0.95rem;
  }

  .detail-text {
    font-size: 0.86rem;
  }

  .actions {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .cancel-btn,
  .allow-btn {
    height: 46px;
    font-size: 0.95rem;
  }
}

.location-pop-enter-active,
.location-pop-leave-active {
  transition: opacity 0.24s ease;
}

.location-pop-enter-from,
.location-pop-leave-to {
  opacity: 0;
}
</style>
