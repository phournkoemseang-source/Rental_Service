<script setup>
import { RouterLink } from 'vue-router'

const quickLinks = [
  { label: 'Home', to: '/view_shop' },
  { label: 'My Booking', to: '/my-bookings' },
  { label: 'Promotions', to: '/promotions' }
]
const paymentMethods = [
  { name: 'Visa', icon: 'fa-brands fa-cc-visa' },
  { name: 'Mastercard', icon: 'fa-brands fa-cc-mastercard' },
  { name: 'Bank Transfer', icon: 'fa-solid fa-building-columns' }
]
const socialLinks = [
  { label: 'Facebook', href: 'https://www.facebook.com', icon: 'fa-brands fa-facebook-f' },
  { label: 'Instagram', href: 'https://www.instagram.com', icon: 'fa-brands fa-instagram' },
  { label: 'TikTok', href: 'https://www.tiktok.com', icon: 'fa-brands fa-tiktok' }
]
const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="common-footer">
    <div class="common-footer__content">
      <div class="common-footer__brand">
        <div class="common-footer__brand-logo">
          <img src="/Images/logo-removebg.png" alt="Chong Choul" class="common-footer__brand-img" />
        </div>
        <h4>Chong Choul</h4>
        <p>{{ $t('connectingAdventurousTravelersWithTheBestLocalVehicleRentalsAcrossTheKingdomOfWonder') }}</p>
      </div>

      <div class="common-footer__col">
        <h5><i class="fa-solid fa-link" aria-hidden="true"></i>{{ $t('quickLinks') }}</h5>
        <RouterLink
          v-for="item in quickLinks"
          :key="item.label"
          :to="item.to"
          class="common-footer__link"
        >
          <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
          {{ item.label }}
        </RouterLink>
      </div>

      <div class="common-footer__col">
        <h5><i class="fa-solid fa-credit-card" aria-hidden="true"></i>{{ $t('paymentMethods') }}</h5>
        <span v-for="method in paymentMethods" :key="method.name" class="common-footer__link">
          <i :class="method.icon" aria-hidden="true"></i>
          {{ method.name }}
        </span>
      </div>

      <div class="common-footer__col">
        <h5><i class="fa-solid fa-share-nodes" aria-hidden="true"></i>{{ $t('socialMedias') }}</h5>
        <a
          v-for="social in socialLinks"
          :key="social.label"
          :href="social.href"
          class="common-footer__link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <i :class="social.icon" aria-hidden="true"></i>
          <span>{{ social.label }}</span>
        </a>
      </div>
    </div>

    <div class="common-footer__divider"></div>

    <div class="common-footer__bottom">
      <span>
        &copy; {{ currentYear }} Chong Choul Rides. Made with
        <span class="common-footer__heart" aria-hidden="true">&hearts;</span>{{ $t('inCambodia') }}</span>
      <div class="common-footer__legal">
        <a href="#" class="common-footer__legal-link">
          <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>{{ $t('privacyPolicy') }}</a>
        <a href="#" class="common-footer__legal-link">
          <i class="fa-solid fa-file-contract" aria-hidden="true"></i>{{ $t('termsOfService') }}</a>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.common-footer {
  background: #0f172a;
  color: #cbd5e1;
  padding: 48px 24px 28px;
  font-family: var(--font-sans, 'Inter', 'Segoe UI', system-ui, sans-serif);
  display: flex;
  flex-direction: column;
  gap: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.common-footer__content {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 40px;
  align-items: flex-start;
}

.common-footer__brand {
  flex: 1 1 280px;
  max-width: 320px;
}

.common-footer__brand-logo {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  overflow: hidden;
}

.common-footer__brand-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.35));
}

.common-footer__col {
  flex: 0 1 170px;
  min-width: 140px;
}

.common-footer__brand h4 {
  margin: 0 0 8px;
  font-size: 1.25rem;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.02em;
}

.common-footer__brand p {
  margin: 0;
  max-width: 280px;
  color: #94a3b8;
  line-height: 1.7;
  font-size: 0.9rem;
}

.common-footer__col h5 {
  margin: 0 0 14px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 8px;
}

.common-footer__col h5 i {
  color: #60a5fa;
  font-size: 0.75rem;
}

.common-footer__link {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  color: #94a3b8;
  text-decoration: none;
  margin-bottom: 10px;
  transition: all 0.2s ease;
  padding: 4px 0;
}

.common-footer__link i {
  font-size: 0.85rem;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.common-footer__link .fa-chevron-right {
  font-size: 0.55rem;
  color: #475569;
  transition: transform 0.2s ease, color 0.2s ease;
}

.common-footer__link:hover {
  color: #ffffff;
}

.common-footer__link:hover .fa-chevron-right {
  transform: translateX(3px);
  color: #60a5fa;
}

.common-footer__heart {
  display: inline-block;
  margin: 0 4px;
  color: #ef4444;
  animation: heartBeat 1.5s ease-in-out infinite;
}

@keyframes heartBeat {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.common-footer__divider {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.common-footer__bottom {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.85rem;
  color: #64748b;
  padding-top: 4px;
}

.common-footer__legal {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.common-footer__legal-link {
  color: #64748b;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  transition: color 0.2s ease;
}

.common-footer__legal-link:hover {
  color: #ffffff;
}

@media (max-width: 1024px) {
  .common-footer__content {
    gap: 32px;
  }

  .common-footer__bottom {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}

@media (max-width: 640px) {
  .common-footer {
    padding: 36px 16px 24px;
  }

  .common-footer__content {
    flex-direction: column;
    gap: 28px;
  }

  .common-footer__brand,
  .common-footer__col {
    max-width: none;
    flex: 1;
  }

  .common-footer__legal {
    gap: 16px;
  }
}
</style>
