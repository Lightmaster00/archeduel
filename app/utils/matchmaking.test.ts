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
