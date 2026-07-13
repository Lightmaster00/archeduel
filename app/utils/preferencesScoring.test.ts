import { describe, it, expect } from 'vitest'
import { computeMaxScore, computeArchetypeScore, getMatchingArchetypeNames, deriveEra } from './preferencesScoring'
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
