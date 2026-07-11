import { describe, it, expect } from 'vitest'
import { expectedScore, applyElo, applyGroupElo } from './elo'

describe('expectedScore', () => {
  it('returns 0.5 for equal Elo', () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5)
  })

  it('favors the higher-rated player', () => {
    expect(expectedScore(1200, 1000)).toBeGreaterThan(0.5)
    expect(expectedScore(1000, 1200)).toBeLessThan(0.5)
  })
})

describe('applyElo', () => {
  it('increases the winner Elo and decreases the loser Elo on an even match', () => {
    const { newWinner, newLoser } = applyElo(1000, 1000, 32)
    expect(newWinner).toBe(1016)
    expect(newLoser).toBe(984)
  })

  it('gives fewer points to a favorite beating a big underdog', () => {
    const favoriteWins = applyElo(1400, 1000, 32)
    const underdogWins = applyElo(1000, 1400, 32)
    const favoriteGain = favoriteWins.newWinner - 1400
    const underdogGain = underdogWins.newWinner - 1000
    expect(underdogGain).toBeGreaterThan(favoriteGain)
  })

  it('uses K=32 by default', () => {
    const withDefault = applyElo(1000, 1000)
    const withExplicitK = applyElo(1000, 1000, 32)
    expect(withDefault).toEqual(withExplicitK)
  })
})

describe('applyGroupElo', () => {
  it('applies elo changes against every loser for the winner', () => {
    const { newWinner, newLosers } = applyGroupElo(1000, [1000, 1000, 1000], 16)
    expect(newWinner).toBeGreaterThan(1000)
    expect(newLosers).toHaveLength(3)
    for (const loserElo of newLosers) {
      expect(loserElo).toBeLessThan(1000)
    }
  })

  it('returns an empty losers array when there are no losers', () => {
    const { newWinner, newLosers } = applyGroupElo(1000, [], 16)
    expect(newWinner).toBe(1000)
    expect(newLosers).toEqual([])
  })
})
