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

/** Derives the display era from a real TCG release year (thresholds match the pre-existing ArchetypeEra buckets). */
export function deriveEra (year: number): ArchetypeEra {
  if (year < 2010) return 'classic'
  if (year < 2020) return 'modern'
  return 'recent'
}

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
