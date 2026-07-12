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
export const CURATED_ARCHETYPES: Record<string, CuratedArchetypeInfo> = {
  'Blue-Eyes': {
    level: 'beginner',
    playstyle: 'aggro',
    themes: ['dragon'],
    description: "The most iconic dragon deck in Yu-Gi-Oh!, built around very high-ATK monsters and straightforward Fusion Summons into powerful multi-headed dragons. Easy to pick up, hard to out-muscle.",
    deckSpeed: 'medium',
    extraDeckDependency: 'medium',
    era: 'classic',
    decisionComplexity: 'linear',
    dominantMechanic: 'fusion',
    keyCards: ['Blue-Eyes White Dragon', 'Blue-Eyes Ultimate Dragon', 'Neo Tachyon Dragon'],
    winCondition: 'board-control'
  },
  'Eldlich': {
    level: 'intermediate',
    playstyle: 'control',
    themes: ['zombie'],
    description: "A patient control deck that stockpiles field cards to overwhelm opponents with recurring zombies and traps, punishing decks that rush in without a plan.",
    deckSpeed: 'slow',
    extraDeckDependency: 'low',
    era: 'modern',
    decisionComplexity: 'moderate',
    dominantMechanic: 'main-deck',
    keyCards: ['Eldlich the Golden Lord', 'Eldlixir of Scarlet Sanguine', 'Golden Land Forever'],
    winCondition: 'grind'
  },
  'Red-Eyes': {
    level: 'beginner',
    playstyle: 'aggro',
    themes: ['dragon'],
    description: "A beatdown deck anchored by Red-Eyes Black Dragon, mixing classic high-ATK dragons with modern Fusion and Synchro support to keep pressuring the opponent. Straightforward to play, rewarding aggressive attacks and simple resource trades.",
    deckSpeed: 'medium',
    extraDeckDependency: 'medium',
    era: 'classic',
    decisionComplexity: 'linear',
    dominantMechanic: 'fusion',
    keyCards: ['Red-Eyes Black Dragon', 'Red-Eyes Darkness Metal Dragon', 'Red-Eyes Fusion', 'Meteor Black Dragon'],
    winCondition: 'board-control'
  },
  'Dark Magician': {
    level: 'beginner',
    playstyle: 'midrange',
    themes: ['spellcaster'],
    description: "The signature spellcaster deck built around protecting and empowering Dark Magician through dedicated spells and traps. Offers a satisfying, thematic playstyle with strong single-target removal and burn options.",
    deckSpeed: 'medium',
    extraDeckDependency: 'medium',
    era: 'classic',
    decisionComplexity: 'linear',
    dominantMechanic: 'main-deck',
    keyCards: ['Dark Magician', 'Dark Magical Circle', 'Eternal Soul', 'Dark Magician Girl'],
    winCondition: 'board-control'
  },
  'Elemental HERO': {
    level: 'intermediate',
    playstyle: 'combo',
    themes: ['warrior'],
    description: "A Fusion-centric deck that mixes and matches Elemental Heroes to create versatile Fusion Monsters on the fly, adapting its combos to whatever the opponent throws at it. Rewards creative deckbuilding and comfort with Fusion Summoning.",
    deckSpeed: 'medium',
    extraDeckDependency: 'high',
    era: 'classic',
    decisionComplexity: 'moderate',
    dominantMechanic: 'fusion',
    keyCards: ['Elemental HERO Sparkman', 'Miracle Fusion', 'Elemental HERO Absolute Zero', 'Polymerization'],
    winCondition: 'board-control'
  },
  'Cyber Dragon': {
    level: 'beginner',
    playstyle: 'aggro',
    themes: ['machine'],
    description: "A machine beatdown deck built around Special Summoning Cyber Dragon for free against monster-heavy boards, then chaining into powerful Fusion finishers. Simple to operate and punishing against decks that overextend their monster zones.",
    deckSpeed: 'fast',
    extraDeckDependency: 'medium',
    era: 'classic',
    decisionComplexity: 'linear',
    dominantMechanic: 'fusion',
    keyCards: ['Cyber Dragon', 'Cyber Dragon Nova', 'Power Bond', 'Chimeratech Fortress Dragon'],
    winCondition: 'otk'
  },
  'Six Samurai': {
    level: 'intermediate',
    playstyle: 'aggro',
    themes: ['warrior'],
    description: "A swarm deck that floods the field with Samurai warriors to fuel explosive Synchro Summons, rewarding careful sequencing of its many searchers and swarm effects. Rushes opponents down before they can stabilize.",
    deckSpeed: 'fast',
    extraDeckDependency: 'high',
    era: 'modern',
    decisionComplexity: 'moderate',
    dominantMechanic: 'synchro',
    keyCards: ['Great Shogun Shien', "Shien's Smoke Signal", 'Legendary Six Samurai - Shi En', 'Kagemusha of the Six Samurai'],
    winCondition: 'otk'
  },
  'Harpie': {
    level: 'beginner',
    playstyle: 'aggro',
    themes: ['winged-beast'],
    description: "A wind-themed beatdown deck centered on Harpie Lady and her sisters, using spell/trap destruction and ATK-boosting support to overpower the field. Easy to learn with a clear game plan of buffing and swinging.",
    deckSpeed: 'medium',
    extraDeckDependency: 'low',
    era: 'classic',
    decisionComplexity: 'linear',
    dominantMechanic: 'main-deck',
    keyCards: ['Harpie Lady', 'Elegant Egotist', "Harpies' Hunting Ground", "Harpie's Feather Duster"],
    winCondition: 'board-control'
  },
  'Gladiator Beast': {
    level: 'expert',
    playstyle: 'combo',
    themes: ['beast'],
    description: "A tag-team deck where monsters continuously Special Summon each other from the field back into the hand or deck, generating relentless pressure and tricky tempo plays. Demands precise sequencing to maximize its chain of tag-outs.",
    deckSpeed: 'fast',
    extraDeckDependency: 'low',
    era: 'classic',
    decisionComplexity: 'high',
    dominantMechanic: 'main-deck',
    keyCards: ['Gladiator Beast Laquari', 'Gladiator Beast Bestiari', 'Gladiator Beast War Chariot', 'Gladiator Beast Equeste'],
    winCondition: 'otk'
  },
  "Gravekeeper's": {
    level: 'intermediate',
    playstyle: 'control',
    themes: ['spellcaster'],
    description: "A Field Spell-dependent control deck that leverages Necrovalley to lock down graveyard interaction while its spellcasters chip away with disruptive effects. Rewards patient, grindy play over explosive combos.",
    deckSpeed: 'slow',
    extraDeckDependency: 'low',
    era: 'classic',
    decisionComplexity: 'moderate',
    dominantMechanic: 'main-deck',
    keyCards: ['Necrovalley', "Gravekeeper's Spy", "Gravekeeper's Commandant", "Gravekeeper's Descendant"],
    winCondition: 'grind'
  },
  'Photon': {
    level: 'intermediate',
    playstyle: 'midrange',
    themes: ['dragon'],
    description: "A galaxy-themed deck combining Photon and Galaxy monsters into a flexible Xyz toolbox, capable of both grinding value and closing games with Galaxy-Eyes Photon Dragon. Offers a good introduction to Xyz Summoning mechanics.",
    deckSpeed: 'medium',
    extraDeckDependency: 'high',
    era: 'modern',
    decisionComplexity: 'moderate',
    dominantMechanic: 'xyz',
    keyCards: ['Galaxy-Eyes Photon Dragon', 'Photon Thrasher', 'Galaxy Soldier', 'Photon Sabre Tiger'],
    winCondition: 'board-control'
  },
  'Lightsworn': {
    level: 'intermediate',
    playstyle: 'aggro',
    themes: ['fairy'],
    description: "A self-mill aggro deck that dumps its own deck into the graveyard for value, powering out Judgment Dragon and other high-impact effects at the cost of running out of resources over time. Fast, punishing, and prone to sudden explosive turns.",
    deckSpeed: 'fast',
    extraDeckDependency: 'low',
    era: 'modern',
    decisionComplexity: 'moderate',
    dominantMechanic: 'main-deck',
    keyCards: ['Judgment Dragon', 'Celestia, Lightsworn Angel', 'Solar Recharge', 'Lyla, Lightsworn Sorceress'],
    winCondition: 'otk'
  },
  'Mermail': {
    level: 'intermediate',
    playstyle: 'combo',
    themes: ['aqua'],
    description: "A water-based combo deck that chains discard effects into Special Summons, quickly assembling powerful Xyz plays from a mostly water-attribute engine. Rewards knowing the right discard-into-summon sequences.",
    deckSpeed: 'fast',
    extraDeckDependency: 'high',
    era: 'modern',
    decisionComplexity: 'moderate',
    dominantMechanic: 'xyz',
    keyCards: ['Mermail Abyssleed', 'Atlantean Dragoons', 'Abyss-sphere', 'Deep Sea Diva'],
    winCondition: 'otk'
  },
  'Fire Fist': {
    level: 'intermediate',
    playstyle: 'midrange',
    themes: ['beast'],
    description: "A beast-warrior deck that uses low-cost Level 4 monsters to swarm into flexible Synchro and Xyz plays, generating card advantage through its Rooster and Bear effects. Balances aggression with resource generation.",
    deckSpeed: 'medium',
    extraDeckDependency: 'high',
    era: 'modern',
    decisionComplexity: 'moderate',
    dominantMechanic: 'synchro',
    keyCards: ['Brotherhood of the Fire Fist - Tiger King', 'Brotherhood of the Fire Fist - Bear', 'Brotherhood of the Fire Fist - Rooster', 'Fire Formation - Tenki'],
    winCondition: 'board-control'
  },
  'Shaddoll': {
    level: 'expert',
    playstyle: 'control',
    themes: ['fiend'],
    description: "A disruptive control deck that turns its own monsters being sent to the graveyard into flip effects, punishing the opponent for interacting and grinding out advantage over the course of a duel. Rewards careful timing over raw speed.",
    deckSpeed: 'medium',
    extraDeckDependency: 'medium',
    era: 'modern',
    decisionComplexity: 'high',
    dominantMechanic: 'fusion',
    keyCards: ['El Shaddoll Winda', 'El Shaddoll Construct', 'Shaddoll Fusion', 'El Shaddoll Grysta'],
    winCondition: 'grind'
  },
  'Qliphort': {
    level: 'expert',
    playstyle: 'control',
    themes: ['machine'],
    description: "A lockdown deck built around Qliphort Scout that shuts off the opponent's ability to Special Summon while its own Pendulum monsters attack freely. Demands precise resource management to keep its Continuous Spells online.",
    deckSpeed: 'slow',
    extraDeckDependency: 'low',
    era: 'modern',
    decisionComplexity: 'high',
    dominantMechanic: 'pendulum',
    keyCards: ['Qliphort Scout', 'Qliphort Genius', 'Qli Disintegration', 'Qliphort Shell'],
    winCondition: 'lockdown'
  },
  'Burning Abyss': {
    level: 'intermediate',
    playstyle: 'midrange',
    themes: ['fiend'],
    description: "A graveyard-value fiend deck that punishes discards by Special Summoning powerful demons, converting hand disruption into board presence. Compact and consistent, with a low reliance on the Extra Deck for its core plays.",
    deckSpeed: 'medium',
    extraDeckDependency: 'low',
    era: 'modern',
    decisionComplexity: 'moderate',
    dominantMechanic: 'main-deck',
    keyCards: ['Dante, Traveler of the Burning Abyss', 'Cir, Malebranche of the Burning Abyss', 'Graff, Malebranche of the Burning Abyss', 'Beatrice, Lady of the Eternal'],
    winCondition: 'board-control'
  },
  'Nekroz': {
    level: 'expert',
    playstyle: 'control',
    themes: ['spellcaster'],
    description: "A Ritual Summoning deck that recycles its own resources by returning Ritual Spells and monsters to the hand, letting it rebuild after every play. One of the most resource-efficient decks ever printed, rewarding tight sequencing.",
    deckSpeed: 'fast',
    extraDeckDependency: 'low',
    era: 'modern',
    decisionComplexity: 'high',
    dominantMechanic: 'ritual',
    keyCards: ['Nekroz of Trishula', 'Nekroz of Valkyrus', 'Nekroz Kaleidoscope', 'Nekroz of Unicore'],
    winCondition: 'otk'
  },
  'Kozmo': {
    level: 'intermediate',
    playstyle: 'aggro',
    themes: ['machine'],
    description: "A space-themed beatdown deck that uses its spaceship monsters to cheat out large-bodied threats from the Extra Deck ahead of schedule, applying immense pressure with big attackers. Rewards careful management of its unique summoning costs.",
    deckSpeed: 'fast',
    extraDeckDependency: 'high',
    era: 'modern',
    decisionComplexity: 'moderate',
    dominantMechanic: 'fusion',
    keyCards: ['Kozmo Dark Destroyer', 'Kozmo Dark Planet', 'Kozmotown', 'Kozmo Farmgirl'],
    winCondition: 'otk'
  },
  'Yosenju': {
    level: 'intermediate',
    playstyle: 'control',
    themes: ['beast'],
    description: "A disruptive beast deck that bounces and destroys the opponent's cards through hand-trap-like monster effects, controlling the pace of the duel before its Xyz plays close things out. Rewards patient, reactive play.",
    deckSpeed: 'medium',
    extraDeckDependency: 'medium',
    era: 'modern',
    decisionComplexity: 'moderate',
    dominantMechanic: 'xyz',
    keyCards: ['Yosenju Kama 1', 'Yosenju Tsujik', 'Yosenju Shinchu', 'Yosen Valley'],
    winCondition: 'board-control'
  },
  'Zoodiac': {
    level: 'expert',
    playstyle: 'combo',
    themes: ['beast'],
    description: "A hyper-consistent combo deck that chains Xyz Summons through its animal-themed monsters, generating an overwhelming number of extra Normal Summons and Special Summons in a single turn. One of the most demanding decks to pilot correctly.",
    deckSpeed: 'fast',
    extraDeckDependency: 'high',
    era: 'modern',
    decisionComplexity: 'high',
    dominantMechanic: 'xyz',
    keyCards: ['Zoodiac Barrage', 'Zoodiac Ratpier', 'Zoodiac Drident', 'Zoodiac Broadbull'],
    winCondition: 'otk'
  },
  'Trickstar': {
    level: 'beginner',
    playstyle: 'control',
    themes: ['fairy'],
    description: "A burn-oriented control deck that punishes the opponent for Special Summoning while chipping away at their life points with its idol-themed monsters. Straightforward to pilot with a clear disruption-and-burn game plan.",
    deckSpeed: 'medium',
    extraDeckDependency: 'low',
    era: 'modern',
    decisionComplexity: 'linear',
    dominantMechanic: 'main-deck',
    keyCards: ['Trickstar Candina', 'Trickstar Lightstage', 'Trickstar Reincarnation', 'Trickstar Lycoris'],
    winCondition: 'grind'
  },
  'Orcust': {
    level: 'expert',
    playstyle: 'combo',
    themes: ['machine'],
    description: "A graveyard-based combo deck that uses its own monsters being destroyed as a resource, chaining into Synchro Summons to disrupt the opponent's Extra Deck plays. Requires careful line-building to maximize each turn's value.",
    deckSpeed: 'fast',
    extraDeckDependency: 'high',
    era: 'modern',
    decisionComplexity: 'high',
    dominantMechanic: 'synchro',
    keyCards: ['Orcust Harp Horror', 'Orcustrated Babel', 'Disciple of the Forbidden Spell', 'Orcust Cymbal Skeleton'],
    winCondition: 'lockdown'
  },
  'Dinomist': {
    level: 'intermediate',
    playstyle: 'aggro',
    themes: ['dinosaur'],
    description: "A Pendulum deck that recycles its dinosaur monsters between the field and Extra Deck, rebuilding its board after every wipe. Punishes single removal effects and keeps the pressure on with recurring attackers.",
    deckSpeed: 'medium',
    extraDeckDependency: 'high',
    era: 'modern',
    decisionComplexity: 'moderate',
    dominantMechanic: 'pendulum',
    keyCards: ['Dinomist Rex', 'Dinomist Stegosaur', 'Dinomist Ceratops', 'Dinomic Reborn'],
    winCondition: 'board-control'
  },
  'Subterror': {
    level: 'intermediate',
    playstyle: 'control',
    themes: ['fiend'],
    description: "A trap-heavy control deck that flips its monsters face-down to reset their effects, generating repeated disruption and value from a small trap package. Rewards patient setup over quick aggression.",
    deckSpeed: 'slow',
    extraDeckDependency: 'low',
    era: 'modern',
    decisionComplexity: 'moderate',
    dominantMechanic: 'spell-trap',
    keyCards: ['Subterror Behemoth Stalagmo', 'Subterror Behemoth Umastryx', 'Subterror Guru', 'Subterranean Rikka'],
    winCondition: 'grind'
  },
  'Metalfoes': {
    level: 'intermediate',
    playstyle: 'combo',
    themes: ['dragon'],
    description: "A Pendulum toolbox deck that fuses its metal-themed monsters together to build a resilient board, mixing Fusion and Pendulum mechanics into flexible, recurring plays. Rewards understanding of its many combo lines.",
    deckSpeed: 'medium',
    extraDeckDependency: 'high',
    era: 'modern',
    decisionComplexity: 'high',
    dominantMechanic: 'fusion',
    keyCards: ['Metalfoes Fusion', 'Metalfoes Steelen', 'Metalfoes Volflame', 'Metalfoes Orichalc'],
    winCondition: 'board-control'
  },
  'Altergeist': {
    level: 'expert',
    playstyle: 'control',
    themes: ['machine'],
    description: "A trap-and-Link control deck that disrupts the opponent's Extra Deck plays while quietly assembling a defensive board of Link Monsters. Rewards patient, disruption-first play over proactive aggression.",
    deckSpeed: 'slow',
    extraDeckDependency: 'medium',
    era: 'modern',
    decisionComplexity: 'high',
    dominantMechanic: 'link',
    keyCards: ['Altergeist Multifaker', 'Altergeist Meluseek', 'Altergeist Silquitous', 'Altergeist Protocol'],
    winCondition: 'lockdown'
  },
  'Sky Striker': {
    level: 'expert',
    playstyle: 'control',
    themes: ['warrior'],
    description: "A spell-centric control deck built around a single ace monster, Sky Striker Ace - Raye, recycling its spells for repeated disruption and value. Extremely resource-efficient but demanding to sequence correctly.",
    deckSpeed: 'medium',
    extraDeckDependency: 'low',
    era: 'modern',
    decisionComplexity: 'high',
    dominantMechanic: 'link',
    keyCards: ['Sky Striker Ace - Raye', 'Sky Striker Mobilize - Engage!', 'Sky Striker Ace - Kagari', 'Sky Striker Airspace - Girty Rise'],
    winCondition: 'grind'
  },
  'SPYRAL': {
    level: 'intermediate',
    playstyle: 'combo',
    themes: ['machine'],
    description: "A spy-themed combo deck that abuses Special Summons from the hand to flood the field, then locks the opponent out of interaction with its ace monster. Fast and consistent, with a clear game plan every turn.",
    deckSpeed: 'fast',
    extraDeckDependency: 'medium',
    era: 'modern',
    decisionComplexity: 'moderate',
    dominantMechanic: 'link',
    keyCards: ['SPYRAL Super Agent', 'SPYRAL GEAR - Drone', 'SPYRAL Sleeper', 'SPYRAL Resort'],
    winCondition: 'lockdown'
  },
  'Ancient Gear': {
    level: 'beginner',
    playstyle: 'aggro',
    themes: ['machine'],
    description: "A stompy machine deck that fields huge-ATK monsters immune to common negation effects, aiming to simply out-power the opponent. Simple to pilot with few tricky decision points.",
    deckSpeed: 'medium',
    extraDeckDependency: 'low',
    era: 'classic',
    decisionComplexity: 'linear',
    dominantMechanic: 'main-deck',
    keyCards: ['Ancient Gear Golem', 'Ancient Gear Fortress', 'Ancient Gear Castle', 'Ancient Gear Reborn'],
    winCondition: 'board-control'
  },
  'Blackwing': {
    level: 'intermediate',
    playstyle: 'aggro',
    themes: ['winged-beast'],
    description: "A wind-themed swarm deck that chains its bird monsters' summon-triggered effects into rapid Synchro Summons, applying pressure with multiple attackers each turn. Rewards efficient sequencing of its many searchers.",
    deckSpeed: 'fast',
    extraDeckDependency: 'high',
    era: 'modern',
    decisionComplexity: 'moderate',
    dominantMechanic: 'synchro',
    keyCards: ['Blackwing Armor Master', 'Blackwing - Gale the Whirlwind', 'Blackwing - Kalut the Moon Shadow', 'Black Whirlwind'],
    winCondition: 'otk'
  },
  'Karakuri': {
    level: 'intermediate',
    playstyle: 'control',
    themes: ['machine'],
    description: "A puppet-themed deck that recycles its monsters between hand and field, chaining flip and search effects into a resilient board. Rewards patient value generation over explosive turns.",
    deckSpeed: 'medium',
    extraDeckDependency: 'medium',
    era: 'modern',
    decisionComplexity: 'moderate',
    dominantMechanic: 'synchro',
    keyCards: ['Karakuri Shogun mdl 00X "Bureido"', 'Karakuri Watchdog mdl 313 "Saizan"', 'Karakuri Merchant mdl 177 "Inashichi"', 'Karakuri Steel Shogun mdl 00X "Bureido"'],
    winCondition: 'grind'
  },
  'Evilswarm': {
    level: 'intermediate',
    playstyle: 'control',
    themes: ['fiend'],
    description: "An Xyz-focused lockdown deck built around Evilswarm Ophion, which prevents the opponent from activating monster effects while it holds the field. Rewards careful protection of its key pieces once established.",
    deckSpeed: 'medium',
    extraDeckDependency: 'high',
    era: 'modern',
    decisionComplexity: 'moderate',
    dominantMechanic: 'xyz',
    keyCards: ['Evilswarm Ophion', 'Evilswarm Exciton Knight', 'Evilswarm Castor', 'Evilswarm Nightmare'],
    winCondition: 'lockdown'
  },
  'Constellar': {
    level: 'intermediate',
    playstyle: 'combo',
    themes: ['warrior'],
    description: "A star-themed Xyz deck that bounces its own monsters back to the hand to reuse their effects, rebuilding an Xyz-heavy board turn after turn. Rewards understanding of its recursive summoning loops.",
    deckSpeed: 'medium',
    extraDeckDependency: 'high',
    era: 'modern',
    decisionComplexity: 'moderate',
    dominantMechanic: 'xyz',
    keyCards: ['Constellar Pleiades', 'Constellar Sombre', 'Constellar Ptolemy M7', 'Constellar Kaus'],
    winCondition: 'board-control'
  },
  'Naturia': {
    level: 'beginner',
    playstyle: 'midrange',
    themes: ['plant'],
    description: "An earth-themed deck combining plant and beast monsters with a toolbox of flip and Synchro effects, offering a resilient, defensive board presence. Easy to learn with clear, incremental value plays.",
    deckSpeed: 'medium',
    extraDeckDependency: 'medium',
    era: 'classic',
    decisionComplexity: 'linear',
    dominantMechanic: 'synchro',
    keyCards: ['Naturia Beast', 'Naturia Landoise', 'Naturia Barkion', 'Naturia Cliff'],
    winCondition: 'board-control'
  },
  'Madolche': {
    level: 'beginner',
    playstyle: 'control',
    themes: ['fairy'],
    description: "A sweets-themed deck that returns its monsters to the deck instead of the graveyard when destroyed, making it highly resistant to removal and grindy in longer games. Gentle learning curve with a clear defensive plan.",
    deckSpeed: 'slow',
    extraDeckDependency: 'low',
    era: 'modern',
    decisionComplexity: 'linear',
    dominantMechanic: 'main-deck',
    keyCards: ['Madolche Queen Tiaramisu', 'Madolche Hootcake', 'Madolche Chateau', 'Madolche Messengelato'],
    winCondition: 'grind'
  }
}
