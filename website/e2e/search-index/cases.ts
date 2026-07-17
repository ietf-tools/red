// Shared model for the search-index case corpus: schema, the canonical "Search Key", facet
// (de)serialisation, and load/write helpers. Both the test suite and the CSV ingest script use
// this so the uniqueness rule and the key format cannot drift between them.
//
// SEARCH KEY = query (case-insensitive) + preset + facet refinements. A single search may have
// exactly one definition in search-cases.json; loadCases() throws on any duplicate key.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { z } from 'zod'

// Ground truth is defined independently of the search engine's current behaviour (the golden-set
// / judgment-list principle): a case says which RFC(s) SHOULD rank for a query, never what the
// index currently does. No engine-observed fields (e.g. an anchored rank) live here — those
// belong in the run report and the metrics baseline.
export const SearchCaseSchema = z.object({
  query: z.string(),
  preset: z.enum(['red', 'red-content']),
  refinements: z.record(z.string(), z.array(z.string())).optional(),
  expected: z.array(z.number()).min(1),
  withinTopN: z.number().optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
  note: z.string().optional()
})

export const CaseFileSchema = z.object({
  defaults: z.object({ withinTopN: z.number().default(5) }).default({ withinTopN: 5 }),
  cases: z.array(SearchCaseSchema).min(1)
})

export type SearchCase = z.infer<typeof SearchCaseSchema>
export type CaseFile = z.infer<typeof CaseFileSchema>

const HERE = dirname(fileURLToPath(import.meta.url))
export const CASES_PATH = resolve(HERE, 'search-cases.json')

/**
 * Canonical facet string, e.g. `group.acronym=tls;status.name=Proposed Standard`. Attributes and
 * values are sorted so the same refinements always serialise identically (needed for the Search
 * Key and for stable CSV round-tripping). Facet VALUES keep their case (Typesense filters are
 * case-sensitive); only the query is lower-cased in the key.
 */
export const facetsToString = (refinements: Record<string, string[]> | undefined): string => {
  if (!refinements) return ''
  return Object.entries(refinements)
    .filter(([, values]) => values.length > 0)
    .map(([attribute, values]) => [attribute, [...values].sort()] as const)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([attribute, values]) => `${attribute}=${values.join('|')}`)
    .join(';')
}

/** Inverse of facetsToString. Returns undefined for an empty string. */
export const parseFacets = (text: string): Record<string, string[]> | undefined => {
  const trimmed = text.trim()
  if (trimmed.length === 0) return undefined
  const refinements: Record<string, string[]> = {}
  for (const part of trimmed.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const attribute = part.slice(0, eq).trim()
    const values = part
      .slice(eq + 1)
      .split('|')
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
    if (attribute.length > 0 && values.length > 0) refinements[attribute] = values
  }
  return Object.keys(refinements).length > 0 ? refinements : undefined
}

const KEY_SEP = '\x1f' // ASCII unit separator; cannot occur in query/preset/facet text

/** The Search Key: identical cases (same query/preset/facets) collapse to one string. */
export const searchKey = (searchCase: Pick<SearchCase, 'query' | 'preset' | 'refinements'>): string => {
  const { query, preset, refinements } = searchCase
  return [query.trim().toLowerCase(), preset, facetsToString(refinements)].join(KEY_SEP)
}

/** Reads and validates search-cases.json, enforcing Search Key uniqueness. */
export const loadCases = (): CaseFile => {
  const parsed = CaseFileSchema.parse(JSON.parse(readFileSync(CASES_PATH, 'utf-8')))
  const seen = new Map<string, SearchCase>()
  for (const searchCase of parsed.cases) {
    const key = searchKey(searchCase)
    const existing = seen.get(key)
    if (existing) {
      throw new Error(
        `Duplicate Search Key in search-cases.json: query="${searchCase.query}" preset=${searchCase.preset} ` +
          `facets="${facetsToString(searchCase.refinements)}". A search may have only one definition.`
      )
    }
    seen.set(key, searchCase)
  }
  return parsed
}

/** Serialise a case with a stable key order (nice diffs); omits empty/optional fields. */
const serialiseCase = (searchCase: SearchCase): SearchCase => {
  const { query, preset, refinements, expected, withinTopN, confidence, note } = searchCase
  return {
    query,
    preset,
    ...(refinements && Object.keys(refinements).length > 0 ? { refinements } : {}),
    expected,
    ...(withinTopN !== undefined ? { withinTopN } : {}),
    ...(confidence ? { confidence } : {}),
    ...(note ? { note } : {})
  }
}

const FILE_DESCRIPTION =
  'RFC search-index quality golden set (judgment list). Each case is keyed by its Search Key ' +
  '(query + preset + facets), unique across the file, and states the canonical RFC(s) that SHOULD ' +
  'rank for the query — independent of what the index currently returns. withinTopN (default 5) ' +
  'is the per-case quality target. Regressions are gated on corpus-level rank-weighted metrics ' +
  '(MRR@10, % in top 10) vs metrics-baseline.json, not per-case ranks. Edit via the CSV ' +
  'round-trip: npm run test:unittests:search-index:ingest-csv.'

/** Writes cases back to search-cases.json, sorted by preset then query for stable diffs. */
export const writeCases = (cases: SearchCase[], defaults: CaseFile['defaults']): void => {
  const sorted = [...cases].sort(
    (a, b) => a.preset.localeCompare(b.preset) || a.query.toLowerCase().localeCompare(b.query.toLowerCase())
  )
  const file = {
    $schema: './search-cases.schema.md',
    description: FILE_DESCRIPTION,
    defaults,
    cases: sorted.map(serialiseCase)
  }
  writeFileSync(CASES_PATH, JSON.stringify(file, null, 2) + '\n', 'utf-8')
}
