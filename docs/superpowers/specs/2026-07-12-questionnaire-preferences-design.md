# Questionnaire de préférences avant tournoi

## Contexte

Aujourd'hui, ArcheDuel démarre un tournoi sur l'intégralité des archétypes
détectés par le pipeline `archetypeIntelligence.ts` (300+ archétypes). Le
choix (phase 1 par élimination 4-way, jusqu'à 32 restants, puis phase 2/3
Elo) est donc long : beaucoup de duels avant d'arriver à un classement
pertinent pour l'utilisateur.

L'utilisateur veut réduire ce temps de sélection en filtrant le pool de
départ selon ses préférences, exprimées via un questionnaire affiché avant
le tournoi. Il veut aussi que chaque archétype affiché soit accompagné
d'une description et de détails suffisants pour que l'utilisateur puisse
se projeter, pas seulement d'un nom et d'une image.

## Objectifs

- Un questionnaire de 8 questions, affiché **obligatoirement** avant chaque
  tournoi (aucun moyen de le sauter), qui influence la sélection du pool de
  départ par un système de score à seuil.
- Un jeu de données rédigées à la main pour ~120-150 archétypes reconnus,
  avec tags structurés et description narrative, qui sert de base unique au
  questionnaire (aucun calcul automatique dérivé des cartes, aucun
  préchargement des 300+ archétypes).
- Un compteur en direct («X archétypes seront sélectionnés») qui se met à
  jour après chaque question répondue, avant validation finale.
- Un accès aux descriptions/tags pendant les duels (pas seulement au
  podium final comme aujourd'hui pour la modal de détail).

## Hors périmètre

- Aucun calcul automatique de tags depuis les données de cartes (race,
  attribut, ATK/DEF) — cette voie a été explorée puis écartée car elle
  demanderait de précharger les cartes de tous les archétypes avant même
  d'afficher le questionnaire, ce qui va à l'encontre de l'objectif de
  rapidité.
- Aucun mode «classique» permettant de sauter le questionnaire. Le pipeline
  de détection des 300+ archétypes (`archetypeIntelligence.ts`,
  `useYgoApi.ts` fetch complet) reste dans le code tel quel mais n'est plus
  invoqué au démarrage.
- Aucune donnée de matchup entre archétypes (trop instable avec les
  changements de banlist/méta).
- Pas de mise à jour automatique du fichier de données curées — c'est un
  contenu rédigé une fois, à la main, extensible dans un cycle ultérieur.

## Modèle de données — `app/data/curatedArchetypes.ts`

```ts
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

export interface CuratedArchetypeInfo {
  level: ArchetypeLevel
  playstyle: ArchetypePlaystyle
  themes: string[]
  description: string
  deckSpeed: DeckSpeed
  extraDeckDependency: ExtraDeckDependency
  era: ArchetypeEra
  decisionComplexity: DecisionComplexity
  dominantMechanic: DominantMechanic
  keyCards: string[]
  winCondition: WinCondition
}

/** Clé = nom d'archétype exact tel qu'utilisé ailleurs dans l'app
 *  (même casse que `displayArchetypeName`/`archetype` de l'API YGOPRODeck). */
export const CURATED_ARCHETYPES: Record<string, CuratedArchetypeInfo> = {
  /* ~120-150 entrées, rédigées à la main */
}
```

### Critères de curation (règles suivies pour peupler ce fichier)

- **≥10 cartes au total** dans l'archétype (toutes catégories confondues :
  monstres Main/Extra Deck, Spells, Traps), vérifiable via l'API
  YGOPRODeck (`archetype` field match).
- **Jamais d'archétype fourre-tout générique.** Un label qui regroupe
  plusieurs archétypes réellement distincts (ex: «Roid» qui contient
  Speedroid, Vehicroid, Gimmick Puppet...) n'apparaît pas lui-même dans le
  fichier ; seuls les archétypes spécifiques réels y figurent, chacun avec
  ses propres tags et description. Ce principe existe déjà partiellement
  dans le pipeline actuel au niveau de l'assignation des cartes
  (`hasMoreSpecificArchetype` dans `app/utils/representativeCard.ts`), mais
  ne s'appliquait pas encore au choix des entrées du fichier curé — c'est
  désormais une règle de curation explicite.
- Priorité aux archétypes reconnus/populaires et à une diversité de
  niveaux/thèmes/époques, pas seulement les plus joués en méta actuelle.

## Le questionnaire

Composant `app/components/questionnaire/PreferencesQuestionnaire.vue`,
affiché à la place de l'actuel `StartScreen.vue` (ou juste après un premier
écran d'accueil minimal — détail d'agencement à trancher dans le plan
d'implémentation). 8 questions, une réponse obligatoire par question sauf
la question thèmes (multi-select, «peu importe» = aucune sélection
valide) :

| # | Question | Champ ciblé | Type |
|---|---|---|---|
| 1 | Ton niveau à Yu-Gi-Oh! ? | `level` | choix unique (3 options) |
| 2 | Tu préfères jouer contrôle, agressif, combo ou midrange ? | `playstyle` | choix unique (4 options) |
| 3 | Quels thèmes t'attirent ? | `themes` | multi-select |
| 4 | Rythme de jeu préféré (rapide/moyen/lent) ? | `deckSpeed` | choix unique (3 options) |
| 5 | Tu préfères un jeu Main Deck ou beaucoup d'Extra Deck ? | `extraDeckDependency` | choix unique (3 options) |
| 6 | Nostalgie ou dernières sorties ? | `era` | choix unique (4 options, dont «peu importe») |
| 7 | Un mécanisme à éviter (Pendule, Lien, Rituel...) ? | `dominantMechanic` (pénalité) | choix unique (liste des mécanismes + «aucun») |
| 8 | Tu préfères gagner par OTK, par usure, par verrouillage ou par contrôle de board ? | `winCondition` | choix unique (4 options) |

Après chaque réponse, le compteur d'archétypes correspondants (voir
Scoring ci-dessous) est recalculé et affiché. Bouton «Valider» actif dès
que toutes les questions obligatoires ont une réponse (thèmes exclu, qui
peut rester vide = pas de préférence).

## Scoring et seuil d'inclusion

Chaque question répondue attribue des points aux archétypes du fichier
curé dont le champ correspondant correspond à la réponse :

- Questions 1, 2, 4, 5, 6, 8 (`level`, `playstyle`, `deckSpeed`,
  `extraDeckDependency`, `era`, `winCondition`) : **+10 points** si le champ
  de l'archétype correspond exactement à la réponse choisie, **0** sinon.
- Question 3 (`themes`, multi-select) : **+10 points** si au moins un des
  thèmes sélectionnés est présent dans `themes` de l'archétype, **0**
  sinon. Si aucun thème n'est sélectionné, cette question ne contribue à
  aucun score (score neutre, ni bonus ni pénalité, pour tous les
  archétypes).
- Question 7 (`dominantMechanic` à éviter) : **-15 points** si le
  `dominantMechanic` de l'archétype correspond au mécanisme choisi comme
  «à éviter», **0** sinon. Si l'utilisateur répond «aucun», cette question
  ne contribue à aucun score.

Le score maximum atteignable à un instant donné = somme des poids positifs
(+10) des questions déjà répondues qui contribuent effectivement (donc
questions 1,2,4,5,6,8 toujours ; question 3 seulement si des thèmes sont
sélectionnés). La pénalité de la question 7 ne compte pas dans le maximum
théorique (une pénalité ne peut pas faire dépasser le score max, elle ne
fait que le réduire pour les archétypes concernés).

**Seuil d'inclusion : un archétype est retenu si son score ≥ 60% du score
maximum atteignable** avec les réponses données jusqu'ici (recalculé en
direct à chaque réponse). Comme le score maximum et le seuil évoluent
ensemble à chaque question répondue, le nombre d'archétypes affichés dans
le compteur peut aussi bien monter que descendre d'une question à l'autre.

Ce seuil ne peut jamais produire un pool vide *dans l'absolu* : avec 0
question répondue, tous les archétypes du fichier curé ont un score de 0
sur un maximum de 0, donc **tous sont inclus par défaut** (règle spéciale :
score max = 0 ⟹ tout le monde passe). Il reste possible, une fois plusieurs
questions répondues, d'arriver à un pool très réduit si les réponses sont
très spécifiques et qu'aucun archétype curé ne les combine toutes — c'est
un résultat voulu (l'utilisateur voit le compteur baisser en direct et peut
ajuster ses réponses avant de valider), pas un cas d'erreur à corriger
automatiquement.

## Flux de démarrage

`app/pages/index.vue` (déjà réduit à de l'orchestration pure après le
cycle de refactor précédent) change son état initial : au lieu d'afficher
`StartScreen.vue` puis d'appeler directement `startTournament()`, il
affiche `PreferencesQuestionnaire.vue`. À la validation du questionnaire,
la liste des noms d'archétypes retenus (clés du sous-ensemble filtré de
`CURATED_ARCHETYPES`) est passée à `useTournamentState()` pour démarrer le
tournoi sur ce pool, au lieu du pool actuel issu de
`fetchAndAnalyzeArchetypes()`/`getCachedValidArchetypes()`. Ces fonctions
et tout le pipeline `archetypeIntelligence.ts` restent inchangés dans le
code (pas de suppression) mais ne sont plus appelés par le flux de
démarrage par défaut.

Comme le pool provient déjà d'un fichier statique (pas d'appel API pour la
liste elle-même), le chargement des cartes/images pour les premiers duels
suit le même mécanisme de fetch à la demande qu'aujourd'hui
(`ensureRepresentatives`, préchargement du groupe suivant) — inchangé.

## UI enrichie de détail d'archétype

`ArchetypeModal.vue` (composant déjà extrait lors du cycle de refactor
précédent) affiche, en plus du contenu actuel (liste de cartes, recherche,
badge de cohérence) : la description, les tags (niveau, playstyle, thèmes,
vitesse, dépendance Extra Deck, ère, mécanisme dominant), les cartes clés
et la condition de victoire — uniquement pour les archétypes présents dans
`CURATED_ARCHETYPES` (fallback : rien de plus affiché si l'archétype n'est
pas dans le fichier curé, ce qui ne devrait plus arriver une fois le
questionnaire obligatoire puisque le pool est toujours un sous-ensemble du
fichier curé).

Un bouton «i» est ajouté sur `ArchetypeCard.vue`, visible pendant les
duels (phases 1/2/3, dans `MatchBoard.vue`), qui ouvre `ArchetypeModal.vue`
pour l'archétype concerné sans interrompre le duel en cours (l'état de
sélection du duel n'est pas affecté par l'ouverture/fermeture de la
modal).

## Critères de succès

- Le questionnaire s'affiche systématiquement avant tout tournoi, sans
  moyen de le contourner.
- Le compteur d'archétypes correspondants se met à jour après chaque
  réponse, avant la validation finale.
- Le pool de départ du tournoi ne contient que des archétypes présents
  dans `CURATED_ARCHETYPES` et satisfaisant le seuil de score au moment de
  la validation.
- `curatedArchetypes.ts` contient entre 120 et 150 entrées, aucune ne
  correspondant à un label fourre-tout générique, toutes avec ≥10 cartes
  au total.
- Le bouton «i» ouvre la description complète d'un archétype pendant un
  duel, sans perturber la sélection en cours.

## Risques

- **Volume de rédaction.** 120-150 archétypes × 11 champs est un contenu
  conséquent à produire en une passe ; un archétype mal classé (mauvais
  `level` ou `dominantMechanic`) ne casse rien techniquement mais dégrade
  la pertinence du questionnaire pour cet archétype précis.
- **Duels avec pool très réduit.** Si le pool filtré descend sous ~8-10
  archétypes, la phase 1 (groupes de 4) et la détection de convergence en
  phase 2/3 (pensées pour des pools plus larges) pourraient se comporter
  de façon dégradée (peu de rounds, peu de diversité). Ce risque est
  atténué par le compteur en direct (l'utilisateur voit le pool se
  réduire avant de valider) mais aucun garde-fou technique n'empêche de
  lancer un tournoi avec un pool minimal — à surveiller lors de
  l'implémentation, sans bloquer ce cycle si le comportement reste
  fonctionnel (pas de crash) même avec un pool réduit.
