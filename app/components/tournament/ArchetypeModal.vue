<script setup lang="ts">
import type { YgoCard } from '~/types/api'
import { fetchCardsForArchetype, displayArchetypeName } from '~/composables/useYgoApi'
import { getCardCategory, getFullCardImageUrl } from '~/utils/representativeCard'
import { analyzeArchetypeCoherence, type ArchetypeCoherenceResult } from '~/utils/archetypeLinks'
import { CURATED_ARCHETYPES } from '~/data/curatedArchetypes'

const props = defineProps<{ name: string | null }>()
const emit = defineEmits<{ close: [] }>()

const curatedInfo = computed(() => (props.name ? CURATED_ARCHETYPES[props.name] : undefined))

/** All archetype cards (API fetch), sorted Extra > Main > Spell > Trap then by name. */
const modalAllCards = ref<YgoCard[]>([])
const modalLoading = ref(false)
/** Selected card (displayed large on the left). */
const modalCardSelected = ref<YgoCard | null>(null)
/** Search by name in the popup. */
const modalSearch = ref('')
/** Coherence of the displayed archetype (true theme vs loose grouping). */
const modalCoherence = ref<ArchetypeCoherenceResult | null>(null)

const CATEGORY_ORDER: Record<string, number> = { extra: 0, main: 1, spell: 2, trap: 3 }

function sortCardsByCategoryThenName (cards: YgoCard[]): YgoCard[] {
  return [...cards].sort((a, b) => {
    const catA = getCardCategory(a)
    const catB = getCardCategory(b)
    const orderA = CATEGORY_ORDER[catA] ?? 4
    const orderB = CATEGORY_ORDER[catB] ?? 4
    if (orderA !== orderB) return orderA - orderB
    const nameA = (a.name_en ?? a.name).toLowerCase()
    const nameB = (b.name_en ?? b.name).toLowerCase()
    return nameA.localeCompare(nameB)
  })
}

/** Excludes tokens and Rush Duel character cards (Skill) from the list. */
function excludeTokensAndRushDuelCharacters (cards: YgoCard[]): YgoCard[] {
  return cards.filter(c => {
    const t = (c.type ?? '').toLowerCase()
    const f = (c.frameType ?? '').toLowerCase()
    if (t.includes('token') || f.includes('token')) return false
    if (t.includes('skill')) return false
    return true
  })
}

const modalCardsFiltered = computed(() => {
  const list = modalAllCards.value
  const q = modalSearch.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(c => {
    const name = (c.name_en ?? c.name).toLowerCase()
    return name.includes(q)
  })
})

watch(() => props.name, async (name) => {
  if (!name) {
    document.body.style.overflow = ''
    modalAllCards.value = []
    modalCardSelected.value = null
    modalSearch.value = ''
    modalCoherence.value = null
    return
  }
  document.body.style.overflow = 'hidden'
  modalCardSelected.value = null
  modalSearch.value = ''
  modalCoherence.value = null
  modalLoading.value = true
  try {
    const raw = await fetchCardsForArchetype(name)
    const withoutTokensNorRush = excludeTokensAndRushDuelCharacters(raw)
    const sorted = sortCardsByCategoryThenName(withoutTokensNorRush)
    modalAllCards.value = sorted
    modalCardSelected.value = modalAllCards.value[0] ?? null
    modalCoherence.value = analyzeArchetypeCoherence(sorted, name)
  } finally {
    modalLoading.value = false
  }
})

function close () {
  document.body.style.overflow = ''
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="name"
        class="archetype-modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="archetype-modal-title"
        @click.self="close"
        @wheel.stop
      >
        <div class="archetype-modal archetype-modal--two-panels">
          <div class="archetype-modal__head">
            <div class="archetype-modal__title-row">
              <h2 id="archetype-modal-title" class="archetype-modal__title">
                {{ displayArchetypeName(name ?? '') }}
              </h2>
              <span
                v-if="modalCoherence && modalCoherence.verdict !== 'unknown'"
                class="archetype-modal__coherence"
                :class="`archetype-modal__coherence--${modalCoherence.verdict}`"
                :title="`Score: ${modalCoherence.score} · Names: ${modalCoherence.nameMatches}/${modalCoherence.totalCards} · Desc: ${modalCoherence.descMatches}/${modalCoherence.totalCards}`"
              >
                {{ modalCoherence.verdict === 'coherent' ? 'Coherent' : 'Loose grouping' }}
              </span>
            </div>
            <button
              type="button"
              class="archetype-modal__close"
              aria-label="Close"
              @click="close"
            >
              ×
            </button>
          </div>
        <div v-if="curatedInfo" class="archetype-modal__curated">
          <p class="archetype-modal__description">{{ curatedInfo.description }}</p>
          <div class="archetype-modal__tags">
            <span class="archetype-modal__tag">{{ curatedInfo.level }}</span>
            <span class="archetype-modal__tag">{{ curatedInfo.playstyle }}</span>
            <span class="archetype-modal__tag">{{ curatedInfo.deckSpeed }} pace</span>
            <span class="archetype-modal__tag">{{ curatedInfo.extraDeckDependency }} Extra Deck</span>
            <span class="archetype-modal__tag">{{ curatedInfo.era }}</span>
            <span class="archetype-modal__tag">{{ curatedInfo.winCondition }}</span>
          </div>
          <p v-if="curatedInfo.keyCards.length" class="archetype-modal__key-cards">
            Key cards: {{ curatedInfo.keyCards.join(', ') }}
          </p>
        </div>
          <div class="archetype-modal__body">
            <template v-if="modalLoading">
              <div class="archetype-modal-loading">
                <p>Loading cards…</p>
              </div>
            </template>
            <template v-else>
              <!-- Left panel: large card + info -->
              <div class="archetype-modal__left">
                <template v-if="modalCardSelected">
                  <img
                    :src="getFullCardImageUrl(modalCardSelected)"
                    :alt="(modalCardSelected.name_en ?? modalCardSelected.name)"
                    class="archetype-modal__card-large"
                  >
                  <div class="archetype-modal__info">
                    <h3 class="archetype-modal__card-name">{{ modalCardSelected.name_en ?? modalCardSelected.name }}</h3>
                    <p class="archetype-modal__card-type">{{ modalCardSelected.type }}</p>
                    <template v-if="modalCardSelected.atk != null">
                      <p class="archetype-modal__stat">ATK / DEF : {{ modalCardSelected.atk }} / {{ modalCardSelected.def ?? '?' }}</p>
                    </template>
                    <template v-else-if="modalCardSelected.level != null">
                      <p class="archetype-modal__stat">Level : {{ modalCardSelected.level }}</p>
                    </template>
                    <p v-if="modalCardSelected.race" class="archetype-modal__stat">{{ modalCardSelected.race }}{{ modalCardSelected.attribute ? ' · ' + modalCardSelected.attribute : '' }}</p>
                    <p v-if="modalCardSelected.desc" class="archetype-modal__desc">{{ modalCardSelected.desc }}</p>
                  </div>
                </template>
                <p v-else class="archetype-modal__no-card">No card</p>
              </div>
              <!-- Right panel: search + full card grid -->
              <div class="archetype-modal__right">
                <input
                  v-model.trim="modalSearch"
                  type="search"
                  class="archetype-modal__search"
                  placeholder="Search by name…"
                  aria-label="Search for a card"
                >
                <div class="archetype-modal__list-wrap">
                  <button
                    v-for="card in modalCardsFiltered"
                    :key="card.id"
                    type="button"
                    class="archetype-modal__card-thumb"
                    :class="{ 'archetype-modal__card-thumb--selected': modalCardSelected?.id === card.id }"
                    @click="modalCardSelected = card"
                  >
                    <img
                      :src="getFullCardImageUrl(card)"
                      :alt="(card.name_en ?? card.name)"
                      class="archetype-modal__card-thumb-img"
                    >
                  </button>
                </div>
                <p v-if="modalCardsFiltered.length === 0" class="archetype-modal__empty">
                  No cards match the search.
                </p>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.archetype-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-sizing: border-box;
}

.archetype-modal {
  width: 100%;
  max-width: 42rem;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius);
  box-shadow: var(--shadow-xl), 0 0 0 1px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.archetype-modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.015);
}

.archetype-modal__title-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  min-width: 0;
}

.archetype-modal__title {
  margin: 0;
  font-family: 'Outfit', sans-serif;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text);
}

.archetype-modal__coherence {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-pill);
  white-space: nowrap;
}

.archetype-modal__coherence--coherent {
  background: rgba(34, 197, 94, 0.12);
  color: #34d399;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.archetype-modal__coherence--loose {
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.archetype-modal__close {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--text-muted);
  font-size: 1.3rem;
  line-height: 1;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
}

.archetype-modal__close:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.06);
}

.archetype-modal__close:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.archetype-modal__curated {
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.archetype-modal__description {
  margin: 0 0 0.6rem;
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.archetype-modal__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
}

.archetype-modal__tag {
  padding: 0.2rem 0.55rem;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  text-transform: capitalize;
}

.archetype-modal__key-cards {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.archetype-modal--two-panels {
  max-width: 56rem;
  max-height: 90vh;
}

.archetype-modal__body {
  display: flex;
  flex: 1;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

.archetype-modal-loading {
  padding: 2.5rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.88rem;
}

.archetype-modal__left {
  width: 40%;
  min-width: 220px;
  padding: 1.25rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  border-right: 1px solid var(--border-subtle);
}

.archetype-modal__card-large {
  width: 100%;
  max-width: 260px;
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  display: block;
}

.archetype-modal__info {
  width: 100%;
  max-width: 260px;
  text-align: left;
}

.archetype-modal__card-name {
  margin: 0 0 0.25rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
}

.archetype-modal__card-type {
  margin: 0 0 0.35rem;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.archetype-modal__stat {
  margin: 0 0 0.2rem;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.archetype-modal__desc {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--text-secondary);
}

.archetype-modal__no-card {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.88rem;
}

.archetype-modal__right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  overflow: hidden;
}

.archetype-modal__search {
  width: 100%;
  padding: 0.55rem 0.85rem;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
  font-family: inherit;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  color: var(--text);
  flex-shrink: 0;
  transition: border-color 0.2s ease;
}

.archetype-modal__search::placeholder {
  color: var(--text-muted);
}

.archetype-modal__search:focus {
  outline: none;
  border-color: var(--accent-dim);
  box-shadow: 0 0 0 3px rgba(232, 197, 71, 0.08);
}

.archetype-modal__list-wrap {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 0.5rem;
  align-content: start;
}

.archetype-modal__card-thumb {
  padding: 0;
  border: 2px solid transparent;
  border-radius: var(--radius-xs);
  background: none;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.15s, box-shadow 0.2s;
}

.archetype-modal__card-thumb:hover {
  transform: scale(1.03);
  box-shadow: var(--shadow-sm);
}

.archetype-modal__card-thumb--selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent), 0 0 12px rgba(232, 197, 71, 0.15);
}

.archetype-modal__card-thumb:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.archetype-modal__card-thumb-img {
  width: 100%;
  display: block;
  border-radius: calc(var(--radius-xs) - 2px);
}

.archetype-modal__empty {
  margin: 1rem 0 0;
  font-size: 0.82rem;
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .archetype-modal__body {
    flex-direction: column;
  }
  .archetype-modal__left {
    width: 100%;
    min-width: 0;
    border-right: none;
    border-bottom: 1px solid var(--border-subtle);
    max-height: 45vh;
  }
  .archetype-modal__right {
    min-height: 180px;
  }
  .archetype-modal__list-wrap {
    grid-template-columns: repeat(auto-fill, minmax(75px, 1fr));
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s var(--ease);
}

.modal-enter-active .archetype-modal,
.modal-leave-active .archetype-modal {
  transition: transform 0.3s var(--ease-spring);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .archetype-modal {
  transform: scale(0.92) translateY(10px);
}

.modal-leave-to .archetype-modal {
  transform: scale(0.95);
}
</style>
