<script setup lang="ts">
import { t } from '~/utils/i18n'
import { displayArchetypeName } from '~/composables/useYgoApi'

const i = (key: string) => t(key, 'en')

const props = defineProps<{
  top10: Array<{ rank: number; name: string; elo: number; wins: number; losses: number }>
}>()

defineEmits<{
  'select-archetype': [name: string]
  'download-csv': []
  restart: []
}>()

/** Podium data — [Silver, Gold, Bronze] for column display order. */
const podiumSlots = computed(() => {
  const t = props.top10
  if (t.length < 3) return []
  return [t[1]!, t[0]!, t[2]!]
})
</script>

<template>
  <Transition name="results">
    <section v-if="top10.length > 0" key="results" class="results-section">
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
          @click="$emit('select-archetype', pos.name)"
          @keydown.enter="$emit('select-archetype', pos.name)"
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
          @click="$emit('select-archetype', row.name)"
          @keydown.enter="$emit('select-archetype', row.name)"
          @keydown.space.prevent="$emit('select-archetype', row.name)"
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
        <button type="button" class="btn btn-gold" @click="$emit('download-csv')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          {{ i('btn.downloadCsv') }}
        </button>
        <button type="button" class="btn btn-outline" @click="$emit('restart')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          {{ i('btn.playAgain') }}
        </button>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
/* ============================== */
/*          RESULTS               */
/* ============================== */
.results-enter-active {
  transition: opacity 0.4s var(--ease), transform 0.4s var(--ease);
}

.results-enter-from {
  opacity: 0;
  transform: translateY(16px);
}

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

@media (max-width: 640px) {
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
