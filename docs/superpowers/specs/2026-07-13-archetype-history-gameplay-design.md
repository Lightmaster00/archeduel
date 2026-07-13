# Extension du pool curaté + historique et gameplay détaillés

## Contexte

Le questionnaire de préférences et la modal d'archétype enrichie (cycle
précédent) donnent déjà une description courte (2-3 phrases), 6 tags et une
liste de cartes clés par archétype — mais uniquement pour 131 archétypes
hand-authored, alors que l'ancien pipeline de détection automatique
(`archetypeIntelligence.ts` + `useYgoApi.ts`, toujours actif dans le code,
utilisé quand l'utilisateur relance un tournoi via «restart») en détecte
dynamiquement 300+ à partir de la base de cartes TCG complète. Le retour
utilisateur est double : (1) le pool curaté est trop restreint par rapport à
ce que l'ancien pipeline reconnaît, (2) le contenu manque d'historique
(pourquoi l'archétype existe, d'où il vient) et d'une vraie explication de
gameplay — l'ère (`classic`/`modern`/`recent`) actuelle n'est qu'une
estimation approximative plutôt qu'un fait vérifiable.

Ce cycle couvre deux changements étroitement liés, car ils touchent le même
fichier de données et les mêmes lots de rédaction :
1. Étendre le fichier curaté pour couvrir tous les archétypes « reconnus »
   par l'ancien pipeline (pas de nombre fixe visé).
2. Enrichir chaque entrée (nouvelles et existantes) avec une année de
   sortie exacte, du contexte historique et un paragraphe de gameplay
   détaillé, et réorganiser la modal existante en conséquence.

La restructuration du questionnaire (au-delà du changement mécanique décrit
plus bas) et le système de duels/matchmaking sont des sujets séparés, hors
périmètre ici.

## Objectifs

- Identifier la liste complète des archétypes que l'ancien pipeline
  reconnaît aujourd'hui, et rédiger une entrée curatée complète pour chacun
  de ceux qui manquent encore au fichier.
- Ajouter à chaque archétype curé (nouveaux et existants) : une année de
  sortie TCG exacte, un paragraphe de contexte de sortie réel (set, rôle
  compétitif, impact méta), un paragraphe de lore optionnel (contexte
  anime/manga quand il existe réellement) et un paragraphe de gameplay plus
  détaillé que la description courte actuelle.
- Rendre `era` dérivé automatiquement de l'année de sortie plutôt que
  rédigé à la main, pour supprimer une source de vérité redondante et
  potentiellement incohérente.
- Réorganiser la modal existante en 3 sections lisibles (Overview,
  Historique, Gameplay) sans changer son mode d'interaction (pas d'onglets,
  pas de panneaux dépliables — tout reste dans le scroll actuel).

## Hors périmètre

- Toute modification du questionnaire (scoring, seuil, nombre de questions)
  au-delà du changement mécanique décrit ci-dessous (lecture de `era` dérivé
  au lieu d'un champ stocké).
- Toute modification du système de duels/matchmaking.
- Un nouveau point d'entrée pour parcourir les archétypes en dehors d'un
  tournoi en cours (reste limité à la modal existante, ouverte pendant un
  tournoi).
- Toute suppression ou modification du pipeline de détection automatique
  (`archetypeIntelligence.ts`, `useYgoApi.ts`) lui-même — il reste inchangé
  et n'est plus impliqué dans ce cycle (voir Pool sourcing ci-dessous,
  révisé suite à la découverte d'un endpoint dédié).
- Mise à jour automatique ou synchronisation continue entre le fichier
  curaté et l'API — voir «Suivi» plus bas, c'est un instantané ponctuel,
  pas une dépendance permanente.

## Pool sourcing — d'où vient la liste des archétypes à rédiger

Contrairement à l'hypothèse initiale de ce spec, YGOPRODeck expose bien un
endpoint dédié à la liste des archétypes : `GET
https://db.ygoprodeck.com/api/v7/archetypes.php`. Un seul appel retourne
**646 noms** (`archetype_name`), vérifié directement le 2026-07-13. C'est la
liste brute de toutes les valeurs distinctes du champ `archetype` toutes
cartes confondues — elle inclut des tags génériques non-jouables ("Assault
Mode", "Attribute Summoner", "-Eyes Dragon") qui ne sont pas de vrais
archétypes, donc un filtrage reste nécessaire, mais c'est une source
beaucoup plus simple que de faire tourner l'ancien pipeline d'inférence
(plus besoin de crawler les ~13k cartes ni de scoring de mentions textuelles
— un seul appel API remplace tout ça).

Démarche retenue :
1. **Extraction ponctuelle** : un appel à `archetypes.php` pour obtenir les
   646 noms candidats.
2. **Filtrage** : pour chaque nom, vérifier via `cardinfo.php?archetype=<nom>`
   qu'il correspond à un archétype réel et jouable — mêmes critères que la
   curation existante (≥10 cartes réelles, pas de label fourre-tout
   générique regroupant plusieurs archétypes distincts). Les tags
   manifestement non-jouables (suffixes de mécanique comme «Assault Mode»,
   catégories transversales comme «Attribute Summoner») sont exclus à cette
   étape.
3. **Diff** contre les clés déjà présentes dans `CURATED_ARCHETYPES` (131
   aujourd'hui) pour obtenir la liste finale des noms manquants à rédiger.
3. Pour chaque nom manquant : rédiger une entrée curatée **complète** (les
   11 champs existants + les 4 nouveaux champs de ce cycle, en une seule
   passe — pas deux passes séparées).
4. Pour les 131 entrées déjà existantes : ajouter uniquement les 4 nouveaux
   champs (pas de nouvelle rédaction des 11 champs existants).
5. Aucun nombre cible fixe dans ce spec — le volume final dépend de ce que
   le pipeline détecte réellement au moment de l'extraction (probablement du
   même ordre que le «300+» mentionné dans le code/les commentaires
   existants, sans que ce soit une contrainte chiffrée).

**Suivi** : instantané ponctuel, pas de test permanent comparant le fichier
curaté à une exécution live du pipeline (le pipeline est dynamique/scoré et
peut varier légèrement d'une exécution à l'autre). Seule reste une
vérification statique de cohérence interne du fichier (voir Tests).

## Modèle de données — `app/data/curatedArchetypes.ts`

Le type `CuratedArchetypeInfo` change comme suit (inchangé pour les 11
premiers champs, 4 nouveaux ajoutés, `era` supprimé) :

```ts
export interface CuratedArchetypeInfo {
  level: ArchetypeLevel
  playstyle: ArchetypePlaystyle
  themes: ArchetypeTheme[]
  description: string          // inchangé : teaser court (2-3 phrases)
  deckSpeed: DeckSpeed
  extraDeckDependency: ExtraDeckDependency
  // era: ArchetypeEra          // SUPPRIMÉ — dérivé de releaseYear
  releaseYear: number           // NOUVEAU — année de sortie TCG réelle
  releaseContext: string        // NOUVEAU — set de sortie, rôle compétitif, impact méta (2-4 phrases)
  lore?: string                 // NOUVEAU, optionnel — contexte anime/manga si l'archétype y apparaît réellement
  gameplay: string              // NOUVEAU — paragraphe détaillé (combos clés, ce qui rend le pilotage distinct)
  decisionComplexity: DecisionComplexity
  dominantMechanic: DominantMechanic
  keyCards: string[]
  winCondition: WinCondition
}
```

### Dérivation de l'ère — `deriveEra(year: number): ArchetypeEra`

Nouvelle fonction pure (dans `app/utils/preferencesScoring.ts`, à côté du
reste du moteur de scoring) :

```ts
export function deriveEra (year: number): ArchetypeEra {
  if (year < 2010) return 'classic'
  if (year < 2020) return 'modern'
  return 'recent'
}
```

`computeArchetypeScore` appelle `deriveEra(info.releaseYear)` au lieu de lire
`info.era`. Le questionnaire (question «Nostalgia ou dernières sorties ?»)
ne change pas côté utilisateur — seule la source de la comparaison change.

### Règles de rédaction du contenu

- `releaseYear` : année réelle de première sortie TCG de l'archétype (pas
  l'année de sortie anime/manga si elle diffère). En cas d'incertitude
  réelle sur l'année exacte, choisir l'année la plus défendable plutôt que
  d'inventer — ne jamais fabriquer une année pour un archétype dont la date
  n'est pas connue avec une confiance raisonnable.
- `releaseContext` : 2-4 phrases, faits réels et vérifiables (set de sortie,
  problème compétitif résolu, impact sur le format à l'époque). Rempli pour
  toutes les entrées, sans exception.
- `lore` : optionnel, rempli uniquement pour les archétypes qui apparaissent
  réellement dans l'anime/manga (ex: Blue-Eyes, Elemental Hero, Dark
  Magician). Absent (pas de placeholder vide) pour les archétypes purement
  TCG (ex: Eldlich, Orcust).
- `gameplay` : 2-4 phrases décrivant le déroulement concret d'un tour type
  ou d'une ligne de combo caractéristique — au-delà du teaser existant, pas
  une reformulation de `description`.
- Pour les nouvelles entrées (issues du diff pipeline), mêmes règles de
  curation que le cycle précédent pour les 11 champs existants : ≥10 cartes
  réelles, jamais de label fourre-tout générique, `themes` limité à
  l'union fermée `ArchetypeTheme` (étendue si un thème réel manque —
  décision à prendre en implémentation si un nouvel archétype l'exige),
  `keyCards` = 2-4 noms de cartes réels et vérifiables.

## Modal — `ArchetypeModal.vue`

Le bloc curaté existant (ajouté au cycle précédent, juste après
`.archetype-modal__head`) est réorganisé en 3 sections, dans cet ordre,
toujours au-dessus de la grille de cartes :

1. **Overview** — `description` (teaser existant) + les 6 tags existants
   (level/playstyle/pace/extra-deck/era/win-condition). Le tag «era» affiche
   désormais l'ère dérivée accompagnée de l'année exacte, ex. `Modern · 2019`.
2. **Historique** — `releaseContext` toujours affiché ; `lore` affiché juste
   en dessous uniquement si présent (aucun texte de remplacement si absent).
3. **Gameplay** — le nouveau paragraphe `gameplay`.

La ligne «Key cards» reste à sa place actuelle, juste après ces sections et
avant la grille de cartes. Aucun nouvel élément d'interaction (pas d'onglets,
pas de sections repliables) : tout reste dans le scroll unique actuel de la
modal, avec des titres de section (`<h4>` ou équivalent) pour la lisibilité.

## Rédaction du contenu — approche

Volume nettement supérieur au cycle précédent (131 entrées à enrichir de 4
champs + N nouvelles entrées de 15 champs chacune, N dépendant du diff avec
le pipeline). Même approche que le cycle précédent : lots successifs
d'environ 35 archétypes, chacun suivi d'une vérification
`npm run build && npx vitest run` avant de passer au lot suivant. Mêmes
garde-fous : faits réels et vérifiables, jamais de card name ou de fait
fabriqué par défaut de certitude — préférer laisser un champ optionnel
absent (`lore`) plutôt que d'inventer, et préférer une année approximative
mais défendable plutôt qu'une date inventée.

## Tests

- `app/utils/preferencesScoring.test.ts` : nouveaux tests pour `deriveEra`
  (bornes 2009/2010/2019/2020) et mise à jour des tests existants de
  `computeArchetypeScore` pour utiliser `releaseYear` + `deriveEra` au lieu
  d'un champ `era` stocké dans les fixtures de test.
- Nouveau test ou script léger de cohérence des données : vérifie que
  **toutes** les entrées de `CURATED_ARCHETYPES` (131 existantes + les
  nouvelles) ont bien un `releaseYear` (nombre valide), un `gameplay` et un
  `releaseContext` non vides, et que les nouvelles entrées ont bien les 11
  champs déjà requis pour les entrées existantes — filet de sécurité contre
  un oubli lors de la rédaction par lots.
- Pas de test comparant en continu au pipeline de détection (voir «Suivi»
  ci-dessus) — l'extraction de la liste de candidats est un instantané
  ponctuel réalisé en implémentation, pas une dépendance testée à chaque
  run.

## Critères de succès

- Le fichier curaté couvre tous les archétypes réels et jouables présents
  dans `archetypes.php` au moment de l'extraction (aucun nombre fixe visé,
  mais aucun nom retenu après filtrage volontairement ignoré sans raison
  documentée — ex: doublon thématique, label jugé fourre-tout).
- Chaque archétype curaté (nouveau ou existant) affiche, dans la modal
  existante, un historique réel (contexte de sortie + lore si pertinent) et
  un paragraphe de gameplay détaillé, en plus du contenu déjà existant.
- L'ère affichée est dérivée automatiquement de l'année de sortie et n'est
  plus une donnée saisie à la main.
- Le scoring du questionnaire produit exactement les mêmes types de
  résultats qu'avant (mécanique inchangée), simplement basés sur l'ère
  dérivée plutôt que stockée, et sur un pool plus large.
- `npm run lint`, `npx vitest run`, `npm run build` restent propres après
  chaque lot de contenu.

## Risques

- **Fiabilité des années de sortie.** Certaines dates de sortie TCG précises
  peuvent être ambiguës (différence de date entre marché japonais et
  international, ou entre première apparition dans un booster vs un
  produit de structure dédié). Le principe reste de choisir la date la plus
  défendable et de ne jamais fabriquer une donnée sans fondement.
- **Volume de rédaction important.** Le nombre exact de nouvelles entrées
  dépend du résultat du filtrage des 646 candidats de `archetypes.php`
  (potentiellement 150-200+ nouvelles entrées à 15 champs chacune, en plus
  des 131 existantes à enrichir de 4 champs) — un effort de rédaction
  significativement plus gros que le cycle précédent, à répartir en
  plusieurs lots dans le plan d'implémentation.
- **Bruit dans la liste brute de `archetypes.php`.** Les 646 noms incluent
  des tags non-jouables (mécaniques génériques, catégories transversales) —
  le filtrage (étape 2 du Pool sourcing) doit être fait avec la même
  rigueur que les règles de curation existantes, pas juste rédiger les 646
  noms tels quels.
