# Static site build for RFC-Editor.org — analysis and plan

## Summary

The architecture is already most of the way to static. `worker/src/index.ts` serves
`/api/v1/*`, `/rfc/*`, `/refs/*` and `/_nuxt/*` from R2; everything it doesn't own falls
through to the Nitro origin on k8s wrapped in stale-while-revalidate (600s fresh, 3000s
stale). That fall-through is *only* HTML pages plus two health checks.

So "switch to a static site" is not a re-platforming. It is: prerender the HTML into the
bucket the Worker already reads, add one `blobsPages` handler above the origin fallback,
then delete the fallback.

**Incremental rebuilds are possible**, and cheaply, because the deploy target is object
storage rather than a container image — see §4.

**Build cost looks much smaller than expected.** The RFC document tree, which I assumed
would dominate, costs ~1.1ms per page. See §3 for what that means and what's still unmeasured.

## §1 Route count

From today's `rfc-mini-index.json`:

| Kind | Count |
|---|---|
| RFCs | 9,835 (highest number 10,042) |
| BCP / STD / FYI subseries | 367 distinct |
| Markdown content pages | 19 |
| Fixed pages (`/`, `/rfc-index`, `/search`, `/set`, `/never-issued`, `/status-changes`, `/account`) | 7 |
| **Total routes** | **~10,230** |

## §2 Page weight

RFC 9000 (QUIC), fetched from prod, is close to the worst case:

| Component | Bytes | Share |
|---|---|---|
| Rendered DOM | 1,062,902 | 36% |
| `__NUXT_DATA__` hydration payload | 1,859,370 | 64% |
| **Total HTML** | **2,922,295** | 100% (481,806 gzipped) |

Two thirds of *that* page is the hydration payload re-serialising the document rendered
immediately above it. RFC 9000 is the extreme, though — payload share scales with document
size. Measured over the 24-route crawl in §3, the mean page is **253,378 bytes with a 41%
payload share**, rising to 57–58% for the largest documents sampled and 15% for the
smallest. Across 9,835 RFCs that is **2.49 GB of HTML**.

This costs nothing today because SSR pages are generated on demand and compressed at the
edge. It becomes a line item the moment all of them are stored. Levers in §7.

## §3 Build cost — measured

### 3a. Whole-page render, against the real built server

`nuxt build` completed in **15.8s wall** (23.4s user CPU) and produced a 6.26 MB server
bundle, **1.43 MB gzipped**. I then booted `.output/server/index.mjs` and timed
`GET /info/rfcN/` for each of 24 cached RFCs — two warmup passes, then the best of three —
with the server pointed at a local stub serving the cached API JSON, so this put no load on
prod.

| Metric | Mean | p50 | p95 |
|---|---|---|---|
| Render time | **15.6ms** | 12.9ms | 25.0ms |
| Page bytes | **253,378** | | |
| Payload share | **41%** | | 58% (largest sampled) |

Extrapolated to 9,835 RFCs: **2.49 GB of HTML, and 2.6 minutes of single-core render
time** — 0.6 min across 4 cores, 0.2 min across 16. Range across the sample was 6.5ms /
88 KB for RFC 439 to 48.0ms / 673 KB for RFC 9203.

So the answer on build cost is: **it's a non-issue.** Even single-threaded and even with
generous I/O overhead on top, a full rebuild is minutes, not hours. Sharding is a
nice-to-have rather than the necessity I first claimed. The dominant cost is I/O and the
2.49 GB upload, not rendering.

**An info page makes exactly one API request** (`/api/v1/rfc-html/N.json`). The stub
  logged no other paths. That makes the build's I/O trivial to reason about and to
  parallelise.

### 3b. Document tree in isolation

Before building, I measured the piece I expected to dominate — `JSON.parse` + Zod
validation + VNode construction + SSR serialisation of the document tree alone, on the same
24 cached documents:

| Metric | Mean | p50 | p95 |
|---|---|---|---|
| Source JSON | 101,196 bytes | | |
| Document nodes | 963 | | |
| Rendered body HTML | 55,251 bytes | | |
| Zod validation | 0.8ms | | |
| VNode + SSR | 0.3ms | | |
| **Total** | **1.1ms** | 0.9ms | 4.5ms |

Extrapolated to 9,835 RFCs: **1.00 GB of source JSON, 0.54 GB of document body HTML, and
about 11 seconds of CPU.**

> **Read that 11 seconds narrowly.** It is one slice of the work, measured with the JSON
> already on local disk and no network involved. It excludes fetching the 1.00 GB of source
> JSON, Nuxt's per-page overhead, devalue payload serialisation, writing ~1.8 GB to disk,
> and uploading ~1.8 GB to R2. It is emphatically *not* a build-time estimate. Its only
> claim is that the document tree is not the bottleneck.

That last point is a correction to my first read. `rfc-validators.ts` defines
`documentHtmlObj` as a recursive POJO node array that's Zod-validated on every render, and
`RFCDocumentBody.vue:144` walks it building VNodes with `h()`. I expected that to dominate.
It doesn't — it's negligible, and "skip Zod validation for trusted build-time input" is
therefore not worth doing for speed.

**What's still unmeasured** is the rest of the per-page cost: Nuxt app creation, plugins,
router, layout, the sidebar/TOC/errata components, and devalue payload serialisation. That
is now the entire question, and it needs a real `nuxt build` plus a timed crawl of
`.output/server/index.mjs` to answer. For a Nuxt app this size, 10–50ms/page is the usual
range, which would put a single-core full build at 2–8 minutes — but that range is
received wisdom, not a measurement of this app.

**`nitro.prerender.concurrency` defaults to 1.** This still matters, but for I/O rather
than CPU. As arithmetic on an assumed 200ms round trip, 10,230 serial fetches of
`/api/v1/rfc-html/N.json` would be ~34 minutes of pure waiting — not a forecast, an
argument for changing the setting. At concurrency 20 the same I/O is under two minutes, and
CI running in the US/EU against R2 directly would see much lower latency than the 200ms
assumed here (measured from New Zealand, through the CDN).

## §4 Incremental rebuilds

**R2 is the incremental cache.** Because the deploy target is object storage, uploading
only the pages you regenerated leaves the other 10,000 in place. You never need the
previous build on disk and there is no diffing step to get wrong.

What makes it work is already in the config: `app.buildAssetsDir` is `/_nuxt/${version}/`,
so asset bundles are version-scoped and immutable, and
`precomputer/src/utilities/cleanup.ts:60` deliberately excludes `other/nuxt-assets` from
purging. Several asset versions coexist.

But "incremental" means two different things:

| Trigger | Pages affected | Cost | Mechanism |
|---|---|---|---|
| **Content change** — an RFC is published or corrected | The RFC, its cross-reference closure, and the indices | seconds | The precomputer already takes RFC numbers (`single.ts`, `multiple.ts`, `publish.ts`). Hand the same list to the renderer. |
| **Code change** — template, component, CSS, dependency | All ~10,230 | full build | Unavoidable; the HTML itself changed. |

### The closure is bigger than the changed RFC

Publishing RFC 10043 doesn't only add one page. It mutates `obsoleted_by` and `updated_by`
on older RFCs, may change a BCP or STD's membership, and changes the homepage,
`/rfc-index`, the feeds and the sitemap. The regeneration set is: the new RFC, every RFC it
references or is referenced by, every affected subseries page, and the fixed index pages.
That closure is computable from the mini index and should be one tested function, shared by
the renderer and the sitemap generator.

### Two ways to render a subset

**Nitro's prerenderer** via `nitro.prerender.routes` (from an env var or a
`prerender:routes` hook) is idiomatic, but prerendering runs *inside* `nuxt build`, so every
incremental run pays the full bundle cost.

**Decoupling build from render** is more work up front and much better afterwards: run
`nuxt build` once to produce `.output`, then a script boots `.output/server/index.mjs` and
crawls a supplied route list with a bounded worker pool, writing `<route>/index.html`. That
gives sharding across a CI matrix, resumability, per-route timing, and one code path for
both the full build and the one-RFC case.

One consequence to choose deliberately: Nitro's prerenderer extracts hydration state into a
sibling `_payload.json` (`experimental.payloadExtraction` resolves to `true` under
compatibility version 4). A live-server crawl does not — it captures exactly what a browser
gets today, payload inline. Simpler, but it bakes in the 64% duplication from §2.

## §5 Options

### A. Full prerender to R2, no origin — *recommended destination*

Prerender all ~10,230 routes, upload to `red-prod`, teach the Worker to serve `pages/`
before its origin fallback, retire the k8s Deployment.

- **Pro** — No origin to run, patch, scale or be paged about.
- **Pro** — Every page is a cache hit on first request; no cold SSR on the long tail.
- **Pro** — Survives a datatracker or k8s outage entirely.
- **Pro** — Fits the existing pipeline — assets already go to R2 via `aws s3 cp`.
- **Pro** — A broken RFC becomes a build failure instead of a 500 found later.
- **Con** — ~1.8 GB of objects.
- **Con** — Any code change invalidates all 10,230 pages.
- **Con** — Non-existent RFCs (`/info/rfc99999`) currently 404 via the origin's renderer.
- **Con** — Health checks and Nuxt islands need somewhere else to live.

### B. Hybrid — prerender `/info/**`, SSR the rest — *stepping stone*

`routeRules: { '/info/**': { prerender: true } }`; index, search, set, account stay on the origin.

- **Pro** — Captures ~99.7% of routes and nearly all traffic.
- **Pro** — No need to solve static 404s, islands or health checks on day one.
- **Pro** — Reversible per route rule.
- **Con** — Keeps the origin, so keeps its cost and failure mode — the main prize is unclaimed.
- **Con** — Two rendering paths to test.

### C. Stay SSR, cache harder at the edge — *honest baseline*

Raise the Worker's SWR window from 600s toward days (RFC pages are immutable once
published) and purge by key when the precomputer republishes one.

- **Pro** — Days of work. Most of the latency benefit immediately.
- **Pro** — No build explosion, no storage growth, no new failure modes.
- **Con** — Cold pages still SSR, and with 10,000 pages most of the tail is always cold.
- **Con** — The origin stays a hard dependency for correctness, not just freshness.
- **Con** — Cache eviction is Cloudflare's call; no guarantee a page is warm.

### D. SPA (`ssr: false`) — *don't*

- **Pro** — Trivially small build; incremental rebuilds become a non-question.
- **Con** — Destroys the no-JS story the codebase deliberately maintains. `RFCIndexTable.vue:95`:
  "this must be rendered on the server -- it's used by non-JavaScript enabled browsers".
- **Con** — RFCs are cited and indexed; crawlability is a core requirement.
- **Con** — Blank page, then a multi-megabyte JSON parse before any text appears.

### E. Static-on-write — render on first request, persist to R2 — *safety net for A*

On an R2 miss the Worker asks a render service for the page, returns it, and writes it to
the bucket.

- **Pro** — No 10k build ever; storage grows with real demand.
- **Pro** — Invalidation is a delete — a code deploy can drop a prefix and let it refill.
- **Pro** — Exactly the right behaviour for a missing page, so it de-risks A's rollout.
- **Con** — Keeps a renderer alive, so it shrinks the origin rather than retiring it.
- **Con** — Write-on-read needs care: dogpiles, partial writes, staleness after a deploy.
- **Con** — Harder to answer "what is currently published" than a build artifact.

### F. Render inside Cloudflare — Nitro on Workers, fan-out over Queues

Run the Nuxt app itself on Workers (Nitro has a `cloudflare-module` preset), with R2 bound
directly. A Queue producer enqueues the route list; consumer invocations each render a small
batch and write to R2. The same Worker serves R2 on a hit and renders on a miss.

The insight this turns on is data movement, not CPU. In a CI build, ~1.00 GB of source JSON
comes *out* of R2 and ~1.8 GB of HTML goes back *in* — nearly 3 GB across the internet each
full rebuild. Rendering inside Cloudflare means the bytes are born and stored in the same
place and never cross it. R2 access via binding is also much faster than via the CDN.

- **Pro** — No ~3 GB of data movement per full rebuild; R2 reads/writes are binding-local.
- **Pro** — Subsumes E: once the app runs on Workers, the batch build becomes a pre-warm
  step rather than a prerequisite. A cold page is never a 404.
- **Pro** — One rendering path for both the fan-out and the miss case.
- **Pro** — Scales horizontally for free; no CI runner sizing.
- **Con** — **No single invocation can do the corpus.** Paid CPU ceiling is 5 min (default
  30s) and memory is 128 MB per isolate. At even 30ms/page, 10,230 pages is ~5.1 min of pure
  CPU — over the ceiling with no slack. It *must* be a fan-out, which is more moving parts
  than a build script.
- **Pro** — **Bundle size is not a blocker — verified.** `nuxt build
  --preset=cloudflare-module` succeeds today with no source changes, producing 1.81 MB
  (511 kB gzip) including sourcemaps, or **1.49 MB raw / ~0.39 MB gzipped** excluding them.
  The paid script limit is 10 MB compressed; this fits under the 3 MB *free* limit. Largest
  chunks: `server.mjs` 540 KB, `nitro.mjs` 363 KB, `_id_` route 114 KB, luxon 77 KB.
- **Con** — Fitting is verified; *running correctly* is not. The build succeeding says
  nothing about `nodejs_compat` behaviour at runtime. Needs `wrangler dev` against real
  bindings to confirm a page actually renders.
- **Con** — Debugging a fan-out across thousands of invocations is harder than reading a CI log.
- **Con** — Queue semantics to get right: retries, dedupe, poison messages, knowing when the
  build is actually complete.

**Suggested route: B as the prototype, A as the destination, E or F as A's safety net.**
Prove the pipeline on `/info/**` while the origin still catches everything else, then move
the remaining 26 pages and cut the origin. Keep the Worker's origin fallback behind a flag
through the transition so a miss degrades to today's behaviour rather than a 404. Measure
C's numbers first so the decision has a baseline.

F is the most interesting option, and it is now much less speculative than when I first
wrote it: the bundle-size gate is cleared with no source changes at all. What remains
unproven is whether the app *runs* on Workers, which `wrangler dev` would settle in an
afternoon. If it does, F is arguably a better destination than A, because it collapses the
build and the miss-handling into one rendering path.

## §6 What breaks, and what has to change

| Area | Issue | Resolution |
|---|---|---|
| `/info/rfcN` | The Worker's `SERIES_ID` regex admits any digits and the origin renders the 404 body. Statically there is no object. | Prerender a `404.html`; Worker serves it with status 404 on an R2 miss. Decide what `/info/rfc0009` does — `parseSeriesId` accepts leading zeros today. |
| Path casing | `isOriginPath` lower-cases before matching; R2 keys are case-sensitive. | Canonicalise in the Worker (redirect to lower-case + trailing slash) before the bucket lookup. |
| `/api/v1/healthcheck.json`, `systemcheck.json` | The only origin-owned API paths, and the k8s liveness probes. | A build-stamp object (version, build time, RFC count, route count) plus Worker-level health. Also drop them from `cacheBypassPaths`. |
| `/rfc-index` | Embeds the whole 7 MB mini index and is explicitly marked as needing server rendering for no-JS clients. | Static is strictly better — built once instead of on every cache miss. But it's the page that most wants the §7 payload fix. |
| `/search`, `/set` | Query-string driven; a prerendered file can't vary by `?q=`. | Prerender the shell, let the client fill it in — Typesense is already called client-side. The Worker's no-JS `serverSearch` is unaffected. |
| `/account` | OIDC + Reef, entirely client-side. | Prerender an empty shell; ensure nothing OIDC-related runs at build time. Interacts with the deferred `/auth/callback/` move. |
| `__nuxt_island` | Islands are fetched per-request. `componentIslands: true` is on and the Worker already routes them; nothing uses them yet. | Either prerender each island response or keep islands out of the static build. Settle it before someone adds one. |
| `baseURL` | Six call sites use `import.meta.server ? apiV1UrlOrigin : undefined`. | Works unchanged — prerendering *is* the server branch. Just needs `NUXT_PUBLIC_API_V1_BASE` pointed at prod during the build. |
| Colour mode | A prerendered page has one fixed theme class. | Already fine: storage is `localStorage` and the module injects an inline head script, so the class is set before paint. |
| Sitemap | Currently a separately generated bucket object. | Generate from the same route manifest as the prerender so they can't drift. |
| e2e tests | Run against a dev server, so they'd no longer cover what ships. | Add a smoke suite over the built output: every route present, no empty bodies, byte-size ceilings per page class. |

## §7 The payload lever

Worth a separate decision: it's the difference between a 1.8 GB build and roughly 700 MB,
and it also halves what readers download. Roughly in order of payoff per unit of pain:

1. **Accept it.** Brotli at the edge already takes the worst page under 500 KB and R2
   storage at this scale is not a meaningful cost. A legitimate answer — just make it explicit.
2. **Let the client re-fetch instead of embedding.** The document is already a separately
   cacheable, separately compressed R2 object at `/api/v1/rfc-html/N.json`. Strip it from
   the payload and have hydration fetch it. Roughly halves every RFC page, and the browser
   can share that object across pages. Needs care so hydration doesn't flash.
3. **Make the RFC body a server component.** Island HTML is never hydrated, so its data
   never enters the payload, and `componentIslands` is already enabled. The obstacle is that
   the body *is* interactive: link previews, errata inlining, text scale, obsoleted-by
   modes. Cleanest architecturally, most work.

(An earlier draft listed "skip Zod validation" here. §3 shows it's worth ~8 seconds across
the whole corpus, so it isn't a lever.)

## §8 Plan of work

**Phase 0 — measure. Done.** Route counts (§1), page weight (§2), whole-page render cost and
corpus size (§3a), document-tree cost in isolation (§3b), and the Cloudflare bundle-size gate
(§5F). The headline: **rendering is cheap** — 15.6ms/page, 2.6 min single-core for the whole
corpus — so build time does not constrain the design. What does constrain it is 2.49 GB of
output and the payload share within it (§7).

The one thing still unmeasured is whether the app *runs* on Workers under `nodejs_compat`,
which decides between A and F. `wrangler dev` against real bindings answers it.

**Phase 1 — route manifest as one source of truth.** One module that turns the mini index
into the full route list, and one function that computes the regeneration closure for a set
of RFC numbers. Consumed by the prerenderer, the sitemap generator, and ideally the Worker's
`isOriginPath` so the three can't disagree. Unit-tested — this is where a subtle bug means
silently missing pages.

**Phase 2 — render pipeline, decoupled from build.** `nuxt build` once; then a render script
that boots `.output/server/index.mjs`, crawls a route list with a bounded worker pool,
writes `index.html` per route, and reports per-route timing and size. Takes a shard index so
CI can fan out. Fails loudly on a non-200 or a suspiciously small body.

**Phase 3 — upload and serve.** Extend the existing `aws s3 cp` deploy step to push
`pages/`. Add `blobsPages` to the Worker, mirroring `blobsNuxtAssets`, above the origin
fallback. Keep the fallback behind a flag so a miss degrades to today's SSR.

**Phase 4 — prove it on `/info/**`.** Option B on staging. Full 10k build, real numbers,
before/after against `www.rfc-editor.org` for a sample of RFCs. This is where the decision
to continue gets made on evidence rather than on this document.

**Phase 5 — incremental trigger from the precomputer.** Wire the publish flow to the render
script: RFC numbers in, closure computed, subset rendered, subset uploaded. Determines
whether a new RFC is live in seconds or in a build cycle.

**Phase 6 — the remaining 26 pages, then cut the origin.** Static 404s, health-check
replacement, query-driven shells, the island decision. Then remove the origin fallback and
delete the k8s Deployment.

## §9 Open questions

- **What build time is acceptable?** A 40-minute full build is fine for a code deploy and
  unacceptable if it also gates publishing an RFC. Phase 5 decouples those, but the target
  shapes the sharding design.
- **Does a mixed-version site matter?** Because assets are version-scoped, a partial rollout
  after a code change leaves old pages running old JS against old assets. Transiently
  harmless; as a strategy it needs a considered answer.
- **Payload duplication: accept or fix?** §7. Deciding early avoids building twice.
- **Why do `/api/v1/rfc-html/4000.json` and `6000.json` return 15 bytes?** Both came back as
  what looks like an empty object rather than a document. Possibly correct, possibly a gap.
  Either way a static build turns it from an invisible runtime 404 into a build error, which
  is an argument for doing it.
- **Where do the sitemap and feed generation live** once a route manifest exists in the
  website rather than the precomputer?
- ~~Does the Nitro `cloudflare-module` bundle fit under 10 MB compressed?~~ **Answered: yes,
  ~0.39 MB gzipped.** See §5F. The follow-on question is whether it *runs* — `wrangler dev`
  against real bindings — and if it does, whether F displaces A as the destination.
- **Is ~3 GB of data movement per full rebuild actually a problem?** R2 egress is free and CI
  bandwidth is not billed to us, so it may be a non-issue — in which case F's main advantage
  is latency and simplicity rather than cost, and A stays the better-understood choice.

---

### Measurement notes

Prod API usage for this analysis: 6 exploratory requests plus 24 cached sample documents,
throttled at 250ms. The sample is `rfc-mini-index.json` positions at even stride:
1, 439, 886, 1299, 1709, 2120, 2530, 2940, 3356, 3770, 4190, 4611, 5034, 5458, 5880, 6301,
6722, 7141, 7552, 7963, 8372, 8791, 9203, 9614.

Timings are the minimum of 3 runs per document on Node 24.16.0. The VNode+SSR figure uses a
plain recursive `h()` rather than `RFCDocumentBody.vue` (an SFC, so not importable from a
standalone script), so it excludes component substitutions such as `PdfPages` and
`AbnfViewer` — it is a lower bound for that step.
