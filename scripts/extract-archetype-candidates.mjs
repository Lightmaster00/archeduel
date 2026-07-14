// One-off script: no Nuxt/TS build needed, run with `node scripts/extract-archetype-candidates.mjs`.
// Fetches YGOPRODeck's archetype list, filters to real/playable archetypes (>=10 cards),
// diffs against app/data/curatedArchetypes.ts, and writes the candidate list to disk.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CURATED_FILE = join(ROOT, 'app/data/curatedArchetypes.ts')
const OUTPUT_FILE = join(ROOT, 'docs/superpowers/plans/2026-07-13-archetype-candidates.json')

const ARCHETYPES_URL = 'https://db.ygoprodeck.com/api/v7/archetypes.php'
const CARDINFO_URL = 'https://db.ygoprodeck.com/api/v7/cardinfo.php'
const MIN_CARDS = 10
const DELAY_MS = 60 // ~16 req/s, safely under the 20 req/s limit

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Extracts the exact object keys already present in CURATED_ARCHETYPES (handles both quote styles). */
function extractExistingKeys (source) {
  const marker = 'export const CURATED_ARCHETYPES'
  const start = source.indexOf(marker)
  const braceStart = source.indexOf('{', start)
  const lines = source.slice(braceStart).split('\n')
  const keyRe = /^\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")\s*:\s*\{/
  const keys = new Set()
  for (const line of lines) {
    const m = line.match(keyRe)
    if (m) keys.add((m[1] ?? m[2]).replace(/\\'/g, "'"))
  }
  return keys
}

async function fetchAllArchetypeNames () {
  const res = await fetch(ARCHETYPES_URL)
  const data = await res.json()
  return data.map(entry => entry.archetype_name)
}

async function countCardsForArchetype (name) {
  const url = `${CARDINFO_URL}?archetype=${encodeURIComponent(name)}&format=tcg`
  try {
    const res = await fetch(url)
    if (!res.ok) return 0
    const json = await res.json()
    return Array.isArray(json?.data) ? json.data.length : 0
  } catch {
    return 0
  }
}

async function main () {
  const existingKeys = extractExistingKeys(readFileSync(CURATED_FILE, 'utf8'))
  console.log(`Existing curated entries: ${existingKeys.size}`)

  const allNames = await fetchAllArchetypeNames()
  console.log(`Fetched ${allNames.length} raw archetype names from archetypes.php`)

  const candidates = []
  for (const name of allNames) {
    if (existingKeys.has(name)) continue
    const cardCount = await countCardsForArchetype(name)
    if (cardCount >= MIN_CARDS) {
      candidates.push({ name, cardCount })
    }
    await sleep(DELAY_MS)
  }

  candidates.sort((a, b) => a.name.localeCompare(b.name))
  writeFileSync(OUTPUT_FILE, JSON.stringify(candidates, null, 2) + '\n')
  console.log(`Wrote ${candidates.length} candidates to ${OUTPUT_FILE}`)
}

main()
