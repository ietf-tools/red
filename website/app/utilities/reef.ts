// Client-side API client for the external Reef API, for the Personalisation feature.
//
// Request/response shapes are not written by hand: they're read off the generated
// ../../generated/reef-api-client types, which are produced from reef_api.yaml by
// `npm run generate:reef-api-client`. Regenerate after any spec change and vue-tsc will
// point at whichever call sites no longer match.
//
// Reef is reached directly from the client with the user's OIDC access token, so every
// operation here is browser-only and we use plain fetch rather than $fetch. Nothing in this
// file is called during the server render: the public engagement numbers an RFC page shows
// arrive with whatever data the route already loads, so a visitor who isn't signed in costs
// Reef nothing at all.
// Every operation in the spec gets one thin function below; reefFetch holds the single
// copy of the base-URL, bearer-token, JSON and error-handling policy. If this file grows,
// split it into a utilities/reef/ directory.
//
// Nothing here coordinates requests. Keeping one reader's answers in step — loading them when the
// reader or the page changes, queueing their changes, putting a control back when Reef refuses —
// belongs to ~/stores/reef, which is the thing that holds the answers.

import { z } from 'zod'
import type { components, operations } from '../../generated/reef-api-client'
import { getAccessToken } from '~/utilities/oidc'

export type DocumentSet = components['schemas']['DocumentSet']
export type DocumentSetEntry = components['schemas']['DocumentSetEntry']
export type MyDocuments = components['schemas']['MyDocuments']
export type MyDocument = components['schemas']['MyDocument']
export type MyDocumentSet = components['schemas']['MyDocumentSet']
export type PopularEntry = components['schemas']['PopularEntry']
export type RatingAggregate = components['schemas']['RatingAggregate']
export type RatingWrite = components['schemas']['RatingWrite']
export type Subject = components['schemas']['Subject']
export type SubjectDetail = components['schemas']['SubjectDetail']
export type SubjectDetailOrRedirect = components['schemas']['SubjectDetailOrRedirect']
export type RetiredSubject = components['schemas']['RetiredSubject']
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

// --- Subjects ---------------------------------------------------------------------------

// The whole subject vocabulary, in name order. Public, and unpaginated because the vocabulary is
// curated by staff rather than self-served, so there's no page to ask for and no token to send.
export const getSubjects = (signal?: AbortSignal): Promise<Subject[]> => reefFetch('/api/reef/subjects/', { signal })

// One subject and the documents carrying it. Reef answers this path with either of two shapes and
// `retired` is what tells them apart, so callers narrow with isRetiredSubject rather than reading a
// field only one of them has.
export const getSubject = (slug: string, signal?: AbortSignal): Promise<SubjectDetailOrRedirect> =>
  reefFetch(`/api/reef/subjects/${encodeURIComponent(slug)}/`, { signal })

// Both shapes carry `retired`, so what separates them is its value rather than the field being
// there at all — which is why this is a predicate and not an `in` check repeated at each call site.
export const isRetiredSubject = (subject: SubjectDetailOrRedirect): subject is RetiredSubject => subject.retired

// --- This reader's own state, a page at a time ---------------------------------------------

// What the signed-in caller's rating, subscription and set membership are for each of the named
// documents, plus the caller's own sets. One request for a whole page of documents: the pages that
// show these controls show them beside ten to fifty documents at once, and asking per document per
// feature is what this replaces.
//
// Carries nothing public. The averages and totals beside these controls are the same for every
// visitor, so they come from the data the route already loaded rather than from here — which is
// what keeps an anonymous visitor from reaching Reef at all.
//
// `docs` names the documents wanted, one `doc` parameter each, in the canonical form
// ~/utilities/reef-documents builds. Reef caps a request at MY_DOCUMENTS_BATCH_LIMIT and answers a
// longer one with a 400, so callers chunk. An empty array is not an error: it asks only for the
// sets, which is how the set list is loaded on its own.
export const MY_DOCUMENTS_BATCH_LIMIT = 100

export const getMyDocuments = (docs: string[], signal?: AbortSignal): Promise<MyDocuments> => {
  const query = docs.map((doc) => `doc=${encodeURIComponent(doc)}`).join('&')
  return reefFetch(`/api/reef/me/documents/${query === '' ? '' : `?${query}`}`, {
    auth: 'required',
    signal
  })
}

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

// id and created_at are server-assigned, so callers supply only kind and params.
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

// One set by id. The id is the whole of a set's identity — there's no second, public read to keep
// in step with this one — so a shared link is this link whoever follows it. `optional` auth for
// that reason: a public set needs no token, which is what makes the link shareable, and a private
// one is the owner's to read with theirs. A set the caller may not read is left out of the queryset
// rather than refused, so it answers 404 without confirming that it exists.
export const getSet = (id: string, signal?: AbortSignal): Promise<DocumentSet> =>
  reefFetch(`/api/reef/sets/${id}/`, { auth: 'optional', signal })

// Create one set. id, slug, owner_name, created_at and updated_at are server-assigned, so callers
// supply only the title and the optional description. Membership isn't settable here either —
// `documents` is read-only on this schema, so a set is always born empty and the first document is
// a second call to putSetDocument.
export const createSet = (
  set: Omit<DocumentSet, 'id' | 'slug' | 'owner_name' | 'documents' | 'created_at' | 'updated_at'>,
  signal?: AbortSignal
): Promise<DocumentSet> => reefFetch('/api/reef/sets/', { method: 'POST', body: set, auth: 'required', signal })

// Add one document to one set, returning the updated set. Reef canonicalizes the identifier, so
// the compact form is what we send. The spec calls PUT idempotent, so adding a document the set
// already holds answers 200 rather than an error — only the first add answers 201, and callers
// have no reason to tell those apart.
export const putSetDocument = (id: string, doc: string, signal?: AbortSignal): Promise<DocumentSet> =>
  reefFetch(`/api/reef/sets/${id}/documents/${encodeURIComponent(doc)}/`, {
    method: 'PUT',
    auth: 'required',
    signal
  })

// Remove one document from one set. Answers 204, so unlike the PUT there's no updated set to read
// the new membership from.
export const deleteSetDocument = (id: string, doc: string, signal?: AbortSignal): Promise<void> =>
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
