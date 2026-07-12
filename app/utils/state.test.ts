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
