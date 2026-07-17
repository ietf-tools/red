// Captures the corpus-level metrics baseline the suite gates against, by scoring the whole golden
// set against the live index and writing metrics-baseline.json. Run this to establish a baseline,
// or to re-anchor it after a deliberate, verified relevance improvement.
//
//   npm run test:unittests:search-index:capture-baseline                    # target = prod
//   SEARCH_INDEX_TARGET=staging npm run test:unittests:search-index:capture-baseline
import { loadCases } from './cases.ts'
import { getTypesenseConfig } from './config.ts'
import { aggregate, loadBaseline, pct, round3, scoreCase, writeBaseline, type AggregateMetrics } from './metrics.ts'
import { searchRfcs } from './typesense-client.ts'
import { mapPool } from './util.ts'

const CONCURRENCY = 8
const DEFAULT_TOLERANCE = 0.03

const roundMetrics = (metrics: AggregateMetrics): AggregateMetrics => ({
  n: metrics.n,
  mrrAt10: round3(metrics.mrrAt10),
  ndcgAt10: round3(metrics.ndcgAt10),
  pctTop1: round3(metrics.pctTop1),
  pctTop3: round3(metrics.pctTop3),
  pctTop10: round3(metrics.pctTop10),
  pctFound: round3(metrics.pctFound)
})

const main = async () => {
  const { target } = getTypesenseConfig()
  const { cases } = loadCases()

  const scores = await mapPool(cases, CONCURRENCY, async (searchCase) => {
    const { query, preset, refinements, expected } = searchCase
    const { rfcNumbers } = await searchRfcs({ query, preset, refinements, perPage: 250 })
    return scoreCase(rfcNumbers, expected)
  })

  const metrics = roundMetrics(aggregate(scores))
  const tolerance = loadBaseline()?.tolerance ?? DEFAULT_TOLERANCE
  const path = writeBaseline({ target, tolerance, metrics })

  const log = (...parts: unknown[]) => console.log(...parts) // eslint-disable-line no-console
  log(`Captured metrics baseline (target: ${target}, tolerance: ${tolerance}) → ${path}`)
  log(`  cases ${metrics.n} | MRR@10 ${metrics.mrrAt10} | NDCG@10 ${metrics.ndcgAt10}`)
  log(
    `  in top 1 ${pct(metrics.pctTop1)} | top 3 ${pct(metrics.pctTop3)} | top 10 ${pct(metrics.pctTop10)} | found ${pct(metrics.pctFound)}`
  )
}

main()
