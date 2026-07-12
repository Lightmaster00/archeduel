<script setup lang="ts">
import { t } from '~/utils/i18n'
import { SWISS_ROUND_COUNT } from '~/types/tournament'

const {
  state,
  loading,
  transitioning,
  error,
  top10,
  canUndo,
  init,
  startTournament,
  startTournamentWithPool,
  pickGroup,
  pickDuel,
  finish,
  undo,
  downloadCsv,
  restart,
  resetToStart
} = useTournamentState()

const i = (key: string) => t(key, 'en')

/** Results popup: selected archetype (null = closed). */
const archetypeModalName = ref<string | null>(null)

/** Cible de progression (0–100), valeur réelle. */
const phaseProgressPercent = computed(() => {
  const s = state.value
  if (!s) return 0
  if (s.phase === 'phase1' || s.phase === 'phase2') {
    if (!s.groupsTotal) return 0
    return (s.groupsCompleted / s.groupsTotal) * 100
  }
  if (s.phase === 'phase3') {
    const pool = s.phasePool
    const matchesPerRound = Math.floor(pool.length / 2)
    const total = matchesPerRound * SWISS_ROUND_COUNT
    if (total <= 0) return 0
    return (s.matchesPlayed.length / total) * 100
  }
  return 0
})

/** Phase 1/2: groups of 2-4. Mirrors MatchBoard's internal isGroupMode for this page's own v-else-if. */
const isGroupModeOuter = computed(
  () =>
    (state.value?.phase === 'phase1' || state.value?.phase === 'phase2') &&
    (state.value?.currentMatch?.length ?? 0) >= 2
)

/** Phase 3: 1v1 duel. Mirrors MatchBoard's internal isDuelMode for this page's own v-else-if. */
const isDuelModeOuter = computed(
  () =>
    state.value?.phase === 'phase3' &&
    state.value?.currentMatch?.length === 2
)

onMounted(() => {
  init()
})
</script>

<template>
  <div class="app-bg">
    <TournamentHeader
      :phase="state?.phase"
      :phase-round="state?.phaseRound ?? 0"
      :progress-percent="phaseProgressPercent"
      :can-undo="canUndo"
      @undo="undo"
      @reset="resetToStart"
    />

    <main class="main">
      <div v-if="loading" class="screen-center loading-screen">
        <div class="ygo-loader">
          <div class="ygo-loader__card-wrap">
            <div class="ygo-loader__card-back" />
            <div class="ygo-loader__card-back ygo-loader__card-back--front" aria-hidden="true" />
          </div>
          <p class="ygo-loader__text">{{ i('loading.shuffle') }}</p>
          <p class="ygo-loader__sub">{{ i('loading.prepare') }}</p>
        </div>
      </div>

      <div v-else-if="error" class="screen-center">
        <div class="error-box">{{ error }}</div>
      </div>

      <div
        v-else-if="transitioning && (state?.phase === 'phase1' || state?.phase === 'phase2' || state?.phase === 'phase3')"
        class="screen-center loading-screen"
      >
        <div class="ygo-loader ygo-loader--small">
          <div class="ygo-loader__card-wrap">
            <div class="ygo-loader__card-back" />
          </div>
          <p class="ygo-loader__text">{{ i('loading.next') }}</p>
        </div>
      </div>

      <MatchBoard
        v-else-if="isGroupModeOuter || isDuelModeOuter"
        :state="state"
        :transitioning="transitioning"
        @pick-group="pickGroup"
        @pick-duel="pickDuel"
        @finish="finish"
      />

      <div
        v-else-if="state && state.phase !== 'finished' && !state.currentMatch?.length"
        class="screen-center"
      >
        <div class="ygo-loader ygo-loader--small">
          <div class="ygo-loader__card-wrap">
            <div class="ygo-loader__card-back" />
          </div>
          <p class="ygo-loader__text">{{ i('loading.next') }}</p>
        </div>
      </div>

      <template v-else-if="state?.phase === 'finished'">
        <TopTenPodium
          :top10="top10"
          @select-archetype="archetypeModalName = $event"
          @download-csv="downloadCsv"
          @restart="restart"
        />
        <!-- Archetype popup: left = card + info, right = search + all cards -->
        <ArchetypeModal :name="archetypeModalName" @close="archetypeModalName = null" />
      </template>

      <PreferencesQuestionnaire v-else-if="!state && !loading" @confirm="startTournamentWithPool" />
    </main>
  </div>
</template>

<style scoped>
/* ============================== */
/*            MAIN                */
/* ============================== */
.main {
  max-width: 96rem;
  margin: 0 auto;
  padding: 0.5rem 2rem 2rem;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.screen-center {
  display: grid;
  place-items: center;
  min-height: 50vh;
}

/* ============================== */
/*       LOADING SCREEN           */
/* ============================== */
.loading-screen {
  min-height: 55vh;
}

.ygo-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.ygo-loader__card-wrap {
  position: relative;
  width: 72px;
  aspect-ratio: 421 / 614;
  transform-style: preserve-3d;
  animation: ygo-card-spin 2s ease-in-out infinite;
}

.ygo-loader__card-back {
  position: absolute;
  inset: 0;
  border-radius: 8px;
  background: url(/card-back.png) center / cover no-repeat;
  border: 1.5px solid rgba(232, 197, 71, 0.2);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.5),
    0 8px 32px rgba(0, 0, 0, 0.6);
  backface-visibility: hidden;
}

.ygo-loader__card-back--front {
  transform: rotateY(180deg);
  background: url(/card-back.png) center / cover no-repeat;
}

@keyframes ygo-card-spin {
  0%, 100% { transform: rotateY(0deg); }
  50% { transform: rotateY(180deg); }
}

.ygo-loader__text {
  color: var(--accent);
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  margin: 0;
  animation: ygo-pulse 1.5s ease-in-out infinite;
}

.ygo-loader__sub {
  color: var(--text-muted);
  font-size: 0.78rem;
  margin: 0;
  animation: ygo-pulse 1.5s ease-in-out infinite 0.3s both;
}

@keyframes ygo-pulse {
  50% { opacity: 0.5; }
}

.ygo-loader--small .ygo-loader__card-wrap {
  width: 48px;
  animation-duration: 2.2s;
}

.ygo-loader--small .ygo-loader__text {
  font-size: 0.88rem;
}

.error-box {
  padding: 1rem 1.25rem;
  background: rgba(185, 28, 28, 0.08);
  border: 1px solid rgba(185, 28, 28, 0.25);
  border-radius: var(--radius-sm);
  color: #fca5a5;
  max-width: 28rem;
  margin: 2rem auto;
  font-size: 0.88rem;
  backdrop-filter: blur(8px);
}

/* ============================== */
/*      RESPONSIVE MOBILE         */
/* ============================== */
@media (max-width: 640px) {
  .main {
    padding: 0.5rem 1rem 1.5rem;
  }
}
</style>
