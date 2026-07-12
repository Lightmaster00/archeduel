import { describe, it, expect } from 'vitest'
import { pick5Main5Extra, hasValidRepresentatives, filterCardsByArchetype, getExtraPolicy, getCardCategory } from './representativeCard'
import type { YgoCard } from '~/types/api'

function card (overrides: Partial<YgoCard> & { id: number; name: string }): YgoCard {
  return {
    type: 'Effect Monster',
    frameType: 'effect',
    archetype: 'Blue-Eyes',
    atk: 0,
    def: 0,
    desc: '',
    card_sets: [],
    card_images: [],
    ...overrides
  } as YgoCard
}

describe('filterCardsByArchetype', () => {
  it('keeps only cards whose archetype field matches exactly', () => {
    const cards = [
      card({ id: 1, name: 'Blue-Eyes White Dragon', archetype: 'Blue-Eyes' }),
      card({ id: 2, name: 'Unrelated Card', archetype: 'Red-Eyes' })
    ]
    expect(filterCardsByArchetype(cards, 'Blue-Eyes').map(c => c.id)).toEqual([1])
  })

  it('excludes cards belonging to a more specific archetype', () => {
    const cards = [
      card({ id: 1, name: 'Speedroid Terrortop', archetype: 'Speedroid' })
    ]
    expect(filterCardsByArchetype(cards, 'Roid')).toEqual([])
  })

  it('returns an empty array for a blank archetype name', () => {
    expect(filterCardsByArchetype([card({ id: 1, name: 'X' })], '  ')).toEqual([])
  })
})

describe('getCardCategory', () => {
  it('classifies Extra Deck monster types as extra', () => {
    expect(getCardCategory(card({ id: 1, name: 'X', type: 'XYZ Monster', frameType: 'xyz' }))).toBe('extra')
  })

  it('classifies Spell cards as spell', () => {
    expect(getCardCategory(card({ id: 1, name: 'X', type: 'Spell Card', frameType: 'spell' }))).toBe('spell')
  })

  it('classifies non-Extra monsters as main', () => {
    expect(getCardCategory(card({ id: 1, name: 'X', type: 'Effect Monster', frameType: 'effect' }))).toBe('main')
  })
})

describe('hasValidRepresentatives', () => {
  it('requires at least 6 displayable monsters', () => {
    const fiveMonsters = Array.from({ length: 5 }, (_, i) =>
      card({ id: i, name: `Blue-Eyes Monster ${i}`, archetype: 'Blue-Eyes', type: 'Effect Monster' })
    )
    expect(hasValidRepresentatives(fiveMonsters, 'Blue-Eyes')).toBe(false)

    const sixMonsters = Array.from({ length: 6 }, (_, i) =>
      card({ id: i, name: `Blue-Eyes Monster ${i}`, archetype: 'Blue-Eyes', type: 'Effect Monster' })
    )
    expect(hasValidRepresentatives(sixMonsters, 'Blue-Eyes')).toBe(true)
  })
})

describe('pick5Main5Extra', () => {
  it('prioritizes Extra Deck monsters, filling the rest with Main Deck monsters', () => {
    const cards = [
      ...Array.from({ length: 3 }, (_, i) =>
        card({ id: i, name: `Blue-Eyes Xyz ${i}`, archetype: 'Blue-Eyes', type: 'XYZ Monster', frameType: 'xyz' })
      ),
      ...Array.from({ length: 8 }, (_, i) =>
        card({ id: 100 + i, name: `Blue-Eyes Main ${i}`, archetype: 'Blue-Eyes', type: 'Effect Monster' })
      )
    ]
    const { main, extra } = pick5Main5Extra(cards, 'Blue-Eyes')
    expect(extra).toHaveLength(3)
    expect(main).toHaveLength(7)
  })
})

describe('getExtraPolicy', () => {
  it('returns none for an empty Extra Deck', () => {
    expect(getExtraPolicy([])).toBe('none')
  })

  it('returns the single type when the Extra Deck is homogeneous', () => {
    const cards = [card({ id: 1, name: 'X', type: 'Synchro Monster', frameType: 'synchro' })]
    expect(getExtraPolicy(cards)).toBe('synchro')
  })

  it('returns mixed when the Extra Deck spans multiple types', () => {
    const cards = [
      card({ id: 1, name: 'X', type: 'Synchro Monster', frameType: 'synchro' }),
      card({ id: 2, name: 'Y', type: 'XYZ Monster', frameType: 'xyz' })
    ]
    expect(getExtraPolicy(cards)).toBe('mixed')
  })
})
