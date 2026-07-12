# Questionnaire de préférences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'écran d'accueil actuel par un questionnaire obligatoire de 8 questions qui filtre, via un système de score à seuil, le pool d'archétypes utilisé pour démarrer un tournoi — à partir d'un jeu de données curées (~120-150 archétypes, tags + description + cartes clés), avec accès enrichi aux détails d'archétype pendant les duels.

**Architecture:** Un nouveau fichier de données statique (`app/data/curatedArchetypes.ts`) remplace le pool actuel (300+ archétypes détectés par API) comme source pour le nouveau flux de démarrage. Un moteur de scoring pur (`app/utils/preferencesScoring.ts`) calcule, pour un ensemble de réponses, quels archétypes du fichier curé passent le seuil. Un nouveau composant (`PreferencesQuestionnaire.vue`) remplace `StartScreen.vue` dans `index.vue` et appelle une nouvelle fonction `startTournamentWithPool()` sur `useTournamentState()`. `ArchetypeModal.vue` et `ArchetypeCard.vue` sont enrichis pour exposer les nouvelles données pendant les duels, pas seulement au podium final.

**Tech Stack:** Nuxt 4, Vue 3 `<script setup>`, TypeScript, Vitest (tests déjà en place depuis le cycle précédent).

## Global Constraints

- Le questionnaire est **obligatoire** — aucun moyen de le sauter, pas de "mode classique".
- Le pipeline de détection des 300+ archétypes (`archetypeIntelligence.ts`, `fetchAndAnalyzeArchetypes`, `getCachedValidArchetypes`) reste inchangé dans le code mais n'est plus appelé par le flux de démarrage par défaut.
- Aucun calcul automatique de tags depuis les données de cartes — toutes les métadonnées (`level`, `playstyle`, `themes`, etc.) sont rédigées à la main dans `curatedArchetypes.ts`.
- `curatedArchetypes.ts` contient entre 120 et 150 entrées au total, chacune avec ≥10 cartes réelles dans l'archétype, aucune ne correspondant à un label fourre-tout générique (ex: "Roid" exclu, "Speedroid"/"Vehicroid" inclus séparément).
- Le seuil d'inclusion est **60% du score maximum atteignable** avec les réponses données ; si aucune question ne contribue au score (max = 0), tous les archétypes curés sont inclus.
- Chaque question à choix unique matchée vaut **+10 points** ; le mécanisme à éviter (question 7) vaut **-15 points** de pénalité et ne compte jamais dans le score maximum.
- Le compteur d'archétypes correspondants se recalcule après chaque réponse, avant validation.
- `npm run lint`, `npx vitest run`, `npm run build` doivent rester propres après chaque tâche.

---

### Task 1: Schéma de données + moteur de scoring (avec tests)

**Files:**
- Create: `app/data/curatedArchetypes.ts`
- Create: `app/utils/preferencesScoring.ts`
- Test: `app/utils/preferencesScoring.test.ts`

**Interfaces:**
- Produces (depuis `app/data/curatedArchetypes.ts`): types `ArchetypeLevel`, `ArchetypePlaystyle`, `ArchetypeTheme`, `DeckSpeed`, `ExtraDeckDependency`, `ArchetypeEra`, `DecisionComplexity`, `DominantMechanic`, `WinCondition`, interface `CuratedArchetypeInfo`, const `ARCHETYPE_THEMES: ArchetypeTheme[]`, const `CURATED_ARCHETYPES: Record<string, CuratedArchetypeInfo>` (vide à ce stade, peuplé aux tâches 2-5).
- Produces (depuis `app/utils/preferencesScoring.ts`): interface `QuestionnaireAnswers`, fonctions `computeMaxScore(answers: QuestionnaireAnswers): number`, `computeArchetypeScore(info: CuratedArchetypeInfo, answers: QuestionnaireAnswers): number`, `getMatchingArchetypeNames(pool: Record<string, CuratedArchetypeInfo>, answers: QuestionnaireAnswers): string[]`.

- [ ] **Step 1: Créer le schéma de données**

Create `app/data/curatedArchetypes.ts`:

```typescript
export type ArchetypeLevel = 'beginner' | 'intermediate' | 'expert'
export type ArchetypePlaystyle = 'control' | 'aggro' | 'combo' | 'midrange'
export type DeckSpeed = 'fast' | 'medium' | 'slow'
export type ExtraDeckDependency = 'low' | 'medium' | 'high'
export type ArchetypeEra = 'classic' | 'modern' | 'recent'
export type DecisionComplexity = 'linear' | 'moderate' | 'high'
export type DominantMechanic =
  | 'fusion' | 'synchro' | 'xyz' | 'link' | 'pendulum' | 'ritual'
  | 'main-deck' | 'spell-trap'
export type WinCondition = 'otk' | 'grind' | 'lockdown' | 'board-control'

/** Closed vocabulary so questionnaire options and curated data stay in sync. */
export type ArchetypeTheme =
  | 'dragon' | 'spellcaster' | 'warrior' | 'machine' | 'fiend' | 'zombie'
  | 'beast' | 'fairy' | 'aqua' | 'insect' | 'dinosaur' | 'plant' | 'rock'
  | 'thunder' | 'psychic' | 'wyrm' | 'cyberse' | 'fish' | 'winged-beast'

export const ARCHETYPE_THEMES: ArchetypeTheme[] = [
  'dragon', 'spellcaster', 'warrior', 'machine', 'fiend', 'zombie',
  'beast', 'fairy', 'aqua', 'insect', 'dinosaur', 'plant', 'rock',
  'thunder', 'psychic', 'wyrm', 'cyberse', 'fish', 'winged-beast'
]

export interface CuratedArchetypeInfo {
  level: ArchetypeLevel
  playstyle: ArchetypePlaystyle
  themes: ArchetypeTheme[]
  description: string
  deckSpeed: DeckSpeed
  extraDeckDependency: ExtraDeckDependency
  era: ArchetypeEra
  decisionComplexity: DecisionComplexity
  dominantMechanic: DominantMechanic
  keyCards: string[]
  winCondition: WinCondition
}

/**
 * Key = exact archetype name as used elsewhere in the app (same casing as
 * `capitalizeArchetypeName`/`displayArchetypeName` output — first letter
 * capitalized, rest untouched). Populated by hand across several tasks;
 * ~120-150 entries once complete.
 */
export const CURATED_ARCHETYPES: Record<string, CuratedArchetypeInfo> = {}
```

- [ ] **Step 2: Écrire les tests du moteur de scoring (ils échoueront, le module n'existe pas encore)**

Create `app/utils/preferencesScoring.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeMaxScore, computeArchetypeScore, getMatchingArchetypeNames } from './preferencesScoring'
import type { QuestionnaireAnswers } from './preferencesScoring'
import type { CuratedArchetypeInfo } from '~/data/curatedArchetypes'

function makeInfo (overrides: Partial<CuratedArchetypeInfo> = {}): CuratedArchetypeInfo {
  return {
    level: 'beginner',
    playstyle: 'aggro',
    themes: ['dragon'],
    description: 'Test archetype.',
    deckSpeed: 'fast',
    extraDeckDependency: 'low',
    era: 'classic',
    decisionComplexity: 'linear',
    dominantMechanic: 'main-deck',
    keyCards: ['Test Card'],
    winCondition: 'otk',
    ...overrides
  }
}

function emptyAnswers (): QuestionnaireAnswers {
  return { themes: [] }
}

describe('computeMaxScore', () => {
  it('is 0 when nothing is answered', () => {
    expect(computeMaxScore(emptyAnswers())).toBe(0)
  })

  it('adds 10 per answered single-choice question', () => {
    expect(computeMaxScore({ ...emptyAnswers(), level: 'beginner', playstyle: 'aggro' })).toBe(20)
  })

  it('counts themes only when at least one is selected', () => {
    expect(computeMaxScore({ ...emptyAnswers(), themes: ['dragon'] })).toBe(10)
    expect(computeMaxScore(emptyAnswers())).toBe(0)
  })

  it('does not count avoidMechanic toward the max (it is a penalty-only question)', () => {
    expect(computeMaxScore({ ...emptyAnswers(), avoidMechanic: 'link' })).toBe(0)
  })

  it('sums all seven scoring questions when fully answered', () => {
    const answers: QuestionnaireAnswers = {
      level: 'expert',
      playstyle: 'control',
      themes: ['dragon'],
      deckSpeed: 'slow',
      extraDeckDependency: 'high',
      era: 'recent',
      winCondition: 'grind',
      avoidMechanic: 'link'
    }
    expect(computeMaxScore(answers)).toBe(70)
  })
})

describe('computeArchetypeScore', () => {
  it('scores 0 against an empty answer set', () => {
    expect(computeArchetypeScore(makeInfo(), emptyAnswers())).toBe(0)
  })

  it('adds 10 when a field matches, 0 when it does not', () => {
    const info = makeInfo({ level: 'expert' })
    expect(computeArchetypeScore(info, { ...emptyAnswers(), level: 'expert' })).toBe(10)
    expect(computeArchetypeScore(info, { ...emptyAnswers(), level: 'beginner' })).toBe(0)
  })

  it('matches themes on any overlap', () => {
    const info = makeInfo({ themes: ['dragon', 'warrior'] })
    expect(computeArchetypeScore(info, { ...emptyAnswers(), themes: ['warrior', 'machine'] })).toBe(10)
    expect(computeArchetypeScore(info, { ...emptyAnswers(), themes: ['machine'] })).toBe(0)
  })

  it('subtracts 15 when the avoided mechanic matches', () => {
    const info = makeInfo({ dominantMechanic: 'link' })
    expect(computeArchetypeScore(info, { ...emptyAnswers(), avoidMechanic: 'link' })).toBe(-15)
  })

  it('does not penalize when the avoided mechanic does not match', () => {
    const info = makeInfo({ dominantMechanic: 'fusion' })
    expect(computeArchetypeScore(info, { ...emptyAnswers(), avoidMechanic: 'link' })).toBe(0)
  })

  it('sums multiple matching dimensions', () => {
    const info = makeInfo({ level: 'expert', playstyle: 'control' })
    const answers: QuestionnaireAnswers = { ...emptyAnswers(), level: 'expert', playstyle: 'control' }
    expect(computeArchetypeScore(info, answers)).toBe(20)
  })
})

describe('getMatchingArchetypeNames', () => {
  it('returns every archetype when no question is answered', () => {
    const pool = { A: makeInfo(), B: makeInfo({ level: 'expert' }) }
    expect(getMatchingArchetypeNames(pool, emptyAnswers()).sort()).toEqual(['A', 'B'])
  })

  it('keeps only archetypes at or above 60% of the max score', () => {
    const pool = {
      Full: makeInfo({ level: 'expert', playstyle: 'control' }),
      Partial: makeInfo({ level: 'expert', playstyle: 'aggro' }),
      None: makeInfo({ level: 'beginner', playstyle: 'aggro' })
    }
    const answers: QuestionnaireAnswers = { ...emptyAnswers(), level: 'expert', playstyle: 'control' }
    // max = 20, threshold = 12 → Full scores 20 (kept), Partial scores 10 (dropped), None scores 0 (dropped)
    expect(getMatchingArchetypeNames(pool, answers)).toEqual(['Full'])
  })

  it('lets a penalty drop an archetype below the threshold', () => {
    const pool = {
      Avoided: makeInfo({ level: 'expert', dominantMechanic: 'link' }),
      Kept: makeInfo({ level: 'expert', dominantMechanic: 'fusion' })
    }
    const answers: QuestionnaireAnswers = { ...emptyAnswers(), level: 'expert', avoidMechanic: 'link' }
    // max = 10, threshold = 6 → Avoided scores 10-15=-5 (dropped), Kept scores 10 (kept)
    expect(getMatchingArchetypeNames(pool, answers)).toEqual(['Kept'])
  })
})
```

- [ ] **Step 3: Vérifier que les tests échouent (module manquant)**

Run: `npx vitest run app/utils/preferencesScoring.test.ts`
Expected: FAIL — `Cannot find module './preferencesScoring'`

- [ ] **Step 4: Implémenter le moteur de scoring**

Create `app/utils/preferencesScoring.ts`:

```typescript
import type {
  CuratedArchetypeInfo, ArchetypeLevel, ArchetypePlaystyle, ArchetypeTheme,
  DeckSpeed, ExtraDeckDependency, ArchetypeEra, DominantMechanic, WinCondition
} from '~/data/curatedArchetypes'

export interface QuestionnaireAnswers {
  level?: ArchetypeLevel
  playstyle?: ArchetypePlaystyle
  themes: ArchetypeTheme[]
  deckSpeed?: DeckSpeed
  extraDeckDependency?: ExtraDeckDependency
  era?: ArchetypeEra
  avoidMechanic?: DominantMechanic
  winCondition?: WinCondition
}

const MATCH_POINTS = 10
const AVOID_PENALTY = 15
const THRESHOLD_RATIO = 0.6

/** Max score achievable given which questions have been answered. */
export function computeMaxScore (answers: QuestionnaireAnswers): number {
  let max = 0
  if (answers.level) max += MATCH_POINTS
  if (answers.playstyle) max += MATCH_POINTS
  if (answers.themes.length > 0) max += MATCH_POINTS
  if (answers.deckSpeed) max += MATCH_POINTS
  if (answers.extraDeckDependency) max += MATCH_POINTS
  if (answers.era) max += MATCH_POINTS
  if (answers.winCondition) max += MATCH_POINTS
  return max
}

/** Score of one archetype against the given answers (can be negative). */
export function computeArchetypeScore (info: CuratedArchetypeInfo, answers: QuestionnaireAnswers): number {
  let score = 0
  if (answers.level && info.level === answers.level) score += MATCH_POINTS
  if (answers.playstyle && info.playstyle === answers.playstyle) score += MATCH_POINTS
  if (answers.themes.length > 0 && answers.themes.some(theme => info.themes.includes(theme))) score += MATCH_POINTS
  if (answers.deckSpeed && info.deckSpeed === answers.deckSpeed) score += MATCH_POINTS
  if (answers.extraDeckDependency && info.extraDeckDependency === answers.extraDeckDependency) score += MATCH_POINTS
  if (answers.era && info.era === answers.era) score += MATCH_POINTS
  if (answers.winCondition && info.winCondition === answers.winCondition) score += MATCH_POINTS
  if (answers.avoidMechanic && info.dominantMechanic === answers.avoidMechanic) score -= AVOID_PENALTY
  return score
}

/**
 * Names of archetypes in `pool` whose score is at or above 60% of the max
 * achievable score. When no question contributes to the score (max = 0),
 * every archetype in the pool is returned.
 */
export function getMatchingArchetypeNames (
  pool: Record<string, CuratedArchetypeInfo>,
  answers: QuestionnaireAnswers
): string[] {
  const maxScore = computeMaxScore(answers)
  if (maxScore === 0) return Object.keys(pool)
  const threshold = maxScore * THRESHOLD_RATIO
  return Object.entries(pool)
    .filter(([, info]) => computeArchetypeScore(info, answers) >= threshold)
    .map(([name]) => name)
}
```

- [ ] **Step 5: Vérifier que les tests passent**

Run: `npx vitest run app/utils/preferencesScoring.test.ts`
Expected: PASS — 14 tests passing.

- [ ] **Step 6: Vérifier le build et le lint**

Run: `npm run build && npm run lint`
Expected: build réussi, 0 erreur de lint.

- [ ] **Step 7: Commit**

```bash
git add app/data/curatedArchetypes.ts app/utils/preferencesScoring.ts app/utils/preferencesScoring.test.ts
git commit -m "feat: schéma de données curées + moteur de scoring du questionnaire"
```

---

### Task 2: Contenu curé — lot A (archétypes classiques, ~35 entrées)

**Files:**
- Modify: `app/data/curatedArchetypes.ts` (ajout d'entrées dans `CURATED_ARCHETYPES`, aucun changement de type)

**Interfaces:**
- Consumes: `CuratedArchetypeInfo`, `ArchetypeTheme` (Task 1) — chaque entrée ajoutée doit respecter exactement ce schéma.

**Règles de curation (rappel, s'appliquent à toutes les tâches de contenu) :**
- ≥10 cartes au total dans l'archétype (vérifiable via l'API YGOPRODeck, champ `archetype`).
- Jamais de label fourre-tout générique regroupant plusieurs archétypes réels distincts (ex: ne jamais ajouter "Roid" lui-même ; ajouter "Speedroid", "Vehicroid", etc. séparément s'ils sont dans la liste).
- `themes` utilise exclusivement les valeurs de `ArchetypeTheme` (liste fermée définie dans `curatedArchetypes.ts` — pas de valeur libre).
- `keyCards` : 2-4 noms de cartes réels et exacts (vérifiables sur YGOPRODeck).
- `description` : 2-3 phrases en anglais (l'app est actuellement tout en anglais pour son contenu, cf. `app/utils/i18n.ts`), qui aide un joueur à se projeter sur le style de l'archétype.
- La clé de l'objet = nom exact de l'archétype, première lettre en majuscule, reste inchangé (ex: `'Blue-Eyes'`, pas `'blue-eyes'` ni `'BLUE-EYES'`).

**Deux exemples entièrement rédigés (respecter ce niveau de détail et ce ton) :**

```typescript
'Blue-Eyes': {
  level: 'beginner',
  playstyle: 'aggro',
  themes: ['dragon'],
  description: 'The most iconic dragon deck in Yu-Gi-Oh!, built around very high-ATK monsters and straightforward Fusion Summons into powerful multi-headed dragons. Easy to pick up, hard to out-muscle.',
  deckSpeed: 'medium',
  extraDeckDependency: 'medium',
  era: 'classic',
  decisionComplexity: 'linear',
  dominantMechanic: 'fusion',
  keyCards: ['Blue-Eyes White Dragon', 'Blue-Eyes Ultimate Dragon', 'Neo Tachyon Dragon'],
  winCondition: 'board-control'
},
'Eldlich': {
  level: 'intermediate',
  playstyle: 'control',
  themes: ['zombie'],
  description: 'A patient control deck that stockpiles field cards to overwhelm opponents with recurring zombies and traps, punishing decks that rush in without a plan.',
  deckSpeed: 'slow',
  extraDeckDependency: 'low',
  era: 'modern',
  decisionComplexity: 'moderate',
  dominantMechanic: 'main-deck',
  keyCards: ['Eldlich the Golden Lord', 'Eldlixir of Scarlet Sanguine', 'Golden Land Forever'],
  winCondition: 'grind'
}
```

- [ ] **Step 1: Ajouter ~35 entrées d'archétypes classiques/reconnus**

Liste de départ suggérée (ajuster si un nom ne respecte pas les règles de curation ci-dessus — vérifier via l'API avant d'écarter/remplacer) : Blue-Eyes, Red-Eyes, Dark Magician, Elemental Hero, Cyber Dragon, Six Samurai, Harpie, Gladiator Beast, Gravekeeper's, Photon, Lightsworn, Mermail, Fire Fist, Shaddoll, Qliphort, Burning Abyss, Nekroz, Kozmo, Yosenju, Zoodiac, Trickstar, Orcust, Dinomist, Subterror, Metalfoes, Altergeist, Sky Striker, SPYRAL, Ancient Gear, Blackwing, Karakuri, Evilswarm, Constellar, Naturia, Madolche.

Pour chaque archétype : vérifier via YGOPRODeck (`https://db.ygoprodeck.com/api/v7/cardinfo.php?archetype=<name>`, ou connaissance directe des cartes) qu'il a ≥10 cartes et n'est pas un fourre-tout, puis ajouter une entrée complète (11 champs) dans `CURATED_ARCHETYPES`, au même niveau de qualité que les deux exemples ci-dessus.

- [ ] **Step 2: Vérifier que le fichier reste valide TypeScript**

Run: `npx vue-tsc --noEmit` (ou `npm run build`, qui type-check en interne)
Expected: aucune erreur de type (chaque entrée doit correspondre exactement à `CuratedArchetypeInfo` — `themes` et `dominantMechanic` sont les champs les plus faciles à mal typer, vérifier qu'ils utilisent uniquement les valeurs des unions définies).

- [ ] **Step 3: Vérifier que la suite de tests existante passe toujours**

Run: `npx vitest run`
Expected: tous les tests passent (ce lot n'ajoute aucun test, il ne doit rien casser).

- [ ] **Step 4: Compter les entrées ajoutées**

Run: `node -e "const {CURATED_ARCHETYPES} = require('./app/data/curatedArchetypes.ts'); console.log(Object.keys(CURATED_ARCHETYPES).length)"` — si cette commande échoue à cause du TypeScript natif, utiliser à la place une recherche simple : `grep -c "^  '" app/data/curatedArchetypes.ts` (compte les lignes de clé d'entrée) pour confirmer visuellement le nombre d'entrées ajoutées (~35).

- [ ] **Step 5: Commit**

```bash
git add app/data/curatedArchetypes.ts
git commit -m "content: ajoute ~35 archétypes curés (lot A — classiques)"
```

---

### Task 3: Contenu curé — lot B (archétypes modernes, ~35 entrées)

**Files:**
- Modify: `app/data/curatedArchetypes.ts`

**Interfaces:**
- Consumes: identique à la Task 2.

Mêmes règles de curation que la Task 2. Mêmes deux exemples de référence pour le ton/format (déjà présents dans le fichier depuis la Task 2, ne pas les dupliquer).

- [ ] **Step 1: Ajouter ~35 entrées d'archétypes modernes/récents**

Liste de départ suggérée (ajuster si besoin, éviter tout doublon avec le lot A) : Salamangreat, Eldlich (déjà ajouté à la Task 1 en exemple — ne pas dupliquer), Tri-Brigade, Virtual World, Drytron, Prank-Kids, Scareclaw, Rescue-ACE, Kashtira, Purrely, Tearlaments, Springans, Branded, Spright, Floowandereeze, Ghoti, Live☆Twin, Fiendsmith, Vanquish Soul, White Forest, Voiceless Voice, Lab, Snake-Eye, Yubel, Bystial, Vaylantz, Centur-Ion, World Chalice, Lyrilusc, Prophecy, Timelord, Neo-Spacian, Igknight, Fire King, Mayakashi.

Même processus que Task 2 Step 1 : vérifier chaque nom, écrire les 11 champs.

- [ ] **Step 2: Vérifier le typage**

Run: `npm run build`
Expected: succès, aucune erreur de type.

- [ ] **Step 3: Vérifier la suite de tests**

Run: `npx vitest run`
Expected: tous les tests passent.

- [ ] **Step 4: Commit**

```bash
git add app/data/curatedArchetypes.ts
git commit -m "content: ajoute ~35 archétypes curés (lot B — modernes)"
```

---

### Task 4: Contenu curé — lot C (archétypes de niche mais réels, ~35 entrées)

**Files:**
- Modify: `app/data/curatedArchetypes.ts`

**Interfaces:**
- Consumes: identique à la Task 2.

Mêmes règles de curation. **Attention particulière à la règle anti-fourre-tout** sur ce lot : il inclut délibérément des archétypes qui sont souvent confondus avec un groupe générique (Speedroid/Vehicroid vs "Roid", etc.) — vérifier via l'API que chaque nom est bien un archétype officiel distinct (`card.archetype` exact), pas une famille de cartes qui n'a jamais son propre nom d'archétype officiel.

- [ ] **Step 1: Ajouter ~35 entrées d'archétypes de niche**

Liste de départ suggérée : Speedroid, Vehicroid, Gimmick Puppet, Ojama, Genex, Yang Zing, Amazoness, Fabled, Infernity, Morphtronic, Geargia, Battlin' Boxer, Volcanic, Ally of Justice, Dogmatika, Adamancipator, Aromage, Cubic, Danger!, Dracoslayer, Frightfur, Ghostrick, Icejade, Invoked, Magical Musket, Mekk-Knight, Performapal, Phantom Knights, Cyberdark, D/D, Deskbot, Ice Barrier, Shiranui, Bujin, Chronomaly.

Même processus. Si un nom de la liste s'avère être un fourre-tout générique (pas d'entrée `archetype` officielle à ce nom précis dans l'API), le remplacer par un archétype réel équivalent de la même famille thématique.

- [ ] **Step 2: Vérifier le typage**

Run: `npm run build`
Expected: succès.

- [ ] **Step 3: Vérifier la suite de tests**

Run: `npx vitest run`
Expected: tous les tests passent.

- [ ] **Step 4: Commit**

```bash
git add app/data/curatedArchetypes.ts
git commit -m "content: ajoute ~35 archétypes curés (lot C — niche)"
```

---

### Task 5: Contenu curé — lot D (complément jusqu'à 120-150 entrées)

**Files:**
- Modify: `app/data/curatedArchetypes.ts`

**Interfaces:**
- Consumes: identique à la Task 2.

- [ ] **Step 1: Compter les entrées actuelles**

Run: `grep -c "^  '" app/data/curatedArchetypes.ts`
Noter le total (attendu ~105 après les tâches 2-4, en comptant les 2 exemples de la Task 1).

- [ ] **Step 2: Ajouter des entrées jusqu'à atteindre 120-150 au total**

Liste de départ suggérée pour compléter (ajuster le nombre pris dans cette liste selon le compte du Step 1, pour atterrir entre 120 et 150 au total) : Crystal Beast, Digital Bug, Dark World, Demise, Herald, Gogogo, Gouki, Guardragon, Hieratic, Traptrix, Windwitch, Witchcrafter, X-Saber, Zefra, Superheavy Samurai, Mathmech, Melffy, Melodious, Onomat, Paleozoic, Plunder Patroll, Runick, Therion, Tenyi, True King, Ursarctic, Utopia, Ancient Warriors, Dark Contract, Dracoverlord, Elder Entity, Empowered Warrior, Exosister, Generaider, Herald.

Même processus (vérification ≥10 cartes, pas de fourre-tout, 11 champs complets) que les tâches précédentes.

- [ ] **Step 3: Vérifier le total final**

Run: `grep -c "^  '" app/data/curatedArchetypes.ts`
Expected: entre 120 et 150.

- [ ] **Step 4: Vérifier le typage et les tests**

Run: `npm run build && npx vitest run`
Expected: build réussi, tous les tests passent.

- [ ] **Step 5: Commit**

```bash
git add app/data/curatedArchetypes.ts
git commit -m "content: ajoute le lot D d'archétypes curés (complément final)"
```

---

### Task 6: Composant `PreferencesQuestionnaire.vue`

**Files:**
- Create: `app/components/questionnaire/PreferencesQuestionnaire.vue`

**Interfaces:**
- Consumes: `CURATED_ARCHETYPES`, `ARCHETYPE_THEMES` et les types de `~/data/curatedArchetypes`; `getMatchingArchetypeNames`, `QuestionnaireAnswers` de `~/utils/preferencesScoring`; `t` de `~/utils/i18n`.
- Produces: composant auto-enregistré `<PreferencesQuestionnaire>` (Nuxt auto-import, `pathPrefix: false` déjà configuré dans `nuxt.config.ts` pour tout `app/components/`), emit `confirm: [names: string[]]`.

- [ ] **Step 1: Créer le composant**

Create `app/components/questionnaire/PreferencesQuestionnaire.vue`:

```vue
<script setup lang="ts">
import {
  CURATED_ARCHETYPES, ARCHETYPE_THEMES,
  type ArchetypeLevel, type ArchetypePlaystyle, type DeckSpeed,
  type ExtraDeckDependency, type ArchetypeEra, type DominantMechanic,
  type WinCondition
} from '~/data/curatedArchetypes'
import { getMatchingArchetypeNames, type QuestionnaireAnswers } from '~/utils/preferencesScoring'
import { t } from '~/utils/i18n'

const i = (key: string) => t(key, 'en')
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
```

- [ ] **Step 2: Vérifier le build et le lint**

Run: `npm run build && npm run lint`
Expected: build réussi, 0 erreur de lint.

- [ ] **Step 3: Commit**

```bash
git add app/components/questionnaire/PreferencesQuestionnaire.vue
git commit -m "feat: composant PreferencesQuestionnaire avec compteur en direct"
```

---

### Task 7: Câbler le questionnaire dans le flux de démarrage

**Files:**
- Modify: `app/composables/useTournamentState.ts`
- Modify: `app/pages/index.vue`

**Interfaces:**
- Consumes: `<PreferencesQuestionnaire>` (Task 6, emit `confirm: [names: string[]]`); `createInitialState`, `capitalizeArchetypeName` (déjà existants, inchangés).
- Produces: nouvelle fonction exposée par `useTournamentState()` : `startTournamentWithPool(names: string[]): Promise<void>`.

- [ ] **Step 1: Ajouter `startTournamentWithPool` à `useTournamentState.ts`**

In `app/composables/useTournamentState.ts`, add this new function right after `loadFromApi` (around line 79, before `setNextMatch`):

```typescript
  /** Démarre un tournoi directement sur un pool donné (questionnaire de préférences),
   *  sans passer par le pipeline de détection des 300+ archétypes. */
  async function loadFromPool (names: string[]) {
    error.value = null
    const seed = Math.floor(Math.random() * 1e6)
    state.value = createInitialState(names.map(capitalizeArchetypeName), seed)
    await setNextMatch()
    prefetchNextGroup()
    persistState(state.value!)
  }
```

Then, near the bottom of the file, add a new exported function mirroring `startTournament`'s error/loading/timeout handling but calling `loadFromPool` instead of `loadFromApi`. Insert it right after the existing `startTournament` function (after its closing brace, before `function restart`):

```typescript
  async function startTournamentWithPool (names: string[]) {
    loading.value = true
    error.value = null
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error('Loading took too long. Try again (slow connection or busy API).')),
        START_TIMEOUT_MS
      )
    })
    try {
      await Promise.race([loadFromPool(names), timeoutPromise])
    } catch (e) {
      error.value = (e as Error)?.message ?? 'An error occurred. Please try again.'
    } finally {
      loading.value = false
    }
  }
```

Finally, add `startTournamentWithPool` to the `return { ... }` object at the bottom of the composable, right after `startTournament,`:

```typescript
    startTournament,
    startTournamentWithPool,
```

- [ ] **Step 2: Câbler `index.vue` sur le nouveau flux**

In `app/pages/index.vue`, in the `<script setup>` destructuring of `useTournamentState()`, add `startTournamentWithPool` next to `startTournament` (keep `startTournament` in the destructure even though it's no longer called from the template — it stays part of the composable's public surface for potential future use, per the plan's constraint that the existing pipeline stays in the code):

```typescript
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
```

Replace the `<StartScreen ... />` line in the template with:

```vue
      <PreferencesQuestionnaire v-else-if="!state && !loading" @confirm="startTournamentWithPool" />
```

- [ ] **Step 3: Vérifier le build**

Run: `npm run build`
Expected: succès (TypeScript doit accepter `startTournamentWithPool` avec la signature `(names: string[]) => Promise<void>` correspondant à l'emit `confirm: [names: string[]]`).

- [ ] **Step 4: Vérification manuelle**

Run: `npm run dev`, ouvrir l'app dans un navigateur. Vérifier : le questionnaire s'affiche au chargement (plus l'écran d'accueil `StartScreen`), répondre aux 8 questions, observer le compteur changer, valider, confirmer que le tournoi démarre avec un pool restreint aux archétypes curés retenus (les noms affichés en phase 1 doivent tous provenir de `CURATED_ARCHETYPES`).

- [ ] **Step 5: Commit**

```bash
git add app/composables/useTournamentState.ts app/pages/index.vue
git commit -m "feat: câble le questionnaire de préférences dans le flux de démarrage"
```

---

### Task 8: Enrichir `ArchetypeModal.vue` avec les données curées

**Files:**
- Modify: `app/components/tournament/ArchetypeModal.vue`

**Interfaces:**
- Consumes: `CURATED_ARCHETYPES` de `~/data/curatedArchetypes` (Task 1+).

- [ ] **Step 1: Ajouter le computed de lookup**

In `app/components/tournament/ArchetypeModal.vue`, add this import at the top of `<script setup>`, alongside the existing imports:

```typescript
import { CURATED_ARCHETYPES } from '~/data/curatedArchetypes'
```

Add this computed right after `const props = defineProps<{ name: string | null }>()`:

```typescript
const curatedInfo = computed(() => (props.name ? CURATED_ARCHETYPES[props.name] : undefined))
```

- [ ] **Step 2: Afficher les données curées dans le template**

In the template, insert this block immediately after the closing `</div>` of `.archetype-modal__head` (right before `<div class="archetype-modal__body">`):

```vue
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
```

- [ ] **Step 3: Ajouter le style correspondant**

In the `<style scoped>` block, add right after the `.archetype-modal__close:focus-visible` rule (before `.archetype-modal--two-panels`):

```css
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
```

- [ ] **Step 4: Vérifier le build et le lint**

Run: `npm run build && npm run lint`
Expected: build réussi, 0 erreur de lint.

- [ ] **Step 5: Vérification manuelle**

Run: `npm run dev`, jouer un tournoi jusqu'à un archétype curé, ouvrir sa modal (podium ou top 10), confirmer que la description, les tags et les cartes clés s'affichent correctement sous l'en-tête.

- [ ] **Step 6: Commit**

```bash
git add app/components/tournament/ArchetypeModal.vue
git commit -m "feat: affiche les données curées (description, tags, cartes clés) dans ArchetypeModal"
```

---

### Task 9: Bouton "i" pendant les duels

**Files:**
- Modify: `app/components/ArchetypeCard.vue`
- Modify: `app/components/tournament/MatchBoard.vue`

**Interfaces:**
- Consumes (`MatchBoard.vue`): `<ArchetypeCard>` avec la nouvelle prop `show-info` et le nouvel emit `info`; `<ArchetypeModal>` (déjà existant, réutilisé ici avec un état local séparé de celui de `index.vue`).
- Produces (`ArchetypeCard.vue`): prop `showInfo?: boolean`, emit `info: []`.

- [ ] **Step 1: Ajouter le bouton "i" à `ArchetypeCard.vue`**

In `app/components/ArchetypeCard.vue`, add `showInfo?: boolean` to the `defineProps` block:

```typescript
const props = defineProps<{
  name: string
  imageUrl?: string
  selected?: boolean
  showElo?: boolean
  elo?: number
  cardType?: string
  extraPolicy?: ExtraPolicy
  showCardBack?: boolean
  showInfo?: boolean
}>()
```

Add `info` to `defineEmits`:

```typescript
const emit = defineEmits<{
  select: []
  info: []
}>()
```

In the template, add this button right after the opening `<div class="ac" :class="{ 'ac--selected': selected }">` tag, as a sibling of `.ac__btn` (not inside it, so it doesn't trigger `select` on click):

```vue
    <button
      v-if="showInfo"
      type="button"
      class="ac__info"
      aria-label="Archetype details"
      @click.stop="emit('info')"
    >
      i
    </button>
```

Add this CSS to the `<style scoped>` block, right after the `.ac` rule:

```css
.ac__info {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  z-index: 2;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-style: italic;
  font-weight: 700;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.ac__info:hover {
  color: var(--accent);
  border-color: var(--accent-dim);
}
```

Since `.ac__info` uses `position: absolute`, verify the existing `.ac` rule has `position: relative` (check the current CSS — if it doesn't, add `position: relative;` to `.ac` so the button anchors to the card, not the page).

- [ ] **Step 2: Câbler l'état local d'info dans `MatchBoard.vue`**

In `app/components/tournament/MatchBoard.vue`, add this ref right after `const selectedCard = ref<string | null>(null)`:

```typescript
const infoArchetypeName = ref<string | null>(null)
```

Add `show-info="true"` and `@info="infoArchetypeName = <name>"` to each of the three `<ArchetypeCard>` usages in the template:

For the duel-mode left card:
```vue
            <ArchetypeCard
              :name="displayArchetypeName(duelLeft)"
              :image-url="getCurrentRepresentative(duelLeft)?.imageUrl"
              :card-type="getCurrentRepresentative(duelLeft)?.displayType"
              :selected="selectedCard === duelLeft"
              :show-elo="true"
              :elo="state?.archetypes[duelLeft]?.elo ?? 1000"
              :show-card-back="showCardBack(duelLeft)"
              :extra-policy="state?.archetypes[duelLeft]?.extraPolicy"
              :show-info="true"
              @select="selectDuel(duelLeft)"
              @info="infoArchetypeName = duelLeft"
            />
```

For the duel-mode right card (same pattern, `duelRight`):
```vue
            <ArchetypeCard
              :name="displayArchetypeName(duelRight)"
              :image-url="getCurrentRepresentative(duelRight)?.imageUrl"
              :card-type="getCurrentRepresentative(duelRight)?.displayType"
              :selected="selectedCard === duelRight"
              :show-elo="true"
              :elo="state?.archetypes[duelRight]?.elo ?? 1000"
              :show-card-back="showCardBack(duelRight)"
              :extra-policy="state?.archetypes[duelRight]?.extraPolicy"
              :show-info="true"
              @select="selectDuel(duelRight)"
              @info="infoArchetypeName = duelRight"
            />
```

For the group-mode grid card (`v-for="name in state?.currentMatch"`):
```vue
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
            :show-info="true"
            @select="selectGroup(name)"
            @info="infoArchetypeName = name"
          />
```

Add `<ArchetypeModal>` at the end of the template, as the last child inside the outer `<div v-if="isGroupMode || isDuelMode" key="duel-wrap" class="duel-wrap">`, right after the closing `</Transition>` tag and before the closing `</div>`:

```vue
    <ArchetypeModal :name="infoArchetypeName" @close="infoArchetypeName = null" />
```

- [ ] **Step 3: Vérifier le build et le lint**

Run: `npm run build && npm run lint`
Expected: build réussi, 0 erreur de lint.

- [ ] **Step 4: Vérification manuelle**

Run: `npm run dev`, démarrer un tournoi, en phase 1 (mode groupe) cliquer sur le bouton "i" d'une carte : vérifier que la modal d'archétype s'ouvre sans sélectionner/valider ce duel (le clic sur "i" ne doit pas déclencher `pick-group`), que fermer la modal revient au duel en cours sans l'avoir affecté. Répéter en phase 3 (mode duel 1v1) si possible.

- [ ] **Step 5: Commit**

```bash
git add app/components/ArchetypeCard.vue app/components/tournament/MatchBoard.vue
git commit -m "feat: bouton info sur ArchetypeCard, accessible pendant les duels"
```

---

### Task 10: Vérification finale

**Files:** aucun nouveau fichier — vérification uniquement.

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: 0 erreur.

- [ ] **Step 2: Tests**

Run: `npx vitest run`
Expected: tous les tests passent (les 40 tests précédents + les 14 nouveaux de `preferencesScoring.test.ts` = 54 tests).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: succès.

- [ ] **Step 4: Vérifier le nombre d'archétypes curés**

Run: `grep -c "^  '" app/data/curatedArchetypes.ts`
Expected: entre 120 et 150.

- [ ] **Step 5: Test manuel de bout en bout**

Run: `npm run dev`. Parcourir : chargement de l'app → questionnaire (répondre aux 8 questions, observer le compteur évoluer) → validation → tournoi démarré uniquement sur des archétypes curés → phase 1/2 (mode groupe, bouton "i" fonctionnel) → phase 3 (mode duel, bouton "i" fonctionnel) → résultats → modal d'archétype au podium avec description/tags/cartes clés → export CSV → rejouer (le questionnaire doit réapparaître, pas l'ancien écran d'accueil).

- [ ] **Step 6: Commit final si des ajustements ont été nécessaires**

```bash
git add -A
git commit -m "chore: nettoyage final post-questionnaire (lint, ajustements)"
```

Ne créer ce commit que s'il y a effectivement des changements (`git status` non vide) — sinon, passer directement à la fin.
