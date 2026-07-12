# Fondations : refactor structurel + robustesse (ESLint + Vitest)

## Contexte

ArcheDuel est une app Nuxt 4 (SPA, sans backend) qui organise un tournoi
d'archétypes Yu-Gi-Oh! (phase 1 par élimination 4-way, phase 2 en 1v1 avec
classement Elo). Le projet n'a ni linter ni tests, et `app/pages/index.vue`
concentre 2095 lignes (script ~270, template ~400, style scoped ~1420) :
orchestration du tournoi, affichage des trois phases, modal de détail
d'archétype, et tout le CSS associé.

L'utilisateur veut améliorer le projet sur 4 axes (qualité de code,
robustesse, fonctionnalités, UX). Vu l'ampleur, le travail est découpé en
cycles indépendants. Ce document couvre le **premier cycle : fondations**
(refactor structurel + linter + tests unitaires), préalable aux cycles
fonctionnalités/UX à venir.

## Objectifs

- Découper `index.vue` en composants plus petits et lisibles, à
  responsabilité unique, **sans changer le comportement observable**.
- Mettre en place ESLint (module officiel `@nuxt/eslint`) et corriger les
  violations existantes.
- Mettre en place Vitest et couvrir les modules de logique métier pure dans
  `app/utils/`.

## Hors périmètre (explicitement exclu de ce cycle)

- Aucune correction de bug ou incohérence rencontrée en cours de route (à
  noter pour un cycle ultérieur, pas à corriger ici).
- Pas d'introduction de Pinia ou d'un autre state manager.
- Pas de refonte des composables existants (`useYgoApi`, `useTournament`,
  `useTournamentState`) — ils restent tels quels sauf ajustement mineur
  requis par l'extraction des composants (ex. passage de props).
- Pas de nouvelles fonctionnalités, pas de retouche visuelle/UX.
- Pas de tests de composants Vue (viendront avec un cycle ultérieur si des
  interactions doivent être validées).

## Découpage de `index.vue`

Nouveaux composants sous `app/components/tournament/` :

- `PhaseOneBoard.vue` — grille de duels 4-way (phase d'élimination).
- `PhaseTwoDuel.vue` — duel 1v1 (phase Elo).
- `TopTenPodium.vue` — classement final (top 10).
- `ArchetypeModal.vue` — modal de détail d'archétype (liste de cartes,
  recherche, résultat de cohérence).
- `TournamentProgressBar.vue` — barre de progression animée entre phases.

`app/pages/index.vue` ne conserve que l'orchestration : état partagé entre
composants, navigation entre phases, câblage des composables existants.

Chaque nouveau composant embarque son propre `<style scoped>` : le CSS
actuellement dans le bloc `<style>` de 1420 lignes est réparti par zone
visuelle vers le composant correspondant. Pas de fichier CSS partagé
supplémentaire.

Le découpage est purement mécanique (déplacement de template + style +
logique locale associée) : aucune logique métier n'est réécrite, seule sa
localisation change. Les props/emits entre `index.vue` et les nouveaux
composants sont conçus au moment du plan d'implémentation, en s'appuyant
sur l'état déjà exposé par `useTournamentState`/`useTournament`.

## ESLint

- Ajout du module `@nuxt/eslint` (flat config générée par Nuxt 4), avec les
  règles recommandées Vue + TypeScript.
- Correction des violations trouvées sans changement de comportement
  (imports inutilisés, typage explicite, etc.).

## Vitest

- Ajout de `vitest` (et `@vue/test-utils` en dépendance, pour usage futur
  uniquement — pas de tests de composants dans ce cycle).
- Tests unitaires sur les modules purs de `app/utils/` (pas de dépendance
  DOM ni API réseau) :
  - `elo.ts` — calcul Elo (K=24, initial 1000).
  - `matchmaking.ts` — appariement par Elo proche, anti-répétition.
  - `csv.ts` — export CSV.
  - `state.ts` — transitions d'état du tournoi (phase 1 → phase 2 → fin).
  - `representativeCard.ts` — sélection de la carte représentative.

## Critères de succès

- `index.vue` ne contient plus que l'orchestration ; chaque composant
  extrait est autonome (props/emits clairs, pas de couplage caché avec le
  parent au-delà de l'état du tournoi).
- `npm run build` et `npm run dev` fonctionnent sans régression visible
  (comportement identique à avant refactor).
- `eslint .` passe sans erreur.
- `vitest run` passe, avec une couverture des cas nominaux et limites pour
  chacun des 5 modules listés ci-dessus.

## Risques

- Le CSS scoped de 1420 lignes peut contenir des règles qui dépendent de la
  structure DOM globale de la page (sélecteurs imbriqués traversant
  plusieurs futures frontières de composants). À vérifier au moment du
  découpage ; si un style dépend de la position relative de deux zones qui
  finissent dans des composants différents, il faudra le garder au niveau
  du parent plutôt que de le déplacer à tort.
