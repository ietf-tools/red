# Search-index quality tests

Standalone tests that hit the **live Typesense API** and score how well RFC search ranks the
canonical RFC for each of ~1200 queries, using the rank-weighted metrics the IR field uses
(**NDCG@10**, **MRR@10**, **% in top 1/3/10**). A regression is a drop in the **corpus-level**
metrics versus a committed baseline — not a per-query rank wobble, which on a live index is too
noisy to gate on.

Kept out of `npm run test:unittests` / `test:e2e` (they make real network calls). Run explicitly:

```bash
npm run test:unittests:search-index                    # score + gate against prod (default)
npm run test:unittests:search-index:staging            # same, against staging (report-only)
npm run test:unittests:search-index:capture-baseline   # (re)write metrics-baseline.json
npm run test:unittests:search-index:ingest-csv         # fold an edited report CSV into search-cases.json
```

## Target selection (independent of the app)

This suite does **not** read `nuxt.config`. Hosts are hardcoded in `config.ts` and chosen by a
flag:

- `SEARCH_INDEX_TARGET=prod` (default) → `typesense.ietf.org`
- `SEARCH_INDEX_TARGET=staging` → `typesense.staging.ietf.org`
- `NUXT_PUBLIC_TYPESENSE_HOST` / `NUXT_PUBLIC_TYPESENSE_API_KEY` override host/key for either.

The request shape mirrors production (`app/utilities/searchv2-rfc-client.ts`): collection `docs`,
constant `type:=rfc`, `red` / `red-content` preset, backtick-quoted facet refinements. Typesense
caps `per_page` at 250, so that is the fetch window (metrics only look at the top 10 regardless).

## Ground truth vs. observed behaviour

`search-cases.json` is a **judgment list**: each case states the canonical RFC(s) that _should_
rank for a query — defined independently of what the index currently returns. It carries **no
engine-observed fields** (no anchored rank); how the index actually performs lives only in the run
report and the metrics baseline. This is deliberate — deriving expectations from the engine's own
output would just lock in its current (imperfect) ranking.

## Search Key (uniqueness)

Every case is identified by its **Search Key** = `query` (case-insensitive) + `preset` + `facets`.
A search may have exactly one definition — `loadCases()` throws on any duplicate, and the CSV
ingest reconciles purely by Search Key (never by row order).

## `search-cases.json`

```jsonc
{
  "defaults": { "withinTopN": 5 },
  "cases": [
    {
      "query": "tls 1.3", // the search term a user types
      "preset": "red", // "red" (metadata) | "red-content" (full text)
      "refinements": { "group.acronym": ["tls"] }, // optional facet filters -> part of the Search Key
      "expected": [8446], // canonical RFC number(s) that SHOULD rank for this query
      "withinTopN": 5, // optional per-case quality target (defaults to defaults.withinTopN)
      "confidence": "high", // high | medium | low
      "note": "…"
    }
  ]
}
```

## What passes, what fails

The suite scores every case (top-k, position-weighted) and gates on the **aggregate**:

- **Regression gate (fails the build):** for the run's target, the gated metrics (`mrrAt10`,
  `pctTop10`) must not fall more than `tolerance` below `metrics-baseline.json`. Individual
  queries moving around is fine; a real quality drop moves the corpus metric.
- **Report-only** when there is no baseline, or the baseline was captured for a different target
  (e.g. you ran against staging but the baseline is prod) — the run prints metrics but does not
  fail.
- `withinTopN` is a **per-case target** surfaced in the CSV (`in_top_target`), not a gate.

Why not gate per-query ranks: a live index re-ranks by large amounts as it is updated, so a strict
per-rank guard produces false failures on legitimate churn. Corpus metrics are robust to that
while still catching genuine regressions.

## The CSV report (and editing the corpus through it)

Each run writes `report/last-run.csv` (gitignored), sorted worst-NDCG first. It is
**round-trippable**:

- **Definition columns** (read by ingest): `query`, `preset`, `facets` (the Search Key), plus
  `expected_rfcs` (comma-separated, e.g. `8446,9110`), `within_top_n`, `confidence`, `note`.
- **Observed columns** (ignored by ingest): `actual_rank`, `reciprocal_rank`, `ndcg_at_10`,
  `in_top_10`, `in_top_target`, `total_matches`, `top_5_returned` (the returned RFCs + titles, so
  a reviewer who knows RFC content can judge whether the ranking is sensible).

Reviewer workflow:

1. `npm run test:unittests:search-index` → open `report/last-run.csv`.
2. Edit rows: change `expected_rfcs` / `within_top_n` / `confidence` / `note`, **delete** a row to
   drop the case, or **add** a row (fill at least `query`, `preset`, `facets`, `expected_rfcs`).
3. `npm run test:unittests:search-index:ingest-csv` → updates `search-cases.json` by Search Key,
   printing added / updated / deleted counts.

## Baselines

`metrics-baseline.json` holds the committed target metrics + `tolerance`. Run
`…:capture-baseline` to (re)establish it — do this to bootstrap, or to re-anchor after a
**deliberate, verified** relevance improvement (never to paper over a regression).

## Files

| File                             | Purpose                                                                |
| -------------------------------- | ---------------------------------------------------------------------- |
| `cases.ts`                       | Shared model: schema, the Search Key, facet (de)serialise, load/write. |
| `config.ts`                      | Target flag + hardcoded hosts/keys (+ env overrides).                  |
| `typesense-client.ts`            | Fetch-only `multi_search` wrapper; returns ordered RFC numbers.        |
| `metrics.ts`                     | NDCG@10 / MRR@10 / top-k scoring, aggregation, and baseline gating.    |
| `util.ts`                        | Bounded-concurrency `mapPool` helper for the parallel probes.          |
| `search-cases.json`              | The golden set (judgment list).                                        |
| `metrics-baseline.json`          | Committed target metrics + tolerance the regression gate compares to.  |
| `search-quality.search-index.ts` | The vitest suite; writes `report/last-run.{csv,json}`.                 |
| `report.ts`                      | Builds the round-trippable CSV/JSON report.                            |
| `ingest.ts`                      | Folds an edited CSV back into `search-cases.json` (add/update/delete). |
| `capture-baseline.ts`            | Scores the whole set and writes `metrics-baseline.json`.               |
| `needs-review.csv`               | Backlog of uncertain / low-confidence mappings for a human to triage.  |

## How the corpus was built

Terms were generated across ~28 RFC topic areas, then every proposed RFC number was verified
against the live index (confirmed to exist; title/topic sanity-checked). Trustworthy canonical
mappings went into the golden set **regardless of current rank** (deep-ranked ones are findings,
not exclusions); uncertain or low-confidence mappings were routed to `needs-review.csv`.
