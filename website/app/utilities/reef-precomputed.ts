// Reading the files Reef publishes for anonymous, server-rendered reads -- the /subjects/ pages'
// data. Same origin as ~/utilities/reef's reefBase: these used to need a base URL of their own to
// reach the bucket Reef writes them to directly, but a routing change on Reef's side put them
// behind the same origin as everything else, so this reads reefBase too. Still a distinct code
// path from that file though: a server render has no reader token to attach, and these paths need
// none, so this calls the plain `fetch()` below rather than reef.ts's `reefFetch`.
//
// Who reads what, and this file is the third case:
//
//   a browser        -> the Reef API with the reader's token, which is ~/utilities/reef
//   the precomputer  -> Reef's own precompute step, at build time
//   a server render  -> this file, and nothing else
//
// One function per file, wired by hand. There are a handful of these and a generated client would
// be more machinery than the thing it replaces.
//
// Dev stand-in: NUXT_PUBLIC_REEF_STAGING points this at Reef's staging deployment
// (reefPrecomputedFixturesBase) instead of reefBase, so /subjects/ pages work with no Reef running
// locally. Fetched live rather than kept as a local snapshot: Reef's index alone runs several
// megabytes, too large for Vite's dev-time `import.meta.glob` transform to serve as a client-side
// dynamic import — it failed only on client-side navigation, since a server render reads reefBase
// directly — and a static copy of a vocabulary this size would drift stale regardless.
//
// Shapes are not written here: they are the Zod schemas generated from reef_api.yaml by
// `npm run generate:reef-api-zod`, the same file `generate:reef-api-client` produces the types
// from. Reef describes these payloads in its API contract even though it serves none of them --
// the views behind them exist and are deliberately not routed -- so the contract stays the one
// description of them and there is no hand-maintained schema on either side.
//
// Parsing, rather than trusting: these arrive over the network from a bucket, and a server render
// that trusts a truncated file answers a public page with a 500 rather than a caught error. The
// generated schemas allow unknown keys, which is Reef's additive guarantee holding up on this
// side: a field Reef adds must not break Red, so nothing here may tighten them.
//
// The generated module exports a value and a type under each name, so one import brings both and
// there is no `z.infer` here to keep in step with it.
import { z } from 'zod'
import {
  OpenSurvey,
  PrecomputedSubjectDetailOrRedirect,
  SubjectBranchNode,
  SubjectIndex
} from '../../generated/reef-api-zod'
import { describeCauseChain, describeNetworkFailure } from './network'
import { API_REEF_SUBJECTS_INDEX_PATH, API_REEF_SURVEYS_PUBLISHED_PATH, apiReefSubjectPathBuilder } from './url'

export type { OpenSurvey, PrecomputedSubjectDetailOrRedirect, SubjectBranchNode, SubjectIndex }

/**
 * Anything that stops a file being read and parsed. An h3 error rather than an Error of this
 * module's own: nothing catches these by type — the pages read `error` off useAsyncData and only
 * ask whether it is set — so a class would buy a name and cost every caller a way to tell one
 * failure from another. The name it was carrying is in the message, which is where a log reads it.
 *
 * `message` is built from `describeCauseChain(cause)` rather than `String(cause)`: a caught
 * `TypeError: fetch failed` only stringifies to that much, dropping the `ErrnoException` nested
 * under its own `.cause` that actually names what went wrong, and that's the detail worth keeping
 * even when nothing below recognises it.
 *
 * `describeNetworkFailure` also runs here, against `cause` while it's still the live object
 * `fetch()` threw, and its answer (when it has one — a fetch that reached the bucket and just got a
 * bad response gets no answer here) goes into `data` rather than staying implicit in `cause`: a
 * server-rendered page's `error` ref crosses to the client through Nuxt's payload, which keeps
 * `message` and `data` but drops `cause` outright, so `~/utilities/network`'s `httpErrorMessage`
 * would otherwise lose the diagnosis the moment the client re-renders. See that function's own doc
 * comment.
 */
const unreadable = (key: string, cause: unknown) => {
  const networkFailureMessage = describeNetworkFailure(cause)
  return createError({
    statusCode: 500,
    message: `[reef] could not read the published ${key}: ${describeCauseChain(cause)}`,
    cause,
    data: networkFailureMessage === undefined ? undefined : { networkFailureMessage }
  })
}

/**
 * A published file, parsed. `undefined` when the key is not there, which for a subject is an
 * ordinary answer about a subject that does not exist rather than something going wrong; anything
 * else raises, because a page cannot be rendered from a file that failed to arrive.
 *
 * `path` is built by one of the `apiReef*PathBuilder`s in ~/utilities/url. In development with
 * NUXT_PUBLIC_REEF_STAGING set, it's read against Reef's staging deployment instead of `reefBase`,
 * so the subject pages can be worked on with no Reef running locally. The parse still runs: a file
 * that has drifted from the contract should fail here exactly as a production one would.
 */
const read = async <T>(path: string, schema: { parse: (value: unknown) => T }): Promise<T | undefined> => {
  let body: unknown
  const { reefBase, reefStaging, reefPrecomputedFixturesBase } = useRuntimeConfig().public
  const base = import.meta.dev && reefStaging !== '' ? reefPrecomputedFixturesBase : reefBase
  try {
    const response = await fetch(`${base}${path}`)
    if (response.status === 404) {
      return undefined
    }
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`)
    }
    body = await response.json()
  } catch (error) {
    throw unreadable(path, error)
  }
  try {
    return schema.parse(body)
  } catch (error) {
    // Separated from the fetch failure on purpose: a file that arrived and did not match the
    // contract is a different problem from one that did not arrive, and it is Reef's rather than
    // the network's.
    throw unreadable(path, error)
  }
}

/**
 * The whole vocabulary: the tree, every assignment, and every document title, in one file. What
 * the /subjects/ listing renders from, in a single fetch.
 */
export const fetchSubjectIndex = async (): Promise<SubjectIndex> => {
  const index = await read(API_REEF_SUBJECTS_INDEX_PATH, SubjectIndex)
  if (index === undefined) {
    throw unreadable('subjects', 'the index is not published')
  }
  return index
}

/**
 * One subject and what a page about it draws: its documents with their titles in `document_meta`,
 * and the curated names of its ancestors and children in `subject_meta`, so a breadcrumb needs no
 * second read.
 *
 * Answers for a retired subject and for an alias too, as the redirect stubs Reef publishes for
 * them — a blob store cannot serve a 301, so the body is the redirect. Callers tell the three
 * shapes apart with the predicates in ~/utilities/reef, which read which key is present.
 */
export const fetchSubjectFile = (slug: string): Promise<PrecomputedSubjectDetailOrRedirect | undefined> =>
  read(apiReefSubjectPathBuilder(slug), PrecomputedSubjectDetailOrRedirect)

/**
 * Every published survey, whatever its visibility — the toast popover's data. `visibility` is
 * what tells an `authenticated` row from one anyone can be offered; ~/utilities/reef-surveys reads
 * it to choose which the reader qualifies for, which needs both kinds in one answer rather than
 * the anonymous-only subset `surveys/open.json` publishes. A missing file is treated as "nothing
 * to offer" rather than raised: unlike the subject vocabulary, there's no page that can't render
 * without it.
 */
export const fetchPublishedSurveys = async (): Promise<OpenSurvey[]> =>
  (await read(API_REEF_SURVEYS_PUBLISHED_PATH, z.array(OpenSurvey))) ?? []
