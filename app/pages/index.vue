<script setup lang="ts">
import { t } from '~/utils/i18n'
import { SWISS_ROUND_COUNT } from '~/types/tournament'
import { MAIN_DISPLAY_COUNT, EXTRA_DISPLAY_COUNT } from '~/utils/representativeCard'
import { displayArchetypeName } from '~/composables/useYgoApi'

const DISPLAY_STEPS = MAIN_DISPLAY_COUNT + EXTRA_DISPLAY_COUNT
const {
  state,
  loading,
  transitioning,
  error,
  top10,
  canUndo,
  init,
  startTournament,
  pickGroup,
  pickDuel,
  finish,
  undo,
  downloadCsv,
  restart,
  resetToStart
} = useTournamentState()

const i = (key: string) => t(key, 'en')
const selectedCard = ref<string | null>(null)

/** Results popup: selected archetype (null = closed). */
const archetypeModalName = ref<string | null>(null)

/** Cycle index (0..9 = 5 Main + 5 Extra). */
const matchDisplayGlobalIdx = ref(0)

const matchDisplayTotalSteps = computed(() => DISPLAY_STEPS)

/** Card to display for an archetype. In duel: index 0 = best card, cycle 0..9 = best → worst. */
function getCurrentRepresentative (archetypeName: string) {
  const entry = state.value?.archetypes[archetypeName]
  const cards = entry?.representativeCards
  if (!cards?.length) return undefined
  const inMatch = state.value?.currentMatch?.includes(archetypeName)
  if (inMatch) {
    const index = matchDisplayGlobalIdx.value % cards.length
    return cards[index]
  }
  const idx = entry?.representativeIndex ?? 0
  return cards[idx] ?? cards[0]
}

function showCardBack (archetypeName: string): boolean {
  if (!state.value?.currentMatch?.includes(archetypeName)) return false
  return getCurrentRepresentative(archetypeName) === undefined
}

/** Phase 1/2: user chooses the winner in a group. */
function selectGroup (name: string) {
  const match = state.value?.currentMatch
  if (!match) return
  selectedCard.value = name
  const losers = match.filter(n => n !== name)
  pickGroup(name, losers)
}

/** Phase 3: user chooses the winner in a 1v1 duel. */
function selectDuel (name: string) {
  const match = state.value?.currentMatch
  if (!match) return
  selectedCard.value = name
  const loser = match.find(n => n !== name)
  if (!loser) return
  pickDuel(name, loser)
}

/** Phase 1/2: groups of 2-4. */
const isGroupMode = computed(
  () =>
    (state.value?.phase === 'phase1' || state.value?.phase === 'phase2') &&
    (state.value?.currentMatch?.length ?? 0) >= 2
)

/** Phase 3: 1v1 duel. */
const isDuelMode = computed(
  () =>
    state.value?.phase === 'phase3' &&
    state.value?.currentMatch?.length === 2
)

const canCycleAllCards = computed(() => matchDisplayTotalSteps.value > 1)

function cycleAllCards () {
  matchDisplayGlobalIdx.value = (matchDisplayGlobalIdx.value + 1) % matchDisplayTotalSteps.value
}

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

/** Grid class based on group size. */
const groupGridClass = computed(() => {
  const len = state.value?.currentMatch?.length ?? 4
  if (len <= 2) return 'cards-grid-2'
  if (len === 3) return 'cards-grid-3'
  return 'cards-grid-4'
})

watch(
  () => [state.value?.currentMatch, state.value?.round] as const,
  () => {
    const s = state.value
    if (s?.currentMatch?.length) {
      // Always start with the first card (Extra slot 0) at each new match
      matchDisplayGlobalIdx.value = 0
    }
  },
  { immediate: true }
)

onMounted(() => {
  init()
})

watch(transitioning, (isTransitioning) => {
  if (isTransitioning) selectedCard.value = null
})

/** Safe access to the two duelists in a 1v1 match. */
const duelLeft = computed(() => state.value?.currentMatch?.[0] ?? '')
const duelRight = computed(() => state.value?.currentMatch?.[1] ?? '')

/** Podium data — [Silver, Gold, Bronze] for column display order. */
const podiumSlots = computed(() => {
  const t = top10.value
  if (t.length < 3) return []
  return [t[1]!, t[0]!, t[2]!]
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

      <div
        v-else-if="isGroupMode || isDuelMode"
        key="duel-wrap"
        class="duel-wrap"
      >
        <Transition name="duel" mode="out-in">
          <!-- Phase 1, 2 and 3: same grid (4, 3 or 2 cards), same ArchetypeCard component -->
          <section
            v-if="isGroupMode || isDuelMode"
            :key="`match-${state!.phase}-${state!.round}`"
            class="duel-section"
          >
            <div class="duel-header">
              <p class="duel-instruction">
                <span>{{ i('duel.instruction') }}</span>{{ i('duel.instruction.suffix') }}
              </p>
              <button
                v-if="canCycleAllCards"
                type="button"
                class="btn btn-outline btn-sm btn-cycle"
                @click="cycleAllCards"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                {{ i('btn.changeCard') }}
              </button>
            </div>
            <!-- 1v1 Duel layout with VS indicator -->
            <div v-if="isDuelMode && duelLeft && duelRight" class="duel-arena">
              <div class="duel-arena__card duel-arena__card--left">
                <ArchetypeCard
                  :name="displayArchetypeName(duelLeft)"
                  :image-url="getCurrentRepresentative(duelLeft)?.imageUrl"
                  :card-type="getCurrentRepresentative(duelLeft)?.displayType"
                  :selected="selectedCard === duelLeft"
                  :show-elo="true"
                  :elo="state!.archetypes[duelLeft]?.elo ?? 1000"
                  :show-card-back="showCardBack(duelLeft)"
                  :extra-policy="state!.archetypes[duelLeft]?.extraPolicy"
                  @select="selectDuel(duelLeft)"
                />
              </div>
              <div class="duel-arena__vs">
                <span class="duel-arena__vs-text">VS</span>
                <span class="duel-arena__vs-glow" aria-hidden="true" />
              </div>
              <div class="duel-arena__card duel-arena__card--right">
                <ArchetypeCard
                  :name="displayArchetypeName(duelRight)"
                  :image-url="getCurrentRepresentative(duelRight)?.imageUrl"
                  :card-type="getCurrentRepresentative(duelRight)?.displayType"
                  :selected="selectedCard === duelRight"
                  :show-elo="true"
                  :elo="state!.archetypes[duelRight]?.elo ?? 1000"
                  :show-card-back="showCardBack(duelRight)"
                  :extra-policy="state!.archetypes[duelRight]?.extraPolicy"
                  @select="selectDuel(duelRight)"
                />
              </div>
            </div>
            <!-- Group layout (3-4 cards) -->
            <div v-else class="cards-grid" :class="groupGridClass">
              <ArchetypeCard
                v-for="name in state!.currentMatch"
                :key="name"
                :name="displayArchetypeName(name)"
                :image-url="getCurrentRepresentative(name)?.imageUrl"
                :card-type="getCurrentRepresentative(name)?.displayType"
                :selected="selectedCard === name"
                :show-elo="false"
                :show-card-back="showCardBack(name)"
                :extra-policy="state!.archetypes[name]?.extraPolicy"
                @select="selectGroup(name)"
              />
            </div>
            <div v-if="isDuelMode" class="actions">
              <button
                type="button"
                class="btn btn-outline"
                @click="finish"
              >
                {{ i('btn.finishEarly') }}
              </button>
            </div>
          </section>
        </Transition>
      </div>

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
        <Transition name="results">
          <section v-if="state?.phase === 'finished'" key="results" class="results-section">
            <div class="results-header">
              <span class="results-label">{{ i('results.label') }}</span>
              <h2 class="results-title">{{ i('results.title') }}</h2>
              <div class="results-separator" aria-hidden="true">
                <span class="results-separator__line" />
                <span class="results-separator__diamond" />
                <span class="results-separator__line" />
              </div>
            </div>
            <!-- Podium top 3 -->
            <div v-if="podiumSlots.length === 3" class="podium">
              <div
                v-for="(pos, idx) in podiumSlots"
                :key="pos.name"
                class="podium__slot"
                :class="[
                  idx === 0 ? 'podium__slot--silver' : idx === 1 ? 'podium__slot--gold' : 'podium__slot--bronze'
                ]"
                role="button"
                tabindex="0"
                @click="archetypeModalName = pos.name"
                @keydown.enter="archetypeModalName = pos.name"
              >
                <span class="podium__rank">{{ pos.rank === 1 ? '\u{1F451}' : pos.rank === 2 ? '\u{1F948}' : '\u{1F949}' }}</span>
                <span class="podium__name">{{ displayArchetypeName(pos.name) }}</span>
                <span class="podium__elo">{{ pos.elo }}</span>
                <span class="podium__record">{{ pos.wins }}W / {{ pos.losses }}L</span>
                <span class="podium__bar" />
              </div>
            </div>
            <!-- Remaining 4–10 -->
            <ul class="top-list">
              <li
                v-for="row in top10.slice(3)"
                :key="row.name"
                class="top-item top-item--clickable"
                role="button"
                tabindex="0"
                @click="archetypeModalName = row.name"
                @keydown.enter="archetypeModalName = row.name"
                @keydown.space.prevent="archetypeModalName = row.name"
              >
                <span class="top-rank">{{ row.rank }}</span>
                <span class="top-name">{{ displayArchetypeName(row.name) }}</span>
                <span class="top-stats">
                  <span class="top-elo">{{ row.elo }}</span>
                  <span class="top-record">{{ row.wins }}W / {{ row.losses }}L</span>
                </span>
              </li>
            </ul>
            <div class="actions results-actions">
              <button type="button" class="btn btn-gold" @click="downloadCsv">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {{ i('btn.downloadCsv') }}
              </button>
              <button type="button" class="btn btn-outline" @click="restart">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                {{ i('btn.playAgain') }}
              </button>
            </div>
          </section>
        </Transition>
        <!-- Archetype popup: left = card + info, right = search + all cards -->
        <ArchetypeModal :name="archetypeModalName" @close="archetypeModalName = null" />
      </template>

      <StartScreen v-else-if="!state && !loading" @start="startTournament" />
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

/* ============================== */
/*        DUEL / MATCH            */
/* ============================== */
.duel-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.duel-enter-active,
.duel-leave-active {
  transition: opacity 0.3s var(--ease), transform 0.3s var(--ease);
}

.duel-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

.duel-enter-from {
  opacity: 0;
  transform: scale(1.03);
}

.results-enter-active {
  transition: opacity 0.4s var(--ease), transform 0.4s var(--ease);
}

.results-enter-from {
  opacity: 0;
  transform: translateY(16px);
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

.duel-section {
  text-align: center;
  padding: 1rem 0 2rem;
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.duel-header {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.btn-sm {
  padding: 0.4rem 0.85rem;
  font-size: 0.78rem;
}

.btn-cycle {
  gap: 0.35rem;
}

.duel-instruction {
  margin: 0;
  font-size: 0.92rem;
  color: var(--text-secondary);
}

/* ── Duel Arena (1v1 VS layout) ── */
.duel-arena {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  width: 100%;
  max-width: 780px;
  margin: 0 auto;
}

.duel-arena__card {
  flex: 1;
  max-width: 320px;
  animation: duel-card-enter 0.5s var(--ease-out) both;
}

.duel-arena__card--left {
  animation-delay: 0.05s;
}

.duel-arena__card--right {
  animation-delay: 0.15s;
}

@keyframes duel-card-enter {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.duel-arena__vs {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  animation: vs-enter 0.4s var(--ease-spring) 0.2s both;
}

.duel-arena__vs-text {
  position: relative;
  z-index: 1;
  font-family: 'Outfit', sans-serif;
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--accent);
  letter-spacing: 0.05em;
  text-shadow: 0 0 20px rgba(232, 197, 71, 0.5);
}

.duel-arena__vs-glow {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(232, 197, 71, 0.12) 0%, transparent 70%);
  animation: vs-glow-pulse 2s ease-in-out infinite;
}

@keyframes vs-enter {
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes vs-glow-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); }
}

@media (max-width: 480px) {
  .duel-arena {
    gap: 0.75rem;
  }
  .duel-arena__card {
    max-width: 180px;
  }
  .duel-arena__vs {
    width: 36px;
    height: 36px;
  }
  .duel-arena__vs-text {
    font-size: 0.85rem;
  }
}

/* ── Card Grids (group mode: 3-4 cards) ── */
.cards-grid {
  display: grid;
  gap: 1.5rem;
  justify-content: center;
  align-items: start;
  margin: 0 auto;
  width: 100%;
  max-width: 100%;
}

.cards-grid-4 {
  grid-template-columns: repeat(2, minmax(0, 280px));
  gap: 1.25rem;
}

@media (min-width: 640px) {
  .cards-grid-4 {
    grid-template-columns: repeat(4, minmax(0, 260px));
    gap: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .cards-grid-4 {
    grid-template-columns: repeat(4, minmax(0, 300px));
    gap: 2rem;
  }
}

.cards-grid-3 {
  grid-template-columns: repeat(1, minmax(0, 300px));
  gap: 1.5rem;
}

@media (min-width: 640px) {
  .cards-grid-3 {
    grid-template-columns: repeat(3, minmax(0, 280px));
    gap: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .cards-grid-3 {
    grid-template-columns: repeat(3, minmax(0, 320px));
    gap: 2rem;
  }
}

.cards-grid-2 {
  grid-template-columns: repeat(2, minmax(0, 280px));
  gap: 1.25rem;
}

@media (min-width: 640px) {
  .cards-grid-2 {
    grid-template-columns: repeat(2, minmax(0, 300px));
    gap: 1.75rem;
  }
}

@media (min-width: 1024px) {
  .cards-grid-2 {
    grid-template-columns: repeat(2, minmax(0, 340px));
    gap: 2rem;
  }
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 2rem;
}

.btn-lg {
  padding: 0.85rem 1.75rem;
  font-size: 0.95rem;
}

/* ============================== */
/*          RESULTS               */
/* ============================== */
.results-section {
  max-width: 38rem;
  margin: 0 auto;
  padding: 2rem 0 3rem;
  width: 100%;
}

.results-header {
  text-align: center;
  margin-bottom: 2rem;
  animation: results-header-in 0.6s var(--ease-out) both;
}

@keyframes results-header-in {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.results-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin-bottom: 0.25rem;
  display: block;
}

.results-title {
  font-family: 'Outfit', sans-serif;
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--text);
  margin: 0.25rem 0 0.75rem;
  letter-spacing: -0.02em;
}

.results-separator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.results-separator__line {
  display: block;
  width: 2rem;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(232, 197, 71, 0.25), transparent);
}

.results-separator__diamond {
  display: block;
  width: 5px;
  height: 5px;
  background: var(--accent);
  transform: rotate(45deg);
  opacity: 0.4;
}

/* ── Podium ── */
.podium {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  align-items: end;
  animation: results-header-in 0.5s var(--ease-out) 0.1s both;
}

.podium__slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 1rem 0.5rem 0;
  border-radius: var(--radius) var(--radius) 0 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-bottom: none;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease;
  position: relative;
  overflow: hidden;
}

.podium__slot:hover {
  background: var(--bg-card-hover);
  transform: translateY(-2px);
}

.podium__slot:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.podium__slot--gold {
  border-color: rgba(232, 197, 71, 0.2);
  background: linear-gradient(180deg, rgba(232, 197, 71, 0.08) 0%, var(--bg-card) 60%);
}

.podium__slot--silver {
  border-color: rgba(192, 192, 192, 0.15);
}

.podium__slot--bronze {
  border-color: rgba(205, 127, 50, 0.15);
}

.podium__rank {
  font-size: 1.5rem;
  line-height: 1;
}

.podium__name {
  font-family: 'Outfit', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.podium__slot--gold .podium__name {
  color: var(--accent);
}

.podium__elo {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.podium__record {
  font-size: 0.65rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  margin-bottom: 0.5rem;
}

.podium__bar {
  width: 100%;
  background: var(--border);
}

.podium__slot--gold .podium__bar { height: 48px; background: linear-gradient(180deg, rgba(232, 197, 71, 0.15) 0%, rgba(232, 197, 71, 0.04) 100%); }
.podium__slot--silver .podium__bar { height: 32px; background: linear-gradient(180deg, rgba(192, 192, 192, 0.1) 0%, rgba(192, 192, 192, 0.02) 100%); }
.podium__slot--bronze .podium__bar { height: 20px; background: linear-gradient(180deg, rgba(205, 127, 50, 0.1) 0%, rgba(205, 127, 50, 0.02) 100%); }

/* ── Top list (positions 4-10) ── */
.top-list {
  list-style: none;
  padding: 0;
  margin: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--bg-card);
}

.top-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 0.88rem;
  transition: background 0.2s var(--ease);
  animation: results-item-in 0.35s var(--ease-out) both;
}

.top-item:nth-child(1) { animation-delay: 0.05s; }
.top-item:nth-child(2) { animation-delay: 0.1s; }
.top-item:nth-child(3) { animation-delay: 0.15s; }
.top-item:nth-child(4) { animation-delay: 0.2s; }
.top-item:nth-child(5) { animation-delay: 0.25s; }
.top-item:nth-child(6) { animation-delay: 0.3s; }
.top-item:nth-child(7) { animation-delay: 0.35s; }

@keyframes results-item-in {
  from { opacity: 0; transform: translateX(-6px); }
  to { opacity: 1; transform: translateX(0); }
}

.top-item:last-child {
  border-bottom: none;
}

.top-item:hover {
  background: var(--bg-card-hover);
}

.top-item--clickable {
  cursor: pointer;
}

.top-item--clickable:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.top-rank {
  font-weight: 800;
  color: var(--text-muted);
  min-width: 1.5rem;
  font-size: 0.88rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.top-name {
  flex: 1;
  font-weight: 600;
  color: var(--text);
}

.top-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.1rem;
}

.top-elo {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.top-record {
  font-size: 0.68rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.results-actions {
  margin-top: 2.5rem;
}

/* ============================== */
/*      RESPONSIVE MOBILE         */
/* ============================== */
@media (max-width: 640px) {
  .main {
    padding: 0.5rem 1rem 1.5rem;
  }
  .duel-instruction {
    font-size: 0.85rem;
  }
  .podium {
    gap: 0.5rem;
  }
  .podium__name {
    font-size: 0.72rem;
  }
  .podium__elo {
    font-size: 0.7rem;
  }
  .podium__record {
    font-size: 0.58rem;
  }
}
</style>
