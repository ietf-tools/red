// Writes the search-quality run to disk as CSV (for non-technical, RFC-savvy reviewers) and JSON.
//
// The CSV is round-trippable. Some columns are the case DEFINITION (query, preset, facets = the
// Search Key, plus expected_rfc, within_top_n, confidence, note); a reviewer edits/deletes/adds
// rows and folds them back with the ingest-csv script, which reads those columns by header NAME
// (so column order here is cosmetic). The rest are the OBSERVED result of the run (rank,
// reciprocal rank, NDCG@10, whether it made the first page, the top-5 returned) — ignored on
// ingest, there for human judgement.
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { round3 } from './metrics.ts'

export type CaseReport = {
  query: string
  preset: string
  facets: string
  expected: number[]
  target: number
  rank: number | null
  reciprocalRank: number
  ndcg: number
  inTop10: boolean
  inTopTarget: boolean
  found: boolean
  totalMatches: number
  topResults: { rfcNumber: number; title: string }[]
  confidence: string
  note: string
}

const HERE = dirname(fileURLToPath(import.meta.url))
const REPORT_DIR = resolve(HERE, 'report')
export const CSV_PATH = resolve(REPORT_DIR, 'last-run.csv')
const JSON_PATH = resolve(REPORT_DIR, 'last-run.json')

/** RFC 4180 CSV escaping: wrap in quotes and double any embedded quotes. */
const csvCell = (value: string | number | boolean): string => `"${String(value).replaceAll('"', '""')}"`

// Column headers ingest-csv reads to rebuild a case. Keep in sync with ingest.ts.
export const CSV_EXPECTED_HEADER = 'expected_rfcs'
export const CSV_WITHIN_TOP_N_HEADER = 'within_top_n'
export const CSV_CONFIDENCE_HEADER = 'confidence'
export const CSV_NOTE_HEADER = 'note'

// Column order is cosmetic — ingest-csv reads the definition columns (query, preset, facets,
// expected_rfc, within_top_n, confidence, note) by header NAME, so this can be reordered freely.
const COLUMNS: { header: string; get: (report: CaseReport) => string | number | boolean }[] = [
  { header: 'preset', get: (r) => r.preset },
  { header: 'query', get: (r) => r.query },
  { header: 'facets', get: (r) => r.facets },
  { header: CSV_EXPECTED_HEADER, get: (r) => r.expected.join(',') },
  { header: CSV_CONFIDENCE_HEADER, get: (r) => r.confidence },
  { header: 'total_matches', get: (r) => r.totalMatches },
  { header: 'in_top_10', get: (r) => (r.inTop10 ? 'YES' : 'NO') },
  { header: 'in_top_target', get: (r) => (r.inTopTarget ? 'YES' : 'NO') },
  { header: CSV_WITHIN_TOP_N_HEADER, get: (r) => r.target },
  { header: CSV_NOTE_HEADER, get: (r) => r.note },
  { header: 'actual_rank', get: (r) => (r.rank === null ? 'NOT FOUND' : r.rank) },
  { header: 'reciprocal_rank', get: (r) => round3(r.reciprocalRank) },
  { header: 'ndcg_at_10', get: (r) => round3(r.ndcg) },
  {
    header: 'top_5_returned',
    get: (r) =>
      r.topResults
        .slice(0, 5)
        .map((hit) => `${hit.rfcNumber}: ${hit.title}`)
        .join('  ||  ')
  }
]

export const writeReports = (reports: CaseReport[]): { csvPath: string; jsonPath: string } => {
  mkdirSync(REPORT_DIR, { recursive: true })

  // Findings first: worst NDCG first, so the queries that hurt quality most are at the top.
  const ordered = [...reports].sort((a, b) => a.ndcg - b.ndcg || (b.rank ?? Infinity) - (a.rank ?? Infinity))

  const header = COLUMNS.map((column) => csvCell(column.header)).join(',')
  const rows = ordered.map((report) => COLUMNS.map((column) => csvCell(column.get(report))).join(','))
  writeFileSync(CSV_PATH, [header, ...rows].join('\n') + '\n', 'utf-8')
  writeFileSync(JSON_PATH, JSON.stringify(ordered, null, 2) + '\n', 'utf-8')

  return { csvPath: CSV_PATH, jsonPath: JSON_PATH }
}
