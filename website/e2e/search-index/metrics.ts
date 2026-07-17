// Rank-weighted, top-k relevance scoring — the metrics the IR field actually uses to judge
// search quality (NDCG@k, MRR@k, precision@k). We score at k=10 because that is the first page
// users actually read; deep ranks (50, 250, …) barely differ to a human, so they barely move the
// score. Regressions are detected on the CORPUS aggregate vs a committed baseline, not per-query.

/** Cutoff for the headline metrics — the "first page" a user realistically scans. */
export const K = 10

export type CaseScore = {
  /** Best (closest to #1) rank among the expected RFCs, or null if none were returned at all. */
  bestRank: number | null
  reciprocalRank: number // 1/bestRank if within K, else 0 (feeds MRR@K)
  ndcg: number // NDCG@K for this case (0..1)
  inTop1: boolean
  inTop3: boolean
  inTop10: boolean
  found: boolean // any expected RFC anywhere in the fetched window (a weak recall signal)
}

const dcgGain = (rank: number): number => 1 / Math.log2(rank + 1)

/** Scores one case given the ordered RFC numbers the index returned and the expected set. */
export const scoreCase = (rfcNumbers: number[], expected: number[]): CaseScore => {
  const ranks = expected.map((rfc) => {
    const index = rfcNumbers.indexOf(rfc)
    return index === -1 ? null : index + 1
  })
  const present = ranks.filter((rank): rank is number => rank !== null)
  const bestRank = present.length > 0 ? Math.min(...present) : null

  // NDCG@K with binary relevance: gain for each expected RFC ranked within K, normalised by the
  // ideal (those same RFCs packed into positions 1..n).
  const dcg = present.filter((rank) => rank <= K).reduce((sum, rank) => sum + dcgGain(rank), 0)
  const idealCount = Math.min(expected.length, K)
  const idcg = Array.from({ length: idealCount }, (_, i) => dcgGain(i + 1)).reduce((sum, gain) => sum + gain, 0)

  return {
    bestRank,
    reciprocalRank: bestRank !== null && bestRank <= K ? 1 / bestRank : 0,
    ndcg: idcg > 0 ? dcg / idcg : 0,
    inTop1: bestRank !== null && bestRank <= 1,
    inTop3: bestRank !== null && bestRank <= 3,
    inTop10: bestRank !== null && bestRank <= K,
    found: bestRank !== null
  }
}

export type AggregateMetrics = {
  n: number
  mrrAt10: number
  ndcgAt10: number
  pctTop1: number
  pctTop3: number
  pctTop10: number
  pctFound: number
}

const mean = (values: number[]): number => (values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length)

/** Aggregates per-case scores into the corpus-level metrics used for regression gating. */
export const aggregate = (scores: CaseScore[]): AggregateMetrics => ({
  n: scores.length,
  mrrAt10: mean(scores.map((s) => s.reciprocalRank)),
  ndcgAt10: mean(scores.map((s) => s.ndcg)),
  pctTop1: mean(scores.map((s) => (s.inTop1 ? 1 : 0))),
  pctTop3: mean(scores.map((s) => (s.inTop3 ? 1 : 0))),
  pctTop10: mean(scores.map((s) => (s.inTop10 ? 1 : 0))),
  pctFound: mean(scores.map((s) => (s.found ? 1 : 0)))
})

export const pct = (value: number): string => `${(value * 100).toFixed(1)}%`
export const round3 = (value: number): number => Math.round(value * 1000) / 1000

// --- regression gating against a committed baseline -------------------------------------------
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import type { Target } from './config.ts'

export type MetricsBaseline = {
  target: Target
  /** Absolute amount a gated metric may fall below baseline before it counts as a regression. */
  tolerance: number
  metrics: AggregateMetrics
}

/** Metrics that hard-gate the build; the rest are reported for context. */
export const GATED_METRICS = ['mrrAt10', 'pctTop10'] as const

const BASELINE_PATH = resolve(dirname(fileURLToPath(import.meta.url)), 'metrics-baseline.json')

export const loadBaseline = (): MetricsBaseline | undefined => {
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, 'utf-8'))
  } catch {
    return undefined
  }
}

export const writeBaseline = (baseline: MetricsBaseline): string => {
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n', 'utf-8')
  return BASELINE_PATH
}

export type Regression = { metric: (typeof GATED_METRICS)[number]; baseline: number; current: number; floor: number }

/** Returns the gated metrics that fell below (baseline − tolerance). Empty = no regression. */
export const regressions = (current: AggregateMetrics, baseline: MetricsBaseline): Regression[] =>
  GATED_METRICS.flatMap((metric) => {
    const floor = baseline.metrics[metric] - baseline.tolerance
    return current[metric] < floor
      ? [{ metric, baseline: baseline.metrics[metric], current: current[metric], floor }]
      : []
  })
