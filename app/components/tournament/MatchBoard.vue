<script setup lang="ts">
import { t } from '~/utils/i18n'
import type { TournamentState } from '~/types/tournament'
import { MAIN_DISPLAY_COUNT, EXTRA_DISPLAY_COUNT } from '~/utils/representativeCard'
import { displayArchetypeName } from '~/composables/useYgoApi'

const DISPLAY_STEPS = MAIN_DISPLAY_COUNT + EXTRA_DISPLAY_COUNT
const i = (key: string) => t(key, 'en')

const props = defineProps<{
  state: TournamentState | null
  transitioning: boolean
}>()

const emit = defineEmits<{
  'pick-group': [winner: string, losers: string[]]
  'pick-duel': [winner: string, loser: string]
  finish: []
}>()

const selectedCard = ref<string | null>(null)

/** Cycle index (0..9 = 5 Main + 5 Extra). */
const matchDisplayGlobalIdx = ref(0)
const matchDisplayTotalSteps = computed(() => DISPLAY_STEPS)

/** Card to display for an archetype. In duel: index 0 = best card, cycle 0..9 = best → worst. */
function getCurrentRepresentative (archetypeName: string) {
  const entry = props.state?.archetypes[archetypeName]
  const cards = entry?.representativeCards
  if (!cards?.length) return undefined
  const inMatch = props.state?.currentMatch?.includes(archetypeName)
  if (inMatch) {
    const index = matchDisplayGlobalIdx.value % cards.length
    return cards[index]
  }
  const idx = entry?.representativeIndex ?? 0
  return cards[idx] ?? cards[0]
}

function showCardBack (archetypeName: string): boolean {
  if (!props.state?.currentMatch?.includes(archetypeName)) return false
  return getCurrentRepresentative(archetypeName) === undefined
}

function selectGroup (name: string) {
  const match = props.state?.currentMatch
  if (!match) return
  selectedCard.value = name
  const losers = match.filter(n => n !== name)
  emit('pick-group', name, losers)
}

function selectDuel (name: string) {
  const match = props.state?.currentMatch
  if (!match) return
  selectedCard.value = name
  const loser = match.find(n => n !== name)
  if (!loser) return
  emit('pick-duel', name, loser)
}

const isGroupMode = computed(
  () =>
    (props.state?.phase === 'phase1' || props.state?.phase === 'phase2') &&
    (props.state?.currentMatch?.length ?? 0) >= 2
)

const isDuelMode = computed(
  () =>
    props.state?.phase === 'phase3' &&
    props.state?.currentMatch?.length === 2
)

const canCycleAllCards = computed(() => matchDisplayTotalSteps.value > 1)

function cycleAllCards () {
  matchDisplayGlobalIdx.value = (matchDisplayGlobalIdx.value + 1) % matchDisplayTotalSteps.value
}

const groupGridClass = computed(() => {
  const len = props.state?.currentMatch?.length ?? 4
  if (len <= 2) return 'cards-grid-2'
  if (len === 3) return 'cards-grid-3'
  return 'cards-grid-4'
})

watch(
  () => [props.state?.currentMatch, props.state?.round] as const,
  () => {
    if (props.state?.currentMatch?.length) {
      matchDisplayGlobalIdx.value = 0
    }
  },
  { immediate: true }
)

watch(
  () => props.transitioning,
  (isTransitioning) => {
    if (isTransitioning) selectedCard.value = null
  }
)

const duelLeft = computed(() => props.state?.currentMatch?.[0] ?? '')
const duelRight = computed(() => props.state?.currentMatch?.[1] ?? '')
</script>

<template>
  <div
    v-if="isGroupMode || isDuelMode"
    key="duel-wrap"
    class="duel-wrap"
  >
    <Transition name="duel" mode="out-in">
      <!-- Phase 1, 2 and 3: same grid (4, 3 or 2 cards), same ArchetypeCard component -->
      <section
        v-if="isGroupMode || isDuelMode"
        :key="`match-${state?.phase}-${state?.round}`"
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
              :elo="state?.archetypes[duelLeft]?.elo ?? 1000"
              :show-card-back="showCardBack(duelLeft)"
              :extra-policy="state?.archetypes[duelLeft]?.extraPolicy"
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
              :elo="state?.archetypes[duelRight]?.elo ?? 1000"
              :show-card-back="showCardBack(duelRight)"
              :extra-policy="state?.archetypes[duelRight]?.extraPolicy"
              @select="selectDuel(duelRight)"
            />
          </div>
        </div>
        <!-- Group layout (3-4 cards) -->
        <div v-else class="cards-grid" :class="groupGridClass">
          <ArchetypeCard
            v-for="name in state?.currentMatch"
            :key="name"
            :name="displayArchetypeName(name)"
            :image-url="getCurrentRepresentative(name)?.imageUrl"
            :card-type="getCurrentRepresentative(name)?.displayType"
            :selected="selectedCard === name"
            :show-elo="false"
            :show-card-back="showCardBack(name)"
            :extra-policy="state?.archetypes[name]?.extraPolicy"
            @select="selectGroup(name)"
          />
        </div>
        <div v-if="isDuelMode" class="actions">
          <button
            type="button"
            class="btn btn-outline"
            @click="$emit('finish')"
          >
            {{ i('btn.finishEarly') }}
          </button>
        </div>
      </section>
    </Transition>
  </div>
</template>

<style scoped>
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

@media (max-width: 640px) {
  .duel-instruction {
    font-size: 0.85rem;
  }
}
</style>
