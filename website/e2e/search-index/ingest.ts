// Ingests the reviewer-edited CSV (e2e/search-index/report/last-run.csv) back into
// search-cases.json. The CSV is the source of truth for the case SET: adding a row adds a case,
// deleting a row deletes it, editing the definition columns updates it. Reconciliation is keyed
// entirely by the Search Key (query + preset + facets) — never by row order or line number.
//
// Run with: npm run test:unittests:search-index:ingest-csv
import { existsSync, readFileSync } from 'node:fs'
import { loadCases, parseFacets, searchKey, writeCases, type SearchCase } from './cases.ts'
import {
  CSV_CONFIDENCE_HEADER,
  CSV_EXPECTED_HEADER,
  CSV_NOTE_HEADER,
  CSV_PATH,
  CSV_WITHIN_TOP_N_HEADER
} from './report.ts'

/** Minimal RFC 4180 CSV parser: handles quoted fields, "" escapes, and newlines within quotes. */
const parseCsv = (text: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      field += char
      i += 1
      continue
    }
    if (char === '"') {
      inQuotes = true
      i += 1
    } else if (char === ',') {
      row.push(field)
      field = ''
      i += 1
    } else if (char === '\n' || char === '\r') {
      // End the row on \n, swallowing a following \n after \r (CRLF).
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(field)
      field = ''
      rows.push(row)
      row = []
      i += 1
    } else {
      field += char
      i += 1
    }
  }
  // Flush a trailing field/row if the file didn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

type Confidence = NonNullable<SearchCase['confidence']>
const isConfidence = (value: string): value is Confidence => value === 'high' || value === 'medium' || value === 'low'

const parseExpected = (raw: string): number[] => {
  const numbers = (raw.match(/\d+/g) ?? []).map(Number)
  return [...new Set(numbers)]
}

/** Builds a SearchCase from a CSV row, given the default withinTopN. */
const rowToCase = (get: (header: string) => string, defaultWithinTopN: number): SearchCase => {
  const query = get('query').trim()
  const preset = get('preset').trim()
  if (preset !== 'red' && preset !== 'red-content') {
    throw new Error(`Row for query="${query}": invalid preset "${preset}" (expected red | red-content).`)
  }

  const expected = parseExpected(get(CSV_EXPECTED_HEADER))
  if (expected.length === 0) {
    throw new Error(`Row for query="${query}": no expected RFC number(s) in "${CSV_EXPECTED_HEADER}".`)
  }

  const refinements = parseFacets(get('facets'))
  const withinTopNRaw = get(CSV_WITHIN_TOP_N_HEADER).trim()
  const withinTopN = withinTopNRaw.length > 0 ? Number(withinTopNRaw) : defaultWithinTopN
  const confidenceRaw = get(CSV_CONFIDENCE_HEADER).trim().toLowerCase()
  const note = get(CSV_NOTE_HEADER).trim()

  return {
    query,
    preset,
    ...(refinements ? { refinements } : {}),
    expected,
    ...(withinTopN !== defaultWithinTopN ? { withinTopN } : {}),
    ...(isConfidence(confidenceRaw) ? { confidence: confidenceRaw } : {}),
    ...(note.length > 0 ? { note } : {})
  }
}

const main = () => {
  if (!existsSync(CSV_PATH)) {
    throw new Error(`No CSV at ${CSV_PATH}. Run \`npm run test:unittests:search-index\` first to produce it.`)
  }

  const { defaults, cases: current } = loadCases()
  const priorByKey = new Map(current.map((searchCase) => [searchKey(searchCase), searchCase]))

  const grid = parseCsv(readFileSync(CSV_PATH, 'utf-8')).filter((row) => row.some((cell) => cell.trim().length > 0))
  if (grid.length < 1) throw new Error('CSV is empty.')

  const headers = grid[0]!.map((header) => header.trim())
  const required = ['query', 'preset', 'facets', CSV_EXPECTED_HEADER]
  for (const header of required) {
    if (!headers.includes(header)) throw new Error(`CSV is missing required column "${header}".`)
  }

  const nextByKey = new Map<string, SearchCase>()
  for (let r = 1; r < grid.length; r++) {
    const cells = grid[r]!
    const get = (header: string): string => {
      const index = headers.indexOf(header)
      return index === -1 ? '' : (cells[index] ?? '')
    }
    const key = searchKey({
      query: get('query'),
      preset: get('preset') === 'red-content' ? 'red-content' : 'red',
      refinements: parseFacets(get('facets'))
    })
    if (nextByKey.has(key)) {
      throw new Error(
        `Duplicate Search Key in CSV: query="${get('query')}" preset=${get('preset')} facets="${get('facets')}". ` +
          `A search may have only one row.`
      )
    }
    nextByKey.set(key, rowToCase(get, defaults.withinTopN))
  }

  const added = [...nextByKey.keys()].filter((key) => !priorByKey.has(key))
  const deleted = [...priorByKey.keys()].filter((key) => !nextByKey.has(key))
  const updated = [...nextByKey.entries()].filter(([key, next]) => {
    const prior = priorByKey.get(key)
    return prior && JSON.stringify(next) !== JSON.stringify(prior)
  })

  writeCases([...nextByKey.values()], defaults)

  const log = (...parts: unknown[]) => console.log(...parts) // eslint-disable-line no-console
  log(`Ingested ${CSV_PATH}`)
  log(`  ${nextByKey.size} cases written (${current.length} before)`)
  log(`  + ${added.length} added, ~ ${updated.length} updated, - ${deleted.length} deleted`)
  if (added.length > 0)
    log(
      `  added: ${added
        .map((k) => k.split('\x1f')[0])
        .slice(0, 10)
        .join(', ')}`
    )
  if (deleted.length > 0)
    log(
      `  deleted: ${deleted
        .map((k) => k.split('\x1f')[0])
        .slice(0, 10)
        .join(', ')}`
    )
}

main()
