<template>
  <transition name="splash-fade">
    <div v-if="show" class="splash-screen">
      <!-- Background Decorative Elements -->
      <div class="bg-grid"></div>
      <div class="bg-glow glow-1"></div>
      <div class="bg-glow glow-2"></div>
      <div class="bg-blob blob-1"></div>
      <div class="bg-blob blob-2"></div>
      
      <div class="splash-content">
        <div class="logo-wrapper">
          <div class="app-logo__mark">
            <div class="logo-orbit"></div>
            <img src="/Images/logo-removebg.png" alt="Chong Choul Logo" class="logo-img" />
            <div class="shimmer"></div>
          </div>
        </div>
        
        <div class="text-wrapper">
          <h1 class="app-name">Chong Choul</h1>
          <p class="tagline">{{ $t('premiumVehicleRentals') }}</p>
        </div>

        <div class="loader-container">
          <div class="loader-track">
            <div class="loader-fill"></div>
          </div>
          <span class="loading-text">{{ $t('startingYourJourney') }}</span>
        </div>

        <div class="trust-row">
          <span>{{ $t('trustedLocalShops') }}</span>
          <span>{{ $t('fastBooking') }}</span>
          <span>{{ $t('247Support') }}</span>
        </div>

        <div v-if="locationRequired" class="splash-location-notice">
          <div class="notice-dot"></div>
          <div>
            <strong>{{ $t('locationPermissionRequired') }}</strong>
            <p>{{ $t('enableLocationToUseLoginAndRegisterWithNearbyShopMatching') }}</p>
          </div>
        </div>
      </div>
      
      <div class="footer-credit">
        <span>{{ $t('poweredByChongChoulEcoSystem') }}</span>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    default: true
  },
  locationRequired: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.splash-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: radial-gradient(circle at 20% 20%, #eef6ff 0%, #e8f4ff 35%, #ffffff 70%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 99999;
  overflow: hidden;
  font-family: var(--font-sans);
}

.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(15, 23, 42, 0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(15, 23, 42, 0.04) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(circle at center, rgba(0, 0, 0, 0.9), transparent 75%);
  z-index: -2;
}

.bg-glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(35px);
  z-index: -2;
  opacity: 0.6;
}

.glow-1 {
  width: 280px;
  height: 280px;
  top: 10%;
  left: 18%;
  background: rgba(56, 189, 248, 0.35);
  animation: float 14s infinite alternate;
}

.glow-2 {
  width: 320px;
  height: 320px;
  bottom: 12%;
  right: 16%;
  background: rgba(30, 64, 175, 0.25);
  animation: float 18s infinite alternate-reverse;
}

/* Decorative Background Blobs */
.bg-blob {
  position: absolute;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(37, 99, 235, 0.05) 0%, rgba(255, 255, 255, 0) 70%);
  border-radius: 50%;
  z-index: -1;
}
.blob-1 { top: -100px; right: -100px; animation: float 10s infinite alternate; }
.blob-2 { bottom: -100px; left: -100px; animation: float 12s infinite alternate-reverse; }

.splash-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.logo-wrapper {
  margin-bottom: -36px;
  perspective: 1000px;
  animation: logo-entrance 1s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.app-logo__mark {
  position: relative;
  width: 190px;
  height: 190px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.logo-orbit {
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  border: 1px solid rgba(37, 99, 235, 0.24);
  box-shadow: 0 0 0 14px rgba(37, 99, 235, 0.08);
  animation: spin 16s linear infinite;
}


.logo-img {
  width: 72%;
  height: 72%;
  object-fit: contain;
  z-index: 2;
  filter: drop-shadow(0 12px 24px rgba(15, 23, 42, 0.2));
}

.shimmer {
  position: absolute;
  top: 0;
  left: -150%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  transform: skewX(-20deg);
  animation: shimmer 2.5s infinite;
}

.text-wrapper {
  text-align: center;
  animation: text-entrance 1s cubic-bezier(0.2, 0.8, 0.2, 1) 0.2s both;
}

.app-name {
  font-size: 2.8rem;
  font-weight: 800;
  background: linear-gradient(135deg, #0b2b73 0%, #1e40af 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin: 0;
  letter-spacing: -1px;
}

.tagline {
  font-size: 0.95rem;
  color: #64748b;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  margin-top: 8px;
  font-weight: 600;
}

.loader-container {
  margin-top: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  animation: fade-in 1s ease 0.5s both;
}

.loader-track {
  width: 260px;
  height: 6px;
  background: #dbe7ff;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.loader-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 40%;
  background: linear-gradient(90deg, #22d3ee, #2563eb, #1d4ed8);
  border-radius: 10px;
  animation: loading-infinite 2s infinite ease-in-out;
}

.loading-text {
  font-size: 0.85rem;
  color: #94a3b8;
  font-weight: 500;
}

.trust-row {
  margin-top: 6px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.trust-row span {
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 0.75rem;
  color: #334155;
  letter-spacing: 0.02em;
}

.splash-location-notice {
  margin-top: 14px;
  width: min(460px, calc(100vw - 40px));
  border-radius: 18px;
  border: 1px solid rgba(30, 64, 175, 0.14);
  background: linear-gradient(135deg, rgba(241, 245, 255, 0.95), rgba(236, 253, 255, 0.95));
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
  padding: 14px 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.notice-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  margin-top: 5px;
  background: radial-gradient(circle at 30% 30%, #22d3ee, #2563eb);
  box-shadow: 0 0 0 7px rgba(56, 189, 248, 0.18);
}

.splash-location-notice strong {
  display: block;
  color: #0f2f72;
  font-size: 0.88rem;
  letter-spacing: 0.01em;
}

.splash-location-notice p {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: #3b4e79;
}

.footer-credit {
  position: absolute;
  bottom: 40px;
  font-size: 0.8rem;
  color: #94a3b8;
  letter-spacing: 0.05em;
  animation: fade-in 1s ease 0.8s both;
}

/* Animations */
@keyframes logo-entrance {
  from { transform: translateY(30px) rotateY(-20deg); opacity: 0; }
  to { transform: translateY(0) rotateY(0); opacity: 1; }
}

@keyframes text-entrance {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes shimmer {
  100% { left: 200%; }
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

@keyframes loading-infinite {
  0% { left: -40%; }
  100% { left: 100%; }
}

@keyframes float {
  from { transform: translate(0, 0); }
  to { transform: translate(20px, 20px); }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.splash-fade-leave-active {
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.splash-fade-leave-to {
  opacity: 0;
  transform: scale(1.05);
  filter: blur(10px);
}
</style>
