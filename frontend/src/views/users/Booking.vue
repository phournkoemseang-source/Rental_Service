<template>
  <div class="booking-checkout-page">
    <UserNavbar
      :nav-items="userNavItems"
      :show-back-button="false"
      :show-fallback-message="false"
      @logout-request="handleLogout"
    />

    <div class="page-container">
      <!-- Back Button -->
      <div class="booking-back-bar">
        <button class="btn-back-top" @click="goToShop">
          <i class="fa-solid fa-arrow-left"></i>
          <span>{{ $t('back') }}</span>
        </button>
      </div>

      <div class="page-heading-row">
        <div class="title-block">
          <h1>{{ $t('checkout') }}</h1>
        </div>
      </div>

      <p v-if="isLoading" class="page-subtitle">{{ $t('loadingVehicleDetails') }}</p>
      <p v-else-if="loadingError" class="page-subtitle">{{ loadingError }}</p>
      <p v-else class="page-subtitle">
        Complete your booking for the {{ rental.title }}
      </p>

      <div class="card checkout-card-single">
        <!-- Vehicle Summary -->
        <div class="vehicle-summary-row">
          <div class="vehicle-thumb">
            <img :src="vehicleImage" :alt="vehicleName" />
            <span class="vehicle-tag-sm">{{ vehicleTag }}</span>
          </div>
          <div class="vehicle-info">
            <h2 class="item-title">{{ rental.title }}</h2>
            <p class="item-location">{{ rental.location }}</p>
            <div class="vehicle-meta">
              <span>{{ rental.riders }}</span>
              <span class="meta-dot">·</span>
              <span>${{ rental.dailyRate.toFixed(2) }}/day</span>
            </div>
          </div>
        </div>

        <!-- Promo Code -->
        <div class="section-block">
          <div class="promo-input-group">
            <input type="text" placeholder="Have a promo code?" v-model="promoCode" />
            <button class="btn-promo" type="button" @click="applyPromoCode">
              {{ appliedCoupon && promoCode === appliedCoupon.code ? 'Applied' : 'Apply' }}
            </button>
          </div>
          <p v-if="promoFeedback" :class="['promo-feedback', `promo-feedback--${promoFeedbackType}`]">
            {{ promoFeedback }}
          </p>
        </div>

        <hr class="section-divider" />

        <!-- Contact & Dates -->
        <div class="section-block">
          <div class="form-row">
            <label>{{ $t('phoneNumber3') }}<span class="required">*</span></label>
            <input type="tel" v-model="customerPhone" placeholder="012345678" required />
          </div>
          <label class="save-phone-check">
            <input type="checkbox" v-model="savePhoneToProfile" />
            <span class="check-box"><i class="fa-solid fa-check"></i></span>
            <span>{{ $t('saveToMyProfile') }}</span>
          </label>

          <div class="date-row">
            <div class="form-row date-field">
              <label>{{ $t('pickUp') }}</label>
              <input type="date" v-model="rental.startDate" :min="minDate" @change="validateDates" required />
            </div>
            <span class="date-arrow">→</span>
            <div class="form-row date-field">
              <label>{{ $t('dropOff') }}</label>
              <input type="date" v-model="rental.endDate" :min="rental.startDate || minDate" @change="validateDates" required />
            </div>
          </div>
          <p class="date-error" v-if="dateError">{{ dateError }}</p>
        </div>

        <hr class="section-divider" />

        <!-- Pricing -->
        <div class="section-block">
          <div class="pricing-rows">
            <div class="price-row">
              <span>Daily Rate x {{ calculateDays() }} day(s)</span>
              <span>${{ rental.subtotal.toFixed(2) }}</span>
            </div>
            <div class="insurance-toggle">
              <label>
                <input type="checkbox" v-model="includeInsurance" />{{ $t('includeInsurance') }}</label>
              <span>${{ insuranceAmount.toFixed(2) }}</span>
            </div>
            <div v-if="appliedCoupon && couponDiscount > 0" class="price-row coupon-row">
              <span>Coupon ({{ appliedCoupon.code }})</span>
              <span class="discount-amount">-${{ couponDiscount.toFixed(2) }}</span>
            </div>
          </div>
          <div class="total-row">
            <span>{{ $t('total3') }}</span>
            <span class="total-amount">${{ totalAmount.toFixed(2) }}</span>
          </div>
        </div>

        <hr class="section-divider" />

        <!-- Payment Method -->
        <div class="section-block">
          <div class="payment-tabs-single">
            <button class="tab" :class="{ active: method === 'qr' }" type="button" @click="method = 'qr'">{{ $t('qrCode') }}</button>
            <button class="tab" :class="{ active: method === 'later' }" type="button" @click="method = 'later'">{{ $t('payLater') }}</button>
          </div>

          <!-- Pay Later -->
          <div v-if="method === 'later'" class="later-info">
            <p class="info-text">{{ $t('payDirectlyAtTheShopWhenYouPickUpYourVehicle') }}</p>
            <button type="button" class="btn-book" :disabled="!isFormValid || isSubmittingPayment" @click="handlePayment">
              {{ isSubmittingPayment ? "Processing..." : "Book Now" }}
            </button>
          </div>

          <!-- QR Code -->
          <div v-if="method === 'qr'" class="qr-section">
            <div v-if="!showQR" class="qr-start">
              <div v-if="shopQrOptions.length" class="qr-shop-select">
                <label>{{ $t('shopQr') }}</label>
                <select v-model="selectedShopQrId">
                  <option v-for="opt in shopQrOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</option>
                </select>
              </div>
              <button type="button" class="btn-generate-qr" :disabled="!isFormValid" @click="generateQRCode">{{ $t('generateQrCode') }}</button>
            </div>
            <div v-else class="qr-active">
              <div class="qr-display">
                <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="QR Code" class="qr-img" />
              </div>
              <p class="qr-ref">Ref: {{ paymentId }}</p>
              <ol class="qr-steps">
                <li>{{ $t('openYourBankingApp') }}</li>
                <li>{{ $t('scanTheQrCode') }}</li>
                <li>{{ $t('confirmPayment') }}</li>
              </ol>
              <button type="button" class="btn-book" :disabled="isSubmittingPayment" @click="handlePayment">
                {{ isSubmittingPayment ? "Processing..." : "Confirm & Book" }}
              </button>
            </div>
          </div>
          <div class="pci-footer">
            <span class="pci-check">{{ $t('pciCompliant') }}</span>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showSuccessModal"
      class="success-modal-overlay"
      @click="returnToShopViewAfterSuccess"
    >
      <div class="success-modal receipt-modal" @click.stop>
        <div class="simple-success-header">
          <div class="success-check-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <h2 class="success-title">{{ $t('successfullyBooked') }}</h2>
        </div>

        <div class="receipt-preview-container">
          <ReceiptCard
            :booking-id="bookingId"
            :total-amount="totalAmount"
            :subtotal="rental.subtotal"
            :insurance="insuranceAmount"
            :discount="couponDiscount"
            :daily-rate="rental.dailyRate"
            :total-days="calculateDays()"
            :rider-count="riderCount"
            :date-time="transactionDateTime"
            :owner-name="shopOwnerName"
            :customer-phone="customerPhone"
            :vehicle-name="rental.title"
            :plate-number="vehiclePlateNumber"
            :address="rental.location"
            :payment-method="method"
            :payment-status="method === 'later' ? 'pending' : 'paid'"
          />
        </div>

        <!-- Hidden wrapper for printing -->
        <div id="receipt-wrapper" style="display: none;">
          <ReceiptCard
            :booking-id="bookingId"
            :total-amount="totalAmount"
            :subtotal="rental.subtotal"
            :insurance="insuranceAmount"
            :discount="couponDiscount"
            :daily-rate="rental.dailyRate"
            :total-days="calculateDays()"
            :rider-count="riderCount"
            :date-time="transactionDateTime"
            :owner-name="shopOwnerName"
            :customer-phone="customerPhone"
            :vehicle-name="rental.title"
            :plate-number="vehiclePlateNumber"
            :address="rental.location"
            :payment-method="method"
            :payment-status="method === 'later' ? 'pending' : 'paid'"
          />
        </div>

        <div class="modal-actions">
          <button class="btn-download" type="button" @click="downloadReceipt">
            <i class="fas fa-download"></i>{{ $t('downloadReceipt') }}</button>
          <button class="btn-close" type="button" @click="returnToShopViewAfterSuccess">{{ $t('returnToShop') }}</button>
        </div>
      </div>
    </div>
    <CommonFooter />
  </div>
</template>


<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import api, { couponApi } from "@/services/api";
import { userService } from "../../services/database.js";
import CommonFooter from '../../components/CommonFooter.vue';
import UserNavbar from '@/components/UserNavbar.vue';
import ReceiptCard from '@/components/ReceiptCard.vue';
import "../../assets/user/booking.css";

// Navigation
const router = useRouter();
const route = useRoute();

const goToShop = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/view_shop')
  }
}

const userNavItems = [
  { label: "Home", route: "/view_shop" },
  { label: "My Bookings", route: "/my-bookings" },
  { label: "Profile", route: "/user/profile" },
];

const handleLogout = async () => {
  await userService.logout();
  router.push('/login');
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
const API_ROOT = API_BASE_URL.replace(/\/api\/?$/, "");
const fallbackImageByType = {
  motorbike: "https://i.pinimg.com/1200x/61/68/42/61684256edbd26664520bdfcf379c762.jpg",
  bicycle: "https://i.pinimg.com/1200x/2c/90/78/2c9078d8032d2e4ae3e737684317f814.jpg",
  car: "https://i.pinimg.com/1200x/d9/9e/06/d99e06bd9dd77fb2581170af2063b3b5.jpg",
};

const vehicle = ref(null);
const shopsById = ref({});
const isLoading = ref(false);
const loadingError = ref("");
const showReceiptView = ref(false);
const vehicleId = computed(() => {
  const value = Number(route.params.id);
  return Number.isFinite(value) && value > 0 ? value : null;
});

const getVehicleName = (item) => (item ? `${item.brand} ${item.model}` : "");
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
    if (image.startsWith("http://") || image.startsWith("https://")) return image;
    if (image.startsWith("/")) return `${API_ROOT}${image}`;
    return `${API_ROOT}/storage/${image.replace(/^storage\//, "")}`;
  }
  const normalizedType = String(item?.type || "").toLowerCase();
  return fallbackImageByType[normalizedType] || fallbackImageByType.motorbike;
};

const stripMapLinks = (value) => {
  if (!value) return "";
  return String(value)
    .replace(/https?:\/\/maps\.app\.goo\.gl\/\S+/gi, "")
    .replace(/https?:\/\/(www\.)?google\.com\/maps\/\S+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};

const getShopLocation = (shop) => {
  const raw = shop?.address || shop?.name || "Unknown Shop";
  const cleaned = stripMapLinks(raw);
  if (cleaned) return cleaned;
  return shop?.name || "Unknown Shop";
};

const resolveShopQrUrl = (shop) => {
  const raw = String(shop?.qr_url_full || shop?.qr_url || "").trim();
  if (!raw) return "";
  if (/^(https?:\/\/|data:|blob:)/i.test(raw)) return raw;
  const normalized = raw.replace(/^\/+/, "");
  if (normalized.startsWith("storage/")) {
    return `${API_ROOT}/${normalized}`;
  }
  return `${API_ROOT}/storage/${normalized.replace(/^storage\//, "")}`;
};

const shopQrOptions = computed(() =>
  Object.values(shopsById.value)
    .map((shop) => {
      const url = resolveShopQrUrl(shop);
      if (!url) return null;
      return {
        id: shop.id,
        label: shop.name || `Shop #${shop.id}`,
        ownerName: shop?.owner?.name || "",
        qrUrl: url,
      };
    })
    .filter(Boolean)
);

const selectedShopQrOption = computed(() => {
  return (
    shopQrOptions.value.find((option) => option.id === selectedShopQrId.value) ||
    null
  );
});

const selectedShopQrUrl = computed(() => selectedShopQrOption.value?.qrUrl || "");

// Update the selected shop QR code when the vehicle's shop_id or shopQrOptions changes
const updateShopQrSelection = () => {
  if (!vehicle.value || !vehicle.value?.shop_id) {
    selectedShopQrId.value = null;
    return;
  }


  const shopId = vehicle.value.shop_id;
  const shopOption = shopQrOptions.value.find(option => option.id === shopId);

  if (shopOption) {
    selectedShopQrId.value = shopId;
  } else if (shopQrOptions.value.length > 0) {
    // Select the first available shop with QR code
    selectedShopQrId.value = shopQrOptions.value[0].id;
  } else {
    selectedShopQrId.value = null;
  }
};

const vehicleName = computed(() => getVehicleName(vehicle.value) || "Vehicle");
const vehicleType = computed(() => vehicle.value?.type || "");
const vehicleTag = computed(() => (vehicleType.value ? String(vehicleType.value).toUpperCase() : "RENTAL"));
const vehicleImage = computed(() => getVehicleImage(vehicle.value));
const vehicleLocation = computed(() => {
  const shop = vehicle.value?.shop_id ? shopsById.value[vehicle.value.shop_id] : null;
  return getShopLocation(shop);
});

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
    // First attempt: fetch the specific vehicle by ID (works even if list endpoints are filtered)
    let found = null;
    try {
      const resp = await api.get(`/vehicles/${vehicleId.value}`);
      found = resp?.data?.data || resp?.data || null;
    } catch (err) {
      // ignore and fallback to paginated list below
      console.warn('vehicleApi.getById failed, falling back to list fetch', err?.message || err);
      found = null;
    }

    // If single-vehicle fetch didn't return, fall back to loading all pages
    const shopList = await loadAllPages("shops");
    shopsById.value = shopList.reduce((acc, shop) => {
      acc[shop.id] = shop;
      return acc;
    }, {});

    if (!found) {
      const vehicleList = await loadAllPages("vehicles");
      found = vehicleList.find((item) => Number(item.id) === vehicleId.value) || null;
    }

    if (!found) {
      throw new Error("Vehicle not found.");
    }

    vehicle.value = found;
    rental.value.title = getVehicleName(found) || rental.value.title;
    rental.value.location = vehicleLocation.value;
    rental.value.dailyRate = Number(found.price_per_day ?? found.price ?? 0);

    // Update Insurance Fee from vehicle data
    if (found.insurance_fee !== undefined) {
      rental.value.insurance = Number(found.insurance_fee);
    }
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

const method = ref("qr");
const promoCode = ref("");
const appliedCoupon = ref(null);
const promoFeedback = ref("");
const promoFeedbackType = ref("success");
const showQR = ref(false);
const showSuccessModal = ref(false);
const isSubmittingPayment = ref(false);
const dateError = ref("");
const customerPhone = ref("");
const savePhoneToProfile = ref(false);
let successRedirectTimer = null;
const bookingId = ref("");
const paymentId = ref(
  "PAY" + Math.random().toString(36).slice(2, 11).toUpperCase()
);
const transactionId = ref(
  "TXN" + Math.random().toString(36).slice(2, 14).toUpperCase()
);
const qrCodeUrl = ref("");
const selectedShopQrId = ref(null);


const rental = ref({
  title: "Vehicle",
  location: "Unknown Shop",
  startDate: "",
  endDate: "",
  period: "",
  riders: "1 Rider",
  dailyRate: 0,
  subtotal: 0,
  insurance: 75,
});

const includeInsurance = ref(true);

const parseNumberFromQuery = (value) => {
  if (value === null || value === undefined) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "") return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
};

const parseRiderDetailsFromQuery = (value) => {
  if (value === null || value === undefined) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  const text = String(raw).trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) {
    const count = Number(text);
    if (!Number.isFinite(count) || count <= 0) return null;
    return `${count} ${count === 1 ? "Rider" : "Riders"}`;
  }
  return text;
};

const parseBooleanFlagFromQuery = (value) => {
  if (value === null || value === undefined) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  const text = String(raw).trim().toLowerCase();
  if (!text) return null;
  if (text === "1" || text === "true" || text === "yes" || text === "on") return true;
  if (text === "0" || text === "false" || text === "no" || text === "off") return false;
  return null;
};

const applyRouteDefaults = () => {
  const insuranceFromQuery = parseNumberFromQuery(route.query.insuranceFee);
  if (insuranceFromQuery !== null) {
    rental.value.insurance = insuranceFromQuery;
  }

  const includeInsuranceFromQuery = parseBooleanFlagFromQuery(route.query.includeInsurance);
  if (includeInsuranceFromQuery !== null) {
    includeInsurance.value = includeInsuranceFromQuery;
  }

  const riderFromQuery = parseRiderDetailsFromQuery(route.query.riderDetails);
  if (riderFromQuery) {
    rental.value.riders = riderFromQuery;
  }

  const couponCodeFromQuery = Array.isArray(route.query.coupon_code)
    ? route.query.coupon_code[0]
    : route.query.coupon_code;
  if (couponCodeFromQuery) {
    promoCode.value = String(couponCodeFromQuery);
  }
};

const loadCouponFromRoute = async () => {
  const rawCouponId = Array.isArray(route.query.coupon_id) ? route.query.coupon_id[0] : route.query.coupon_id;
  const couponId = Number(rawCouponId);

  if (!couponId) {
    appliedCoupon.value = null;
    return;
  }

  try {
    const response = await api.get(`/coupons/${couponId}`);
    appliedCoupon.value = response?.data || null;

    if (appliedCoupon.value?.code) {
      promoCode.value = appliedCoupon.value.code;
    }
    promoFeedback.value = appliedCoupon.value?.code ? `${appliedCoupon.value.code} applied successfully.` : "";
    promoFeedbackType.value = "success";
  } catch (error) {
    console.error("Failed to load coupon:", error);
    appliedCoupon.value = null;
    promoFeedback.value = "";
  }
};

const showPromoFeedback = (message, type = "success") => {
  promoFeedback.value = message;
  promoFeedbackType.value = type;
};

const applyPromoCode = async () => {
  const code = String(promoCode.value || "").trim().toUpperCase();

  if (!code) {
    appliedCoupon.value = null;
    showPromoFeedback("Please enter a coupon code.", "error");
    return;
  }

  try {
    const totalBeforeDiscount = Number(rental.value.subtotal || 0) + insuranceAmount.value + taxesAmount.value;
    const shopId = vehicle.value?.shop_id ?? vehicle.value?.shop?.id ?? null;
    const validation = await couponApi.validate(code, totalBeforeDiscount, shopId);
    const payload = validation?.data || {};

    if (!payload.valid) {
      appliedCoupon.value = null;
      const message = payload?.message || "Coupon code not found.";
      showPromoFeedback(message, "error");
      return;
    }

    const coupon = payload.coupon || null;

    if (!coupon) {
      appliedCoupon.value = null;
      showPromoFeedback("Coupon code not found.", "error");
      return;
    }

    appliedCoupon.value = coupon;
    promoCode.value = coupon.code || code;
    showPromoFeedback(`${promoCode.value} applied successfully.`, "success");
  } catch (error) {
    console.error("Failed to apply coupon:", error);
    const formatted = formatBackendValidationError(error);
    appliedCoupon.value = null;
    showPromoFeedback(
      formatted || error?.response?.data?.message || "Failed to apply coupon. Please try again.",
      "error"
    );
  }
};

const methodTitle = computed(() => (method.value === 'qr' ? 'QR Code Payment' : 'Payment'));
const methodDescription = computed(() => (method.value === 'qr' ? 'Pay directly using your banking app.' : ''));
const receiptPaymentLabel = computed(() => (method.value === 'qr' ? 'QR Payment' : 'Pay Later'));

const minDate = computed(() => {
  const today = new Date();
  return today.toISOString().split("T")[0];
});

const calculateDays = () => {
  if (!rental.value.startDate || !rental.value.endDate) return 0;

  const start = new Date(rental.value.startDate);
  const end = new Date(rental.value.endDate);
  const diff = end.getTime() - start.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  return days > 0 ? days : 0;
};

const riderCount = computed(() => {
  const match = String(rental.value.riders).match(/^\s*(\d+)/);
  if (!match) return 1;
  const count = Number(match[1]);
  return Number.isFinite(count) && count > 0 ? count : 1;
});

const insuranceAmount = computed(() => {
  const base = Number(rental.value.insurance || 0);
  return includeInsurance.value ? base : 0;
});

const taxesAmount = computed(() => 0);

const couponDiscount = computed(() => {
  const coupon = appliedCoupon.value;
  if (!coupon) return 0;

  const subtotal = Number(rental.value.subtotal || 0);
  const minimumAmount = Number(coupon.minimum_amount || 0);

  if (minimumAmount > 0 && subtotal < minimumAmount) {
    return 0;
  }

  if (coupon.discount_percent !== null && coupon.discount_percent !== undefined) {
    return subtotal * (Number(coupon.discount_percent) / 100);
  }

  if (coupon.discount_amount !== null && coupon.discount_amount !== undefined) {
    return Number(coupon.discount_amount);
  }

  return 0;
});

const totalAmount = computed(() => {
  const days = Math.max(1, calculateDays());
  const subtotal = days * rental.value.dailyRate;
  rental.value.subtotal = subtotal;
  return Math.max(0, rental.value.subtotal + insuranceAmount.value - couponDiscount.value);
});

const isFormValid = computed(() => {
  return (
    !!rental.value.startDate &&
    !!rental.value.endDate &&
    calculateDays() > 0 &&
    !dateError.value
  );
});

const transactionDateTime = computed(() => {
  return new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
});

const formatPeriod = () => {
  const start = new Date(rental.value.startDate);
  const end = new Date(rental.value.endDate);
  const opts = { month: "short", day: "numeric", year: "numeric" };
  const days = calculateDays();
};


const isDateAvailable = async (startDate, endDate) => {
  const existingBookings = [
    { startDate: "2026-04-10", endDate: "2026-04-12" },
    { startDate: "2026-04-20", endDate: "2026-04-23" },
  ];

  const requestedStart = new Date(startDate);
  const requestedEnd = new Date(endDate);

  return existingBookings.every((booking) => {
    const existingStart = new Date(booking.startDate);
    const existingEnd = new Date(booking.endDate);
    return requestedEnd < existingStart || requestedStart > existingEnd;
  });
};

const validateDates = async () => {
  dateError.value = "";

  if (!rental.value.startDate || !rental.value.endDate) {
    dateError.value = "Please select both pick-up and drop-off dates.";
    return;
  }

  const start = new Date(rental.value.startDate);
  const end = new Date(rental.value.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (start < today) {
    dateError.value = "Pick-up date cannot be in the past.";
    return;
  }

  if (end <= start) {
    dateError.value = "Drop-off date must be after pick-up date.";
    return;
  }

  const available = await isDateAvailable(rental.value.startDate, rental.value.endDate);
  if (!available) {
    dateError.value = "Selected dates are not available. Please choose different dates.";
    return;
  }

  formatPeriod();
};

const formatBackendValidationError = (error) => {
  const errors = error?.response?.data?.errors
  if (errors && typeof errors === 'object') {
    for (const key of Object.keys(errors)) {
      const entry = errors[key]
      if (Array.isArray(entry)) {
        const first = entry.find((item) => typeof item === 'string' && item.trim())
        if (first) {
          return first
        }
      } else if (typeof entry === 'string' && entry.trim()) {
        return entry
      }
    }
  }
  return null
}

const saveBookingToDatabase = async (bookingData) => {
  const currentUser = userService.getCurrentUser();
  if (!currentUser?.id) {
    return { success: false, message: "Please login first." };
  }

  if (!vehicleId.value) {
    return { success: false, message: "Vehicle not found." };
  }

  const resolvedShopId = Number(vehicle.value?.shop_id ?? vehicle.value?.shop?.id);
  const shopId = Number.isFinite(resolvedShopId) && resolvedShopId > 0 ? resolvedShopId : null;

  const payload = {
    user_id: currentUser.id,
    phone_number: customerPhone.value,
    vehicle_id: vehicleId.value,
    shop_id: shopId,
    coupon_id: appliedCoupon.value?.id || null,
    start_date: rental.value.startDate,
    total_days: calculateDays(),
    total_price: totalAmount.value,
    status: bookingData?.status || "pending",
    deposit_amount: 0,
    deposit_status: "unpaid",
    rider_details: rental.value.riders,
    daily_rate: rental.value.dailyRate,
    insurance_fee: insuranceAmount.value,
    taxes_fee: taxesAmount.value,
  };

  try {
    const response = await api.post("/bookings", payload);
    const record = response?.data?.data || response?.data;
    const recordId = record?.id;
    const nextBookingId = recordId ? `BK${recordId}` : bookingData?.bookingId;

    const paymentStatusValue = bookingData?.paymentStatus || "pending";
    const paymentPayload = {
      booking_id: recordId,
      transaction_id: transactionId.value || paymentId.value,
      amount: totalAmount.value,
      payment_method: bookingData?.paymentMethod || method.value,
      payment_status: paymentStatusValue,
      paid_at: paymentStatusValue === "paid" ? new Date().toISOString() : null,
    };

    await api.post("/payments", paymentPayload);

    return {
      success: true,
      bookingId: nextBookingId || "",
    };
  } catch (error) {
    console.error("Booking create error:", error);
    const message =
      formatBackendValidationError(error) ||
      error?.response?.data?.message ||
      error?.message ||
      "Failed to create booking.";
    return { success: false, message };
  }
};


const buildBookingData = (paymentMethod, status, paymentStatus = 'pending') => ({
  bookingId: bookingId.value,
  transactionId: transactionId.value,
  paymentId: paymentId.value,
  rental: {
    title: rental.value.title,
    location: rental.value.location,
    startDate: rental.value.startDate,
    endDate: rental.value.endDate,
    dailyRate: rental.value.dailyRate,
    days: calculateDays(),
    subtotal: rental.value.subtotal,
    insurance: insuranceAmount.value,
    taxes: taxesAmount.value,
    totalAmount: totalAmount.value,
  },
  paymentMethod,
  status,
  paymentStatus,
  createdAt: new Date().toISOString(),
});

const handlePayment = async () => {
  if (isSubmittingPayment.value) return;
  isSubmittingPayment.value = true;
  await validateDates();
  if (dateError.value) {
    isSubmittingPayment.value = false;
    return;
  }
  if (!isFormValid.value) {
    isSubmittingPayment.value = false;
    alert("Please select valid rental dates before paying.");
    return;
  }

  try {
    if (!customerPhone.value) {
      alert("Please enter your phone number.");
      isSubmittingPayment.value = false;
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));
    const result = await saveBookingToDatabase(buildBookingData(method.value, "pending", "paid"));

    if (result.success) {
      bookingId.value = result.bookingId;
      showSuccessModal.value = true;

      // Save phone to user profile if checked
      if (savePhoneToProfile.value && customerPhone.value) {
        try {
          const currentUser = userService.getCurrentUser();
          if (currentUser?.id) {
            // Update on backend
            await api.put(`/users/${currentUser.id}`, { phone: customerPhone.value });
            // Update in local storage
            const updatedUser = { ...currentUser, phone: customerPhone.value };
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        } catch (e) {
          console.warn('Failed to save phone to profile:', e);
        }
      }
    } else {
      alert(result.message || "Payment failed. Please try again.");
    }
  } finally {
    isSubmittingPayment.value = false;
  }
};

const generateABAQRData = () => {
  const qrData = {
    merchant: "MOTORAL-001",
    name: "Moto Rental",
    amount: totalAmount.value.toFixed(2),
    currency: "USD",
    ref: paymentId.value,
    desc: `Payment for ${rental.value.title}`,
    time: new Date().toISOString(),
  };

  return `aba://payment?merchant=${qrData.merchant}&name=${encodeURIComponent(
    qrData.name
  )}&amount=${qrData.amount}&currency=${qrData.currency}&ref=${qrData.ref}&desc=${encodeURIComponent(
    qrData.desc
  )}&time=${qrData.time}`;
};

const generateQRCode = async () => {
  await validateDates();
  if (dateError.value) return;

  if (selectedShopQrUrl.value) {
    qrCodeUrl.value = selectedShopQrUrl.value;
  } else {
    const qrPayload = generateABAQRData();
    qrCodeUrl.value = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
      qrPayload
    )}`;
  }

  showQR.value = true;
};

const returnToShopViewAfterSuccess = () => {
  if (successRedirectTimer) {
    window.clearTimeout(successRedirectTimer);
    successRedirectTimer = null;
  }
  showSuccessModal.value = false;
  router.replace('/view_shop');
};

const loadExternalScript = (src) =>
  new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = (e) => reject(e);
    document.head.appendChild(s);
  });

const renderReceiptToPdf = async (filename = `receipt_${bookingId.value || Date.now()}.pdf`) => {
  try {
    await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');

    // @ts-ignore
    const html2canvas = window.html2canvas || window.HTML2CANVAS || window.html2canvas;
    // @ts-ignore
    const jspdfModule = window.jspdf || window.jspPDF || window.jspdf;
    const jsPDF = jspdfModule?.jsPDF || (jspdfModule && jspdfModule.default?.jsPDF) || (jspdfModule && jspdfModule.default) || null;

    if (!html2canvas || !jsPDF) throw new Error('PDF libraries not available');

    const el = document.getElementById('receipt') || document.getElementById('receipt-wrapper');
    if (!el) throw new Error('Receipt element not found');


    // Store original display style and temporarily make element visible for rendering
    const originalDisplay = el.style.display;
    el.style.display = 'block'; // Temporarily make visible for html2canvas

    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true });
      if (canvas.width <= 0 || canvas.height <= 0) {
          throw new Error('Invalid canvas dimensions');
      }
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      // Convert canvas dimensions from pixels to points (1 pixel = 0.75 points)
      const widthInPts = canvas.width * 0.75;
      const heightInPts = canvas.height * 0.75;
      // Create PDF with dimensions matching canvas in points
      const pdf = new jsPDF({ unit: 'pt', format: [widthInPts, heightInPts] });
      pdf.addImage(imgData, 'JPEG', 0, 0, widthInPts, heightInPts);
      pdf.save(filename);
      return true;
    } finally {
      // Restore original display style
      el.style.display = originalDisplay;
    }
  } catch (err) {
    console.error('PDF generation failed:', err);
    return false;
  }
};

const downloadReceipt = async () => {
  const filename = `receipt_${bookingId.value || Date.now()}.pdf`;
  const ok = await renderReceiptToPdf(filename);
  if (!ok) {
    alert('Failed to generate PDF receipt. Please try again.');
  }
};

const shopOwnerName = computed(() => {
  const shop = vehicle.value?.shop_id ? shopsById.value[vehicle.value.shop_id] : null;
  return shop?.owner?.name || 'CHANTHEN ORN';
});

const vehiclePlateNumber = computed(() => {
  return vehicle.value?.plate_number || 'N/A';
});

const initDates = () => {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  rental.value.startDate = start.toISOString().split("T")[0];
  rental.value.endDate = end.toISOString().split("T")[0];
  formatPeriod();
};

onMounted(() => {
  loadVehicleDetail();
  loadCouponFromRoute();
  
  // Pre-fill phone from user profile
  const currentUser = userService.getCurrentUser();
  if (currentUser?.phone) {
    customerPhone.value = currentUser.phone;
  }
});

watch(
  () => [route.query.insuranceFee, route.query.includeInsurance, route.query.includeTaxes, route.query.riderDetails, route.query.coupon_id, route.query.coupon_code],
  () => {
    applyRouteDefaults();
    loadCouponFromRoute();
  },
  { immediate: true }
);

watch(
  () => [vehicle.value?.shop_id, shopQrOptions.value.length],
  updateShopQrSelection,
  { immediate: true }
);

watch(method, (next) => {
  if (next !== "qr") {
    showQR.value = false;
    return;
  }
  if (selectedShopQrUrl.value) {
    qrCodeUrl.value = selectedShopQrUrl.value;
    showQR.value = true;
  }
});

watch(selectedShopQrUrl, (url) => {
  if (!url) return;
  if (method.value === "qr" && showQR.value) {
    qrCodeUrl.value = url;
  }
});
initDates();

onBeforeUnmount(() => {
  if (successRedirectTimer) {
    window.clearTimeout(successRedirectTimer);
    successRedirectTimer = null;
  }
});
</script>
