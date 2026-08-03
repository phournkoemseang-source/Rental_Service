<template>
  <div class="receipt-container" id="receipt-content">
    <div class="receipt-card">
      <!-- High-Fidelity Blue Header -->
      <div class="receipt-header-blue">
        <div class="brand-section">
          <h1 class="brand-logo-white">CHONG CHOUL</h1>
          <p class="brand-tagline-white">{{ $t('poweredByMvl') }}</p>
        </div>
        <div class="receipt-title-kh-white">វិក្កយបត្រ</div>
      </div>

      <!-- Main Amount with Blue Highlight -->
      <div class="amount-section-highlight">
        <div class="amount-label-kh">{{ $t('totalAmount') }}</div>
        <div class="main-amount-blue">
          <span class="currency">$</span>{{ totalAmount.toFixed(2) }}
        </div>
        <div :class="['payment-status-badge-fancy', paymentStatus]">
          {{ paymentStatus === 'paid' ? 'បានបង់ប្រាក់ / PAID' : 'បង់ប្រាក់ពេលក្រោយ / PAY LATER' }}
        </div>
      </div>

      <!-- Breakdown Details -->
      <div class="details-section">
        <!-- New breakdown requested by user -->
        <div class="detail-row">
          <span class="detail-label-kh">{{ $t('originalPrice1Day') }}</span>
          <span class="detail-value">${{ dailyRate.toFixed(2) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label-kh">{{ $t('rentalDuration') }}</span>
          <span class="detail-value">{{ totalDays }} {{ totalDays > 1 ? 'Days' : 'Day' }}</span>
        </div>
        <div class="detail-row" v-if="totalDays > 1">
          <span class="detail-label-kh">{{ $t('additionalDaysPrice') }}</span>
          <span class="detail-value">${{ (subtotal - (dailyRate * (props.riderCount || 1))).toFixed(2) }}</span>
        </div>

        <div class="total-divider"></div>

        <div class="detail-row">
          <span class="detail-label-kh">{{ $t('vehicleSubtotal') }}</span>
          <span class="detail-value">${{ subtotal.toFixed(2) }}</span>
        </div>
        <div class="detail-row" v-if="insurance > 0">
          <span class="detail-label-kh">{{ $t('insurance') }}</span>
          <span class="detail-value">${{ insurance.toFixed(2) }}</span>
        </div>
        <div class="detail-row discount" v-if="discount > 0">
          <span class="detail-label-kh">{{ $t('discount2') }}</span>
          <span class="detail-value">-${{ discount.toFixed(2) }}</span>
        </div>
        <div class="total-divider"></div>
        <div class="detail-row total-row-fancy">
          <span class="detail-label-kh bold">{{ $t('grandTotal') }}</span>
          <span class="detail-value bold-blue">${{ totalAmount.toFixed(2) }}</span>
        </div>
      </div>


      <!-- Information Grid -->
      <div class="info-grid-fancy">
        <div class="info-item">
          <div class="info-label-kh-small">{{ $t('dateTime') }}</div>
          <div class="info-value-dark">{{ dateTime }}</div>
        </div>
        <div class="info-item">
          <div class="info-label-kh-small">{{ $t('shopOwner2') }}</div>
          <div class="info-value-dark verified">
            {{ ownerName }} <i class="fas fa-check-circle check-icon"></i>
          </div>
        </div>
        <div class="info-item">
          <div class="info-label-kh-small">{{ $t('vehicle2') }}</div>
          <div class="info-value-dark">{{ vehicleName }}</div>
        </div>
        <div class="info-item">
          <div class="info-label-kh-small">{{ $t('licensePlate') }}</div>
          <div class="info-value-dark plate-tag">{{ plateNumber }}</div>
        </div>
        <div class="info-item full-width">
          <div class="info-label-kh-small">{{ $t('pickupLocation') }}</div>
          <div class="info-value-dark">
            <i class="fas fa-map-marker-alt map-icon-blue"></i> {{ address }}
          </div>
        </div>
        <div class="info-item">
          <div class="info-label-kh-small">{{ $t('paymentMethod2') }}</div>
          <div class="info-value-dark">{{ paymentMethodLabel }}</div>
        </div>
        <div class="info-item">
          <div class="info-label-kh-small">{{ $t('phoneNumber2') }}</div>
          <div class="info-value-dark">{{ customerPhone || 'N/A' }}</div>
        </div>
        <div class="info-item">
          <div class="info-label-kh-small">{{ $t('bookingId2') }}</div>
          <div class="info-value-dark">#{{ bookingId }}</div>
        </div>
      </div>

      <!-- Footer -->
      <div class="receipt-footer-fancy">
        <div class="footer-brand-dark">CHONG CHOUL</div>
        <div class="support-email-gray">{{ $t('supportChongchoulCom') }}</div>
        <div class="social-icons-blue">
          <i class="fab fa-facebook"></i>
          <i class="fab fa-instagram"></i>
        </div>
        <div class="thanks-note">{{ $t('thankYouForYourBooking') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  bookingId: { type: [String, Number], default: '' },
  totalAmount: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },
  insurance: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  dailyRate: { type: Number, default: 0 },
  totalDays: { type: Number, default: 1 },
  riderCount: { type: Number, default: 1 },
  dateTime: { type: String, default: () => new Date().toLocaleString() },
  ownerName: { type: String, default: 'CHANTHEN ORN' },
  customerPhone: { type: String, default: '' },
  vehicleName: { type: String, default: 'Koemseang' },
  plateNumber: { type: String, default: 'N/A' },
  address: { type: String, default: 'Phnom Penh' },
  paymentMethod: { type: String, default: 'Cash' },
  paymentStatus: { type: String, default: 'pending' }
});

const paymentMethodLabel = computed(() => {
  if (props.paymentMethod === 'qr') return 'QR Code';
  if (props.paymentMethod === 'later') return 'Pay Later';
  if (props.paymentMethod === 'bank_transfer') return 'Bank Transfer';
  return props.paymentMethod;
});
</script>

<style scoped>
.receipt-container {
  display: flex;
  justify-content: center;
  padding: 10px;
  /* keep container transparent so the modal's white background shows fully */
  background-color: transparent;
  font-family: 'Inter', 'Kantumruy Pro', sans-serif;
}

.receipt-card {
  width: 100%;
  max-width: 480px;
  background: white;
  margin-top: 14px;
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

/* Blue Header Style */
.receipt-header-blue {
  background: linear-gradient(135deg, #0066ff 0%, #0052cc 100%);
  padding: 25px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
}


.brand-logo-white {
  color: white;
  font-weight: 900;
  font-size: 22px;
  margin: 0;
  letter-spacing: -0.5px;
}

.brand-tagline-white {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.8);
  margin: 2px 0 0;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.receipt-title-kh-white {
  font-family: 'Kantumruy Pro', sans-serif;
  color: white;
  font-weight: 700;
  font-size: 18px;
}

/* Amount Section Style */
.amount-section-highlight {
  padding: 30px 25px;
  text-align: center;
  background-color: #f8fbff;
  border-bottom: 1px dashed #cbd5e1;
}

.amount-label-kh {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 10px;
}

.main-amount-blue {
  font-size: 42px;
  font-weight: 900;
  color: #0f172a;
  margin-bottom: 15px;
}

.currency {
  font-size: 24px;
  vertical-align: super;
  margin-right: 4px;
  color: #0066ff;
}

.payment-status-badge-fancy {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.payment-status-badge-fancy.paid {
  background-color: #dcfce7;
  color: #15803d;
}

.payment-status-badge-fancy.pending {
  background-color: #fef3c7;
  color: #92400e;
}

/* Details Style */
.details-section {
  padding: 25px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
}

.detail-label-kh {
  color: #64748b;
}

.detail-value {
  font-weight: 600;
  color: #1e293b;
}

.detail-row.discount .detail-value {
  color: #ef4444;
}

.total-divider {
  height: 1px;
  background-color: #e2e8f0;
  margin: 15px 0;
}

.total-row-fancy {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}

.bold-blue {
  font-weight: 900;
  color: #0066ff;
  font-size: 20px;
}

/* Grid Style */
.info-grid-fancy {
  padding: 0 25px 25px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.info-item.full-width {
  grid-column: span 2;
}

.info-label-kh-small {
  font-size: 10px;
  color: #94a3b8;
  margin-bottom: 5px;
  text-transform: uppercase;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.info-value-dark {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}

.info-value-dark.verified {
  display: flex;
  align-items: center;
  gap: 5px;
}

.check-icon {
  color: #10b981;
  font-size: 14px;
}

.plate-tag {
  background: #f1f5f9;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}

.map-icon-blue {
  color: #0066ff;
  margin-right: 4px;
}

/* Footer Style */
.receipt-footer-fancy {
  background-color: #f8fafc;
  padding: 25px;
  text-align: center;
  border-top: 1px solid #f1f5f9;
}

.footer-brand-dark {
  font-weight: 800;
  color: #475569;
  margin-bottom: 5px;
  font-size: 16px;
}

.support-email-gray {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 15px;
}

.social-icons-blue {
  display: flex;
  justify-content: center;
  gap: 20px;
  color: #0066ff;
  font-size: 20px;
  margin-bottom: 15px;
}

.thanks-note {
  font-size: 11px;
  color: #94a3b8;
  font-style: italic;
}

@media print {
  .receipt-container {
    background: white;
    padding: 0;
  }
  .receipt-card {
    box-shadow: none;
    border: none;
  }
}
</style>
