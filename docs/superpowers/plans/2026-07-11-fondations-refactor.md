# Fondations : refactor structurel + ESLint + Vitest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Découper `app/pages/index.vue` (2095 lignes) en composants plus petits sans changer le comportement observable, et poser des fondations de robustesse (ESLint + tests Vitest sur la logique métier pure).

**Architecture:** Extraction mécanique : le template/script/style de chaque zone visuelle de `index.vue` est déplacé tel quel vers un nouveau composant sous `app/components/tournament/`, avec des props/emits pour relier l'état déjà exposé par `useTournamentState()`. Aucune logique métier n'est réécrite.

**Tech Stack:** Nuxt 4, Vue 3 `<script setup>`, TypeScript, `@nuxt/eslint`, Vitest.

## Global Constraints

- Aucun changement de comportement observable (spec `docs/superpowers/specs/2026-07-11-fondations-refactor-design.md`).
- Pas de Pinia, pas de nouveau composable de state.
- Pas de correction de bug rencontré en cours de route — noter et continuer.
- `npm run build` doit réussir après chaque tâche de refactor.
- `npm run lint` doit passer sans erreur à la fin du plan.
- `npx vitest run` doit passer à la fin du plan, avec des tests sur `elo.ts`, `matchmaking.ts`, `csv.ts`, `state.ts`, `representativeCard.ts`.

## Déviations mineures par rapport à la spec (décisions prises au moment du plan)

La spec listait 5 composants nommés `PhaseOneBoard`, `PhaseTwoDuel`, `TopTenPodium`, `ArchetypeModal`, `TournamentProgressBar`. En lisant `index.vue` en détail :

- Phase 1 et Phase 2 utilisent **exactement le même rendu** ("group mode", grille de 2 à 4 cartes) ; seule la Phase 3 diffère ("duel mode", VS 1v1). Les fondre en un seul composant `MatchBoard.vue` évite de dupliquer l'en-tête partagé (instruction + bouton "changer de carte") entre deux fichiers.
- La barre de progression (`TournamentProgressBar`) partage sa valeur animée (`displayedProgressPercent`) avec le texte du badge de phase, tous deux affichés dans le header. Les séparer forcerait à faire remonter l'animation dans `index.vue` puis à la repasser en prop à deux endroits. Elle est donc repliée dans `TournamentHeader.vue`.
- L'écran d'accueil (`start-screen`, lignes 609-671 + ~360 lignes de CSS) n'a aucune dépendance d'état complexe (juste un bouton `startTournament`) : c'est un bon candidat d'extraction supplémentaire, `StartScreen.vue`, non listé dans la spec mais cohérent avec son objectif de réduire `index.vue`.

Résultat : toujours 5 composants, périmètre inchangé, juste des frontières plus fidèles au comportement réel.

---

### Task 1: ESLint

**Files:**
- Create: `eslint.config.mjs` (généré par la commande ci-dessous)
- Modify: `nuxt.config.ts` (ajout du module), `package.json` (devDependency + script)

**Interfaces:** Aucune — tâche d'outillage pure.

- [ ] **Step 1: Ajouter le module ESLint officiel Nuxt**

```bash
npx nuxi module add eslint
```

Cette commande installe `@nuxt/eslint`, l'ajoute à `modules` dans `nuxt.config.ts`, et génère `eslint.config.mjs` à la racine.

- [ ] **Step 2: Vérifier le script `lint` dans `package.json`**

Si `npx nuxi module add eslint` n'a pas ajouté de script, ajouter manuellement dans `package.json` (bloc `"scripts"`) :

```json
"lint": "eslint ."
```

- [ ] **Step 3: Lancer le lint et lister les violations**

```bash
npm run lint
```

- [ ] **Step 4: Corriger chaque violation sans changer le comportement**

Pour chaque fichier signalé par `npm run lint` : corriger l'erreur (imports inutilisés, typage explicite manquant, règles de style Vue) en modifiant uniquement la forme, jamais la logique. Relancer `npm run lint` après chaque correction jusqu'à sortie propre (exit code 0, aucune erreur listée).

- [ ] **Step 5: Vérifier que le build n'est pas cassé**

```bash
npm run build
```

Attendu : build réussi (mêmes warnings qu'avant, pas de nouvelle erreur).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: ajoute ESLint (@nuxt/eslint) et corrige les violations"
```

---

### Task 2: Vitest — setup + tests `elo.ts`

**Files:**
- Create: `vitest.config.ts`
- Create: `app/utils/elo.test.ts`
- Modify: `package.json` (devDependencies `vitest`, `@vue/test-utils`, script `test`)

**Interfaces:**
- Consumes: `expectedScore(eloA: number, eloB: number): number`, `applyElo(winnerElo: number, loserElo: number, K?: number): { newWinner: number, newLoser: number }`, `applyGroupElo(winnerElo: number, loserElos: number[], K: number): { newWinner: number, newLosers: number[] }` — tous exportés par `app/utils/elo.ts`.

- [ ] **Step 1: Installer Vitest**

```bash
npm install -D vitest @vue/test-utils
```

- [ ] **Step 2: Créer `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url))
    }
  },
  test: {
    environment: 'node'
  }
})
```

- [ ] **Step 3: Ajouter le script `test` dans `package.json`**

```json
"test": "vitest run"
```

- [ ] **Step 4: Écrire les tests de `elo.ts`**

Create `app/utils/elo.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { expectedScore, applyElo, applyGroupElo } from './elo'

describe('expectedScore', () => {
  it('returns 0.5 for equal Elo', () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5)
  })

  it('favors the higher-rated player', () => {
    expect(expectedScore(1200, 1000)).toBeGreaterThan(0.5)
    expect(expectedScore(1000, 1200)).toBeLessThan(0.5)
  })
})

describe('applyElo', () => {
  it('increases the winner Elo and decreases the loser Elo on an even match', () => {
    const { newWinner, newLoser } = applyElo(1000, 1000, 32)
    expect(newWinner).toBe(1016)
    expect(newLoser).toBe(984)
  })

  it('gives fewer points to a favorite beating a big underdog', () => {
    const favoriteWins = applyElo(1400, 1000, 32)
    const underdogWins = applyElo(1000, 1400, 32)
    const favoriteGain = favoriteWins.newWinner - 1400
    const underdogGain = underdogWins.newWinner - 1000
    expect(underdogGain).toBeGreaterThan(favoriteGain)
  })

  it('uses K=32 by default', () => {
    const withDefault = applyElo(1000, 1000)
    const withExplicitK = applyElo(1000, 1000, 32)
    expect(withDefault).toEqual(withExplicitK)
  })
})

describe('applyGroupElo', () => {
  it('applies elo changes against every loser for the winner', () => {
    const { newWinner, newLosers } = applyGroupElo(1000, [1000, 1000, 1000], 16)
    expect(newWinner).toBeGreaterThan(1000)
    expect(newLosers).toHaveLength(3)
    for (const loserElo of newLosers) {
      expect(loserElo).toBeLessThan(1000)
    }
  })

  it('returns an empty losers array when there are no losers', () => {
    const { newWinner, newLosers } = applyGroupElo(1000, [], 16)
    expect(newWinner).toBe(1000)
    expect(newLosers).toEqual([])
  })
})
```

- [ ] **Step 5: Lancer les tests**

```bash
npx vitest run app/utils/elo.test.ts
```

Attendu : tous les tests passent. Si `applyElo(1000, 1000, 32)` ne donne pas exactement `1016`/`984`, ajuster les valeurs attendues dans le test pour qu'elles correspondent au résultat réel produit par le code (le test documente le comportement existant, il ne le redéfinit pas).

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts app/utils/elo.test.ts package.json package-lock.json
git commit -m "test: ajoute Vitest et couvre app/utils/elo.ts"
```

---

### Task 3: Vitest — tests `matchmaking.ts`

**Files:**
- Create: `app/utils/matchmaking.test.ts`

**Interfaces:**
- Consumes: `matchKey(a: string, b: string): string`, `buildCoverageGroups(pool: string[], archetypes: Record<string, ArchetypeState>, seed: number, groupSize?: number): string[][]`, `buildEloProximityGroups(pool: string[], archetypes: Record<string, ArchetypeState>, seed: number, groupSize?: number): string[][]`, `getNextMatchSwiss(state: TournamentState, pool: string[]): [string, string] | null` — de `app/utils/matchmaking.ts`. `ArchetypeState`/`TournamentState` de `~/types/tournament`.

- [ ] **Step 1: Écrire les tests**

Create `app/utils/matchmaking.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { matchKey, buildCoverageGroups, buildEloProximityGroups, getNextMatchSwiss } from './matchmaking'
import type { ArchetypeState, TournamentState } from '~/types/tournament'

function makeArchetypes (names: string[]): Record<string, ArchetypeState> {
  const out: Record<string, ArchetypeState> = {}
  for (const name of names) {
    out[name] = { elo: 1000, wins: 0, losses: 0 }
  }
  return out
}

describe('matchKey', () => {
  it('is order-independent', () => {
    expect(matchKey('A', 'B')).toBe(matchKey('B', 'A'))
  })

  it('is a stable alphabetical join', () => {
    expect(matchKey('B', 'A')).toBe('A|B')
  })
})

describe('buildCoverageGroups', () => {
  it('covers every archetype exactly once', () => {
    const pool = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    const groups = buildCoverageGroups(pool, makeArchetypes(pool), 42)
    const flat = groups.flat()
    expect(flat.sort()).toEqual([...pool].sort())
  })

  it('never produces a group smaller than 2 or larger than groupSize', () => {
    const pool = Array.from({ length: 11 }, (_, i) => `arch-${i}`)
    const groups = buildCoverageGroups(pool, makeArchetypes(pool), 7, 4)
    for (const g of groups) {
      expect(g.length).toBeGreaterThanOrEqual(2)
      expect(g.length).toBeLessThanOrEqual(4)
    }
  })

  it('returns an empty array for an empty pool', () => {
    expect(buildCoverageGroups([], {}, 1)).toEqual([])
  })
})

describe('buildEloProximityGroups', () => {
  it('covers every archetype exactly once', () => {
    const pool = ['A', 'B', 'C', 'D', 'E']
    const groups = buildEloProximityGroups(pool, makeArchetypes(pool), 3)
    expect(groups.flat().sort()).toEqual([...pool].sort())
  })
})

describe('getNextMatchSwiss', () => {
  function makeState (pool: string[], matchesPlayed: string[] = []): TournamentState {
    return {
      runId: 'test',
      createdAt: new Date().toISOString(),
      seed: 1,
      phase: 'phase3',
      archetypes: makeArchetypes(pool),
      remainingNames: pool,
      matchesPlayed,
      currentMatch: null,
      round: 0,
      initialPoolSize: pool.length,
      phaseRound: 0,
      groupsCompleted: 0,
      groupsTotal: 0,
      currentRoundGroups: null,
      phasePool: pool
    }
  }

  it('returns null when fewer than 2 archetypes remain', () => {
    expect(getNextMatchSwiss(makeState(['A']), ['A'])).toBeNull()
  })

  it('never proposes a pair that already played', () => {
    const pool = ['A', 'B']
    const state = makeState(pool, [matchKey('A', 'B')])
    expect(getNextMatchSwiss(state, pool)).toBeNull()
  })

  it('proposes an unplayed pair', () => {
    const pool = ['A', 'B', 'C']
    const state = makeState(pool, [matchKey('A', 'B')])
    const result = getNextMatchSwiss(state, pool)
    expect(result).not.toBeNull()
    expect(state.matchesPlayed).not.toContain(matchKey(result![0], result![1]))
  })
})
```

- [ ] **Step 2: Lancer les tests**

```bash
npx vitest run app/utils/matchmaking.test.ts
```

Attendu : tous les tests passent.

- [ ] **Step 3: Commit**

```bash
git add app/utils/matchmaking.test.ts
git commit -m "test: couvre app/utils/matchmaking.ts"
```

---

### Task 4: Vitest — tests `csv.ts` / `rankingStorage.ts`

**Files:**
- Create: `app/utils/rankingStorage.test.ts`

**Interfaces:**
- Consumes: `getTop10(state: TournamentState)`, `exportTop10Csv(state: TournamentState): string` de `app/utils/rankingStorage.ts`.

Note : le fichier lu comme `csv.ts` dans l'exploration contient en réalité `getTop10`, `exportTop10Csv`, `downloadTop10Csv` — vérifier son nom exact avec `ls app/utils/ | grep -i -E "csv|ranking"` avant d'écrire l'import (c'est `app/utils/rankingStorage.ts`).

- [ ] **Step 1: Écrire les tests**

Create `app/utils/rankingStorage.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getTop10, exportTop10Csv } from './rankingStorage'
import type { TournamentState, ArchetypeState } from '~/types/tournament'

function makeState (archetypes: Record<string, ArchetypeState>, overrides: Partial<TournamentState> = {}): TournamentState {
  return {
    runId: 'run-1234',
    createdAt: new Date().toISOString(),
    seed: 1,
    phase: 'finished',
    archetypes,
    remainingNames: Object.keys(archetypes),
    matchesPlayed: [],
    currentMatch: null,
    round: 0,
    initialPoolSize: Object.keys(archetypes).length,
    phaseRound: 0,
    groupsCompleted: 0,
    groupsTotal: 0,
    currentRoundGroups: null,
    phasePool: Object.keys(archetypes),
    ...overrides
  }
}

describe('getTop10', () => {
  it('sorts by descending Elo and caps at 10', () => {
    const archetypes: Record<string, ArchetypeState> = {}
    for (let i = 0; i < 15; i++) {
      archetypes[`arch-${i}`] = { elo: 1000 + i, wins: 1, losses: 0 }
    }
    const top = getTop10(makeState(archetypes))
    expect(top).toHaveLength(10)
    expect(top[0]!.name).toBe('arch-14')
    expect(top[0]!.rank).toBe(1)
  })

  it('excludes archetypes that never played a match', () => {
    const archetypes: Record<string, ArchetypeState> = {
      played: { elo: 1000, wins: 1, losses: 0 },
      unplayed: { elo: 1200, wins: 0, losses: 0 }
    }
    const top = getTop10(makeState(archetypes))
    expect(top.map(r => r.name)).toEqual(['played'])
  })
})

describe('exportTop10Csv', () => {
  it('starts with a UTF-8 BOM and the header row', () => {
    const csv = exportTop10Csv(makeState({ A: { elo: 1010, wins: 1, losses: 0 } }))
    expect(csv.startsWith('﻿Rank,Archetype,Elo,Wins,Losses,Matches Played')).toBe(true)
  })

  it('quotes archetype names containing a comma', () => {
    const csv = exportTop10Csv(makeState({ 'A, the Great': { elo: 1010, wins: 1, losses: 0 } }))
    expect(csv).toContain('"A, the Great"')
  })
})
```

- [ ] **Step 2: Lancer les tests**

```bash
npx vitest run app/utils/rankingStorage.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add app/utils/rankingStorage.test.ts
git commit -m "test: couvre app/utils/rankingStorage.ts (top10 + export CSV)"
```

---

### Task 5: Vitest — tests `state.ts`

**Files:**
- Create: `app/utils/state.test.ts`

**Interfaces:**
- Consumes: `createInitialState(archetypeNames: string[], seed: number): TournamentState`, `applyGroupResult(state, winner: string, losers: string[]): TournamentState`, `applyEloResult(state, winner: string, loser: string): TournamentState`, `isPhase3Done(state): boolean`, `undoLastResult(state): TournamentState | null`, `getTopByElo(archetypes, pool, count): string[]` — de `app/utils/state.ts`.

- [ ] **Step 1: Écrire les tests**

Create `app/utils/state.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createInitialState, applyGroupResult, applyEloResult, isPhase3Done, undoLastResult, getTopByElo } from './state'

const NAMES = Array.from({ length: 8 }, (_, i) => `arch-${i}`)

describe('createInitialState', () => {
  it('initializes every archetype at 1000 Elo with no wins/losses', () => {
    const state = createInitialState(NAMES, 1)
    for (const name of NAMES) {
      expect(state.archetypes[name]).toEqual({ elo: 1000, wins: 0, losses: 0 })
    }
    expect(state.phase).toBe('phase1')
    expect(state.remainingNames.sort()).toEqual([...NAMES].sort())
  })
})

describe('getTopByElo', () => {
  it('returns the N highest-Elo archetypes from the pool', () => {
    const state = createInitialState(NAMES, 1)
    state.archetypes['arch-3']!.elo = 1500
    state.archetypes['arch-5']!.elo = 1400
    const top2 = getTopByElo(state.archetypes, NAMES, 2)
    expect(top2).toEqual(['arch-3', 'arch-5'])
  })
})

describe('applyGroupResult', () => {
  it('increments the winner wins and every loser losses', () => {
    const state = createInitialState(NAMES, 1)
    const group = state.currentRoundGroups![0]!
    const [winner, ...losers] = group
    const next = applyGroupResult({ ...state, currentMatch: group }, winner!, losers)
    expect(next.archetypes[winner!]!.wins).toBe(1)
    for (const loser of losers) {
      expect(next.archetypes[loser]!.losses).toBe(1)
    }
  })

  it('raises the winner Elo and lowers every loser Elo', () => {
    const state = createInitialState(NAMES, 1)
    const group = state.currentRoundGroups![0]!
    const [winner, ...losers] = group
    const next = applyGroupResult({ ...state, currentMatch: group }, winner!, losers)
    expect(next.archetypes[winner!]!.elo).toBeGreaterThan(1000)
    for (const loser of losers) {
      expect(next.archetypes[loser]!.elo).toBeLessThan(1000)
    }
  })
})

describe('applyEloResult', () => {
  it('records the match as played and updates wins/losses', () => {
    const state = createInitialState(NAMES, 1)
    const phase3State = { ...state, phase: 'phase3' as const, phasePool: NAMES, currentMatch: [NAMES[0]!, NAMES[1]!] }
    const next = applyEloResult(phase3State, NAMES[0]!, NAMES[1]!)
    expect(next.archetypes[NAMES[0]!]!.wins).toBe(1)
    expect(next.archetypes[NAMES[1]!]!.losses).toBe(1)
    expect(next.matchesPlayed).toHaveLength(1)
  })
})

describe('isPhase3Done', () => {
  it('is false outside phase3', () => {
    const state = createInitialState(NAMES, 1)
    expect(isPhase3Done(state)).toBe(false)
  })

  it('is true once the Swiss round quota is reached', () => {
    const state = createInitialState(NAMES, 1)
    const pool = NAMES.slice(0, 4)
    const matchesPerRound = Math.floor(pool.length / 2)
    const phase3State = {
      ...state,
      phase: 'phase3' as const,
      phasePool: pool,
      matchesPlayed: Array.from({ length: matchesPerRound * 3 }, (_, i) => `m${i}`)
    }
    expect(isPhase3Done(phase3State)).toBe(true)
  })
})

describe('undoLastResult', () => {
  it('returns null when there is nothing to undo', () => {
    const state = createInitialState(NAMES, 1)
    expect(undoLastResult(state)).toBeNull()
  })

  it('restores the pre-match Elo and win/loss counts', () => {
    const state = createInitialState(NAMES, 1)
    const group = state.currentRoundGroups![0]!
    const [winner, ...losers] = group
    const afterResult = applyGroupResult({ ...state, currentMatch: group }, winner!, losers)
    const undone = undoLastResult(afterResult)
    expect(undone).not.toBeNull()
    expect(undone!.archetypes[winner!]!.elo).toBe(1000)
    expect(undone!.archetypes[winner!]!.wins).toBe(0)
    for (const loser of losers) {
      expect(undone!.archetypes[loser]!.elo).toBe(1000)
      expect(undone!.archetypes[loser]!.losses).toBe(0)
    }
  })
})
```

- [ ] **Step 2: Lancer les tests**

```bash
npx vitest run app/utils/state.test.ts
```

Attendu : tous les tests passent. Si `undoLastResult` restaure un Elo légèrement différent de 1000 (arrondi cumulé), ajuster l'assertion pour vérifier une égalité au delta d'arrondi près plutôt qu'une valeur exacte — documenter le comportement réel observé, ne pas le changer.

- [ ] **Step 3: Commit**

```bash
git add app/utils/state.test.ts
git commit -m "test: couvre app/utils/state.ts (transitions de phase, undo)"
```

---

### Task 6: Vitest — tests `representativeCard.ts`

**Files:**
- Create: `app/utils/representativeCard.test.ts`

**Interfaces:**
- Consumes: `pick5Main5Extra(cards: YgoCard[], archetypeName: string)`, `hasValidRepresentatives(cards, archetypeName): boolean`, `filterCardsByArchetype(cards, archetypeName): YgoCard[]`, `getExtraPolicy(extraCards): ExtraPolicy`, `getCardCategory(card): CardCategory` — de `app/utils/representativeCard.ts`. Type `YgoCard` de `~/types/api`.

- [ ] **Step 1: Écrire un helper de fixture minimal et les tests**

Create `app/utils/representativeCard.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { pick5Main5Extra, hasValidRepresentatives, filterCardsByArchetype, getExtraPolicy, getCardCategory } from './representativeCard'
import type { YgoCard } from '~/types/api'

function card (overrides: Partial<YgoCard> & { id: number; name: string }): YgoCard {
  return {
    type: 'Effect Monster',
    frameType: 'effect',
    archetype: 'Blue-Eyes',
    atk: 0,
    def: 0,
    desc: '',
    card_sets: [],
    card_images: [],
    ...overrides
  } as YgoCard
}

describe('filterCardsByArchetype', () => {
  it('keeps only cards whose archetype field matches exactly', () => {
    const cards = [
      card({ id: 1, name: 'Blue-Eyes White Dragon', archetype: 'Blue-Eyes' }),
      card({ id: 2, name: 'Unrelated Card', archetype: 'Red-Eyes' })
    ]
    expect(filterCardsByArchetype(cards, 'Blue-Eyes').map(c => c.id)).toEqual([1])
  })

  it('excludes cards belonging to a more specific archetype', () => {
    const cards = [
      card({ id: 1, name: 'Speedroid Terrortop', archetype: 'Speedroid' })
    ]
    expect(filterCardsByArchetype(cards, 'Roid')).toEqual([])
  })

  it('returns an empty array for a blank archetype name', () => {
    expect(filterCardsByArchetype([card({ id: 1, name: 'X' })], '  ')).toEqual([])
  })
})

describe('getCardCategory', () => {
  it('classifies Extra Deck monster types as extra', () => {
    expect(getCardCategory(card({ id: 1, name: 'X', type: 'XYZ Monster', frameType: 'xyz' }))).toBe('extra')
  })

  it('classifies Spell cards as spell', () => {
    expect(getCardCategory(card({ id: 1, name: 'X', type: 'Spell Card', frameType: 'spell' }))).toBe('spell')
  })

  it('classifies non-Extra monsters as main', () => {
    expect(getCardCategory(card({ id: 1, name: 'X', type: 'Effect Monster', frameType: 'effect' }))).toBe('main')
  })
})

describe('hasValidRepresentatives', () => {
  it('requires at least 6 displayable monsters', () => {
    const fiveMonsters = Array.from({ length: 5 }, (_, i) =>
      card({ id: i, name: `Blue-Eyes Monster ${i}`, archetype: 'Blue-Eyes', type: 'Effect Monster' })
    )
    expect(hasValidRepresentatives(fiveMonsters, 'Blue-Eyes')).toBe(false)

    const sixMonsters = Array.from({ length: 6 }, (_, i) =>
      card({ id: i, name: `Blue-Eyes Monster ${i}`, archetype: 'Blue-Eyes', type: 'Effect Monster' })
    )
    expect(hasValidRepresentatives(sixMonsters, 'Blue-Eyes')).toBe(true)
  })
})

describe('pick5Main5Extra', () => {
  it('prioritizes Extra Deck monsters, filling the rest with Main Deck monsters', () => {
    const cards = [
      ...Array.from({ length: 3 }, (_, i) =>
        card({ id: i, name: `Blue-Eyes Xyz ${i}`, archetype: 'Blue-Eyes', type: 'XYZ Monster', frameType: 'xyz' })
      ),
      ...Array.from({ length: 8 }, (_, i) =>
        card({ id: 100 + i, name: `Blue-Eyes Main ${i}`, archetype: 'Blue-Eyes', type: 'Effect Monster' })
      )
    ]
    const { main, extra } = pick5Main5Extra(cards, 'Blue-Eyes')
    expect(extra).toHaveLength(3)
    expect(main).toHaveLength(7)
  })
})

describe('getExtraPolicy', () => {
  it('returns none for an empty Extra Deck', () => {
    expect(getExtraPolicy([])).toBe('none')
  })

  it('returns the single type when the Extra Deck is homogeneous', () => {
    const cards = [card({ id: 1, name: 'X', type: 'Synchro Monster', frameType: 'synchro' })]
    expect(getExtraPolicy(cards)).toBe('synchro')
  })

  it('returns mixed when the Extra Deck spans multiple types', () => {
    const cards = [
      card({ id: 1, name: 'X', type: 'Synchro Monster', frameType: 'synchro' }),
      card({ id: 2, name: 'Y', type: 'XYZ Monster', frameType: 'xyz' })
    ]
    expect(getExtraPolicy(cards)).toBe('mixed')
  })
})
```

- [ ] **Step 2: Lancer les tests**

```bash
npx vitest run app/utils/representativeCard.test.ts
```

Attendu : tous les tests passent. Adapter les assertions de `pick5Main5Extra` si le compte réel de main diffère (le total attendu est toujours 10, mais la répartition dépend de `MAIN_DISPLAY_COUNT`/`EXTRA_DISPLAY_COUNT` — vérifier la sortie réelle plutôt que de supposer).

- [ ] **Step 3: Commit**

```bash
git add app/utils/representativeCard.test.ts
git commit -m "test: couvre app/utils/representativeCard.ts"
```

---

### Task 7: Extraire `StartScreen.vue`

**Files:**
- Create: `app/components/tournament/StartScreen.vue`
- Modify: `app/pages/index.vue:609-671` (template), `app/pages/index.vue` style block lines `888-1246` (section `START SCREEN`)

**Interfaces:**
- Consumes: rien (composant purement présentational).
- Produces: emit `start` — `index.vue` l'écoute pour appeler `startTournament()` (déjà fourni par `useTournamentState()`).

- [ ] **Step 1: Créer le composant avec le template et le style déplacés**

Create `app/components/tournament/StartScreen.vue`. Copier tel quel le contenu du template `index.vue:610-670` (tout l'intérieur du `<div class="start-screen">`, en gardant la div englobante) dans le `<template>`, et copier tel quel les lignes CSS `888-1246` de `index.vue` (bloc `/* START SCREEN */`) dans le `<style scoped>`. Remplacer uniquement `@click="startTournament"` par `@click="$emit('start')"` et `v-html="i(...)"` par un usage direct de `t` importé localement :

```vue
<script setup lang="ts">
import { t } from '~/utils/i18n'

const i = (key: string) => t(key, 'en')

defineEmits<{ start: [] }>()
</script>

<template>
  <div class="start-screen">
    <!-- coller ici tel quel le contenu de index.vue:611-670 -->
  </div>
</template>

<style scoped>
/* coller ici tel quel index.vue:889-1246 (tout le bloc START SCREEN) */
</style>
```

- [ ] **Step 2: Remplacer le bloc dans `index.vue`**

In `app/pages/index.vue`, replace lines 609-671:

```vue
      <div v-else-if="!state && !loading" class="start-screen">
        ...
      </div>
```

with:

```vue
      <StartScreen v-else-if="!state && !loading" @start="startTournament" />
```

Then delete CSS lines 888-1246 (the whole `/* START SCREEN */` block) from `index.vue`'s `<style scoped>`.

- [ ] **Step 3: Vérifier que le build passe**

```bash
npm run build
```

- [ ] **Step 4: Vérification visuelle**

```bash
npm run dev
```

Ouvrir `http://localhost:3000`, vérifier que l'écran d'accueil (particules, texte, bouton) est identique à avant, et que cliquer sur le bouton démarre bien le tournoi (passe à l'écran de chargement / phase 1).

- [ ] **Step 5: Commit**

```bash
git add app/components/tournament/StartScreen.vue app/pages/index.vue
git commit -m "refactor: extrait StartScreen.vue de index.vue"
```

---

### Task 8: Extraire `TournamentHeader.vue`

**Files:**
- Create: `app/components/tournament/TournamentHeader.vue`
- Modify: `app/pages/index.vue:274-312` (template header), script (déplacer `phaseBadgeText`, `displayedProgressPercent`, `phaseProgressPercent`, le `watch` d'animation RAF), style lines `677-793` (bloc HEADER) + les règles mobile associées lignes `2054-2078` (`.header`, `.header-right`, `.phase-badge`, `.phase-badge__dot`, `.btn-header`, `.logo`)

**Interfaces:**
- Consumes: `state.value?.phase`, `state.value?.phaseRound` depuis `useTournamentState()`, `canUndo`, `undo`, `resetToStart` (déjà exposés par `useTournamentState()` dans `index.vue`).
- Produces: props `phase: TournamentState['phase'] | undefined`, `phaseRound: number`, `progressPercent: number` (valeur cible 0-100, non animée — l'animation RAF est interne au composant), `canUndo: boolean`. Emits: `undo`, `reset`.

- [ ] **Step 1: Créer le composant**

Create `app/components/tournament/TournamentHeader.vue`:

```vue
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
    <div v-if="phase && phase !== 'finished'" class="header-progress">
      <div class="header-progress__fill" :style="{ width: displayedProgressPercent + '%' }" />
    </div>
  </header>
</template>

<style scoped>
/* coller ici tel quel index.vue:680-793 (tout le bloc HEADER) */

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
```

- [ ] **Step 2: Câbler dans `index.vue`**

In `app/pages/index.vue`, replace the `<header>` block (lines 275-312) with:

```vue
    <TournamentHeader
      :phase="state?.phase"
      :phase-round="state?.phaseRound ?? 0"
      :progress-percent="phaseProgressPercent"
      :can-undo="canUndo"
      @undo="undo"
      @reset="resetToStart"
    />
```

In the `<script setup>`, remove `phaseBadgeText`, `displayedProgressPercent`, `PROGRESS_ANIM_DURATION_MS`, `progressAnimId`, and the `watch(phaseProgressPercent, ...)` block (lines 196-231) — `phaseProgressPercent` itself (lines 178-194) stays, it's now passed as a prop. Remove the now-unused `COVERAGE_ROUND_COUNT`/`REFINEMENT_ROUND_COUNT` import if no longer referenced elsewhere in `index.vue` (check with `grep -n "COVERAGE_ROUND_COUNT\|REFINEMENT_ROUND_COUNT" app/pages/index.vue`).

Delete CSS lines 680-793 (`/* HEADER */` block) and the mobile rules for `.header`, `.header-right`, `.phase-badge`, `.phase-badge__dot`, `.btn-header`, `.logo` from the `RESPONSIVE MOBILE` block (lines 2054-2078), keeping the rest of that media query (`.main`, `.duel-instruction`, `.podium*`) in `index.vue`.

- [ ] **Step 3: Vérifier build + dev**

```bash
npm run build
npm run dev
```

Vérifier manuellement : le badge de phase affiche le bon pourcentage animé pendant un tournoi, le bouton "précédent" apparaît/disparaît selon `canUndo`, le bouton reset fonctionne.

- [ ] **Step 4: Commit**

```bash
git add app/components/tournament/TournamentHeader.vue app/pages/index.vue
git commit -m "refactor: extrait TournamentHeader.vue de index.vue"
```

---

### Task 9: Extraire `ArchetypeModal.vue`

**Files:**
- Create: `app/components/tournament/ArchetypeModal.vue`
- Modify: `app/pages/index.vue` script (supprimer `archetypeModalName`'s consumers, `modalAllCards`, `modalLoading`, `modalCardSelected`, `modalSearch`, `modalCoherence`, `CATEGORY_ORDER`, `sortCardsByCategoryThenName`, `excludeTokensAndRushDuelCharacters`, `modalCardsFiltered`, le `watch(archetypeModalName, ...)`, `closeArchetypeModal`), template lines `507-606`, style lines `1749-2050` (bloc ARCHETYPE MODAL)

**Interfaces:**
- Consumes: `fetchCardsForArchetype(name: string): Promise<YgoCard[]>`, `displayArchetypeName(name: string): string` de `~/composables/useYgoApi`; `analyzeArchetypeCoherence(cards, name): ArchetypeCoherenceResult` de `~/utils/archetypeLinks`; `getCardCategory(card): CardCategory`, `getFullCardImageUrl(card): string` de `~/utils/representativeCard`.
- Produces: prop `name: string | null` (nom d'archétype à afficher, `null` = fermé). Emit `close`.

- [ ] **Step 1: Créer le composant**

Create `app/components/tournament/ArchetypeModal.vue`:

```vue
<script setup lang="ts">
import type { YgoCard } from '~/types/api'
import { fetchCardsForArchetype, displayArchetypeName } from '~/composables/useYgoApi'
import { getCardCategory, getFullCardImageUrl } from '~/utils/representativeCard'
import { analyzeArchetypeCoherence, type ArchetypeCoherenceResult } from '~/utils/archetypeLinks'

const props = defineProps<{ name: string | null }>()
const emit = defineEmits<{ close: [] }>()

const modalAllCards = ref<YgoCard[]>([])
const modalLoading = ref(false)
const modalCardSelected = ref<YgoCard | null>(null)
const modalSearch = ref('')
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
        <!-- coller ici tel quel le contenu de index.vue:518-603 (div.archetype-modal jusqu'à sa fermeture), en remplaçant closeArchetypeModal par close, et archetypeModalName par name -->
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* coller ici tel quel index.vue:1750-2050 (tout le bloc ARCHETYPE MODAL) */
</style>
```

- [ ] **Step 2: Câbler dans `index.vue`**

In `app/pages/index.vue`, replace the `<Teleport>` block (template lines 507-606) with:

```vue
        <ArchetypeModal :name="archetypeModalName" @close="archetypeModalName = null" />
```

Keep `archetypeModalName` as a local `ref<string | null>(null)` in `index.vue` (it's still set by clicks on podium/top-list items — those stay in `index.vue`/move to `TopTenPodium.vue` in Task 10).

In `<script setup>`, remove: `modalAllCards`, `modalLoading`, `modalCardSelected`, `modalSearch`, `modalCoherence`, `CATEGORY_ORDER`, `sortCardsByCategoryThenName`, `excludeTokensAndRushDuelCharacters`, `modalCardsFiltered`, the `watch(archetypeModalName, ...)` block, `closeArchetypeModal`. Remove now-unused imports (`fetchCardsForArchetype`, `analyzeArchetypeCoherence`, `ArchetypeCoherenceResult`, `getCardCategory` — check with `grep -n "getCardCategory\|fetchCardsForArchetype\|analyzeArchetypeCoherence" app/pages/index.vue` since `getFullCardImageUrl`/`displayArchetypeName` may still be used elsewhere in `index.vue`).

Delete CSS lines 1750-2050 (`/* ARCHETYPE MODAL */` block) from `index.vue`.

- [ ] **Step 3: Vérifier build + dev**

```bash
npm run build
npm run dev
```

Terminer un tournoi, cliquer sur une entrée du podium ou du top 10, vérifier que la modal s'ouvre avec la bonne liste de cartes, que la recherche filtre, que le clic en dehors ferme la modal, et que le scroll de la page reste bloqué pendant que la modal est ouverte.

- [ ] **Step 4: Commit**

```bash
git add app/components/tournament/ArchetypeModal.vue app/pages/index.vue
git commit -m "refactor: extrait ArchetypeModal.vue de index.vue"
```

---

### Task 10: Extraire `TopTenPodium.vue`

**Files:**
- Create: `app/components/tournament/TopTenPodium.vue`
- Modify: `app/pages/index.vue` script (`podiumSlots` déplacé dans le composant), template lines `442-505`, style lines `1502-1748` (bloc RESULTS) + règles mobile `.podium`, `.podium__name`, `.podium__elo`, `.podium__record` (lignes `2082-2093`)

**Interfaces:**
- Consumes: `displayArchetypeName(name: string): string` de `~/composables/useYgoApi`. Type de `top10` : `Array<{ rank: number; name: string; elo: number; wins: number; losses: number; matchesPlayed: number }>` (retour de `getTop10` dans `~/utils/rankingStorage`).
- Produces: props `top10: Array<{ rank: number; name: string; elo: number; wins: number; losses: number }>`. Emits: `select-archetype(name: string)`, `download-csv`, `restart`.

- [ ] **Step 1: Créer le composant**

Create `app/components/tournament/TopTenPodium.vue`:

```vue
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
    <section key="results" class="results-section">
      <!-- coller ici tel quel le contenu de index.vue:444-503, en remplaçant archetypeModalName = pos.name par $emit('select-archetype', pos.name), downloadCsv par $emit('download-csv'), restart par $emit('restart') -->
    </section>
  </Transition>
</template>

<style scoped>
/* coller ici tel quel index.vue:1503-1748 (tout le bloc RESULTS) */

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
```

- [ ] **Step 2: Câbler dans `index.vue`**

In `app/pages/index.vue`, replace template lines 442-505 (the `<Transition name="results">...</Transition>` block) with:

```vue
        <TopTenPodium
          :top10="top10"
          @select-archetype="archetypeModalName = $event"
          @download-csv="downloadCsv"
          @restart="restart"
        />
```

In `<script setup>`, remove `podiumSlots` (now internal to `TopTenPodium.vue`). Delete CSS lines 1503-1748 (`/* RESULTS */` block) and the `.podium*` rules from the `RESPONSIVE MOBILE` block (lines 2082-2093) from `index.vue`.

- [ ] **Step 3: Vérifier build + dev**

```bash
npm run build
npm run dev
```

Terminer un tournoi, vérifier que le podium (3 premiers) et la liste (4-10) s'affichent identiquement, que le clic sur une entrée ouvre la modal d'archétype, et que les boutons "Télécharger CSV" / "Rejouer" fonctionnent.

- [ ] **Step 4: Commit**

```bash
git add app/components/tournament/TopTenPodium.vue app/pages/index.vue
git commit -m "refactor: extrait TopTenPodium.vue de index.vue"
```

---

### Task 11: Extraire `MatchBoard.vue`

**Files:**
- Create: `app/components/tournament/MatchBoard.vue`
- Modify: `app/pages/index.vue` script (déplacer `selectedCard`, `matchDisplayGlobalIdx`, `matchDisplayTotalSteps`, `getCurrentRepresentative`, `showCardBack`, `isGroupMode`, `isDuelMode`, `canCycleAllCards`, `cycleAllCards`, `groupGridClass`, `duelLeft`, `duelRight`, le `watch` sur `[currentMatch, round]`, le `watch(transitioning, ...)`, `selectGroup`, `selectDuel`), template lines `342-427`, style lines `1247-1501` (bloc DUEL/MATCH, hors `.error-box` qui reste dans `index.vue`) + règle mobile `.duel-instruction` (ligne `2079-2081`)

**Interfaces:**
- Consumes: `state.value` (phase, round, currentMatch, archetypes) et `transitioning` de `useTournamentState()`; `pickGroup(winner, losers)`, `pickDuel(winner, loser)`, `finish()` de `useTournamentState()`; `displayArchetypeName(name)` de `~/composables/useYgoApi`; `MAIN_DISPLAY_COUNT`, `EXTRA_DISPLAY_COUNT` de `~/utils/representativeCard`.
- Produces: props `state: TournamentState | null`, `transitioning: boolean`. Emits: `pick-group(winner: string, losers: string[])`, `pick-duel(winner: string, loser: string)`, `finish()`.

- [ ] **Step 1: Créer le composant**

Create `app/components/tournament/MatchBoard.vue`:

```vue
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

defineExpose({ isGroupMode, isDuelMode })
</script>

<template>
  <div
    v-if="isGroupMode || isDuelMode"
    key="duel-wrap"
    class="duel-wrap"
  >
    <!-- coller ici tel quel le contenu de index.vue:347-426 (le <Transition name="duel">...</Transition>), en remplaçant :
         - selectGroup(name) / selectDuel(name) restent identiques (méthodes locales ci-dessus)
         - @click="finish" → @click="$emit('finish')"
         - state! → state (prop, potentiellement null : les v-if isGroupMode/isDuelMode garantissent déjà state non-null à l'intérieur) -->
  </div>
</template>

<style scoped>
/* coller ici tel quel index.vue:1250-1500 (tout le bloc DUEL/MATCH, sans .error-box qui reste dans index.vue) */

@media (max-width: 480px) {
  /* conserver tel quel le sous-bloc @media (max-width: 480px) déjà présent dans DUEL/MATCH (duel-arena) */
}
</style>
```

Note : à l'intérieur du template collé, remplacer chaque `state!.` par `state?.` ou par un accès garanti par le `v-if` englobant, puisque `state` est maintenant une prop typée `TournamentState | null` (pas un `ref` non-nul comme dans `index.vue` où `state!` forçait le typage). Vérifier avec `npm run build` (Task 11 Step 3) qu'aucune erreur de typage ne subsiste.

- [ ] **Step 2: Câbler dans `index.vue`**

In `app/pages/index.vue`, replace template lines 342-427 with:

```vue
      <MatchBoard
        v-else-if="isGroupModeOuter || isDuelModeOuter"
        :state="state"
        :transitioning="transitioning"
        @pick-group="pickGroup"
        @pick-duel="pickDuel"
        @finish="finish"
      />
```

Comme `isGroupMode`/`isDuelMode` sont maintenant internes à `MatchBoard.vue`, `index.vue` a besoin d'un signal équivalent pour son propre `v-else-if`. Ajouter dans le `<script setup>` de `index.vue` deux computed minimalistes réutilisant la même logique (dupliquée intentionnellement — c'est une condition d'affichage au niveau du parent, pas une donnée métier) :

```typescript
const isGroupModeOuter = computed(
  () =>
    (state.value?.phase === 'phase1' || state.value?.phase === 'phase2') &&
    (state.value?.currentMatch?.length ?? 0) >= 2
)
const isDuelModeOuter = computed(
  () =>
    state.value?.phase === 'phase3' &&
    state.value?.currentMatch?.length === 2
)
```

Remove from `index.vue`'s `<script setup>`: `selectedCard`, `matchDisplayGlobalIdx`, `matchDisplayTotalSteps`, `getCurrentRepresentative`, `showCardBack`, `isGroupMode`, `isDuelMode`, `canCycleAllCards`, `cycleAllCards`, `groupGridClass`, `duelLeft`, `duelRight`, `selectGroup`, `selectDuel`, the `watch` on `[currentMatch, round]`, the `watch(transitioning, ...)`, and the now-unused `DISPLAY_STEPS`/`MAIN_DISPLAY_COUNT`/`EXTRA_DISPLAY_COUNT` imports (check with `grep -n "MAIN_DISPLAY_COUNT\|EXTRA_DISPLAY_COUNT\|DISPLAY_STEPS" app/pages/index.vue`).

Delete CSS lines 1250-1500 (`/* DUEL/MATCH */` block, keeping `.error-box` at its current position or moving it just above `/* RESULTS */` since it's used by `index.vue`'s own error state) and the `.duel-instruction` rule from `RESPONSIVE MOBILE` (lines 2079-2081) from `index.vue`.

- [ ] **Step 3: Vérifier build + dev**

```bash
npm run build
npm run dev
```

Jouer un tournoi complet : vérifier le mode groupe (phase 1 et 2, grilles 2/3/4 cartes), le mode duel (phase 3, VS 1v1), le cycle de cartes ("changer de carte"), le bouton "terminer maintenant", et que l'annulation (`undo`) réinitialise bien `selectedCard` via `transitioning`.

- [ ] **Step 4: Commit**

```bash
git add app/components/tournament/MatchBoard.vue app/pages/index.vue
git commit -m "refactor: extrait MatchBoard.vue de index.vue"
```

---

### Task 12: Vérification finale

**Files:** aucun nouveau fichier — vérification uniquement.

- [ ] **Step 1: Lint**

```bash
npm run lint
```

Attendu : aucune erreur (corriger si l'extraction a introduit des imports inutilisés ou du code mort).

- [ ] **Step 2: Tests**

```bash
npx vitest run
```

Attendu : tous les tests des Tasks 2-6 passent toujours.

- [ ] **Step 3: Build**

```bash
npm run build
```

Attendu : build réussi.

- [ ] **Step 4: Vérifier la taille de `index.vue`**

```bash
wc -l app/pages/index.vue
```

Attendu : très inférieur à 2095 lignes (orchestration seule : état partagé, `init()`, `onMounted`, câblage des composants).

- [ ] **Step 5: Test manuel de bout en bout**

```bash
npm run dev
```

Jouer un tournoi complet du début à la fin (écran d'accueil → phase 1 → phase 2 → phase 3 → résultats → modal d'archétype → export CSV → rejouer), en confirmant qu'aucun comportement n'a changé par rapport à avant le refactor.

- [ ] **Step 6: Commit final si des ajustements ont été nécessaires**

```bash
git add -A
git commit -m "chore: nettoyage final post-refactor (lint, imports inutilisés)"
```

Ne créer ce commit que s'il y a effectivement des changements (`git status` non vide) — sinon, passer directement à la fin.
