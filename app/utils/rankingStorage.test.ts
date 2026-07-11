import { describe, it, expect } from 'vitest'
import { getTop10, exportTop10Csv } from './csv'
import type { TournamentState, ArchetypeState } from '~/types/tournament'

function makeState (archetypes: Record<string, ArchetypeState>, overrides: Partial<TournamentState> = {}): TournamentState {
  return {
    runId: 'run-1234',
    createdAt: new Date().toISOString(),
    seed: 1,
    phase: 'finished',
    archetypes,
    remainingNames: Object.keys(archetypes),
    matchesPlayed: [],
    currentMatch: null,
    round: 0,
    initialPoolSize: Object.keys(archetypes).length,
    phaseRound: 0,
    groupsCompleted: 0,
    groupsTotal: 0,
    currentRoundGroups: null,
    phasePool: Object.keys(archetypes),
    ...overrides
  }
}

describe('getTop10', () => {
  it('sorts by descending Elo and caps at 10', () => {
    const archetypes: Record<string, ArchetypeState> = {}
    for (let i = 0; i < 15; i++) {
      archetypes[`arch-${i}`] = { elo: 1000 + i, wins: 1, losses: 0 }
    }
    const top = getTop10(makeState(archetypes))
    expect(top).toHaveLength(10)
    expect(top[0]!.name).toBe('arch-14')
    expect(top[0]!.rank).toBe(1)
  })

  it('excludes archetypes that never played a match', () => {
    const archetypes: Record<string, ArchetypeState> = {
      played: { elo: 1000, wins: 1, losses: 0 },
      unplayed: { elo: 1200, wins: 0, losses: 0 }
    }
    const top = getTop10(makeState(archetypes))
    expect(top.map(r => r.name)).toEqual(['played'])
  })
})

describe('exportTop10Csv', () => {
  it('starts with a UTF-8 BOM and the header row', () => {
    const csv = exportTop10Csv(makeState({ A: { elo: 1010, wins: 1, losses: 0 } }))
    expect(csv.startsWith('﻿Rank,Archetype,Elo,Wins,Losses,Matches Played')).toBe(true)
  })

  it('quotes archetype names containing a comma', () => {
    const csv = exportTop10Csv(makeState({ 'A, the Great': { elo: 1010, wins: 1, losses: 0 } }))
    expect(csv).toContain('"A, the Great"')
  })
})
