// Client-side API client for the external Reef API, for the Personalisation feature.
//
// Request/response shapes are not written by hand: they're read off the generated
// ../../generated/reef-api-client types, which are produced from reef_api.yaml by
// `npm run generate:reef-api-client`. Regenerate after any spec change and vue-tsc will
// point at whichever call sites no longer match.
//
// Browser-only by design — Reef is reached directly from the client with the user's OIDC
// access token, so nothing here runs during SSR and we use plain fetch rather than $fetch.
// Every operation in the spec gets one thin function below; reefFetch holds the single
// copy of the base-URL, bearer-token, JSON and error-handling policy. If this file grows,
// split it into a utilities/reef/ directory.
//
// The last section is not API surface: it's the request coordination every per-reader feature
// needs, kept here so the feature modules built on this client — ~/utilities/reef-ratings,
// ~/utilities/reef-subscriptions and ~/utilities/reef-sets — don't each reinvent it.

import { onBeforeUnmount, watch } from 'vue'
import { z } from 'zod'
import { useAuthStore } from '~/stores/auth'
import type { components, operations } from '../../generated/reef-api-client'
import { getAccessToken } from '~/utilities/oidc'

export type DocumentSet = components['schemas']['DocumentSet']
export type DocumentSetEntry = components['schemas']['DocumentSetEntry']
export type DocumentSetVisibility = components['schemas']['DocumentSetVisibilityEnum']
export type PopularEntry = components['schemas']['PopularEntry']
export type RatingAggregate = components['schemas']['RatingAggregate']
export type RatingWrite = components['schemas']['RatingWrite']
export type Subscription = components['schemas']['Subscription']
export type SubscriptionKind = components['schemas']['KindEnum']
export type Survey = components['schemas']['Survey']
export type PatchedSurvey = components['schemas']['PatchedSurvey']
export type SurveyDefinition = components['schemas']['SurveyDefinition']
export type SurveyResults = operations['surveys_results_retrieve']['responses'][200]['content']['application/json']
export type OpenSurvey = components['schemas']['OpenSurvey']
export type ResponseCreate = components['schemas']['ResponseCreate']

// The one field an error body is read for here. Anything else it carries is left to callers to take
// off `body`, which keeps the payload as it arrived — a validation error names the fields it
// rejected, and this is in no position to know them.
const ErrorDetailSchema = z.object({ detail: z.string() })

// Thrown for any non-2xx response. `body` is the parsed error payload when the server sent
// JSON, otherwise the raw text, so callers can surface field-level validation errors.
export class ReefError extends Error {
  readonly status: number
  readonly statusText: string
  readonly body: unknown

  constructor({
    status,
    statusText,
    body,
    method,
    path
  }: {
    status: number
    statusText: string
    body: unknown
    method: string
    path: string
  }) {
    // Reef reports why in DRF's `detail` string, and for a 401 that's the whole diagnosis:
    // "Authentication credentials were not provided" (we sent no token) reads very
    // differently from "Invalid bearer token: <JWT error>" (we sent one and it was
    // rejected). Fold it into the message, because an uncaught error logs only
    // Error.message and `body` would otherwise go unread in the console.
    const { data } = ErrorDetailSchema.safeParse(body)
    const detail = data === undefined ? '' : ` — ${data.detail}`
    super(`[reef] ${method} ${path} failed: ${status} ${statusText}${detail}`)
    this.name = 'ReefError'
    this.status = status
    this.statusText = statusText
    this.body = body
  }
}

type ReefRequest = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  // Whether the OIDC bearer token is attached, mirroring the operation's `security` in the
  // spec. 'required' for the operations that list only BearerAuth/cookieAuth: anonymous is
  // not a valid outcome, so no token means we fail without sending the request. 'optional'
  // for those that also list `{}`, where being logged in only changes the response (an
  // authenticated-visibility survey, an attributed response) and anonymous is fine. Omitted
  // for the ones Red always calls anonymously.
  auth?: 'required' | 'optional'
  signal?: AbortSignal
}

const parseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text()
  if (text === '') {
    return undefined
  }
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('json')) {
    return text
  }
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

const reefFetch = async <T>(path: string, request: ReefRequest = {}): Promise<T> => {
  const { method = 'GET', body, auth, signal } = request
  const { reefBase } = useRuntimeConfig().public
  const token = auth === undefined ? undefined : await getAccessToken()

  // Sending an authenticated-only operation with no Authorization header can only ever come
  // back 401, and the resulting error reads like the server rejecting us rather than like a
  // session we never had. Fail here instead, so the cause is named. Synthesised rather than
  // observed, but a 401 ReefError is what callers already branch on.
  if (auth === 'required' && token === undefined) {
    throw new ReefError({
      status: 401,
      statusText: 'Unauthorized',
      body: { detail: 'Not signed in, or the session could not be refreshed.' },
      method,
      path
    })
  }

  const headers = new Headers({ Accept: 'application/json' })
  if (token !== undefined) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${reefBase}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal
  })

  if (!response.ok) {
    const { status, statusText } = response
    throw new ReefError({
      status,
      statusText,
      body: await parseBody(response),
      method,
      path
    })
  }

  // The 204 operations (subscription and survey deletes) are typed as returning void.
  if (response.status === 204) {
    return undefined as T
  }

  return (await parseBody(response)) as T
}

// --- Popularity -------------------------------------------------------------------------

// The curated most-popular list. Public.
export const getPopularity = (signal?: AbortSignal): Promise<PopularEntry[]> =>
  reefFetch('/api/reef/popularity/', { signal })

// --- Ratings ----------------------------------------------------------------------------

// Aggregate rating for one RFC. The operation also lists `{}` in its security, so anonymous is
// fine and the token is sent only to identify the caller — which is what lets a signed-in
// reader be told their own rating rather than just the public average.
export const getRating = (rfc: string, signal?: AbortSignal): Promise<RatingAggregate> =>
  reefFetch(`/api/reef/ratings/${encodeURIComponent(rfc)}/`, { auth: 'optional', signal })

// Set the caller's own rating for one RFC, returning the updated aggregate.
export const putRating = (rfc: string, rating: RatingWrite, signal?: AbortSignal): Promise<RatingAggregate> =>
  reefFetch(`/api/reef/ratings/${encodeURIComponent(rfc)}/`, {
    method: 'PUT',
    body: rating,
    auth: 'required',
    signal
  })

// Withdraw the caller's own rating of one RFC, returning the updated aggregate with `your_rating`
// now null. Unlike the other deletes in this file it answers 200 with a body rather than 204, and
// the spec calls it idempotent: a caller with no rating to remove gets the same response as one
// whose rating was just removed, so a repeated removal is a success rather than a 404.
export const deleteRating = (rfc: string, signal?: AbortSignal): Promise<RatingAggregate> =>
  reefFetch(`/api/reef/ratings/${encodeURIComponent(rfc)}/`, {
    method: 'DELETE',
    auth: 'required',
    signal
  })

// --- Subscriptions ----------------------------------------------------------------------

export const getSubscriptions = (signal?: AbortSignal): Promise<Subscription[]> =>
  reefFetch('/api/reef/subscriptions/', { auth: 'required', signal })

// id, verified and created_at are server-assigned, so callers supply only kind and params.
export const createSubscription = (
  subscription: Pick<Subscription, 'kind' | 'params'>,
  signal?: AbortSignal
): Promise<Subscription> =>
  reefFetch('/api/reef/subscriptions/', {
    method: 'POST',
    body: subscription,
    auth: 'required',
    signal
  })

export const deleteSubscription = (id: number, signal?: AbortSignal): Promise<void> =>
  reefFetch(`/api/reef/subscriptions/${id}/`, { method: 'DELETE', auth: 'required', signal })

// --- Document sets ------------------------------------------------------------------------

// The caller's own sets, each carrying its `documents` membership. There's no per-document
// endpoint to ask "which of my sets contain this RFC", so this list is the only read available.
export const getSets = (signal?: AbortSignal): Promise<DocumentSet[]> =>
  reefFetch('/api/reef/sets/', { auth: 'required', signal })

// Create one set. id, slug, owner_name, created_at and updated_at are server-assigned, so callers
// supply only the title and the optional description and visibility. Membership isn't settable
// here either — `documents` is read-only on this schema, so a set is always born empty and the
// first document is a second call to putSetDocument.
export const createSet = (
  set: Omit<DocumentSet, 'id' | 'slug' | 'owner_name' | 'documents' | 'created_at' | 'updated_at'>,
  signal?: AbortSignal
): Promise<DocumentSet> => reefFetch('/api/reef/sets/', { method: 'POST', body: set, auth: 'required', signal })

// Add one document to one set, returning the updated set. Reef canonicalizes the identifier, so
// the compact form is what we send. The spec calls PUT idempotent, so adding a document the set
// already holds answers 200 rather than an error — only the first add answers 201, and callers
// have no reason to tell those apart.
export const putSetDocument = (id: number, doc: string, signal?: AbortSignal): Promise<DocumentSet> =>
  reefFetch(`/api/reef/sets/${id}/documents/${encodeURIComponent(doc)}/`, {
    method: 'PUT',
    auth: 'required',
    signal
  })

// Remove one document from one set. Answers 204, so unlike the PUT there's no updated set to read
// the new membership from.
export const deleteSetDocument = (id: number, doc: string, signal?: AbortSignal): Promise<void> =>
  reefFetch(`/api/reef/sets/${id}/documents/${encodeURIComponent(doc)}/`, {
    method: 'DELETE',
    auth: 'required',
    signal
  })

// --- Surveys (management; staff only, used by the builder) -------------------------------

export const getSurveys = (signal?: AbortSignal): Promise<Survey[]> =>
  reefFetch('/api/reef/surveys/', { auth: 'required', signal })

// id, created_at and updated_at are server-assigned.
export const createSurvey = (
  survey: Omit<Survey, 'id' | 'created_at' | 'updated_at'>,
  signal?: AbortSignal
): Promise<Survey> => reefFetch('/api/reef/surveys/', { method: 'POST', body: survey, auth: 'required', signal })

export const getSurvey = (id: number, signal?: AbortSignal): Promise<Survey> =>
  reefFetch(`/api/reef/surveys/${id}/`, { auth: 'required', signal })

export const updateSurvey = (
  id: number,
  survey: Omit<Survey, 'id' | 'created_at' | 'updated_at'>,
  signal?: AbortSignal
): Promise<Survey> => reefFetch(`/api/reef/surveys/${id}/`, { method: 'PUT', body: survey, auth: 'required', signal })

export const patchSurvey = (id: number, survey: PatchedSurvey, signal?: AbortSignal): Promise<Survey> =>
  reefFetch(`/api/reef/surveys/${id}/`, { method: 'PATCH', body: survey, auth: 'required', signal })

export const deleteSurvey = (id: number, signal?: AbortSignal): Promise<void> =>
  reefFetch(`/api/reef/surveys/${id}/`, { method: 'DELETE', auth: 'required', signal })

// Aggregated responses for one survey. The spec types the payload as a free-form object.
export const getSurveyResults = (id: number, signal?: AbortSignal): Promise<SurveyResults> =>
  reefFetch(`/api/reef/surveys/${id}/results/`, { auth: 'required', signal })

// --- Surveys (runner; keyed by slug) ----------------------------------------------------

// Definition and theme for the runner. Anonymous for open surveys, so the token is sent
// only to unlock the ones whose visibility is authenticated.
export const getSurveyDefinition = (slug: string, signal?: AbortSignal): Promise<SurveyDefinition> =>
  reefFetch(`/api/reef/surveys/${encodeURIComponent(slug)}/definition/`, {
    auth: 'optional',
    signal
  })

export const createSurveyResponse = (
  slug: string,
  response: ResponseCreate,
  signal?: AbortSignal
): Promise<ResponseCreate> =>
  reefFetch(`/api/reef/surveys/${encodeURIComponent(slug)}/responses/`, {
    method: 'POST',
    body: response,
    auth: 'optional',
    signal
  })

// Surveys currently open to the caller — the list Red uses for its survey popover.
export const getOpenSurveys = (signal?: AbortSignal): Promise<OpenSurvey[]> =>
  reefFetch('/api/reef/surveys/open/', { auth: 'optional', signal })

// --- Coordinating one reader's reads and writes -------------------------------------------
//
// Not API surface: bookkeeping shared by the per-reader features. Each of them — the reader's
// rating of an RFC, their subscription to it, which of their sets hold it — loads Reef's answer
// when the reader or the RFC changes and writes their own changes back, and each needs the same
// care to do it safely. A read that has been superseded must not land and overwrite a newer
// answer; a deliberate change must supersede a read still in flight, which would otherwise
// arrive afterwards and overwrite the change with the value it set out to fetch; and of several
// rapid changes the last must be the one that wins. That care lives here, once, leaving the
// feature modules holding only what's particular to them.

// What became of one request. `superseded` covers both a newer request having taken over and the
// component having gone away — callers treat those the same way, by leaving everything alone,
// since whatever replaced this request is the thing that should decide the state.
export type ReefRequestOutcome<T> =
  | { status: 'done'; value: T }
  | { status: 'superseded' }
  | { status: 'failed'; error: unknown }

const runReefRequest = async <T>(
  controller: AbortController,
  run: (signal: AbortSignal) => Promise<T>
): Promise<ReefRequestOutcome<T>> => {
  const { signal } = controller
  try {
    const value = await run(signal)
    // Checked on the way out as well as in the catch below, because a request can resolve without
    // ever consulting its signal — a cached read answers from sessionStorage and never reaches
    // fetch — and a superseded read must not report a value the caller would then act on.
    return signal.aborted ? { status: 'superseded' } : { status: 'done', value }
  } catch (error) {
    return signal.aborted ? { status: 'superseded' } : { status: 'failed', error }
  }
}

export type ReefRequests = {
  // Run a read, abandoning any read this feature already had in flight: the newest answer is the
  // only one worth having.
  load: <T>(run: (signal: AbortSignal) => Promise<T>) => Promise<ReefRequestOutcome<T>>
  // Run a write, superseding any write already in flight so the reader's last change wins, and
  // abandoning any read for the reason given above. Reads and writes have controllers of their
  // own, so a write is never cancelled by a read.
  write: <T>(run: (signal: AbortSignal) => Promise<T>) => Promise<ReefRequestOutcome<T>>
  // As `write`, but for a feature whose parts change independently: one controller per key rather
  // than one for all of them, so changing two things starts two writes and neither aborts the
  // other. Only a change to the *same* key supersedes anything.
  writeFor: <T>(key: string, run: (signal: AbortSignal) => Promise<T>) => Promise<ReefRequestOutcome<T>>
  // Abandon a read in flight without starting another, for when there's nothing to read — nobody
  // is signed in, so there's no per-reader answer to ask for.
  abortLoad: () => void
}

const createReefRequests = (): ReefRequests => {
  let loadController: AbortController | undefined
  let writeController: AbortController | undefined
  const writeControllersByKey = new Map<string, AbortController>()

  const abortLoad = () => {
    loadController?.abort()
  }

  return {
    load: (run) => {
      abortLoad()
      loadController = new AbortController()
      return runReefRequest(loadController, run)
    },
    write: (run) => {
      abortLoad()
      writeController?.abort()
      writeController = new AbortController()
      return runReefRequest(writeController, run)
    },
    writeFor: async (key, run) => {
      abortLoad()
      writeControllersByKey.get(key)?.abort()
      const controller = new AbortController()
      writeControllersByKey.set(key, controller)
      try {
        return await runReefRequest(controller, run)
      } finally {
        // Only if this is still the current write for the key — a superseded write must not clear
        // the controller belonging to the write that replaced it.
        if (writeControllersByKey.get(key) === controller) {
          writeControllersByKey.delete(key)
        }
      }
    },
    abortLoad
  }
}

// The Vue side of the above: reads are abandoned when the component goes away. Writes deliberately
// are not — a rating the reader has just set or removed, a subscription they've just ticked, a set
// they've just added this RFC to should all reach Reef even if they navigate away immediately, and
// unlike a read there's no state left behind for a late response to corrupt.
export const useReefRequests = (): ReefRequests => {
  const requests = createReefRequests()
  onBeforeUnmount(requests.abortLoad)
  return requests
}

// Run `load` for the current reader and RFC, now and again whenever either changes. Whether anyone
// is signed in is passed rather than left to be looked up, because it decides what a load even
// means: Reef identifies a reader by their bearer token, so signed out there is nothing to ask for
// and the feature resets instead.
//
// `immediate` is load-bearing, not a convenience. Both gates in front of the RFC page's Reef row
// are async and client-side — the oidc feature flag comes from localStorage, and oidcRestore() runs
// in Header.vue's onMounted — so a restored session often lands *before* setup runs, leaving
// isAuthenticated already true with no transition left to observe. Without immediate the callback
// then never fires at all.
export const watchReefUserDocument = (
  rfcNumber: () => number,
  load: (rfcNumber: number, isAuthenticated: boolean) => void
): void => {
  const authStore = useAuthStore()
  watch(
    [() => authStore.isAuthenticated, rfcNumber],
    () => {
      load(rfcNumber(), authStore.isAuthenticated)
    },
    { immediate: true }
  )
}
