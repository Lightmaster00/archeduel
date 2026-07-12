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

/** Closed vocabulary so questionnaire options and curated data stay in sync. */
export type ArchetypeTheme =
  | 'dragon' | 'spellcaster' | 'warrior' | 'machine' | 'fiend' | 'zombie'
  | 'beast' | 'fairy' | 'aqua' | 'insect' | 'dinosaur' | 'plant' | 'rock'
  | 'thunder' | 'psychic' | 'wyrm' | 'cyberse' | 'fish' | 'winged-beast'

export const ARCHETYPE_THEMES: ArchetypeTheme[] = [
  'dragon', 'spellcaster', 'warrior', 'machine', 'fiend', 'zombie',
  'beast', 'fairy', 'aqua', 'insect', 'dinosaur', 'plant', 'rock',
  'thunder', 'psychic', 'wyrm', 'cyberse', 'fish', 'winged-beast'
]

export interface CuratedArchetypeInfo {
  level: ArchetypeLevel
  playstyle: ArchetypePlaystyle
  themes: ArchetypeTheme[]
  description: string
  deckSpeed: DeckSpeed
  extraDeckDependency: ExtraDeckDependency
  era: ArchetypeEra
  decisionComplexity: DecisionComplexity
  dominantMechanic: DominantMechanic
  keyCards: string[]
  winCondition: WinCondition
}

/**
 * Key = exact archetype name as used elsewhere in the app (same casing as
 * `capitalizeArchetypeName`/`displayArchetypeName` output — first letter
 * capitalized, rest untouched). Populated by hand across several tasks;
 * ~120-150 entries once complete.
 */
export const CURATED_ARCHETYPES: Record<string, CuratedArchetypeInfo> = {}
