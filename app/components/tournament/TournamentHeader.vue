<script setup lang="ts">
import { t } from '~/utils/i18n'
import { COVERAGE_ROUND_COUNT, REFINEMENT_ROUND_COUNT } from '~/types/tournament'
import type { TournamentState } from '~/types/tournament'

const props = defineProps<{
  phase: TournamentState['phase'] | undefined
  phaseRound: number
  progressPercent: number
  canUndo: boolean
}>()

defineEmits<{ undo: []; reset: [] }>()

const i = (key: string) => t(key, 'en')

/** Pourcentage affiché, animé linéairement vers la cible (pas de saut). */
const displayedProgressPercent = ref(0)
const PROGRESS_ANIM_DURATION_MS = 450
let progressAnimId = 0
watch(
  () => props.progressPercent,
  (target) => {
    const start = displayedProgressPercent.value
    const startTime = performance.now()
    const tick = () => {
      const t = Math.min((performance.now() - startTime) / PROGRESS_ANIM_DURATION_MS, 1)
      const ease = 1 - (1 - t) * (1 - t) // easeOutQuad
      displayedProgressPercent.value = start + (target - start) * ease
      if (t < 1) progressAnimId = requestAnimationFrame(tick)
    }
    cancelAnimationFrame(progressAnimId)
    progressAnimId = requestAnimationFrame(tick)
  },
  { immediate: true }
)

/** Phase badge text: pourcentage animé (progression linéaire visuelle). */
const phaseBadgeText = computed(() => {
  if (!props.phase || props.phase === 'finished') return ''
  const percent = Math.round(displayedProgressPercent.value)
  if (props.phase === 'phase1') {
    const roundNum = (props.phaseRound ?? 0) + 1
    return `${i('phase1.badge')} — Round ${roundNum} of ${COVERAGE_ROUND_COUNT} — ${percent}%`
  }
  if (props.phase === 'phase2') {
    const roundNum = (props.phaseRound ?? 0) + 1
    return `${i('phase2.badge')} — Round ${roundNum} of ${REFINEMENT_ROUND_COUNT} — ${percent}%`
  }
  return `${i('phase3.badge')} — ${percent}%`
})

defineExpose({ displayedProgressPercent })
</script>

<template>
  <header class="header">
    <div class="header-inner">
      <div class="logo-wrap">
        <span class="logo-brand">Yu-Gi-Oh!</span>
        <h1 class="logo">{{ i('header.tournament') }}</h1>
      </div>
      <div v-if="phase" class="header-right">
        <span v-if="phase !== 'finished'" class="phase-badge">
          <span class="phase-badge__dot" />
          <span class="phase-badge__text">{{ phaseBadgeText }}</span>
        </span>
        <div class="header-actions">
          <button
            v-if="canUndo"
            type="button"
            class="btn btn-prev btn-header"
            @click="$emit('undo')"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            {{ i('btn.previous') }}
          </button>
          <button
            v-if="phase && phase !== 'finished'"
            type="button"
            class="btn btn-reset btn-header"
            :title="i('btn.reset')"
            @click="$emit('reset')"
          >
            {{ i('btn.reset') }}
          </button>
        </div>
      </div>
    </div>
    <!-- Thin progress bar at bottom of header -->
    <div v-if="phase && phase !== 'finished'" class="header-progress">
      <div class="header-progress__fill" :style="{ width: displayedProgressPercent + '%' }" />
    </div>
  </header>
</template>

<style scoped>
/* ============================== */
/*           HEADER               */
/* ============================== */
.header {
  padding: 1rem 2rem;
  background: var(--bg-glass-strong);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1px solid var(--border-subtle);
}

.header-inner {
  max-width: 72rem;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.logo-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
}

.logo-brand {
  font-size: 0.65rem;
  font-weight: 700;
  background: linear-gradient(90deg, var(--accent-dim), var(--accent), var(--accent-dim));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.14em;
  margin: 0;
  text-transform: uppercase;
}

.logo {
  font-family: 'Outfit', sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  letter-spacing: -0.02em;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-header {
  padding: 0.45rem 0.85rem;
  font-size: 0.78rem;
}

.phase-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.7rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
  border: 1px solid rgba(232, 197, 71, 0.15);
  border-radius: var(--radius-pill);
  background: rgba(232, 197, 71, 0.05);
  white-space: nowrap;
}

.phase-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: badge-dot-pulse 1.5s ease-in-out infinite;
}

@keyframes badge-dot-pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(232, 197, 71, 0.4); }
  50% { opacity: 0.6; box-shadow: 0 0 0 4px rgba(232, 197, 71, 0); }
}

.phase-badge__text {
  line-height: 1;
}

/* Header progress bar */
.header-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.03);
}

.header-progress__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-dim), var(--accent));
  transition: width 0.5s var(--ease-out);
  box-shadow: 0 0 8px rgba(232, 197, 71, 0.3);
}

@media (max-width: 640px) {
  .header {
    padding: 0.75rem 1rem;
  }
  .header-right {
    gap: 0.4rem;
  }
  .phase-badge {
    font-size: 0.6rem;
    padding: 0.2rem 0.5rem;
  }
  .phase-badge__dot {
    width: 5px;
    height: 5px;
  }
  .btn-header {
    padding: 0.35rem 0.6rem;
    font-size: 0.72rem;
  }
  .logo {
    font-size: 0.92rem;
  }
}
</style>
