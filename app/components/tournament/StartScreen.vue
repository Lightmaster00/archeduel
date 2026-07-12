<script setup lang="ts">
import { t } from '~/utils/i18n'

const i = (key: string) => t(key, 'en')

defineEmits<{ start: [] }>()
</script>

<template>
  <div class="start-screen">
    <!-- ── Background layers ── -->
    <div class="start-bg-vignette" aria-hidden="true" />
    <div class="start-bg-rays" aria-hidden="true" />
    <div class="start-bg-grid" aria-hidden="true" />

    <!-- Floating gold particles -->
    <div class="start-particles" aria-hidden="true">
      <span v-for="j in 20" :key="j" class="start-particle" :style="{ '--i': j }" />
    </div>

    <!-- ── Floating card silhouettes (scattered around viewport) ── -->
    <div class="start-cards-scatter" aria-hidden="true">
      <span v-for="c in 8" :key="c" class="start-card-ghost" :style="{ '--c': c }" />
    </div>

    <!-- ── Hero content ── -->
    <div class="start-hero">
      <div class="start-glow" aria-hidden="true" />

      <!-- App favicon (diamond) -->
      <div class="start-favicon" aria-hidden="true">
        <img src="/favicon.svg" alt="" width="80" height="80" class="start-favicon__img" >
      </div>

      <p class="start-brand">Yu-Gi-Oh!</p>
      <h2 class="start-title" v-html="i('start.title').replace('\n', '<br>')" />
      <p class="start-tagline" v-html="i('start.tagline').replace('\n', '<br>')" />

      <!-- Separator -->
      <div class="start-separator" aria-hidden="true">
        <span class="start-sep-line" />
        <span class="start-sep-diamond" />
        <span class="start-sep-line" />
      </div>

      <!-- CTA -->
      <div class="start-cta">
        <button type="button" class="btn btn-gold btn-lg start-btn" @click="$emit('start')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          {{ i('start.cta') }}
        </button>
      </div>

      <!-- Stats teaser -->
      <div class="start-stats">
        <div class="start-stat">
          <span class="start-stat__num">300+</span>
          <span class="start-stat__label">Archetypes</span>
        </div>
        <span class="start-stat__sep" />
        <div class="start-stat">
          <span class="start-stat__num">3</span>
          <span class="start-stat__label">Phases</span>
        </div>
        <span class="start-stat__sep" />
        <div class="start-stat">
          <span class="start-stat__num">Top 10</span>
          <span class="start-stat__label">Ranking</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================== */
/*        START SCREEN            */
/* ============================== */
.start-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 52px);
  min-height: calc(100dvh - 52px);
  padding: 2rem;
  position: relative;
  overflow: hidden;
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  margin-top: -0.75rem;
  margin-bottom: -1.5rem;
}

/* Dark vignette */
.start-bg-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 65% 55% at 50% 42%, transparent 0%, rgba(5, 5, 7, 0.75) 100%);
  pointer-events: none;
  z-index: 1;
}

/* Rotating rays */
.start-bg-rays {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 160vmax;
  height: 160vmax;
  transform: translate(-50%, -50%);
  background: conic-gradient(
    from 0deg,
    transparent 0deg, rgba(232, 192, 64, 0.04) 8deg, transparent 16deg,
    transparent 30deg, rgba(232, 192, 64, 0.035) 38deg, transparent 46deg,
    transparent 60deg, rgba(232, 192, 64, 0.04) 68deg, transparent 76deg,
    transparent 90deg, rgba(232, 192, 64, 0.035) 98deg, transparent 106deg,
    transparent 120deg, rgba(232, 192, 64, 0.04) 128deg, transparent 136deg,
    transparent 150deg, rgba(232, 192, 64, 0.035) 158deg, transparent 166deg,
    transparent 180deg, rgba(232, 192, 64, 0.04) 188deg, transparent 196deg,
    transparent 210deg, rgba(232, 192, 64, 0.035) 218deg, transparent 226deg,
    transparent 240deg, rgba(232, 192, 64, 0.04) 248deg, transparent 256deg,
    transparent 270deg, rgba(232, 192, 64, 0.035) 278deg, transparent 286deg,
    transparent 300deg, rgba(232, 192, 64, 0.04) 308deg, transparent 316deg,
    transparent 330deg, rgba(232, 192, 64, 0.035) 338deg, transparent 346deg,
    transparent 360deg
  );
  animation: start-rays-rotate 50s linear infinite;
  pointer-events: none;
}

@keyframes start-rays-rotate {
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

/* Grid texture */
.start-bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(232, 192, 64, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(232, 192, 64, 0.025) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse 55% 45% at 50% 50%, rgba(0, 0, 0, 0.4) 0%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse 55% 45% at 50% 50%, rgba(0, 0, 0, 0.4) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* Floating gold particles */
.start-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.start-particle {
  position: absolute;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0;
  animation: start-particle-float 7s ease-in-out infinite;
  animation-delay: calc(var(--i) * 0.4s);
  left: calc(3% + var(--i) * 4.7%);
  top: calc(90% - var(--i) * 0.5%);
}

.start-particle:nth-child(even) {
  width: 3px;
  height: 3px;
  animation-duration: 9s;
}

.start-particle:nth-child(3n) {
  width: 4px;
  height: 4px;
  animation-duration: 8s;
  background: linear-gradient(135deg, var(--accent), #f0d060);
  box-shadow: 0 0 6px rgba(232, 192, 64, 0.35);
}

@keyframes start-particle-float {
  0% { opacity: 0; transform: translateY(0) scale(0.4); }
  12% { opacity: 0.6; }
  50% { opacity: 0.25; }
  100% { opacity: 0; transform: translateY(-60vh) scale(0); }
}

/* ── Scattered card ghosts ── */
.start-cards-scatter {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.start-card-ghost {
  position: absolute;
  width: 52px;
  aspect-ratio: 1;
  border-radius: 8px;
  border: 1px solid rgba(232, 192, 64, 0.08);
  background: linear-gradient(145deg, rgba(232, 192, 64, 0.03), rgba(232, 192, 64, 0.01));
  backdrop-filter: blur(2px);
  animation: card-ghost-drift 12s ease-in-out infinite;
  opacity: 0;
}

.start-card-ghost:nth-child(1) { left: 5%; top: 12%; animation-delay: 0s; transform: rotate(-12deg); }
.start-card-ghost:nth-child(2) { right: 6%; top: 15%; animation-delay: 1.5s; transform: rotate(10deg); width: 44px; }
.start-card-ghost:nth-child(3) { left: 12%; bottom: 18%; animation-delay: 3s; transform: rotate(-6deg); width: 48px; }
.start-card-ghost:nth-child(4) { right: 10%; bottom: 22%; animation-delay: 4.5s; transform: rotate(14deg); width: 40px; }
.start-card-ghost:nth-child(5) { left: 22%; top: 8%; animation-delay: 2s; transform: rotate(5deg); width: 36px; }
.start-card-ghost:nth-child(6) { right: 20%; top: 6%; animation-delay: 5s; transform: rotate(-8deg); width: 42px; }
.start-card-ghost:nth-child(7) { left: 3%; top: 55%; animation-delay: 6s; transform: rotate(9deg); width: 38px; }
.start-card-ghost:nth-child(8) { right: 4%; top: 50%; animation-delay: 7s; transform: rotate(-11deg); width: 46px; }

@keyframes card-ghost-drift {
  0%, 100% { opacity: 0; transform: translateY(0) rotate(var(--r, -5deg)) scale(0.95); }
  15% { opacity: 0.35; }
  50% { opacity: 0.2; transform: translateY(-20px) rotate(calc(var(--r, -5deg) + 3deg)) scale(1); }
  85% { opacity: 0.35; }
}

/* ── Hero ── */
.start-hero {
  position: relative;
  text-align: center;
  max-width: 36rem;
  z-index: 3;
  animation: start-hero-enter 1s var(--ease-out) both;
}

@keyframes start-hero-enter {
  from {
    opacity: 0;
    transform: scale(0.94) translateY(24px);
    filter: blur(3px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
    filter: blur(0);
  }
}

.start-glow {
  position: absolute;
  top: -50%;
  left: 50%;
  transform: translateX(-50%);
  width: 180%;
  height: 100%;
  background:
    radial-gradient(ellipse 45% 30% at 50% 40%, rgba(232, 192, 64, 0.12) 0%, transparent 50%),
    radial-gradient(ellipse 70% 55% at 50% 45%, rgba(232, 192, 64, 0.04) 0%, transparent 60%);
  pointer-events: none;
  animation: start-glow-pulse 4.5s ease-in-out infinite;
}

@keyframes start-glow-pulse {
  0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
  50% { opacity: 0.6; transform: translateX(-50%) scale(1.08); }
}

/* Favicon (diamond) */
.start-favicon {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
  animation: start-fade-up 0.8s var(--ease-out) 0.1s both;
}

.start-favicon__img {
  width: 80px;
  height: 80px;
  object-fit: contain;
  filter: drop-shadow(0 0 14px rgba(232, 192, 64, 0.4));
  animation: start-favicon-glow 3.5s ease-in-out infinite;
}

@keyframes start-favicon-glow {
  0%, 100% { filter: drop-shadow(0 0 14px rgba(232, 192, 64, 0.4)); }
  50% { filter: drop-shadow(0 0 24px rgba(232, 192, 64, 0.6)); }
}

/* Brand */
.start-brand {
  font-size: 0.85rem;
  font-weight: 700;
  background: linear-gradient(90deg, #c9a020, var(--accent), #f5e080, var(--accent), #c9a020);
  background-size: 200% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.28em;
  margin: 0 0 0.75rem;
  text-transform: uppercase;
  animation: start-brand-shine 4s ease-in-out infinite, start-fade-up 0.8s var(--ease-out) 0.15s both;
}

@keyframes start-brand-shine {
  0% { background-position: 200% 0; }
  50% { background-position: -50% 0; }
  100% { background-position: 200% 0; }
}

/* Title */
.start-title {
  font-family: 'Outfit', sans-serif;
  font-size: clamp(2.4rem, 7vw, 3.6rem);
  font-weight: 800;
  color: var(--text);
  margin: 0 0 1rem;
  letter-spacing: -0.025em;
  line-height: 1.05;
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.6);
  animation: start-fade-up 0.9s var(--ease-out) 0.2s both;
}

/* Tagline */
.start-tagline {
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin: 0 0 1.5rem;
  line-height: 1.55;
  animation: start-fade-up 0.8s var(--ease-out) 0.3s both;
}

@keyframes start-fade-up {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Separator */
.start-separator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  margin: 0 0 2rem;
  animation: start-fade-up 0.7s var(--ease-out) 0.4s both;
}

.start-sep-line {
  display: block;
  width: 3rem;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(232, 192, 64, 0.3), transparent);
}

.start-sep-diamond {
  display: block;
  width: 6px;
  height: 6px;
  background: var(--accent);
  transform: rotate(45deg);
  opacity: 0.6;
  box-shadow: 0 0 8px rgba(232, 192, 64, 0.4);
}

/* CTA */
.start-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  animation: start-fade-up 0.8s var(--ease-out) 0.5s both;
}

.start-btn {
  padding: 1rem 2.5rem;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  box-shadow: 0 4px 24px rgba(232, 192, 64, 0.3);
  transition: box-shadow 0.3s var(--ease), transform 0.2s var(--ease);
  animation: start-btn-breathe 2.5s ease-in-out infinite;
}

@keyframes start-btn-breathe {
  0%, 100% { box-shadow: 0 4px 24px rgba(232, 192, 64, 0.3); }
  50% { box-shadow: 0 8px 36px rgba(232, 192, 64, 0.45), 0 0 48px rgba(232, 192, 64, 0.1); }
}

.start-btn:hover {
  box-shadow: 0 6px 32px rgba(232, 192, 64, 0.4);
  transform: translateY(-2px);
  animation: none;
}

/* Stats teaser */
.start-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 2.5rem;
  animation: start-fade-up 0.7s var(--ease-out) 0.7s both;
}

.start-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}

.start-stat__num {
  font-family: 'Outfit', sans-serif;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--accent);
  letter-spacing: -0.02em;
}

.start-stat__label {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.start-stat__sep {
  display: block;
  width: 1px;
  height: 28px;
  background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.08), transparent);
}
</style>
