<script setup lang="ts">
import {
  CURATED_ARCHETYPES, ARCHETYPE_THEMES,
  type ArchetypeLevel, type ArchetypePlaystyle, type DeckSpeed,
  type ExtraDeckDependency, type ArchetypeEra, type DominantMechanic,
  type WinCondition
} from '~/data/curatedArchetypes'
import { getMatchingArchetypeNames, type QuestionnaireAnswers } from '~/utils/preferencesScoring'
import { t } from '~/utils/i18n'

const _i = (key: string) => t(key, 'en')
const emit = defineEmits<{ confirm: [names: string[]] }>()

const answers = reactive<QuestionnaireAnswers>({ themes: [] })

const LEVEL_OPTIONS: { value: ArchetypeLevel, label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'expert', label: 'Expert' }
]
const PLAYSTYLE_OPTIONS: { value: ArchetypePlaystyle, label: string }[] = [
  { value: 'control', label: 'Control' },
  { value: 'aggro', label: 'Aggro' },
  { value: 'combo', label: 'Combo' },
  { value: 'midrange', label: 'Midrange' }
]
const SPEED_OPTIONS: { value: DeckSpeed, label: string }[] = [
  { value: 'fast', label: 'Fast' },
  { value: 'medium', label: 'Medium' },
  { value: 'slow', label: 'Slow' }
]
const EXTRA_DEPENDENCY_OPTIONS: { value: ExtraDeckDependency, label: string }[] = [
  { value: 'low', label: 'Mostly Main Deck' },
  { value: 'medium', label: 'Balanced' },
  { value: 'high', label: 'Extra Deck heavy' }
]
const ERA_OPTIONS: { value: ArchetypeEra, label: string }[] = [
  { value: 'classic', label: 'Classic' },
  { value: 'modern', label: 'Modern' },
  { value: 'recent', label: 'Recent' }
]
const MECHANIC_OPTIONS: { value: DominantMechanic, label: string }[] = [
  { value: 'fusion', label: 'Fusion' },
  { value: 'synchro', label: 'Synchro' },
  { value: 'xyz', label: 'Xyz' },
  { value: 'link', label: 'Link' },
  { value: 'pendulum', label: 'Pendulum' },
  { value: 'ritual', label: 'Ritual' }
]
const WIN_CONDITION_OPTIONS: { value: WinCondition, label: string }[] = [
  { value: 'otk', label: 'OTK' },
  { value: 'grind', label: 'Grind' },
  { value: 'lockdown', label: 'Lockdown' },
  { value: 'board-control', label: 'Board control' }
]

function toggleTheme (theme: typeof ARCHETYPE_THEMES[number]) {
  const idx = answers.themes.indexOf(theme)
  if (idx === -1) answers.themes.push(theme)
  else answers.themes.splice(idx, 1)
}

const matchingCount = computed(() => getMatchingArchetypeNames(CURATED_ARCHETYPES, answers).length)

const canConfirm = computed(() =>
  answers.level != null &&
  answers.playstyle != null &&
  answers.deckSpeed != null &&
  answers.extraDeckDependency != null &&
  answers.era != null &&
  answers.winCondition != null
)

function confirm () {
  if (!canConfirm.value) return
  emit('confirm', getMatchingArchetypeNames(CURATED_ARCHETYPES, answers))
}
</script>

<template>
  <div class="questionnaire">
    <div class="questionnaire__intro">
      <p class="questionnaire__brand">Yu-Gi-Oh!</p>
      <h2 class="questionnaire__title">Tell us how you like to play</h2>
      <p class="questionnaire__tagline">Answer a few questions to narrow down the archetype pool.</p>
    </div>

    <div class="questionnaire__questions">
      <section class="q-block">
        <h3 class="q-block__title">Your Yu-Gi-Oh! level?</h3>
        <div class="q-block__options">
          <button
            v-for="opt in LEVEL_OPTIONS"
            :key="opt.value"
            type="button"
            class="q-option"
            :class="{ 'q-option--selected': answers.level === opt.value }"
            @click="answers.level = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </section>

      <section class="q-block">
        <h3 class="q-block__title">Preferred playstyle?</h3>
        <div class="q-block__options">
          <button
            v-for="opt in PLAYSTYLE_OPTIONS"
            :key="opt.value"
            type="button"
            class="q-option"
            :class="{ 'q-option--selected': answers.playstyle === opt.value }"
            @click="answers.playstyle = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </section>

      <section class="q-block">
        <h3 class="q-block__title">Themes that interest you? (optional, pick any)</h3>
        <div class="q-block__options">
          <button
            v-for="theme in ARCHETYPE_THEMES"
            :key="theme"
            type="button"
            class="q-option"
            :class="{ 'q-option--selected': answers.themes.includes(theme) }"
            @click="toggleTheme(theme)"
          >
            {{ theme }}
          </button>
        </div>
      </section>

      <section class="q-block">
        <h3 class="q-block__title">Preferred pace?</h3>
        <div class="q-block__options">
          <button
            v-for="opt in SPEED_OPTIONS"
            :key="opt.value"
            type="button"
            class="q-option"
            :class="{ 'q-option--selected': answers.deckSpeed === opt.value }"
            @click="answers.deckSpeed = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </section>

      <section class="q-block">
        <h3 class="q-block__title">Main Deck or Extra Deck focus?</h3>
        <div class="q-block__options">
          <button
            v-for="opt in EXTRA_DEPENDENCY_OPTIONS"
            :key="opt.value"
            type="button"
            class="q-option"
            :class="{ 'q-option--selected': answers.extraDeckDependency === opt.value }"
            @click="answers.extraDeckDependency = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </section>

      <section class="q-block">
        <h3 class="q-block__title">Nostalgia or latest releases?</h3>
        <div class="q-block__options">
          <button
            v-for="opt in ERA_OPTIONS"
            :key="opt.value"
            type="button"
            class="q-option"
            :class="{ 'q-option--selected': answers.era === opt.value }"
            @click="answers.era = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </section>

      <section class="q-block">
        <h3 class="q-block__title">A mechanic to avoid? (optional)</h3>
        <div class="q-block__options">
          <button
            v-for="opt in MECHANIC_OPTIONS"
            :key="opt.value"
            type="button"
            class="q-option"
            :class="{ 'q-option--selected': answers.avoidMechanic === opt.value }"
            @click="answers.avoidMechanic = answers.avoidMechanic === opt.value ? undefined : opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </section>

      <section class="q-block">
        <h3 class="q-block__title">Preferred win condition?</h3>
        <div class="q-block__options">
          <button
            v-for="opt in WIN_CONDITION_OPTIONS"
            :key="opt.value"
            type="button"
            class="q-option"
            :class="{ 'q-option--selected': answers.winCondition === opt.value }"
            @click="answers.winCondition = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </section>
    </div>

    <div class="questionnaire__footer">
      <p class="questionnaire__count">
        <strong>{{ matchingCount }}</strong> archetype{{ matchingCount === 1 ? '' : 's' }} will be selected
      </p>
      <button
        type="button"
        class="btn btn-gold btn-lg"
        :disabled="!canConfirm"
        @click="confirm"
      >
        Start tournament
      </button>
    </div>
  </div>
</template>

<style scoped>
.questionnaire {
  max-width: 48rem;
  margin: 0 auto;
  padding: 2rem 1rem 6rem;
}

.questionnaire__intro {
  text-align: center;
  margin-bottom: 2rem;
}

.questionnaire__brand {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin: 0 0 0.5rem;
}

.questionnaire__title {
  font-family: 'Outfit', sans-serif;
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--text);
  margin: 0 0 0.5rem;
}

.questionnaire__tagline {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
}

.questionnaire__questions {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.q-block {
  padding: 1.25rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.q-block__title {
  margin: 0 0 0.85rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
}

.q-block__options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.q-option {
  padding: 0.5rem 0.9rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
  text-transform: capitalize;
}

.q-option:hover {
  color: var(--text);
  border-color: var(--accent-dim);
}

.q-option--selected {
  color: var(--accent);
  background: rgba(232, 197, 71, 0.1);
  border-color: var(--accent);
}

.questionnaire__footer {
  position: sticky;
  bottom: 0;
  margin-top: 2rem;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: var(--bg-glass-strong);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.questionnaire__count {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.questionnaire__count strong {
  color: var(--accent);
  font-size: 1.1rem;
}

@media (max-width: 640px) {
  .questionnaire__footer {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }
}
</style>
