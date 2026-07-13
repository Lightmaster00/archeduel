# Historique et gameplay détaillés des archétypes

## Contexte

Le questionnaire de préférences et la modal d'archétype enrichie (cycle
précédent) donnent déjà une description courte (2-3 phrases), 6 tags et une
liste de cartes clés par archétype. Le retour utilisateur après ce cycle est
que ce n'est pas assez pour se projeter sur un archétype : pas d'historique
(pourquoi il existe, d'où il vient), pas de vraie explication de gameplay
(comment il se joue concrètement), et l'ère (`classic`/`modern`/`recent`) est
une estimation approximative plutôt qu'un fait vérifiable.

Ce cycle enrichit uniquement le contenu et son affichage dans la modal
existante (`ArchetypeModal.vue`, ouverte via le bouton podium ou le bouton
«i» pendant les duels). La restructuration du questionnaire et du système de
duels sont des sujets séparés, hors périmètre ici.

## Objectifs

- Ajouter à chaque archétype curé : une année de sortie TCG exacte, un
  paragraphe de contexte de sortie réel (set, rôle compétitif, impact méta),
  un paragraphe de lore optionnel (contexte anime/manga quand il existe
  réellement) et un paragraphe de gameplay plus détaillé que la description
  courte actuelle.
- Rendre `era` dérivé automatiquement de l'année de sortie plutôt que
  rédigé à la main, pour supprimer une source de vérité redondante et
  potentiellement incohérente.
- Réorganiser la modal existante en 3 sections lisibles (Overview, Historique,
  Gameplay) sans changer son mode d'interaction (pas d'onglets, pas de
  panneaux dépliables — tout reste dans le scroll actuel).

## Hors périmètre

- Toute modification du questionnaire (scoring, seuil, nombre de questions)
  au-delà du changement mécanique décrit ci-dessous (lecture de `era` dérivé
  au lieu d'un champ stocké).
- Toute modification du système de duels/matchmaking.
- Un nouveau point d'entrée pour parcourir les archétypes en dehors d'un
  tournoi en cours (reste limité à la modal existante, ouverte pendant un
  tournoi).
- Mise à jour automatique ou pipeline de récupération de données externes —
  contenu rédigé à la main, comme le reste du fichier curé.

## Modèle de données — `app/data/curatedArchetypes.ts`

Le type `CuratedArchetypeInfo` change comme suit :

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
  les 131 entrées, sans exception.
- `lore` : optionnel, rempli uniquement pour les archétypes qui apparaissent
  réellement dans l'anime/manga (ex: Blue-Eyes, Elemental Hero, Dark
  Magician). Absent (pas de placeholder vide) pour les archétypes purement
  TCG (ex: Eldlich, Orcust).
- `gameplay` : 2-4 phrases décrivant le déroulement concret d'un tour type
  ou d'une ligne de combo caractéristique — au-delà du teaser existant, pas
  une reformulation de `description`.

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

Même ampleur de travail que la rédaction initiale du fichier curé (131
entrées × 4 nouveaux champs). Même approche : lots successifs d'environ 35
entrées, chacun suivi d'une vérification `npm run build && npx vitest run`
avant de passer au lot suivant. Mêmes garde-fous que le cycle précédent :
faits réels et vérifiables, jamais de card name ou de fait fabriqué par
défaut de certitude — préférer laisser un champ optionnel absent (`lore`)
plutôt que d'inventer.

## Tests

- `app/utils/preferencesScoring.test.ts` : nouveaux tests pour `deriveEra`
  (bornes 2009/2010/2019/2020) et mise à jour des tests existants de
  `computeArchetypeScore` pour utiliser `releaseYear` + `deriveEra` au lieu
  d'un champ `era` stocké dans les fixtures de test.
- Nouveau test ou script léger de cohérence des données : vérifie que les
  131 entrées de `CURATED_ARCHETYPES` ont bien un `releaseYear` (nombre
  valide), un `gameplay` et un `releaseContext` non vides — filet de
  sécurité contre un oubli lors de la rédaction par lots.

## Critères de succès

- Chaque archétype curé affiche, dans la modal existante, un historique
  réel (contexte de sortie + lore si pertinent) et un paragraphe de
  gameplay détaillé, en plus du contenu déjà existant.
- L'ère affichée est dérivée automatiquement de l'année de sortie et
  n'est plus une donnée saisie à la main.
- Le scoring du questionnaire produit exactement les mêmes types de
  résultats qu'avant (mécanique inchangée), simplement basés sur l'ère
  dérivée plutôt que stockée.
- `npm run lint`, `npx vitest run`, `npm run build` restent propres après
  chaque lot de contenu.

## Risques

- **Fiabilité des années de sortie.** Certaines dates de sortie TCG précises
  peuvent être ambiguës (différence de date entre marché japonais et
  international, ou entre première apparition dans un booster vs un
  produit de structure dédié). Le principe reste de choisir la date la plus
  défendable et de ne jamais fabriquer une donnée sans fondement.
- **Volume de rédaction.** 4 nouveaux champs × 131 entrées est un volume de
  contenu conséquent, du même ordre que la rédaction initiale du fichier
  curé — un rythme de lots similaire (batches de ~35) est nécessaire pour
  rester gérable.
