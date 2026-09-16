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
import { PrecomputedSubjectDetailOrRedirect, SubjectIndex } from '../../generated/reef-api-zod'
import { describeNetworkFailure } from './network'
import { API_REEF_SUBJECTS_INDEX_PATH, apiReefSubjectPathBuilder } from './url'

export type { PrecomputedSubjectDetailOrRedirect, SubjectIndex }

/**
 * Anything that stops a file being read and parsed. An h3 error rather than an Error of this
 * module's own: nothing catches these by type — the pages read `error` off useAsyncData and only
 * ask whether it is set — so a class would buy a name and cost every caller a way to tell one
 * failure from another. The name it was carrying is in the message, which is where a log reads it.
 *
 * `describeNetworkFailure` runs here, against `cause` while it's still the live object `fetch()`
 * threw, and its answer (when it has one — a fetch that reached the bucket and just got a bad
 * response gets no answer here) goes into `data` rather than staying implicit in `cause`: a
 * server-rendered page's `error` ref crosses to the client through Nuxt's payload, which keeps
 * `data` but drops `cause` outright, so `~/utilities/network`'s `httpErrorMessage` would otherwise
 * lose the diagnosis the moment the client re-renders. See that function's own doc comment.
 */
const unreadable = (key: string, cause: unknown) => {
  const networkFailureMessage = describeNetworkFailure(cause)
  return createError({
    statusCode: 500,
    message: `[reef] could not read the published ${key}: ${String(cause)}`,
    cause,
    data: networkFailureMessage === undefined ? undefined : { networkFailureMessage }
  })
}

// The dev stand-in for the store: ./reef-fixtures/precomputed, which is a verbatim copy of a
// precompute run laid out under the same keys, each as a `.json` file. Lazy, so a production
// build that drops the branch below does not carry five hundred files it will never read, and
// keyed the same way `read` derives a fixture path from its logical key so that nothing here can
// answer a key the real store would not.
const fixtures = import.meta.glob('./reef-fixtures/precomputed/**/*.json') as Record<
  string,
  () => Promise<{ default: unknown }>
>

const fixtureFor = async (key: string): Promise<unknown | undefined> => {
  const load = fixtures[`./reef-fixtures/precomputed/${key}`]
  return load === undefined ? undefined : (await load()).default
}

/**
 * A published file, parsed. `undefined` when the key is not there, which for a subject is an
 * ordinary answer about a subject that does not exist rather than something going wrong; anything
 * else raises, because a page cannot be rendered from a file that failed to arrive.
 *
 * `key` is the fixture's logical name (`subjects`, `subjects/<slug>`); `path` is the real one's
 * path under `reefBase`, built by one of the `apiReef*PathBuilder`s in ~/utilities/url.
 *
 * In development with NUXT_PUBLIC_REEF_FIXTURES set, the copy in ./reef-fixtures/precomputed
 * answers instead, so the subject pages can be worked on with no Reef running at all. The parse
 * still runs: a fixture that has drifted from the contract should fail here exactly as a published
 * file would.
 */
const read = async <T>(key: string, path: string, schema: { parse: (value: unknown) => T }): Promise<T | undefined> => {
  let body: unknown
  const { reefBase, reefFixtures } = useRuntimeConfig().public
  if (import.meta.dev && reefFixtures !== '') {
    body = await fixtureFor(`${key}.json`)
    if (body === undefined) {
      return undefined
    }
    return schema.parse(body)
  }
  try {
    const response = await fetch(`${reefBase}${path}`)
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
  const index = await read('subjects', API_REEF_SUBJECTS_INDEX_PATH, SubjectIndex)
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
  read(`subjects/${encodeURIComponent(slug)}`, apiReefSubjectPathBuilder(slug), PrecomputedSubjectDetailOrRedirect)
