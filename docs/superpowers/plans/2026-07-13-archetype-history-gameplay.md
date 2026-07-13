# Extension du pool curaté + historique et gameplay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Étendre `app/data/curatedArchetypes.ts` pour couvrir tous les archétypes réels et jouables détectés via l'endpoint `archetypes.php` de YGOPRODeck (au lieu des 131 actuels), et enrichir chaque entrée (nouvelle et existante) avec une année de sortie réelle, un contexte historique, un lore optionnel et un paragraphe de gameplay détaillé — puis réorganiser `ArchetypeModal.vue` pour afficher ce contenu.

**Architecture:** Un script one-off (`scripts/extract-archetype-candidates.mjs`) interroge `archetypes.php` puis `cardinfo.php?archetype=<nom>` pour produire un fichier JSON de candidats filtrés (≥10 cartes, diffés contre les clés déjà curatées). Le schéma `CuratedArchetypeInfo` gagne 4 champs (`releaseYear`, `releaseContext`, `lore?`, `gameplay`) d'abord en optionnel le temps de la rédaction par lots, puis verrouillés en requis (et `era` supprimé, remplacé par `deriveEra(releaseYear)` dans `app/utils/preferencesScoring.ts`) une fois toutes les entrées enrichies. `ArchetypeModal.vue` est réorganisée en 3 sections (Overview/Historique/Gameplay) dans une tâche finale, une fois le schéma verrouillé.

**Tech Stack:** Nuxt 4, Vue 3 `<script setup>`, TypeScript, Vitest, Node.js (script one-off, pas de dépendance Nuxt).

## Global Constraints

- Aucune modification du questionnaire au-delà de la lecture de `era` dérivé au lieu d'un champ stocké — le nombre de questions, le seuil (60%), les points (+10/-15) restent inchangés.
- Aucune modification du système de duels/matchmaking.
- Aucun nouveau point d'entrée de navigation en dehors de la modal existante.
- Le pipeline `archetypeIntelligence.ts`/`useYgoApi.ts` reste inchangé et n'est pas impliqué dans ce cycle.
- Pas de synchronisation continue entre le fichier curaté et l'API — extraction ponctuelle uniquement (Task 1), pas de test comparant en continu.
- `releaseYear` : année réelle de première sortie TCG, jamais inventée — préférer une année approximative mais défendable.
- `releaseContext` : 2-4 phrases, faits réels et vérifiables, rempli pour toutes les entrées sans exception.
- `lore` : optionnel, rempli uniquement si l'archétype apparaît réellement dans l'anime/manga ; absent sinon (pas de placeholder vide).
- `gameplay` : 2-4 phrases sur le déroulement concret d'un tour type, pas une reformulation de `description`.
- Nouvelles entrées : mêmes règles de curation que le cycle précédent — ≥10 cartes réelles, jamais de label fourre-tout générique, `themes` limité à l'union fermée `ArchetypeTheme` (extensible si un thème réel manque), `keyCards` = 2-4 noms de cartes réels et vérifiables.
- `npm run lint`, `npx vitest run`, `npm run build` doivent rester propres après chaque tâche.

---

### Task 1: Script d'extraction des archétypes candidats

**Files:**
- Create: `scripts/extract-archetype-candidates.mjs`
- Create (généré par le script, pas écrit à la main): `docs/superpowers/plans/2026-07-13-archetype-candidates.json`

**Interfaces:**
- Produces: le fichier JSON `2026-07-13-archetype-candidates.json`, un tableau trié alphabétiquement d'objets `{ "name": string, "cardCount": number }` — c'est la liste des noms candidats (présents dans `archetypes.php`, ≥10 cartes, absents de `CURATED_ARCHETYPES`) que les tâches 6 à 9 consommeront.

- [ ] **Step 1: Créer le script d'extraction**

Create `scripts/extract-archetype-candidates.mjs`:

```js
// One-off script: no Nuxt/TS build needed, run with `node scripts/extract-archetype-candidates.mjs`.
// Fetches YGOPRODeck's archetype list, filters to real/playable archetypes (>=10 cards),
// diffs against app/data/curatedArchetypes.ts, and writes the candidate list to disk.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CURATED_FILE = join(ROOT, 'app/data/curatedArchetypes.ts')
const OUTPUT_FILE = join(ROOT, 'docs/superpowers/plans/2026-07-13-archetype-candidates.json')

const ARCHETYPES_URL = 'https://db.ygoprodeck.com/api/v7/archetypes.php'
const CARDINFO_URL = 'https://db.ygoprodeck.com/api/v7/cardinfo.php'
const MIN_CARDS = 10
const DELAY_MS = 60 // ~16 req/s, safely under the 20 req/s limit

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Extracts the exact object keys already present in CURATED_ARCHETYPES (handles both quote styles). */
function extractExistingKeys (source) {
  const marker = 'export const CURATED_ARCHETYPES'
  const start = source.indexOf(marker)
  const braceStart = source.indexOf('{', start)
  const lines = source.slice(braceStart).split('\n')
  const keyRe = /^\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")\s*:\s*\{/
  const keys = new Set()
  for (const line of lines) {
    const m = line.match(keyRe)
    if (m) keys.add((m[1] ?? m[2]).replace(/\\'/g, "'"))
  }
  return keys
}

async function fetchAllArchetypeNames () {
  const res = await fetch(ARCHETYPES_URL)
  const data = await res.json()
  return data.map(entry => entry.archetype_name)
}

async function countCardsForArchetype (name) {
  const url = `${CARDINFO_URL}?archetype=${encodeURIComponent(name)}&format=tcg`
  try {
    const res = await fetch(url)
    if (!res.ok) return 0
    const json = await res.json()
    return Array.isArray(json?.data) ? json.data.length : 0
  } catch {
    return 0
  }
}

async function main () {
  const existingKeys = extractExistingKeys(readFileSync(CURATED_FILE, 'utf8'))
  console.log(`Existing curated entries: ${existingKeys.size}`)

  const allNames = await fetchAllArchetypeNames()
  console.log(`Fetched ${allNames.length} raw archetype names from archetypes.php`)

  const candidates = []
  for (const name of allNames) {
    if (existingKeys.has(name)) continue
    const cardCount = await countCardsForArchetype(name)
    if (cardCount >= MIN_CARDS) {
      candidates.push({ name, cardCount })
    }
    await sleep(DELAY_MS)
  }

  candidates.sort((a, b) => a.name.localeCompare(b.name))
  writeFileSync(OUTPUT_FILE, JSON.stringify(candidates, null, 2) + '\n')
  console.log(`Wrote ${candidates.length} candidates to ${OUTPUT_FILE}`)
}

main()
```

- [ ] **Step 2: Exécuter le script**

Run: `node scripts/extract-archetype-candidates.mjs`

Ce script fait ~646 requêtes séquentielles (une par archétype candidat non déjà curaté) avec un délai de 60ms entre chaque — prévoir plusieurs minutes d'exécution. Expected: le script se termine sans erreur et affiche un résumé du type `Wrote N candidates to .../2026-07-13-archetype-candidates.json` avec N strictement supérieur à 0 et strictement inférieur à 646.

- [ ] **Step 3: Vérifier la forme du fichier généré**

Run: `node -e "const d = require('./docs/superpowers/plans/2026-07-13-archetype-candidates.json'); console.log(d.length, d[0], d[d.length-1])"`
Expected: affiche un nombre N (le nombre de candidats), et deux objets `{ name, cardCount }` valides (premier et dernier par ordre alphabétique). Si le tableau est vide ou que l'exécution a échoué (erreur réseau, endpoint indisponible), ne pas continuer — investiguer avant de passer à la tâche suivante (ex: relancer le script, vérifier que `archetypes.php` répond toujours).

- [ ] **Step 4: Commit**

```bash
git add scripts/extract-archetype-candidates.mjs docs/superpowers/plans/2026-07-13-archetype-candidates.json
git commit -m "feat: script d'extraction des archétypes candidats via archetypes.php"
```

---

### Task 2: Schéma étendu (champs optionnels) + deriveEra()

**Files:**
- Modify: `app/data/curatedArchetypes.ts`
- Modify: `app/utils/preferencesScoring.ts`
- Modify: `app/utils/preferencesScoring.test.ts`

**Interfaces:**
- Produces (depuis `app/data/curatedArchetypes.ts`): `CuratedArchetypeInfo` gagne 4 champs optionnels : `releaseYear?: number`, `releaseContext?: string`, `lore?: string`, `gameplay?: string`. Le champ `era` n'est **pas encore retiré** dans cette tâche (il le sera à la Task 10, une fois toutes les entrées enrichies).
- Produces (depuis `app/utils/preferencesScoring.ts`): fonction `deriveEra(year: number): ArchetypeEra`. **Non câblée** dans `computeArchetypeScore` pour l'instant (ça reste à Task 10) — cette tâche ajoute la fonction et ses tests de façon isolée.

- [ ] **Step 1: Ajouter les champs optionnels à `CuratedArchetypeInfo`**

In `app/data/curatedArchetypes.ts`, replace the interface:

```ts
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
```

with:

```ts
export interface CuratedArchetypeInfo {
  level: ArchetypeLevel
  playstyle: ArchetypePlaystyle
  themes: ArchetypeTheme[]
  description: string
  deckSpeed: DeckSpeed
  extraDeckDependency: ExtraDeckDependency
  era: ArchetypeEra
  /** TCG debut year. Optional during content migration (Tasks 3-9); required once locked (Task 10). */
  releaseYear?: number
  /** 2-4 sentences: release set, competitive role, meta impact. Required for all entries once Task 10 locks the schema. */
  releaseContext?: string
  /** In-universe anime/manga context. Only present when the archetype genuinely appears there. */
  lore?: string
  /** 2-4 sentences on concrete turn-to-turn play, beyond the short `description` teaser. */
  gameplay?: string
  decisionComplexity: DecisionComplexity
  dominantMechanic: DominantMechanic
  keyCards: string[]
  winCondition: WinCondition
}
```

- [ ] **Step 2: Écrire les tests pour `deriveEra` (ils échoueront, la fonction n'existe pas encore)**

In `app/utils/preferencesScoring.test.ts`, add this new `describe` block at the end of the file:

```ts
describe('deriveEra', () => {
  it('returns classic for years before 2010', () => {
    expect(deriveEra(2009)).toBe('classic')
    expect(deriveEra(1996)).toBe('classic')
  })

  it('returns modern for years from 2010 up to (not including) 2020', () => {
    expect(deriveEra(2010)).toBe('modern')
    expect(deriveEra(2019)).toBe('modern')
  })

  it('returns recent for years from 2020 onward', () => {
    expect(deriveEra(2020)).toBe('recent')
    expect(deriveEra(2026)).toBe('recent')
  })
})
```

Update the import at the top of the file to include `deriveEra`:

```ts
import { computeMaxScore, computeArchetypeScore, getMatchingArchetypeNames, deriveEra } from './preferencesScoring'
```

- [ ] **Step 3: Vérifier que les nouveaux tests échouent**

Run: `npx vitest run app/utils/preferencesScoring.test.ts`
Expected: FAIL — `deriveEra is not exported` (ou équivalent).

- [ ] **Step 4: Implémenter `deriveEra`**

In `app/utils/preferencesScoring.ts`, add this function after the existing constants (`MATCH_POINTS`/`AVOID_PENALTY`/`THRESHOLD_RATIO`), before `computeMaxScore`:

```ts
/** Derives the display era from a real TCG release year (thresholds match the pre-existing ArchetypeEra buckets). */
export function deriveEra (year: number): ArchetypeEra {
  if (year < 2010) return 'classic'
  if (year < 2020) return 'modern'
  return 'recent'
}
```

- [ ] **Step 5: Vérifier que les tests passent**

Run: `npx vitest run app/utils/preferencesScoring.test.ts`
Expected: PASS — tous les tests, y compris les 3 nouveaux pour `deriveEra`.

- [ ] **Step 6: Vérifier le build et le lint**

Run: `npm run build && npm run lint`
Expected: build réussi, 0 erreur de lint.

- [ ] **Step 7: Commit**

```bash
git add app/data/curatedArchetypes.ts app/utils/preferencesScoring.ts app/utils/preferencesScoring.test.ts
git commit -m "feat: ajoute les champs optionnels d'historique/gameplay et deriveEra()"
```

---

### Task 3: Enrichissement des entrées existantes — lot A (44 archétypes)

**Files:**
- Modify: `app/data/curatedArchetypes.ts` (ajout des 4 nouveaux champs sur des entrées déjà existantes — aucune suppression, aucun renommage de clé)

**Interfaces:**
- Consumes: `CuratedArchetypeInfo` (Task 2) — chaque entrée modifiée doit respecter exactement ce schéma (les 4 nouveaux champs sont optionnels à ce stade, mais doivent être renseignés dès maintenant : `releaseYear`, `releaseContext`, `gameplay` non vides pour toutes les entrées de ce lot ; `lore` uniquement si pertinent).

**Liste des 44 archétypes de ce lot (ordre du fichier)** : Blue-Eyes, Eldlich, Red-Eyes, Dark Magician, Elemental HERO, Cyber Dragon, Six Samurai, Harpie, Gladiator Beast, Gravekeeper's, Photon, Lightsworn, Mermail, Fire Fist, Shaddoll, Qliphort, Burning Abyss, Nekroz, Kozmo, Yosenju, Zoodiac, Trickstar, Orcust, Dinomist, Subterror, Metalfoes, Altergeist, Sky Striker, SPYRAL, Ancient Gear, Blackwing, Karakuri, Evilswarm, Constellar, Naturia, Madolche, Salamangreat, Tri-Brigade, Virtual World, Drytron, Prank-Kids, Scareclaw, Adamancipator, Kashtira.

**Deux exemples entièrement rédigés (respecter ce niveau de détail et ce ton) :**

```ts
// Ajouts sur l'entrée 'Blue-Eyes' existante (les autres champs ne changent pas) :
releaseYear: 2002,
releaseContext: "Blue-Eyes White Dragon predates the TCG's archetype system entirely, debuting in the original 2002 Starter Deck as Kaiba's signature monster. Fusion support arrived gradually over two decades, culminating in Legendary Duelists: Magical Hero (2018) and Duel Overload (2021), which turned a nostalgia pick into a genuinely competitive Fusion beatdown deck.",
gameplay: "A typical turn floods the field with high-ATK Normal Monsters, then uses Fusion cards like Polymerization or Shard of Greed to combine them into a single overwhelming Fusion Monster. There's little hand-trap interaction to worry about — the deck wins by presenting more raw ATK than the opponent can profitably block.",

// Ajouts sur l'entrée 'Eldlich' existante :
releaseYear: 2020,
releaseContext: "Eldlich the Golden Lord debuted in Rise of the Duelist (2020) as a Rank 1-2 competitive deck built around locking down the opponent's Graveyard while recurring its own field spell. It became a fixture of the 2020-2021 format for its resilience against typical hand-trap disruption.",
gameplay: "The deck sets Golden Land Forever and repeatedly banishes it from the Graveyard to Special Summon Eldlich, refusing to commit more than one or two cards per turn. Opponents who try to grind through it on card advantage alone often find themselves locked out of their own Graveyard by Eldlixir effects.",
```

- [ ] **Step 1: Ajouter les 4 champs aux 44 entrées listées ci-dessus**

Pour chaque archétype de la liste, localiser son entrée existante dans `app/data/curatedArchetypes.ts` et y ajouter `releaseYear`, `releaseContext`, `gameplay` (et `lore` si l'archétype apparaît réellement dans l'anime/manga — c'est le cas pour Blue-Eyes, Dark Magician, Elemental HERO, Six Samurai, Harpie notamment dans ce lot). Respecter les règles de rédaction des Global Constraints (années réelles, faits vérifiables, jamais de placeholder vide pour `lore`).

- [ ] **Step 2: Vérifier le typage**

Run: `npm run build`
Expected: succès, aucune erreur de type (chaque entrée doit toujours correspondre à `CuratedArchetypeInfo` — les nouveaux champs sont optionnels donc aucune entrée non touchée ne peut casser le build).

- [ ] **Step 3: Vérifier la suite de tests existante**

Run: `npx vitest run`
Expected: tous les tests passent (ce lot n'ajoute aucun test, il ne doit rien casser).

- [ ] **Step 4: Vérifier que les 44 entrées ont bien les nouveaux champs**

Run: `node -e "
const fs = require('fs');
const src = fs.readFileSync('app/data/curatedArchetypes.ts', 'utf8');
const names = ['Blue-Eyes','Eldlich','Red-Eyes','Dark Magician','Elemental HERO','Cyber Dragon','Six Samurai','Harpie','Gladiator Beast','Gravekeeper\'s','Photon','Lightsworn','Mermail','Fire Fist','Shaddoll','Qliphort','Burning Abyss','Nekroz','Kozmo','Yosenju','Zoodiac','Trickstar','Orcust','Dinomist','Subterror','Metalfoes','Altergeist','Sky Striker','SPYRAL','Ancient Gear','Blackwing','Karakuri','Evilswarm','Constellar','Naturia','Madolche','Salamangreat','Tri-Brigade','Virtual World','Drytron','Prank-Kids','Scareclaw','Adamancipator','Kashtira'];
let missing = [];
for (const name of names) {
  const idx = src.indexOf(\`'\${name}':\`) !== -1 ? src.indexOf(\`'\${name}':\`) : src.indexOf(\`\\\"\${name}\\\":\`);
  const nextEntry = src.indexOf(\"\\n  '\", idx + 1);
  const nextEntry2 = src.indexOf('\\n  \"', idx + 1);
  const end = Math.min(...[nextEntry, nextEntry2].filter(n => n > 0));
  const block = src.slice(idx, end > 0 ? end : idx + 1000);
  if (!block.includes('releaseYear') || !block.includes('releaseContext') || !block.includes('gameplay')) missing.push(name);
}
console.log(missing.length === 0 ? 'OK: all 44 enriched' : 'MISSING FIELDS: ' + missing.join(', '));
"`
Expected: `OK: all 44 enriched`. Si des noms apparaissent dans `MISSING FIELDS`, compléter leurs entrées avant de continuer.

- [ ] **Step 5: Commit**

```bash
git add app/data/curatedArchetypes.ts
git commit -m "content: enrichit 44 archétypes existants (lot A) — historique et gameplay"
```

---

### Task 4: Enrichissement des entrées existantes — lot B (44 archétypes)

**Files:**
- Modify: `app/data/curatedArchetypes.ts`

**Interfaces:**
- Consumes: identique à la Task 3.

**Liste des 44 archétypes de ce lot** : Icejade, Tearlaments, Traptrix, Branded, Spright, Floowandereeze, Ghoti, Live☆Twin, Fiendsmith, Vanquish Soul, Mathmech, Fabled, Labrynth, Snake-Eye, Yubel, Bystial, Mekk-Knight, Gouki, World Chalice, Lyrilusc, Prophecy, Timelord, Neo-Spacian, Vendread, Fire King, Dogmatika, Speedroid, Vehicroid, Gimmick Puppet, Ojama, Genex, Yang Zing, Amazoness, Infernity, Morphtronic, Geargia, Vampire, Ally of Justice, Aromage, Cubic, Danger!, Dragunity, Frightfur, Ghostrick.

Mêmes règles et même niveau de détail que la Task 3 (voir les deux exemples de la Task 3 pour le ton/format attendu — ne pas les dupliquer, ils servent de référence).

- [ ] **Step 1: Ajouter les 4 champs aux 44 entrées listées ci-dessus**

Même processus que Task 3 Step 1, pour cette liste. `lore` s'applique notamment à Yubel, Neo-Spacian, Timelord dans ce lot (apparitions anime confirmées).

- [ ] **Step 2: Vérifier le typage**

Run: `npm run build`
Expected: succès.

- [ ] **Step 3: Vérifier la suite de tests**

Run: `npx vitest run`
Expected: tous les tests passent.

- [ ] **Step 4: Vérifier que les 44 entrées ont bien les nouveaux champs**

Run le même script de vérification que Task 3 Step 4, en remplaçant le tableau `names` par la liste de ce lot.
Expected: `OK: all 44 enriched`.

- [ ] **Step 5: Commit**

```bash
git add app/data/curatedArchetypes.ts
git commit -m "content: enrichit 44 archétypes existants (lot B) — historique et gameplay"
```

---

### Task 5: Enrichissement des entrées existantes — lot C (43 archétypes, dernier lot)

**Files:**
- Modify: `app/data/curatedArchetypes.ts`

**Interfaces:**
- Consumes: identique à la Task 3.

**Liste des 43 archétypes de ce lot** : Invoked, Magical Musket, Performapal, The Phantom Knights, Cyberdark, D/D, Deskbot, Ice Barrier, Shiranui, Bujin, Chronomaly, Batteryman, Melffy, Windwitch, Dinowrestler, Ninja, Crystal Beast, Dark World, Guardragon, Hieratic, Witchcrafter, X-Saber, Zefra, Superheavy Samurai, Melodious, Paleozoic, Plunder Patroll, Runick, Therion, Tenyi, True King, Ursarctic, Utopia, Mecha Phantom Beast, Sylvan, Gem-Knight, Tellarknight, Wind-Up, Evol, Gishki, Vylon, Battlin' Boxer, Cyber Angel.

Mêmes règles et même niveau de détail que la Task 3.

- [ ] **Step 1: Ajouter les 4 champs aux 43 entrées listées ci-dessus**

Même processus. `lore` s'applique notamment à Utopia (Yu-Gi-Oh! ZEXAL) dans ce lot.

- [ ] **Step 2: Vérifier le typage**

Run: `npm run build`
Expected: succès.

- [ ] **Step 3: Vérifier la suite de tests**

Run: `npx vitest run`
Expected: tous les tests passent.

- [ ] **Step 4: Vérifier que les 43 entrées ont bien les nouveaux champs, et que les 131 entrées existantes sont désormais toutes enrichies**

Run le même script de vérification que Task 3 Step 4, en remplaçant le tableau `names` par la liste de ce lot.
Expected: `OK: all 43 enriched`.

Puis, pour confirmer que les 131 entrées existantes (lots A+B+C cumulés) sont toutes enrichies :

Run: `node -e "
const total = (require('fs').readFileSync('app/data/curatedArchetypes.ts', 'utf8').match(/releaseYear:/g) || []).length;
console.log('entries with releaseYear:', total);
"`
Expected: `entries with releaseYear: 131` (ou plus, si des candidats de la Task 1 ont déjà été ajoutés en avance — ce qui ne devrait pas être le cas à ce stade, les tâches suivantes n'ont pas encore commencé).

- [ ] **Step 5: Commit**

```bash
git add app/data/curatedArchetypes.ts
git commit -m "content: enrichit 43 archétypes existants (lot C) — historique et gameplay"
```

---

### Task 6: Nouveaux archétypes — lot 1 (jusqu'à 40, depuis le fichier de candidats)

**Files:**
- Modify: `app/data/curatedArchetypes.ts` (ajout de nouvelles entrées)

**Interfaces:**
- Consumes: `docs/superpowers/plans/2026-07-13-archetype-candidates.json` (Task 1) comme source des noms ; `CuratedArchetypeInfo` (Task 2) comme schéma cible.

- [ ] **Step 1: Prendre les 40 premiers noms du fichier de candidats**

Run: `node -e "
const candidates = require('./docs/superpowers/plans/2026-07-13-archetype-candidates.json');
console.log(JSON.stringify(candidates.slice(0, 40).map(c => c.name), null, 2));
"`

Cette commande affiche les 40 premiers noms (ordre alphabétique) du fichier généré à la Task 1. Ce sont les archétypes à rédiger dans cette tâche.

- [ ] **Step 2: Rédiger une entrée complète (15 champs) pour chacun des 40 noms**

Pour chaque nom affiché à l'étape précédente, rédiger une entrée complète dans `CURATED_ARCHETYPES`, respectant exactement le schéma `CuratedArchetypeInfo` (tous les champs, `lore` uniquement si pertinent) et les règles de curation des Global Constraints (≥10 cartes réelles — déjà vérifié par le script de la Task 1 via `cardCount`, mais revérifier qu'aucun nom n'est un label fourre-tout générique malgré le filtre ; si un nom s'avère être un fourre-tout au moment de la rédaction, le documenter en commentaire au-dessus de son entrée dans le fichier plutôt que de l'ajouter, et noter ce nom comme exclu dans le message de commit).

**Exemple entièrement rédigé (respecter ce niveau de détail et ce ton — la clé exacte dépend du nom réellement présent dans le fichier de candidats, cet exemple est indicatif du format) :**

```ts
'Gouki': {
  level: 'intermediate',
  playstyle: 'combo',
  themes: ['machine'],
  description: 'A martial-arts-themed Fusion deck that ambushes the opponent with cheap on-field Fusion Summons of powerful WIND monsters, punishing decks that overcommit to the field.',
  deckSpeed: 'fast',
  extraDeckDependency: 'high',
  era: 'modern',
  releaseYear: 2018,
  releaseContext: 'Gouki debuted in Circuit Break (2018) as one of the first archetypes built entirely around on-field Fusion Summoning without Polymerization, letting it combo out of a single normal summon.',
  gameplay: 'A turn typically starts with a single Gouki monster, chains into an on-field Fusion using its own effect, and repeats the process to build a wide board of WIND Fusion Monsters before the opponent gets to interact.',
  decisionComplexity: 'moderate',
  dominantMechanic: 'fusion',
  keyCards: ['Gouki Suprex', 'Gouki The Fist of Flame', 'Gouki Twistcobra'],
  winCondition: 'board-control'
},
```

- [ ] **Step 3: Vérifier le typage**

Run: `npm run build`
Expected: succès (chaque nouvelle entrée doit correspondre exactement à `CuratedArchetypeInfo`).

- [ ] **Step 4: Vérifier la suite de tests**

Run: `npx vitest run`
Expected: tous les tests passent.

- [ ] **Step 5: Compter les entrées ajoutées**

Run: `node -e "
const total = (require('fs').readFileSync('app/data/curatedArchetypes.ts', 'utf8').match(/releaseYear:/g) || []).length;
console.log('total entries with releaseYear:', total, '(expected: 131 + up to 40 new = up to 171)');
"`

- [ ] **Step 6: Commit**

```bash
git add app/data/curatedArchetypes.ts
git commit -m "content: ajoute jusqu'à 40 nouveaux archétypes curés (lot 1, depuis archetypes.php)"
```

---

### Task 7: Nouveaux archétypes — lot 2 (jusqu'à 40 suivants)

**Files:**
- Modify: `app/data/curatedArchetypes.ts`

**Interfaces:**
- Consumes: identique à la Task 6.

- [ ] **Step 1: Prendre les 40 noms suivants du fichier de candidats**

Run: `node -e "
const candidates = require('./docs/superpowers/plans/2026-07-13-archetype-candidates.json');
console.log(JSON.stringify(candidates.slice(40, 80).map(c => c.name), null, 2));
"`

Si ce tableau est vide ou contient moins de 40 noms, c'est que le fichier de candidats est plus court que prévu — traiter tous les noms restants dans cette tâche et sauter directement à la Task 10 (les tâches 8 et 9 deviennent alors inutiles, le documenter dans le message de commit final).

- [ ] **Step 2: Rédiger une entrée complète pour chacun des noms affichés**

Même processus et mêmes règles que Task 6 Step 2.

- [ ] **Step 3: Vérifier le typage**

Run: `npm run build`
Expected: succès.

- [ ] **Step 4: Vérifier la suite de tests**

Run: `npx vitest run`
Expected: tous les tests passent.

- [ ] **Step 5: Commit**

```bash
git add app/data/curatedArchetypes.ts
git commit -m "content: ajoute jusqu'à 40 nouveaux archétypes curés (lot 2)"
```

---

### Task 8: Nouveaux archétypes — lot 3 (jusqu'à 40 suivants)

**Files:**
- Modify: `app/data/curatedArchetypes.ts`

**Interfaces:**
- Consumes: identique à la Task 6.

- [ ] **Step 1: Prendre les 40 noms suivants du fichier de candidats**

Run: `node -e "
const candidates = require('./docs/superpowers/plans/2026-07-13-archetype-candidates.json');
console.log(JSON.stringify(candidates.slice(80, 120).map(c => c.name), null, 2));
"`

Même remarque que Task 7 Step 1 si le tableau est vide ou incomplet — traiter le reste et sauter à la Task 9 (catch-all) si nécessaire.

- [ ] **Step 2: Rédiger une entrée complète pour chacun des noms affichés**

Même processus et mêmes règles que Task 6 Step 2.

- [ ] **Step 3: Vérifier le typage**

Run: `npm run build`
Expected: succès.

- [ ] **Step 4: Vérifier la suite de tests**

Run: `npx vitest run`
Expected: tous les tests passent.

- [ ] **Step 5: Commit**

```bash
git add app/data/curatedArchetypes.ts
git commit -m "content: ajoute jusqu'à 40 nouveaux archétypes curés (lot 3)"
```

---

### Task 9: Nouveaux archétypes — lot final (tout le reste du fichier de candidats)

**Files:**
- Modify: `app/data/curatedArchetypes.ts`

**Interfaces:**
- Consumes: identique à la Task 6.

- [ ] **Step 1: Lister tous les noms restants du fichier de candidats**

Run: `node -e "
const candidates = require('./docs/superpowers/plans/2026-07-13-archetype-candidates.json');
console.log(JSON.stringify(candidates.slice(120).map(c => c.name), null, 2));
console.log('remaining count:', candidates.slice(120).length);
"`

- [ ] **Step 2: Rédiger une entrée complète pour chaque nom restant**

Même processus et mêmes règles que Task 6 Step 2. Cette tâche traite **tout** ce qui reste, quel que soit le nombre — c'est la tâche qui garantit la couverture complète du fichier de candidats (critère de succès du spec : « aucun nom retenu après filtrage volontairement ignoré sans raison documentée »). Si un nom est délibérément exclu (fourre-tout non détecté par le filtre automatique de la Task 1, doublon thématique évident avec une entrée déjà curatée), le documenter dans le message de commit.

- [ ] **Step 3: Vérifier le typage**

Run: `npm run build`
Expected: succès.

- [ ] **Step 4: Vérifier la suite de tests**

Run: `npx vitest run`
Expected: tous les tests passent.

- [ ] **Step 5: Vérifier la couverture complète**

Run: `node -e "
const fs = require('fs');
const candidates = require('./docs/superpowers/plans/2026-07-13-archetype-candidates.json');
const src = fs.readFileSync('app/data/curatedArchetypes.ts', 'utf8');
const missing = candidates.filter(c => !src.includes(\`'\${c.name}':\`) && !src.includes(\`\"\${c.name}\":\`));
console.log('candidates not yet curated:', missing.length, missing.map(m => m.name));
"`
Expected: `candidates not yet curated: 0 []`. Si des noms apparaissent, soit les rédiger, soit documenter explicitement leur exclusion (commentaire dans le fichier + mention dans le commit) avant de continuer.

- [ ] **Step 6: Commit**

```bash
git add app/data/curatedArchetypes.ts
git commit -m "content: complète la couverture des archétypes curés (lot final)"
```

---

### Task 10: Verrouillage du schéma — champs requis, suppression de `era`, câblage de `deriveEra`

**Files:**
- Modify: `app/data/curatedArchetypes.ts`
- Modify: `app/utils/preferencesScoring.ts`
- Modify: `app/utils/preferencesScoring.test.ts`

**Interfaces:**
- Produces: `CuratedArchetypeInfo` avec `releaseYear`, `releaseContext`, `gameplay` désormais **requis** (plus de `?`), `era` **supprimé**. `computeArchetypeScore` compare désormais `deriveEra(info.releaseYear)` à `answers.era` au lieu de lire `info.era`.

- [ ] **Step 1: Verrouiller le schéma dans `curatedArchetypes.ts`**

In `app/data/curatedArchetypes.ts`, replace the interface:

```ts
export interface CuratedArchetypeInfo {
  level: ArchetypeLevel
  playstyle: ArchetypePlaystyle
  themes: ArchetypeTheme[]
  description: string
  deckSpeed: DeckSpeed
  extraDeckDependency: ExtraDeckDependency
  era: ArchetypeEra
  releaseYear?: number
  releaseContext?: string
  lore?: string
  gameplay?: string
  decisionComplexity: DecisionComplexity
  dominantMechanic: DominantMechanic
  keyCards: string[]
  winCondition: WinCondition
}
```

with:

```ts
export interface CuratedArchetypeInfo {
  level: ArchetypeLevel
  playstyle: ArchetypePlaystyle
  themes: ArchetypeTheme[]
  description: string
  deckSpeed: DeckSpeed
  extraDeckDependency: ExtraDeckDependency
  releaseYear: number
  releaseContext: string
  lore?: string
  gameplay: string
  decisionComplexity: DecisionComplexity
  dominantMechanic: DominantMechanic
  keyCards: string[]
  winCondition: WinCondition
}
```

Then remove every `era: '...',` line from every entry in `CURATED_ARCHETYPES` (search-and-replace across the file — each entry currently has exactly one `era: 'classic' | 'modern' | 'recent',` line to remove).

- [ ] **Step 2: Vérifier que le build échoue si une entrée manque un champ requis (contrôle de cohérence)**

Run: `npm run build`
Expected: si toutes les entrées des tâches 3 à 9 ont bien été enrichies, le build **réussit**. S'il échoue avec des erreurs de type sur `releaseYear`/`releaseContext`/`gameplay` manquants, c'est le filet de sécurité qui fonctionne : identifier les entrées incomplètes depuis les messages d'erreur du compilateur et les compléter avant de continuer.

- [ ] **Step 3: Mettre à jour les fixtures de test pour ne plus utiliser `era`**

In `app/utils/preferencesScoring.test.ts`, replace the `makeInfo` fixture:

```ts
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
```

with:

```ts
function makeInfo (overrides: Partial<CuratedArchetypeInfo> = {}): CuratedArchetypeInfo {
  return {
    level: 'beginner',
    playstyle: 'aggro',
    themes: ['dragon'],
    description: 'Test archetype.',
    deckSpeed: 'fast',
    extraDeckDependency: 'low',
    releaseYear: 2005, // classic
    releaseContext: 'Test release context.',
    gameplay: 'Test gameplay paragraph.',
    decisionComplexity: 'linear',
    dominantMechanic: 'main-deck',
    keyCards: ['Test Card'],
    winCondition: 'otk',
    ...overrides
  }
}
```

- [ ] **Step 4: Écrire un test qui échoue pour le nouveau comportement de `computeArchetypeScore` sur `era`**

Replace the existing `'adds 10 when a field matches, 0 when it does not'` test in the `computeArchetypeScore` describe block — this test currently only covers `level`, add an era-via-year case right after it:

```ts
  it('matches era derived from releaseYear, not a stored era field', () => {
    const modernInfo = makeInfo({ releaseYear: 2015 }) // deriveEra(2015) === 'modern'
    const classicInfo = makeInfo({ releaseYear: 2005 }) // deriveEra(2005) === 'classic'
    expect(computeArchetypeScore(modernInfo, { ...emptyAnswers(), era: 'modern' })).toBe(10)
    expect(computeArchetypeScore(classicInfo, { ...emptyAnswers(), era: 'modern' })).toBe(0)
  })
```

- [ ] **Step 5: Vérifier que ce nouveau test échoue**

Run: `npx vitest run app/utils/preferencesScoring.test.ts`
Expected: FAIL sur le nouveau test (`computeArchetypeScore` compare encore `info.era`, qui n'existe plus — erreur de type ou `undefined`).

- [ ] **Step 6: Câbler `deriveEra` dans `computeArchetypeScore`**

In `app/utils/preferencesScoring.ts`, replace:

```ts
  if (answers.era && info.era === answers.era) score += MATCH_POINTS
```

with:

```ts
  if (answers.era && deriveEra(info.releaseYear) === answers.era) score += MATCH_POINTS
```

- [ ] **Step 7: Vérifier que tous les tests passent**

Run: `npx vitest run`
Expected: PASS — tous les tests, y compris le nouveau et ceux mis à jour.

- [ ] **Step 8: Ajouter le test de cohérence des données**

Add a new import line at the top of `app/utils/preferencesScoring.test.ts`, right after the existing `import type { CuratedArchetypeInfo } from '~/data/curatedArchetypes'` line (do not modify or remove that existing line — this is a second, separate value import from the same module):

```ts
import { CURATED_ARCHETYPES } from '~/data/curatedArchetypes'
```

Then add this new `describe` block at the end of the file:

```ts
describe('CURATED_ARCHETYPES data integrity', () => {
  it('every entry has releaseYear, releaseContext and gameplay filled', () => {
    const incomplete = Object.entries(CURATED_ARCHETYPES).filter(
      ([, info]) => !info.releaseYear || !info.releaseContext?.trim() || !info.gameplay?.trim()
    )
    expect(incomplete.map(([name]) => name)).toEqual([])
  })
})
```

- [ ] **Step 9: Vérifier que le test de cohérence passe**

Run: `npx vitest run app/utils/preferencesScoring.test.ts`
Expected: PASS. Si ce test échoue, il liste les noms d'archétypes incomplets — les compléter avant de continuer (ce test est le filet de sécurité permanent contre un oubli lors des lots de rédaction).

- [ ] **Step 10: Vérifier le build et le lint**

Run: `npm run build && npm run lint`
Expected: build réussi, 0 erreur de lint.

- [ ] **Step 11: Commit**

```bash
git add app/data/curatedArchetypes.ts app/utils/preferencesScoring.ts app/utils/preferencesScoring.test.ts
git commit -m "feat: verrouille le schéma (champs requis, era supprimé, deriveEra câblé) + test de cohérence"
```

---

### Task 11: Réorganisation de `ArchetypeModal.vue` en 3 sections

**Files:**
- Modify: `app/components/tournament/ArchetypeModal.vue`

**Interfaces:**
- Consumes: `CuratedArchetypeInfo` verrouillé (Task 10) — `curatedInfo` (déjà défini dans le composant) expose désormais `releaseYear`, `releaseContext`, `lore?`, `gameplay` sans avoir besoin de garde `v-if` supplémentaire pour `releaseYear`/`releaseContext`/`gameplay` (requis par le typage), seul `lore` reste conditionnel.

- [ ] **Step 1: Remplacer le bloc curaté du template**

In `app/components/tournament/ArchetypeModal.vue`, replace this block (currently right after `.archetype-modal__head`'s closing `</div>`, before `.archetype-modal__body`):

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

with:

```vue
        <div v-if="curatedInfo" class="archetype-modal__curated">
          <section class="archetype-modal__section">
            <h4 class="archetype-modal__section-title">Overview</h4>
            <p class="archetype-modal__description">{{ curatedInfo.description }}</p>
            <div class="archetype-modal__tags">
              <span class="archetype-modal__tag">{{ curatedInfo.level }}</span>
              <span class="archetype-modal__tag">{{ curatedInfo.playstyle }}</span>
              <span class="archetype-modal__tag">{{ curatedInfo.deckSpeed }} pace</span>
              <span class="archetype-modal__tag">{{ curatedInfo.extraDeckDependency }} Extra Deck</span>
              <span class="archetype-modal__tag">{{ deriveEra(curatedInfo.releaseYear) }} · {{ curatedInfo.releaseYear }}</span>
              <span class="archetype-modal__tag">{{ curatedInfo.winCondition }}</span>
            </div>
          </section>

          <section class="archetype-modal__section">
            <h4 class="archetype-modal__section-title">History</h4>
            <p class="archetype-modal__paragraph">{{ curatedInfo.releaseContext }}</p>
            <p v-if="curatedInfo.lore" class="archetype-modal__paragraph">{{ curatedInfo.lore }}</p>
          </section>

          <section class="archetype-modal__section">
            <h4 class="archetype-modal__section-title">Gameplay</h4>
            <p class="archetype-modal__paragraph">{{ curatedInfo.gameplay }}</p>
          </section>

          <p v-if="curatedInfo.keyCards.length" class="archetype-modal__key-cards">
            Key cards: {{ curatedInfo.keyCards.join(', ') }}
          </p>
        </div>
```

- [ ] **Step 2: Importer `deriveEra` dans le composant**

In `app/components/tournament/ArchetypeModal.vue`, add this import alongside the existing `CURATED_ARCHETYPES` import at the top of `<script setup>`:

```ts
import { deriveEra } from '~/utils/preferencesScoring'
```

- [ ] **Step 3: Ajouter le style des nouvelles sections**

In the `<style scoped>` block, replace:

```css
.archetype-modal__description {
  margin: 0 0 0.6rem;
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--text-secondary);
}
```

with:

```css
.archetype-modal__section {
  margin-bottom: 0.85rem;
}

.archetype-modal__section:last-of-type {
  margin-bottom: 0.5rem;
}

.archetype-modal__section-title {
  margin: 0 0 0.4rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.archetype-modal__description {
  margin: 0 0 0.6rem;
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.archetype-modal__paragraph {
  margin: 0 0 0.4rem;
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.archetype-modal__paragraph:last-child {
  margin-bottom: 0;
}
```

- [ ] **Step 4: Vérifier le build et le lint**

Run: `npm run build && npm run lint`
Expected: build réussi, 0 erreur de lint.

- [ ] **Step 5: Vérification manuelle**

Run: `npm run dev`, démarrer un tournoi via le questionnaire, ouvrir la modal d'un archétype (bouton «i» pendant un duel, ou au podium) : vérifier que les 3 sections (Overview, History, Gameplay) s'affichent dans cet ordre, que le tag d'ère affiche bien le format `<ère> · <année>` (ex: `modern · 2019`), que la section History n'affiche le paragraphe de lore que pour les archétypes qui en ont un, et que la liste de cartes clés reste juste en dessous, avant la grille de cartes.

- [ ] **Step 6: Commit**

```bash
git add app/components/tournament/ArchetypeModal.vue
git commit -m "feat: réorganise ArchetypeModal en 3 sections (Overview/History/Gameplay)"
```

---

### Task 12: Vérification finale

**Files:** aucun nouveau fichier — vérification uniquement.

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: 0 erreur.

- [ ] **Step 2: Tests**

Run: `npx vitest run`
Expected: tous les tests passent (les tests existants + les nouveaux de `deriveEra`, du matching par `releaseYear`, et le test de cohérence des données).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: succès.

- [ ] **Step 4: Vérifier la couverture complète du fichier de candidats**

Run: `node -e "
const fs = require('fs');
const candidates = require('./docs/superpowers/plans/2026-07-13-archetype-candidates.json');
const src = fs.readFileSync('app/data/curatedArchetypes.ts', 'utf8');
const missing = candidates.filter(c => !src.includes(\`'\${c.name}':\`) && !src.includes(\`\"\${c.name}\":\`));
console.log('total candidates:', candidates.length, '| still missing:', missing.length, missing.map(m => m.name));
"`
Expected: `still missing: 0 []` (ou une liste vide de noms explicitement documentés comme exclus dans les commits précédents).

- [ ] **Step 5: Compter le total final d'archétypes curés**

Run: `node -e "console.log((require('fs').readFileSync('app/data/curatedArchetypes.ts', 'utf8').match(/releaseYear:/g) || []).length)"`
Expected: 131 + le nombre de candidats retenus (pas de nombre fixe visé, mais doit être strictement supérieur à 131).

- [ ] **Step 6: Test manuel de bout en bout**

Run: `npm run dev`. Parcourir : questionnaire → compteur d'archétypes (doit refléter le pool étendu, pas seulement 131) → tournoi démarré → phase 1/2 (bouton «i» fonctionnel, modal à 3 sections) → phase 3 → résultats → modal au podium avec Overview/History/Gameplay → export CSV.

- [ ] **Step 7: Commit final si des ajustements ont été nécessaires**

```bash
git add -A
git commit -m "chore: nettoyage final post-extension du pool (lint, ajustements)"
```

Ne créer ce commit que s'il y a effectivement des changements (`git status` non vide) — sinon, passer directement à la fin.