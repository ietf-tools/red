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

import type { components, operations } from '../../generated/reef-api-client'
import { getAccessToken } from '~/utilities/oidc'

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
    const detail =
      typeof body === 'object' && body !== null && 'detail' in body && typeof body.detail === 'string'
        ? ` — ${body.detail}`
        : ''
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

  console.log('sdfsdf4', { auth, token })

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
