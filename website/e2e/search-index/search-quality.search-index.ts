// Search-index quality / ranking-regression tests.
//
// Evaluates a golden set of RFC queries against the live Typesense index using rank-weighted,
// top-k metrics (the metrics the IR field uses): NDCG@10, MRR@10, and % of queries whose
// canonical RFC lands in the top 1/3/10. A REGRESSION is a drop in the corpus-level metrics
// beyond a tolerance vs the committed baseline (metrics-baseline.json) — not a per-query rank
// change, which on a live index is too noisy to gate on. Per-query detail goes to the CSV report
// for human review.
//
//   npm run test:unittests:search-index                    # target = prod (default)
//   SEARCH_INDEX_TARGET=staging npm run test:unittests:search-index
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { facetsToString, loadCases } from './cases.ts'
import { getTypesenseConfig } from './config.ts'
import {
  aggregate,
  GATED_METRICS,
  loadBaseline,
  pct,
  regressions,
  scoreCase,
  type AggregateMetrics
} from './metrics.ts'
import { probeConnectivity, searchRfcs } from './typesense-client.ts'
import { writeReports, type CaseReport } from './report.ts'
import { mapPool } from './util.ts'

const FETCH_PER_PAGE = 250 // Typesense caps per_page at 250; metrics only look at the top K anyway.
const CONCURRENCY = 8

const { target } = getTypesenseConfig()
const { defaults, cases } = loadCases()
const baseline = loadBaseline()

const reports: CaseReport[] = []
let metrics: AggregateMetrics

describe('search index ranking quality', () => {
  beforeAll(async () => {
    try {
      await probeConnectivity()
    } catch (error) {
      throw new Error(`Could not reach the Typesense ${target} host.\n${String(error)}`)
    }

    const scored = await mapPool(cases, CONCURRENCY, async (searchCase) => {
      const { query, preset, refinements, expected } = searchCase
      const { rfcNumbers, hits, found } = await searchRfcs({ query, preset, refinements, perPage: FETCH_PER_PAGE })
      const score = scoreCase(rfcNumbers, expected)
      const targetN = searchCase.withinTopN ?? defaults.withinTopN
      const report: CaseReport = {
        query,
        preset,
        facets: facetsToString(refinements),
        expected,
        target: targetN,
        rank: score.bestRank,
        reciprocalRank: score.reciprocalRank,
        ndcg: score.ndcg,
        inTop10: score.inTop10,
        inTopTarget: score.bestRank !== null && score.bestRank <= targetN,
        found: score.found,
        totalMatches: found,
        topResults: hits.slice(0, 5),
        confidence: searchCase.confidence ?? 'medium',
        note: searchCase.note ?? ''
      }
      reports.push(report)
      return score
    })

    metrics = aggregate(scored)
  }, 300_000)

  it('probes every case against the index', () => {
    expect(reports.length).toBe(cases.length)
  })

  // Regression gate: corpus metrics must not fall below the committed baseline (for the same
  // target) by more than its tolerance. When there is no baseline, or it was captured against a
  // different target, we skip the gate (the run is report-only) rather than fail spuriously.
  const gateEnabled = baseline && baseline.target === target
  it.runIf(gateEnabled)(`corpus metrics have not regressed vs baseline (${baseline?.target})`, () => {
    const violations = regressions(metrics, baseline!)
    expect(
      violations,
      violations
        .map(
          (v) =>
            `${v.metric}: ${v.current.toFixed(3)} < floor ${v.floor.toFixed(3)} (baseline ${v.baseline.toFixed(3)})`
        )
        .join('; ')
    ).toEqual([])
  })

  it.skipIf(gateEnabled)('has a metrics baseline for this target (report-only otherwise)', () => {
    // Informational: not failing, just visible in the run when the gate is off.
    expect(reports.length).toBeGreaterThan(0)
  })

  afterAll(() => {
    if (!metrics) return
    const { csvPath } = writeReports(reports)
    const gateNote = gateEnabled
      ? `gating ${GATED_METRICS.join(', ')} vs baseline (tolerance ${baseline!.tolerance})`
      : baseline
        ? `report-only (baseline target=${baseline.target} ≠ run target=${target})`
        : 'report-only (no metrics-baseline.json — run capture-baseline to create one)'

    // eslint-disable-next-line no-console
    console.log(
      `\n── search-index quality (target: ${target}) ──\n` +
        `cases: ${metrics.n}\n` +
        `MRR@10:     ${metrics.mrrAt10.toFixed(3)}\n` +
        `NDCG@10:    ${metrics.ndcgAt10.toFixed(3)}\n` +
        `in top 1:   ${pct(metrics.pctTop1)}\n` +
        `in top 3:   ${pct(metrics.pctTop3)}\n` +
        `in top 10:  ${pct(metrics.pctTop10)}\n` +
        `found @250: ${pct(metrics.pctFound)}\n` +
        `${gateNote}\n` +
        `report: ${csvPath}\n`
    )
  })
})
