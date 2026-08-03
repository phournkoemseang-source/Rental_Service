<template>
  <MobileCustomerLayout
    :title="vehicleName || 'Vehicle Detail'"
    :show-back="true"
    back-to="/view_shop"
  >
    <div class="motoride-container">
      <UserNavbar
        :nav-items="navItems"
        :show-fallback-message="false"
        @logout-request="handleLogout"
      />

      <main class="content">
      <p v-if="isLoading" class="action-message">{{ $t('loadingVehicleDetails') }}</p>
      <p v-else-if="loadingError" class="action-message">{{ loadingError }}</p>

      <template v-else>
        <!-- Top Row: Image Vehicle and Booking Details -->   
        <div class="top-row">
          <div class="detail-left">
            <section class="image-vehicle">
              <img :src="vehicleImage" :alt="vehicleName" class="main-img" />
              <div class="image-overlay">
                <button class="btn-reset image-zoom-btn" @click="openImageModal">
                  <i class="fas fa-search-plus"></i>
                </button>
                <button class="btn-reset image-favorite-btn" @click="toggleFavorite">
                  <i :class="isFavorite ? 'fas fa-heart' : 'far fa-heart'"></i>
                </button>
              </div>
              <div class="gallery-controls">
                <div class="dots">
                  <span v-for="(dot, index) in 3" :key="index" 
                        :class="{ active: index === currentImageIndex }"
                        @click="setImageIndex(index)"></span>
                </div>
                <button class="view-all" @click="viewAllPhotos">
                  <i class="fas fa-images"></i>{{ $t('viewAllPhotos') }}</button>
              </div>
            </section>
            <section class="detail-hero">
              <div class="name-label">
                <h2>{{ vehicleName }}</h2>
                <p class="vehicle-meta">{{ vehicleShopName }} • {{ vehicleRating }} ★</p>
              </div>

              <div class="chip-row">
                <span class="chip">
                  <i class="fas fa-cog"></i>
                  {{ vehicleTransmission }}
                </span>
                <span class="chip">
                  <i class="fas fa-gas-pump"></i>
                  {{ vehicleFuel }}
                </span>
                <span class="chip">
                  <i class="fas fa-motorcycle"></i>
                  {{ vehicleType }}
                </span>
              </div>
            </section>
          </div>


          <aside class="booking-details">
            <div class="booking-card-header">
              <div class="header-icon">
                <i class="fas fa-calendar-check"></i>
              </div>
              <div class="header-text">
                <h3>{{ $t('bookingDetails') }}</h3>
                <p class="booking-card-subtitle">{{ $t('selectOptionsAndReviewTheTotal') }}</p>
              </div>
            </div>
            
            <div class="price-row">
              <span class="price-label">
                <i class="fas fa-calendar"></i>{{ $t('duration') }}</span>
              <select v-model.number="bookingDuration" class="rider-select">
                <option :value="1">{{ $t('1Day') }}</option>
                <option :value="2">{{ $t('2Days') }}</option>
                <option :value="3">{{ $t('3Days') }}</option>
                <option :value="4">{{ $t('4Days') }}</option>
                <option :value="5">{{ $t('5Days') }}</option>
                <option :value="10">{{ $t('10Days') }}</option>
                <option :value="30">{{ $t('30Days') }}</option>
              </select>
            </div>
            <div class="price-row">
              <span class="price-label">
                <i class="fas fa-tag"></i>{{ $t('dailyRate2') }}</span>
              <span class="price-value">{{ formatCurrency(dailyRate) }}</span>
            </div>
            <div class="price-row">
              <span class="price-label">
                <i class="fas fa-users"></i>{{ $t('riderDetails') }}</span>
              <span class="rider-info">{{ riderDetails }}</span>
            </div>
            <div class="price-row price-row-toggle">
               <label class="toggle-label">
                 <input v-model="includeInsurance" class="toggle-checkbox" type="checkbox" />
                 <span class="toggle-text">
                   <i class="fas fa-shield-alt"></i>{{ $t('insuranceFee2') }}</span>
               </label>
             </div>
            <div class="total-row">
              <span class="total-label">
                <i class="fas fa-calculator"></i>{{ $t('totalPrice') }}</span>
              <span class="price-blue">{{ formatCurrency(totalPrice) }}</span>
            </div>
            <button class="book-btn" @click="goToBooking">
               <i class="fas fa-check-circle"></i>{{ $t('booking') }}</button>            <p class="disclaimer">{{ $t('noPaymentTakenUntilBookingIsConfirmed') }}</p>
          </aside>
        </div>

        <transition name="fade">
          <div
            v-if="showImageModalFlag"
            class="image-modal-overlay"
            @click.self="closeImageModal"
          >
            <div class="image-modal-content">
              <button class="btn-reset image-modal-close" @click="closeImageModal">
                <i class="fas fa-times"></i>
              </button>
              <img :src="vehicleImage" :alt="vehicleName" class="image-modal-img" />
            </div>
          </div>
        </transition>


        <!-- Middle Section: Name Label and Content Boxes -->
        <div class="middle-section">
          <!-- Two Side-by-Side Boxes -->
          <div class="two-box-row">
            <div class="content-box">
              <h4>
                <i class="fas fa-list-ul"></i>{{ $t('specifications') }}</h4>
              <div class="spec-list">
                <div class="spec-item">
                  <span class="spec-label">
                    <i class="fas fa-cog"></i>{{ $t('transmission') }}</span>
                  <span class="spec-value">{{ vehicleTransmission }}</span>
                </div>
                <div class="spec-item">
                  <span class="spec-label">
                    <i class="fas fa-gas-pump"></i>{{ $t('fuelType') }}</span>
                  <span class="spec-value">{{ vehicleFuel }}</span>
                </div>
                <div class="spec-item">
                  <span class="spec-label">
                    <i class="fas fa-motorcycle"></i>{{ $t('vehicleType') }}</span>
                  <span class="spec-value">{{ vehicleType }}</span>
                </div>
              </div>
            </div>

            <div class="content-box">
              <h4>
                <i class="fas fa-star"></i>{{ $t('features') }}</h4>
              <div class="feature-list">
                <div class="feature-item">
                  <i class="fas fa-map-marked-alt"></i>{{ $t('gpsNavigation') }}</div>
                <div class="feature-item">
                  <i class="fas fa-mobile-alt"></i>{{ $t('phoneMount') }}</div>
                <div class="feature-item">
                  <i class="fas fa-suitcase"></i>{{ $t('luggageStorage') }}</div>
                <div class="feature-item">
                  <i class="fas fa-headset"></i>{{ $t('247Support') }}</div>
              </div>
            </div>
          </div>

          <!-- Full Width Box -->
          <div class="full-width-box">
            <h4>
              <i class="fas fa-crown"></i>{{ $t('premiumRentalBenefits') }}</h4>
            <div class="benefits-grid">
              <div class="benefit-item">
                <i class="fas fa-tools"></i>
                <span>{{ $t('topOfTheLineMaintenance') }}</span>
              </div>
              <div class="benefit-item">
                <i class="fas fa-shield-alt"></i>
                <span>{{ $t('comprehensiveInsuranceCoverage') }}</span>
              </div>
              <div class="benefit-item">
                <i class="fas fa-headset"></i>
                <span>{{ $t('dedicatedCustomerSupport') }}</span>
              </div>
              <div class="benefit-item">
                <i class="fas fa-road"></i>
                <span>{{ $t('ultimateRidingAdventure') }}</span>
              </div>
            </div>
            <p>{{ $t('experienceTheUltimateRidingAdventureWithOurPremiumRentalServiceEnjoyTopOfTheLineMaintenanceComprehensiveInsuranceCoverageAndDedicatedCustomerSupportThroughoutYourJourney') }}</p>
          </div>
        </div>


        <!-- Bottom Section: Full Width Box -->
        <div class="bottom-section">
          <div class="full-width-box">
            <h4>
              <i class="fas fa-info-circle"></i>{{ $t('shopDescription') }}</h4>
            <div class="description-highlights">
              <div class="highlight-item">
                <i class="fas fa-check-circle"></i>
                <span>Smooth {{ vehicleTransmission }} ride</span>
              </div>
              <div class="highlight-item">
                <i class="fas fa-leaf"></i>
                <span>{{ vehicleFuel }} efficiency</span>
              </div>
              <div class="highlight-item">
                <i class="fas fa-city"></i>
                <span>{{ $t('perfectForUrbanCommuting') }}</span>
              </div>
              <div class="highlight-item">
                <i class="fas fa-mountain"></i>
                <span>{{ $t('greatForLongDistanceAdventures') }}</span>
              </div>
            </div>
            <p>
              Enjoy the {{ vehicleName }} from
              {{ vehicleShopName || "our partners" }} with a smooth
              {{ vehicleTransmission }} ride and {{ vehicleFuel }} efficiency.
              Perfect for both urban commuting and long-distance adventures,
              this vehicle offers exceptional comfort and reliability.
            </p>
          </div>
        </div>
      </template>
    </main>

    

    <!-- Common Footer -->
    <UserFooter class="detail-page-footer" />
    <!-- Hidden receipt template used to render PDF -->
    <div id="receipt-root" style="display:none">
      <div id="receipt" style="width:768px;padding:28px;font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;">
        <div style="text-align:center;margin-bottom:8px;">
          <div style="font-size:34px;font-weight:800;color:#0b4fd6">CHONG CHOUL</div>
          <div style="font-size:12px;color:#666;margin-top:4px">{{ $t('poweredByMvl2') }}</div>
        </div>

        <h2 style="margin-top:14px;margin-bottom:6px">{{ $t('receipt') }}</h2>
        <div style="font-size:22px;font-weight:800;margin-bottom:8px">{{ $t('paid') }}<span id="receipt-paid-amount"></span></div>

        <div style="display:flex;justify-content:space-between;border-top:1px solid #eee;padding-top:8px;margin-top:8px">
          <div style="flex:1">
            <div id="receipt-trip-details" style="font-size:13px;color:#333"></div>
            <div id="receipt-booking-id" style="font-size:12px;color:#666;margin-top:6px"></div>
            <div id="receipt-address" style="font-size:12px;color:#666;margin-top:6px"></div>
          </div>
          <div style="text-align:right;min-width:180px">
            <div style="font-size:12px;color:#666">{{ $t('dateTime2') }}</div>
            <div id="receipt-datetime" style="font-weight:700;color:#111;margin-top:6px"></div>
            <div style="font-size:12px;color:#666;margin-top:8px">{{ $t('paymentMethod') }}</div>
            <div id="receipt-method" style="font-weight:700;margin-top:6px"></div>
          </div>
        </div>

        <table style="width:100%;margin-top:16px;border-collapse:collapse">
          <tbody>
            <tr>
              <td style="padding:6px 0;color:#666">{{ $t('fare') }}</td>
              <td style="text-align:right;font-weight:700"><span id="receipt-fare"></span></td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666">{{ $t('discount') }}</td>
              <td style="text-align:right;color:#e53e3e">-<span id="receipt-discount"></span></td>
            </tr>
            <tr style="border-top:1px solid #eee">
              <td style="padding:10px 0;font-weight:800">{{ $t('total3') }}</td>
              <td style="text-align:right;font-weight:800"><span id="receipt-total"></span></td>
            </tr>
          </tbody>
        </table>


        <div style="margin-top:18px;font-size:12px;color:#666">{{ $t('supportSupportkhTadaGlobal') }}</div>
      </div>
    </div>
    <footer v-if="false" class="site-footer">
      <div class="footer-wrap">
        <div class="footer-top">
          <div class="footer-brand">
            <div class="footer-brand-title">CHONG CHOUL</div>
            <div class="footer-brand-slogan">{{ $t('secureRidesFastBookings') }}</div>

            <div class="footer-social">
              <button class="btn-reset social-btn" type="button">F</button>
              <button class="btn-reset social-btn" type="button">T</button>
              <button class="btn-reset social-btn" type="button">L</button>
              <button class="btn-reset social-btn" type="button">W</button>
              <button class="btn-reset social-btn" type="button">I</button>
            </div>
            <div class="footer-social-label">{{ $t('socialMedia') }}</div>
          </div>


          <div class="footer-nav">
            <div class="footer-nav-links">
              <button class="btn-reset footer-nav-link" type="button">{{ $t('home') }}</button>
              <button class="btn-reset footer-nav-link" type="button">{{ $t('viewDetail') }}</button>
              <button class="btn-reset footer-nav-link" type="button">{{ $t('booking') }}</button>
              <button class="btn-reset footer-nav-link" type="button">{{ $t('promotion') }}</button>
            </div>

            <div class="footer-about">
              <div class="footer-section-title">{{ $t('aboutUs') }}</div>
              <p>{{ $t('secureFastAndTransparentBookingsAcrossCambodiaWithVerifiedPartners') }}</p>
            </div>
          </div>

          <div class="footer-contact">
            <div class="footer-contact-row">
              <div class="footer-contact-label">{{ $t('call') }}</div>
              <div class="footer-contact-value">+0123 456 789 00</div>
            </div>
            <div class="footer-contact-row">
              <div class="footer-contact-label">{{ $t('email4') }}</div>
              <div class="footer-contact-value">{{ $t('userExampleCom') }}</div>
            </div>

            <div class="footer-newsletter">
              <input class="footer-input" type="text" placeholder="Write Email" />
              <button class="btn-reset footer-send" type="button">➤</button>
            </div>
          </div>
        </div>

        <div class="footer-bottom">
          <span>{{ $t('footerCopyright') }}</span>
          <div class="footer-bottom-links">
            <span>{{ $t('security') }}</span>
            <span>{{ $t('accessibility') }}</span>
            <span>{{ $t('legal') }}</span>
          </div>
        </div>
      </div>
    </footer>
  </div>
  </MobileCustomerLayout>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import api, { vehicleApi, shopApi } from "@/services/api";
import { userService } from "../../services/database.js";
import UserNavbar from '@/components/UserNavbar.vue';
import MobileCustomerLayout from '@/components/MobileCustomerLayout.vue';
import UserFooter from '@/components/UserFooter.vue';
import '@/css/customer-responsive.css';
import '@/css/MyBookings.css';
import {
  parseDateInputValue,
  parseQuantityValue,
} from "@/utils/bookingAvailability";

const router = useRouter();
const route = useRoute();

const navItems = [
  { label: "Home", route: "/view_shop" },
  { label: "My Bookings", route: "/my-bookings" },
  { label: "Profile", route: "/user/profile" },
];
const actionMessage = ref("");
const avatarLoadFailed = ref(false);
const currentUser = computed(() => userService.getCurrentUser());
const activeNavLabel = computed(() => {
  const matchedItem = navItems.find((item) => item.route && route.path.startsWith(item.route));
  return matchedItem?.label || "My Bookings";
});

// Booking confirmation modal
const showBookingConfirm = ref(false);
const showBookingSuccess = ref(false);
const isBooking = ref(false);
const createdBookingRecordId = ref(null);
const bookingFlowState = ref("idle");
let bookingFlowTimer = null;


const normalizeAvatarUrl = (url) => {
  if (!url) return "";
  if (/^(https?:\/\/|data:|blob:)/i.test(url)) return url;
  const normalized = String(url).replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.startsWith("storage/")) return `/${normalized}`;
  return `/storage/${normalized}`;
};

const handleLogout = async () => {
  await userService.logout();
  router.push("/login");
};

const showBookingConfirmModal = () => {
  showBookingConfirm.value = true;
};

const cancelBooking = () => {
  showBookingConfirm.value = false;
};

const clearBookingFlowTimer = () => {
  if (bookingFlowTimer !== null) {
    window.clearTimeout(bookingFlowTimer);
    bookingFlowTimer = null;
  }
};

const waitForBookingFlow = (ms) =>
  new Promise((resolve) => {
    clearBookingFlowTimer();
    bookingFlowTimer = window.setTimeout(() => {
      bookingFlowTimer = null;
      resolve();
    }, ms);
  });

const closeBookingSuccessModal = () => {
  showBookingSuccess.value = false;
  bookingFlowState.value = "idle";
  clearBookingFlowTimer();
  
  // Refresh bookings to update available vehicles count
  refreshAvailableVehicles();
};


// Emit event to refresh available vehicles in parent component
const emit = defineEmits(['refresh-bookings'])

const refreshAvailableVehicles = () => {
  // This will trigger a refresh of the vehicle list with updated booking counts
  emit('refresh-bookings')
}

const parseRouteDate = (value) => {
  const raw = Array.isArray(value) ? value[0] : value;
  return parseDateInputValue(raw) ? String(raw).trim() : "";
};

const selectedBookingStartDate = computed(() => {
  return parseRouteDate(route.query.startDate) || new Date().toISOString().split("T")[0];
});

const selectedBookingEndDate = computed(() => parseRouteDate(route.query.endDate));

const syncBookingDurationFromRoute = () => {
  const startDate = parseRouteDate(route.query.startDate);
  const endDate = parseRouteDate(route.query.endDate);
  if (!startDate || !endDate) return;

  const start = parseDateInputValue(startDate);
  const end = parseDateInputValue(endDate);
  if (!start || !end) return;

  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 0) {
    bookingDuration.value = diffDays;
  }
};

const goToUserDashboard = () => {
  closeBookingSuccessModal();
  router.push({ name: "view_shop" });
};

const goToPaymentPage = () => {
  const currentVehicleId = route.params.id || vehicle.value?.id || 1;
  const query = {
    includeInsurance: includeInsurance.value ? "1" : "0",
    includeTaxes: includeTaxes.value ? "1" : "0",
    totalDays: String(bookingDuration.value),
    startDate: selectedBookingStartDate.value,
  };

  if (selectedBookingEndDate.value) {
    query.endDate = selectedBookingEndDate.value;
  }

  if (riderDetails.value) {
    query.riderDetails = riderDetails.value;
  }

  if (createdBookingRecordId.value) {
    query.bookingRecordId = String(createdBookingRecordId.value);
  }

  closeBookingSuccessModal();
  router.push({ name: "booking", params: { id: currentVehicleId }, query });
};

const confirmBooking = async () => {
  if (!vehicle.value) return;
  
  // Check if vehicle has available stock
  const totalVehicles = vehicle.value.total_vehicles || 1;
  if (totalVehicles <= 0) {
    alert('Sorry, this vehicle is not available for booking.');
    return;
  }
  
  if (bookingDuration.value <= 0) {
    alert("Please select at least 1 day.");
    return;
  }

  const authToken = localStorage.getItem("auth_token") || localStorage.getItem("token");
  if (!authToken || !currentUser.value?.id) {
    alert("Please log in before creating a booking.");
    router.push("/login");
    return;
  }


  isBooking.value = true;
  createdBookingRecordId.value = null;
  showBookingConfirm.value = false;
  showBookingSuccess.value = true;
  bookingFlowState.value = "processing";
  const requestStartedAt = Date.now();
  try {
    const bookingData = {
      user_id: currentUser.value.id,
      vehicle_id: vehicle.value.id,
      shop_id: vehicle.value.shop_id ?? null,
      coupon_id: null,
      start_date: selectedBookingStartDate.value,
      total_days: bookingDuration.value,
      rider_details: riderDetails.value || null,
      daily_rate: Number(dailyRate.value || 0),
      total_price: Number(totalPrice.value || 0),
      status: 'pending',
      deposit_amount: 0,
      deposit_status: 'unpaid',
    };

    const response = await api.post('/bookings', bookingData);
    const record = response?.data?.data || response?.data;
    const recordId = Number(record?.id);
    createdBookingRecordId.value = Number.isFinite(recordId) && recordId > 0 ? recordId : null;
    const elapsed = Date.now() - requestStartedAt;
    const remainingSpinnerTime = Math.max(700 - elapsed, 0);
    if (remainingSpinnerTime > 0) {
      await waitForBookingFlow(remainingSpinnerTime);
    }
    bookingFlowState.value = "success";
    // Generate and download receipt, then show bookings history
    try {
      await downloadReceiptAndShowHistory(record || {});
    } catch (err) {
      // If receipt generation fails, still continue to show success
      console.error('Receipt generation failed', err);
    }


  } catch (error) {
    closeBookingSuccessModal();
    console.error('Booking error:', error);
    const firstValidationMessage = Object.values(error?.response?.data?.errors || {})
      .flat()
      .find(Boolean);
    const message =
      firstValidationMessage ||
      error?.response?.data?.message ||
      (error?.response?.status === 401 ? 'Your session has expired. Please log in again.' : '') ||
      error?.message ||
      'Failed to create booking. Please try again.';
    alert(message);
  } finally {
    isBooking.value = false;
  }
};

// Helpers for receipt generation
const loadExternalScript = (src) =>
  new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) return existing.onload ? resolve() : resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = (e) => reject(e);
    document.head.appendChild(s);
  });

const fillReceiptFields = (data) => {
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KHR', maximumFractionDigits: 0 });
  document.getElementById('receipt-paid-amount').textContent = data.paid_amount_text || fmt.format(data.total_price || 0);
  document.getElementById('receipt-fare').textContent = data.fare_text || fmt.format(data.fare || data.total_price || 0);
  document.getElementById('receipt-discount').textContent = data.discount_text || fmt.format(data.discount || 0);
  document.getElementById('receipt-total').textContent = data.total_text || fmt.format(data.total_price || 0);
  document.getElementById('receipt-datetime').textContent = data.datetime || new Date().toLocaleString();
  document.getElementById('receipt-method').textContent = data.method || 'Cash';
  document.getElementById('receipt-booking-id').textContent = 'Booking ID: ' + (data.booking_id || '—');
  document.getElementById('receipt-address').textContent = data.address || '';
  document.getElementById('receipt-trip-details').textContent = data.trip || '';
};

const openPrintWindow = (html) => {
  const w = window.open('', '_blank');
  if (!w) throw new Error('Unable to open print window');
  w.document.write(html);
  w.document.close();
  w.focus();
  // Delay to allow load, then print
  setTimeout(() => {
    w.print();
  }, 500);
};


const renderReceiptToPdf = async (filename = 'receipt.pdf') => {
  // Try to load html2canvas and jspdf; fallback to print window
  try {
    await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    // @ts-ignore
    const html2canvas = window.html2canvas || window.HTML2CANVAS;
    // @ts-ignore
    const { jsPDF } = window.jspdf || window.jspPDF || window.jspdf;
    const el = document.getElementById('receipt');
    if (!el || !html2canvas || !jsPDF) throw new Error('Missing libs');
    const canvas = await html2canvas(el, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
    pdf.save(filename);
    return true;
  } catch (e) {
    // fallback: open printable window so user can Save as PDF
    const el = document.getElementById('receipt');
    if (!el) throw e;
    openPrintWindow(el.outerHTML);
    return false;
  }
};

const downloadReceiptAndShowHistory = async (bookingRecord = {}) => {
  // Prepare data for receipt
  const data = {
    paid_amount_text: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KHR', maximumFractionDigits: 0 }).format(bookingRecord.total_price || totalPrice.value || 0),
    fare_text: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KHR', maximumFractionDigits: 0 }).format(bookingRecord.daily_rate || dailyRate.value || 0),
    discount_text: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KHR', maximumFractionDigits: 0 }).format(bookingRecord.discount || 0),
    total_text: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KHR', maximumFractionDigits: 0 }).format(bookingRecord.total_price || totalPrice.value || 0),
    datetime: bookingRecord.created_at || new Date().toLocaleString(),
    method: bookingRecord.payment_method || 'Cash',
    booking_id: bookingRecord.id || createdBookingRecordId.value || '',
    address: bookingRecord.address || vehicle.value?.address || vehicleShopName.value || '',
    trip: `${vehicleName.value} • ${bookingDurationLabel.value}`,
  };

  fillReceiptFields(data);
  // file name using booking id if available
  const filename = `receipt_${data.booking_id || Date.now()}.pdf`;
  await renderReceiptToPdf(filename);
  // After download/showing receipt, navigate to My Bookings
  router.push('/my-bookings');
};

// Expose helper so other pages (payment, QR flow) can trigger receipt generation
try { window.generateBookingReceipt = downloadReceiptAndShowHistory; } catch (e) { /* ignore */ }

onBeforeUnmount(() => {
  clearBookingFlowTimer();
});

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api`;
const API_ROOT = API_BASE_URL.replace(/\/api\/?$/, "");
const fallbackImageByType = {
  motorbike:
    "https://i.pinimg.com/1200x/61/68/42/61684256edbd26664520bdfcf379c762.jpg",
  bicycle:
    "https://i.pinimg.com/1200x/2c/90/78/2c9078d8032d2e4ae3e737684317f814.jpg",
  car: "https://i.pinimg.com/1200x/d9/9e/06/d99e06bd9dd77fb2581170af2063b3b5.jpg",
};

const vehicle = ref(null);
const shopNamesById = ref({});
const isLoading = ref(false);
const loadingError = ref("");
const includeInsurance = ref(false);
const includeTaxes = ref(false);
const riderDetails = ref("1 Rider");
const bookingDuration = ref(1);
const currentImageIndex = ref(0);
const isFavorite = ref(false);
const insuranceAmount = ref(0);
const taxesAmount = ref(0);
const vehicleId = computed(() => {
  const value = Number(route.params.id);
  return Number.isFinite(value) && value > 0 ? value : null;
});

const getVehicleName = (item) => {
  const explicitName = String(item?.name || "").trim();
  if (explicitName) return explicitName;

  const fallbackName = [item?.brand, item?.model]
    .filter((part) => String(part || "").trim())
    .join(" ")
    .trim();


  return fallbackName;
};
const getVehicleShop = (item) =>
  item?.shop_id
    ? shopNamesById.value[item.shop_id] || "Unknown Shop"
    : "Unknown Shop";

const getVehicleImage = (item) => {
  // First check for full URL (provided by backend accessor)
  if (item?.image_url_full) {
    return item.image_url_full
  }
  // Check photo_urls array
  if (item?.photo_urls && Array.isArray(item.photo_urls) && item.photo_urls.length > 0) {
    return item.photo_urls[0]
  }
  const image = item?.image_url ? String(item.image_url).trim() : "";
  if (image) {
    if (image.startsWith("http://") || image.startsWith("https://"))
      return image;
    if (image.startsWith("/")) return `${API_ROOT}${image}`;
    return `${API_ROOT}/storage/${image.replace(/^storage\//, "")}`;
  }
  const normalizedType = String(item?.type || "").toLowerCase();
  return fallbackImageByType[normalizedType] || fallbackImageByType.motorbike;
};

const vehicleName = computed(() => getVehicleName(vehicle.value) || "Vehicle");
const vehicleShopName = computed(() => getVehicleShop(vehicle.value));
const vehicleRating = computed(
  () => vehicle.value?.rating ?? vehicle.value?.average_rating ?? 4.8,
);
const vehicleTransmission = computed(
  () => vehicle.value?.transmission || "N/A",
);
const vehicleFuel = computed(() => vehicle.value?.fuel_type || "N/A");
const vehicleType = computed(() => vehicle.value?.type || "Vehicle");
const vehicleImage = computed(() => getVehicleImage(vehicle.value));
const hasValidBookingDuration = computed(() => Number(bookingDuration.value) > 0);
const bookingDurationLabel = computed(() => {
  const days = Number(bookingDuration.value || 0);
  return `${days} ${days === 1 ? "Day" : "Days"}`;
});

const formatBookingDateLabel = (value) => {
  const parsed = parseDateInputValue(value);
  if (!parsed) return "";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const bookingEndDateLabel = computed(() => {
  if (selectedBookingEndDate.value) {
    return formatBookingDateLabel(selectedBookingEndDate.value);
  }

  const start = parseDateInputValue(selectedBookingStartDate.value);
  const totalDays = Number(bookingDuration.value || 0);
  if (!start || totalDays <= 0) return "";


  const end = new Date(start);
  end.setDate(end.getDate() + totalDays);
  return end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
});

const bookingDateRangeLabel = computed(() => {
  const start = formatBookingDateLabel(selectedBookingStartDate.value);
  const end = bookingEndDateLabel.value;
  if (start && end) return `${start} -> ${end}`;
  return start || "Selected dates";
});

const bookingQuantityLabel = computed(() => "1 Vehicle");

const dailyRate = computed(() => Number(vehicle.value?.price_per_day ?? vehicle.value?.price ?? 0));
const riderCount = computed(() => {
  return parseQuantityValue(riderDetails.value, 1);
});
const baseAmount = computed(() => dailyRate.value * bookingDuration.value);





const totalPrice = computed(() => {
  let total = baseAmount.value;
  if (includeInsurance.value) {
    total += insuranceAmount.value;
  }
  if (includeTaxes.value) {
    total += taxesAmount.value;
  }
  return total;
});

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(value || 0),
  );

const loadAllPages = async (resource) => {
  let page = 1;
  let lastPage = 1;
  const results = [];

  while (page <= lastPage) {
    const response = await api.get(`/${resource}`, { params: { page } });
    const payload = response.data;
    const data = Array.isArray(payload) ? payload : payload?.data || [];
    results.push(...data);
    lastPage = payload?.last_page || 1;
    page += 1;
  }

  return results;
};

const loadVehicleDetail = async () => {
  if (!vehicleId.value) {
    loadingError.value = "Vehicle not found.";
    return;
  }
  isLoading.value = true;
  loadingError.value = "";


  try {
    // Prefer fetching the specific vehicle by ID to avoid loading large lists
    const [vehicleResp, shopResp] = await Promise.all([
      vehicleApi.getById(vehicleId.value),
      shopApi.getAll(),
    ]);

    const found = vehicleResp?.data?.data || vehicleResp?.data;
    const shopList = Array.isArray(shopResp?.data)
      ? shopResp.data
      : shopResp?.data?.data || [];

    shopNamesById.value = shopList.reduce((acc, shop) => {
      acc[shop.id] = shop.name;
      return acc;
    }, {});

    if (!found || !found.id) {
      throw new Error("Vehicle not found.");
    }

    vehicle.value = {
      ...found,
      rating: found.rating ?? found.average_rating ?? 4.8,
    };
  } catch (error) {
    const status = error?.response?.status;
    const message = error?.response?.data?.message || error.message;
    console.error("API Error:", status, message);

    if (status === 401) {
      loadingError.value = "Authentication required. Please log in.";
    } else if (status === 500) {
      loadingError.value = "Server error. Please try again later.";
    } else {
      loadingError.value = `Could not load vehicle (${status || "network error"}). Check backend server.`;
    }
  } finally {
    isLoading.value = false;
  }
};

// Watch for vehicle data changes and update fee values from backend
  watch(
    () => vehicle.value,
    (newVehicle) => {
      if (newVehicle) {
        // Update insurance fee from backend data
        if (newVehicle.insurance_fee !== undefined) {
          insuranceAmount.value = Number(newVehicle.insurance_fee) || 0;
        }
        // Update taxes fee from backend data
        if (newVehicle.tax_fee !== undefined) {
          taxesAmount.value = Number(newVehicle.tax_fee) || 0;
        }
        // Update rider details from backend data if available
        if (newVehicle.rider_details) {
          riderDetails.value = newVehicle.rider_details;
        }
      }
    },
    { immediate: true }
  );

const goToBooking = () => {
   const vehicleId = route.params.id;
   const query = {};

   if (typeof includeInsurance.value === "boolean") {
     query.includeInsurance = includeInsurance.value ? "1" : "0";
   }
   if (riderDetails.value) {
     query.riderDetails = riderDetails.value;
   }

   if (vehicleId) {
     router.push({ name: "booking", params: { id: vehicleId }, query });
   } else {
     router.push({ name: "booking", params: { id: 1 }, query }); // Fallback ID
   }
 };


// New UX enhancement functions
const getNavIcon = (item) => {
  const iconMap = {
    'Home': 'fas fa-home',
    'View Details': 'fas fa-eye',
    'Bookings': 'fas fa-calendar-alt'
  };
  return iconMap[item] || 'fas fa-circle';
};

const showImageModalFlag = ref(false);
const openImageModal = () => {
  showImageModalFlag.value = true;
};
const closeImageModal = () => {
  showImageModalFlag.value = false;
};

const toggleFavorite = () => {
  isFavorite.value = !isFavorite.value;
  // Future: Save to backend/localStorage
  console.log('Favorite toggled:', isFavorite.value);
};

const setImageIndex = (index) => {
  currentImageIndex.value = index;
};

const viewAllPhotos = () => {
  // Future: Navigate to photo gallery
  console.log('Viewing all photos');
};

watch(
  () => [route.query.startDate, route.query.endDate],
  () => {
    syncBookingDurationFromRoute();
  },
  { immediate: true },
);

onMounted(() => {
  syncBookingDurationFromRoute();
  loadVehicleDetail();
});
</script>

<style scoped>
/* Modern Design System */
.motoride-container {
  font-family: var(--font-sans);
  color: #1a1d23;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  min-height: 100vh;
  padding: 0 40px;
}

.detail-page-footer {
  width: calc(100% + 80px);
  margin-left: -40px;
  margin-right: -40px;
}

.btn-reset {
  border: 0;
  background: transparent;
  font: inherit;
  color: inherit;
  cursor: pointer;
}


.topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 32px;
  align-items: center;
  width: calc(100% + 80px);
  margin-left: -40px;
  margin-right: -40px;
  padding: 14px 20px;
  background: #fff;
  border-bottom: 1px solid #d8dee7;
  box-sizing: border-box;
}

.brand {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 20px;
  font-weight: 700;
  color: #2563eb;
  white-space: nowrap;
}

.brand-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: #dbeafe;
}

.brand-icon i {
  color: #2563eb;
}

.nav-links {
  display: flex;
  gap: 24px;
  justify-self: center;
}

.nav-link {
  padding: 8px 16px;
  border-radius: 8px;
  color: #4a556b;
  font-size: 14px;
  font-weight: 700;
}

.nav-link.active,
.nav-link:hover {
  background: #eef7ff;
  color: #1d4ed8;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-self: end;
  white-space: nowrap;
}

.user-display-name {
  font-size: 16px;
  font-weight: 800;
  color: #33435d;
}

.avatar {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #1d4ed8;
  color: #fff;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  object-position: center;
}

.logout-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  background: #1d4ed8;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(29, 78, 216, 0.3);
}

.logout-btn:hover {
  background: #1d4ed8;
}

/* Main Content */
.content {
  max-width: 1240px;
  margin: 0 auto;
  padding: 22px 0 36px;
}

.action-message {
  margin: 0 0 12px;
  color: #1d4ed8;
  font-size: 14px;
}

/* Wireframe Layout Styles */
.top-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.detail-left {
  display: grid;
  gap: 18px;
}

.image-vehicle {
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  background: white;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 640px;
  min-height: 360px;
  max-height: 520px;
}

.image-vehicle .main-img {
  width: auto;
  height: 100%;
  max-width: 100%;
  object-fit: contain;
  transition: transform 0.5s ease;
  object-position: center;
}

.image-vehicle:hover .main-img {
  transform: scale(1.02);
}


.image-vehicle .gallery-controls {
  position: absolute;
  bottom: 2rem;
  left: 2rem;
  right: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.image-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
}

.image-modal-content {
  position: relative;
  background: #ffffff;
  border-radius: 24px;
  padding: 2rem;
  max-width: 760px;
  width: min(95vw, 760px);
  max-height: 80vh;
  box-shadow: 0 30px 60px rgba(15, 23, 42, 0.35);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1.5rem;
}

.image-modal-img {
  width: 100%;
  max-height: 30vh;
  max-width: 70vw;
  object-fit: contain;
  border-radius: 12px;
  align-self: center;
}

.image-modal-img {
  width: 100%;
  max-height: 40vh;
  max-width: 70vw;
  object-fit: contain;
  border-radius: 12px;
}

.image-modal-close {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(148, 163, 184, 0.08);
  border-radius: 50%;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.2);
  color: #1f2937;
}

.image-modal-close:hover {
  background: rgba(148, 163, 184, 0.2);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}


/* Enhanced Image Overlay */
.image-overlay {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  gap: 0.5rem;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-vehicle:hover .image-overlay {
  opacity: 1;
}

.image-zoom-btn,
.image-favorite-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  color: #1a1d23;
}

.image-zoom-btn:hover,
.image-favorite-btn:hover {
  background: #ffffff;
  transform: scale(1.1);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.image-favorite-btn {
  color: #e53e3e;
}

.image-favorite-btn:hover {
  background: #fed7d7;
}

/* Enhanced Price Labels and Values */
.price-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #475569;
}

.price-label i {
  color: #3b82f6;
  font-size: 14px;
}

.price-value {
  font-weight: 700;
  color: #1a1d23;
}

.muted {
  color: #94a3b8;
  opacity: 0.7;
}

/* Enhanced Toggle Labels */
.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.toggle-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #475569;
}

.toggle-text i {
  color: #3b82f6;
  font-size: 14px;
}

/* Enhanced Chips with Icons */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.85rem;
  font-weight: 600;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.chip:hover {
  background: #e2e8f0;
  transform: translateY(-1px);
}

.chip i {
  font-size: 12px;
  color: #3b82f6;
}

/* Enhanced Content Boxes */
.content-box h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
  font-weight: 700;
  color: #1a1d23;
  margin-bottom: 16px;
}

.content-box h4 i {
  color: #3b82f6;
  font-size: 16px;
}

/* Enhanced Specification Items */
.spec-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.2s ease;
}

.spec-item:hover {
  background: #f8fafc;
  margin: 0 -8px;
  padding: 12px 8px;
  border-radius: 8px;
}

.spec-item:last-child {
  border-bottom: none;
}

.spec-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #475569;
}

.spec-label i {
  color: #3b82f6;
  font-size: 14px;
}

.spec-value {
  font-weight: 700;
  color: #1a1d23;
}


/* Enhanced Feature Items */
.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  transition: transform 0.2s ease;
}

.feature-item:hover {
  transform: translateX(4px);
}

.feature-item i {
  color: #10b981;
  font-size: 16px;
  width: 20px;
  text-align: center;
}

/* Benefits Grid */
.benefits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin: 20px 0;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.benefit-item:hover {
  background: #e2e8f0;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.benefit-item i {
  color: #3b82f6;
  font-size: 18px;
  width: 24px;
  text-align: center;
}

.benefit-item span {
  font-weight: 600;
  color: #475569;
  font-size: 0.9rem;
}

/* Description Highlights */
.description-highlights {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin: 16px 0;
}

.highlight-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f0f9ff;
  border-radius: 8px;
  border: 1px solid #bae6fd;
  transition: all 0.2s ease;
}

.highlight-item:hover {
  background: #e0f2fe;
  transform: translateY(-1px);
}


.highlight-item i {
  color: #0ea5e9;
  font-size: 14px;
  width: 16px;
  text-align: center;
}

.highlight-item span {
  font-weight: 600;
  color: #0c4a6e;
  font-size: 0.85rem;
}

/* Enhanced Book Button */
.book-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(29, 78, 216, 0.3);
}

.book-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(29, 78, 216, 0.4);
  background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
}

.book-btn:active {
  transform: translateY(0);
}

.book-btn i {
  font-size: 18px;
}

/* Enhanced Gallery Dots */
.dots {
  display: flex;
  gap: 8px;
}

.dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.3s ease;
}

.dots span.active {
  width: 24px;
  border-radius: 4px;
  background: white;
}

.dots span:hover:not(.active) {
  background: rgba(255, 255, 255, 0.8);
}

/* Enhanced View All Button */
.view-all {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  color: #1a1d23;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.view-all:hover {
  background: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.view-all i {
  font-size: 12px;
}

/* Enhanced Navigation Icons */
.nav-icon {
  margin-right: 6px;
  font-size: 12px;
  transition: transform 0.2s ease;
}

.nav-link:hover .nav-icon {
  transform: translateY(-1px);
}

.booking-details {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  padding: 22px;
  box-shadow:
    0 18px 50px rgba(15, 23, 42, 0.12);
  height: fit-content;
  position: sticky;
  top: 96px;
}

.booking-details h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1d23;
  margin: 0;
  text-align: center;
  position: relative;
}

.booking-details h3::after {
  content: "";
  position: absolute;
  bottom: -0.5rem;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background: linear-gradient(135deg, #1d4ed8 0%, #1d4ed8 100%);
  border-radius: 2px;
}


.booking-card-header {
  padding: 10px 10px 18px;
  border-bottom: 1px solid #eef2f7;
  margin: -6px -6px 4px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.header-text h3 {
  font-size: 1.3rem;
  font-weight: 700;
  color: #1a1d23;
  margin: 0;
  text-align: left;
}

.header-text h3::after {
  display: none;
}

.booking-card-subtitle {
  margin: 10px 0 0;
  text-align: center;
  color: #64748b;
  font-size: 0.92rem;
  font-weight: 600;
}

.middle-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-bottom: 2rem;
}

/* New Layout Styles for Wireframe */
.middle-section {
  margin-bottom: 2rem;
}

.name-label {
  margin-bottom: 12px;
  text-align: left;
}

.name-label h2 {
  font-size: 2rem;
  font-weight: 800;
  color: #1a1d23;
  margin: 0 0 0.5rem 0;
  line-height: 1.1;
}

.vehicle-meta {
  font-size: 1rem;
  color: #64748b;
  margin: 0;
  font-weight: 500;
}

.detail-hero {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 18px 20px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}


.chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #334155;
  font-weight: 700;
  font-size: 0.85rem;
}

.two-box-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.content-box {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  min-height: 200px;
}

.content-box h4 {
  font-size: 1.3rem;
  font-weight: 700;
  color: #1a1d23;
  margin: 0 0 1.5rem 0;
  position: relative;
  padding-left: 1rem;
}

.content-box h4::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 20px;
  background: linear-gradient(135deg, #1d4ed8 0%, #1d4ed8 100%);
  border-radius: 2px;
}

.spec-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.spec-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.spec-item:last-child {
  border-bottom: none;
}

.spec-label {
  color: #64748b;
  font-weight: 500;
  font-size: 0.95rem;
}

.spec-value {
  color: #1a1d23;
  font-weight: 700;
  font-size: 0.95rem;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.feature-item {
  color: #475569;
  font-size: 0.95rem;
  font-weight: 500;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.feature-item:last-child {
  border-bottom: none;
}

.full-width-box {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 2.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 2rem;
}

.full-width-box h4 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1d23;
  margin: 0 0 1.5rem 0;
  position: relative;
  padding-left: 1rem;
}

.full-width-box h4::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 24px;
  background: linear-gradient(135deg, #1d4ed8 0%, #1d4ed8 100%);
  border-radius: 2px;
}

.full-width-box p {
  font-size: 1.05rem;
  line-height: 1.7;
  color: #475569;
  margin: 0;
}

.bottom-section {
  margin-bottom: 2rem;
}

.info-box {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  min-height: 200px;
}

.bottom-rows {
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 2rem;
}


.horizontal-box {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 2.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.dots {
  display: flex;
  gap: 0.5rem;
}

.dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transition: all 0.3s ease;
}

.dots span.active {
  width: 24px;
  border-radius: 4px;
  background: white;
}

.view-all {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  color: #1a1d23;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.view-all:hover {
  background: white;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

/* Component Styles for New Layout */
.title-section {
  text-align: center;
}

.title-section h1 {
  font-size: 1.8rem;
  font-weight: 800;
  color: #1a1d23;
  margin: 0 0 1rem 0;
  line-height: 1.1;
}

.meta {
  font-size: 1rem;
  color: #64748b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: center;
}

.badge {
  background: linear-gradient(135deg, #1d4ed8 0%, #1d4ed8 100%);
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  display: inline-block;
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: 0 4px 12px rgba(29, 78, 216, 0.3);
}


.spec-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.spec-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 1rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.3s ease;
}

.spec-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #1d4ed8;
}

.spec-card .icon {
  font-size: 1.2rem;
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #1d4ed8 0%, #1d4ed8 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spec-card .icon i {
  color: white;
}

.spec-card small {
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: block;
  margin-bottom: 0.25rem;
}

.spec-card p {
  margin: 0;
  font-weight: 700;
  font-size: 0.9rem;
  color: #1a1d23;
}

.additional-info h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1a1d23;
  margin: 0 0 1rem 0;
}

.additional-info ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.additional-info li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.9rem;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.additional-info li::before {
  content: "✓";
  color: #1d4ed8;
  font-weight: 700;
  font-size: 1rem;
}

.additional-info li:last-child {
  border-bottom: none;
}

/* Booking Details Styles */
.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 10px;
  font-size: 0.98rem;
  border-bottom: 1px solid #f1f5f9;
}

.price-row-toggle {
  gap: 12px;
}

.toggle-label {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  font-weight: 600;
  color: #64748b;
}

.toggle-checkbox {
  width: 18px;
  height: 18px;
  accent-color: #1d4ed8;
  cursor: pointer;
}

.muted {
  color: #94a3b8;
}

.price-row span {
  color: #64748b;
  font-weight: 700;
}

.price-row span:last-child {
  color: #1a1d23;
  font-weight: 700;
  font-size: 1.05rem;
}

.price-row:first-of-type {
  border-top: none;
}

.rider-select {
  padding: 10px 12px;
  border: 1px solid #dbe4f0;
  border-radius: 8px;
  background: white;
  color: #1a1d23;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 110px;
  min-width: 0;
}

.rider-select:focus {
  outline: none;
  border-color: #1d4ed8;
  box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.1);
}

.rider-select:hover {
  border-color: #1d4ed8;
}


.price-blue {
  background: linear-gradient(135deg, #1d4ed8 0%, #1d4ed8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 1.8rem;
  font-weight: 800;
}

.total-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 10px 6px;
  border-top: 1px solid #e8eef7;
  border-bottom: none;
  margin-top: 6px;
}

.total-row span:first-child {
  color: #0f172a;
  font-weight: 800;
  font-size: 1.02rem;
}

.book-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  width: 100%;
  background: linear-gradient(135deg, #1d4ed8 0%, #1d4ed8 100%);
  color: white;
  border: none;
  padding: 1.25rem;
  border-radius: 16px;
  font-weight: 700;
  font-size: 1.1rem;
  text-align: center;
  cursor: pointer;
  margin: 18px auto 0;
  transition: all 0.3s ease;
  box-shadow: 0 8px 25px rgba(29, 78, 216, 0.3);
}

.book-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 35px rgba(29, 78, 216, 0.4);
}

.disclaimer {
  text-align: center;
  color: #64748b;
  font-size: 0.9rem;
  margin-top: 1rem;
  font-style: italic;
}

/* Description and Terms Styles */
.description h3,
.rental-terms h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1d23;
  margin: 0 0 1.5rem 0;
  position: relative;
  padding-left: 1rem;
}


.description h3::before,
.rental-terms h3::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 24px;
  background: linear-gradient(135deg, #1d4ed8 0%, #1d4ed8 100%);
  border-radius: 2px;
}

.description p {
  font-size: 1.05rem;
  line-height: 1.7;
  color: #475569;
  margin: 0;
}

.rental-terms {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.rental-terms ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.rental-terms li {
  padding: 1rem 0;
  border-bottom: 1px solid rgba(229, 231, 235, 0.5);
  font-size: 1rem;
  color: #475569;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.rental-terms li::before {
  content: "✓";
  color: #1d4ed8;
  font-weight: 700;
  font-size: 1.2rem;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.rental-terms li:last-child {
  border-bottom: none;
}

/* Footer Styles */
.site-footer {
  margin-top: 28px;
  border-top: 1px solid #d8dee7;
  background: #ffffff;
  color: #0f172a;
}

.footer-wrap {
  max-width: 1200px;
  margin: 0 auto;
  padding: 22px 2rem 0;
}

.footer-top {
  display: grid;
  grid-template-columns: 1fr 1.6fr 1fr;
  gap: 26px;
  padding: 20px 0 22px;
  border-bottom: 1px solid #e6edf6;
  align-items: start;
}

.footer-brand-title {
  font-size: 1.15rem;
  font-weight: 900;
  letter-spacing: 0.01em;
  color: #0f172a;
}

.footer-brand-slogan {
  margin-top: 6px;
  font-size: 0.88rem;
  font-weight: 700;
  color: #3b82f6;
}

.footer-social {
  margin-top: 14px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.social-btn {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid #cfd9e6;
  color: #334155;
  font-weight: 800;
  background: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.social-btn:first-child {
  border-color: #3b82f6;
  background: #3b82f6;
  color: #ffffff;
}

.social-btn:hover {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #ffffff;
}

.footer-social-label {
  margin-top: 10px;
  font-size: 0.9rem;
  font-weight: 800;
  color: #0f172a;
}

.footer-nav-links {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  justify-content: center;
}

.footer-nav-link {
  font-size: 0.9rem;
  font-weight: 800;
  color: #475569;
  transition: color 0.2s ease;
}

.footer-nav-link:first-child {
  color: #3b82f6;
}

.footer-nav-link:hover {
  color: #3b82f6;
}

.footer-about {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid #e6edf6;
}

.footer-section-title {
  font-size: 1rem;
  font-weight: 900;
  color: #0f172a;
  text-align: center;
}


.footer-about p {
  margin: 10px auto 0;
  max-width: 520px;
  text-align: center;
  color: #52627b;
  line-height: 1.7;
  font-size: 0.92rem;
}

.footer-contact {
  border-left: 1px solid #e6edf6;
  padding-left: 22px;
}

.footer-contact-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  margin-bottom: 10px;
  align-items: baseline;
}

.footer-contact-label {
  font-weight: 900;
  color: #0f172a;
  font-size: 0.88rem;
}

.footer-contact-value {
  font-weight: 700;
  color: #52627b;
  font-size: 0.88rem;
}

.footer-newsletter {
  margin-top: 12px;
  display: grid;
  grid-template-columns: 1fr auto;
  border: 1px solid #d8e2f0;
  border-radius: 10px;
  overflow: hidden;
  background: #ffffff;
}

.footer-input {
  border: 0;
  background: transparent;
  color: #0f172a;
  height: 36px;
  padding: 0 12px;
  font-size: 0.88rem;
  outline: none;
}

.footer-input::placeholder {
  color: #94a3b8;
}

.footer-send {
  width: 40px;
  background: #3b82f6;
  color: #ffffff;
  font-weight: 900;
}

.footer-bottom {
  margin: 0;
  padding: 14px 0 22px;
  border-top: 0;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #75839b;
  font-size: 0.85rem;
  flex-wrap: wrap;
}

.footer-bottom-links {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}


.footer-bottom-links span {
  color: #475569;
  font-weight: 800;
  font-size: 0.82rem;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  cursor: pointer;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;
}

.footer-bottom-links span:hover {
  color: #0f172a;
  border-color: #3b82f6;
  background: #eff6ff;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .top-row {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .two-box-row {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .booking-details {
    position: static;
  }
}

@media (max-width: 768px) {
  .motoride-container {
    padding: 0 16px;
  }

  .detail-page-footer {
    width: calc(100% + 32px);
    margin-left: -16px;
    margin-right: -16px;
  }

  .topbar {
    grid-template-columns: 1fr;
    width: calc(100% + 32px);
    margin-left: -16px;
    margin-right: -16px;
    gap: 10px;
    padding: 12px 16px;
  }

  .nav-links,
  .top-actions {
    justify-self: start;
  }

  .nav-links {
    flex-wrap: wrap;
  }

  .content {
    padding: 1rem 0;
  }

  .name-label h2 {
    font-size: 1.5rem;
  }

  .content-box,
  .full-width-box {
    padding: 1.5rem;
  }

  .footer-inner {
    grid-template-columns: 1fr;
  }

  .footer-bottom {
    flex-direction: column;
    align-items: flex-start;
  }

  .footer-top {
    grid-template-columns: 1fr;
  }

  .footer-contact {
    border-left: 0;
    padding-left: 0;
    padding-top: 18px;
    border-top: 1px solid #e6edf6;
  }
}

@media (max-width: 480px) {
  .motoride-container {
    padding: 0 12px;
  }

  .detail-page-footer {
    width: calc(100% + 24px);
    margin-left: -12px;
    margin-right: -12px;
  }

  .topbar {
    width: calc(100% + 24px);
    margin-left: -12px;
    margin-right: -12px;
    padding: 12px;
  }

  .brand {
    font-size: 18px;
  }

  .name-label h2 {
    font-size: 1.2rem;
  }

  .gallery-controls {
    left: 1rem;
    right: 1rem;
    bottom: 1rem;
  }

  .view-all {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
}
/* Booking Confirmation Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: white;
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 100%;
  overflow: hidden;
  animation: slideUp 0.3s ease;
}


.success-modal {
  width: 100%;
  max-width: 440px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border-radius: 28px;
  border: 1px solid #dbe7f4;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.22);
  padding: 34px 30px 28px;
  text-align: center;
  animation: slideUp 0.3s ease;
}

.booking-status-modal::before {
  content: "";
  display: block;
  width: 100%;
  height: 6px;
  margin: -34px -30px 28px;
  background: linear-gradient(90deg, #1d4ed8 0%, #38bdf8 100%);
}

.booking-status-hero {
  margin-bottom: 14px;
}

.booking-loader-wrap,
.booking-check-wrap {
  width: 112px;
  height: 112px;
  margin: 0 auto;
  position: relative;
  display: grid;
  place-items: center;
}

.booking-loader-circle {
  width: 112px;
  height: 112px;
  border-radius: 50%;
  border: 6px solid rgba(59, 130, 246, 0.15);
  border-top-color: #2563eb;
  border-right-color: #38bdf8;
  animation: bookingSpin 0.9s linear infinite;
}

.booking-loader-core {
  position: absolute;
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: radial-gradient(circle at top, #ffffff 0%, #dbeafe 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.booking-check-wrap {
  border-radius: 50%;
  background: radial-gradient(circle at top, rgba(187, 247, 208, 0.7), rgba(220, 252, 231, 0.2));
}


.booking-check-svg {
  width: 112px;
  height: 112px;
  filter: drop-shadow(0 14px 30px rgba(34, 197, 94, 0.2));
}

.booking-check-ring,
.booking-check-path {
  stroke-linecap: round;
  stroke-linejoin: round;
}

.booking-check-ring {
  stroke: #22c55e;
  stroke-width: 6;
  stroke-dasharray: 289;
  stroke-dashoffset: 289;
  animation: bookingCircleReveal 0.55s ease forwards;
}

.booking-check-path {
  stroke: #16a34a;
  stroke-width: 7;
  stroke-dasharray: 64;
  stroke-dashoffset: 64;
  animation: bookingCheckReveal 0.35s ease 0.45s forwards;
}

.booking-status-kicker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.success-modal h3 {
  margin: 0 0 10px;
  font-size: 1.65rem;
  font-weight: 800;
  color: #0f172a;
}

.success-modal p {
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  color: #475569;
}

.booking-status-text {
  max-width: 320px;
  margin: 0 auto;
}

.success-booking-card {
  margin-top: 20px;
  border-radius: 20px;
  border: 1px solid #dbe7f4;
  background: #ffffff;
  box-shadow: 0 14px 30px rgba(148, 163, 184, 0.12);
  overflow: hidden;
  text-align: left;
}

.success-booking-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid #edf2f7;
}

.success-booking-row:last-child {
  border-bottom: none;
}

.success-booking-row span {
  color: #64748b;
  font-size: 0.84rem;
  font-weight: 700;
}

.success-booking-row strong {
  color: #0f172a;
  font-size: 0.95rem;
  font-weight: 800;
  text-align: right;
}

.success-booking-total {
  color: #1d4ed8 !important;
}

.success-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 22px;
}

.success-primary-btn,
.success-secondary-btn {
  border: none;
  border-radius: 14px;
  padding: 14px 18px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.success-primary-btn {
  background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
  color: white;
  box-shadow: 0 8px 22px rgba(29, 78, 216, 0.28);
}

.success-primary-btn:hover,
.success-secondary-btn:hover {
  transform: translateY(-2px);
}

.success-primary-btn:hover {
  box-shadow: 0 12px 28px rgba(29, 78, 216, 0.36);
}

.success-secondary-btn {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
  box-shadow: 0 8px 22px rgba(148, 163, 184, 0.18);
}

@keyframes bookingSpin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}


@keyframes bookingCircleReveal {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes bookingCheckReveal {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
}

.modal-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  margin-right: 16px;
}

.modal-title {
  flex: 1;
}

.modal-title h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1d23;
  margin: 0 0 4px 0;
}

.modal-title p {
  font-size: 0.95rem;
  color: #64748b;
  margin: 0;
}

.modal-close-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f1f5f9;
  border: none;
  color: #64748b;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close-btn:hover {
  background: #e2e8f0;
  color: #1a1d23;
  transform: scale(1.05);
}


.modal-body {
  padding: 24px;
}

.booking-summary {
  margin-bottom: 24px;
}

.summary-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: 12px;
  background: #f8fafc;
  margin-bottom: 12px;
  transition: all 0.3s ease;
}

.summary-item:hover {
  background: #f1f5f9;
  transform: translateX(4px);
}

.summary-item:last-child {
  margin-bottom: 0;
}

.summary-item.total-item {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border: 1px solid #bfdbfe;
  margin-top: 16px;
  padding: 20px;
}

.summary-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  font-size: 16px;
  margin-right: 16px;
  flex-shrink: 0;
}

.summary-item.total-item .summary-icon {
  background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
  color: white;
}

.summary-content {
  flex: 1;
}

.summary-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 4px;
}

.summary-value {
  display: block;
  font-size: 1.05rem;
  font-weight: 700;
  color: #1a1d23;
}

.summary-item.total-item .summary-value {
  font-size: 1.3rem;
  color: #1d4ed8;
}

.booking-notice {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 12px;
  margin-bottom: 24px;
}

.notice-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #fed7aa;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ea580c;
  font-size: 14px;
  margin-right: 12px;
  flex-shrink: 0;
  margin-top: 2px;
}

.booking-notice p {
  font-size: 0.9rem;
  color: #7c2d12;
  line-height: 1.6;
  margin: 0;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 14px 24px;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-cancel {
  background: white;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.btn-cancel:hover:not(:disabled) {
  background: #f8fafc;
  color: #475569;
  border-color: #cbd5e1;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.btn-confirm {
  background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(29, 78, 216, 0.3);
}

.btn-confirm:hover:not(:disabled) {
  background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(29, 78, 216, 0.4);
}


.btn-cancel:disabled,
.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-confirm:disabled {
  box-shadow: none;
}

/* Responsive Design for Modal */
@media (max-width: 768px) {
  .modal-content {
    margin: 0 16px;
  }

  .success-modal {
    margin: 0 16px;
    padding: 28px 22px 22px;
  }

  .booking-status-modal::before {
    margin: -28px -22px 24px;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 20px;
  }

  .modal-title h3 {
    font-size: 1.3rem;
  }

  .modal-footer {
    flex-direction: column;
  }

  .btn-cancel,
  .btn-confirm {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .modal-content {
    margin: 0 12px;
    border-radius: 20px;
  }

  .success-modal {
    margin: 0 12px;
    border-radius: 20px;
    padding: 24px 18px;
  }

  .booking-status-modal::before {
    margin: -24px -18px 20px;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 16px;
  }

  .modal-icon {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }

  .modal-title h3 {
    font-size: 1.2rem;
  }

  .success-modal h3 {
    font-size: 1.35rem;
  }

  .booking-loader-wrap,
  .booking-check-wrap,
  .booking-check-svg,
  .booking-loader-circle {
    width: 92px;
    height: 92px;
  }


  .booking-loader-core {
    width: 62px;
    height: 62px;
  }

  .success-booking-row {
    flex-direction: column;
    gap: 6px;
  }

  .success-booking-row strong {
    text-align: left;
  }

  .summary-item {
    padding: 12px;
  }

  .summary-icon {
    width: 36px;
    height: 36px;
    font-size: 14px;
  }

  .btn-cancel,
  .btn-confirm {
    padding: 12px 20px;
    font-size: 0.95rem;
  }
}
</style>
