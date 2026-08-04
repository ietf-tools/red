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
    super(`[reef] ${method} ${path} failed: ${status} ${statusText}`)
    this.name = 'ReefError'
    this.status = status
    this.statusText = statusText
    this.body = body
  }
}

type ReefRequest = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  // Attach the OIDC bearer token when a session exists. Set for every operation the spec
  // marks as authenticated, and also for those where being logged in changes the response
  // (an authenticated-visibility survey, an attributed response).
  auth?: boolean
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
  const { method = 'GET', body, auth = false, signal } = request
  const { reefBase } = useRuntimeConfig().public
  const token = auth ? await getAccessToken() : undefined

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

// Public aggregate rating for one RFC. Anonymous.
export const getRating = (rfc: string, signal?: AbortSignal): Promise<RatingAggregate> =>
  reefFetch(`/api/reef/ratings/${encodeURIComponent(rfc)}/`, { signal })

// Set the caller's own rating for one RFC, returning the updated aggregate.
export const putRating = (rfc: string, rating: RatingWrite, signal?: AbortSignal): Promise<RatingAggregate> =>
  reefFetch(`/api/reef/ratings/${encodeURIComponent(rfc)}/`, {
    method: 'PUT',
    body: rating,
    auth: true,
    signal
  })

// --- Subscriptions ----------------------------------------------------------------------

export const getSubscriptions = (signal?: AbortSignal): Promise<Subscription[]> =>
  reefFetch('/api/reef/subscriptions/', { auth: true, signal })

// id, verified and created_at are server-assigned, so callers supply only kind and params.
export const createSubscription = (
  subscription: Pick<Subscription, 'kind' | 'params'>,
  signal?: AbortSignal
): Promise<Subscription> =>
  reefFetch('/api/reef/subscriptions/', {
    method: 'POST',
    body: subscription,
    auth: true,
    signal
  })

export const deleteSubscription = (id: number, signal?: AbortSignal): Promise<void> =>
  reefFetch(`/api/reef/subscriptions/${id}/`, { method: 'DELETE', auth: true, signal })

// --- Surveys (management; staff only, used by the builder) -------------------------------

export const getSurveys = (signal?: AbortSignal): Promise<Survey[]> =>
  reefFetch('/api/reef/surveys/', { auth: true, signal })

// id, created_at and updated_at are server-assigned.
export const createSurvey = (
  survey: Omit<Survey, 'id' | 'created_at' | 'updated_at'>,
  signal?: AbortSignal
): Promise<Survey> => reefFetch('/api/reef/surveys/', { method: 'POST', body: survey, auth: true, signal })

export const getSurvey = (id: number, signal?: AbortSignal): Promise<Survey> =>
  reefFetch(`/api/reef/surveys/${id}/`, { auth: true, signal })

export const updateSurvey = (
  id: number,
  survey: Omit<Survey, 'id' | 'created_at' | 'updated_at'>,
  signal?: AbortSignal
): Promise<Survey> => reefFetch(`/api/reef/surveys/${id}/`, { method: 'PUT', body: survey, auth: true, signal })

export const patchSurvey = (id: number, survey: PatchedSurvey, signal?: AbortSignal): Promise<Survey> =>
  reefFetch(`/api/reef/surveys/${id}/`, { method: 'PATCH', body: survey, auth: true, signal })

export const deleteSurvey = (id: number, signal?: AbortSignal): Promise<void> =>
  reefFetch(`/api/reef/surveys/${id}/`, { method: 'DELETE', auth: true, signal })

// Aggregated responses for one survey. The spec types the payload as a free-form object.
export const getSurveyResults = (id: number, signal?: AbortSignal): Promise<SurveyResults> =>
  reefFetch(`/api/reef/surveys/${id}/results/`, { auth: true, signal })

// --- Surveys (runner; keyed by slug) ----------------------------------------------------

// Definition and theme for the runner. Anonymous for open surveys, so the token is sent
// only to unlock the ones whose visibility is authenticated.
export const getSurveyDefinition = (slug: string, signal?: AbortSignal): Promise<SurveyDefinition> =>
  reefFetch(`/api/reef/surveys/${encodeURIComponent(slug)}/definition/`, {
    auth: true,
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
    auth: true,
    signal
  })

// Surveys currently open to the caller — the list Red uses for its survey popover.
export const getOpenSurveys = (signal?: AbortSignal): Promise<OpenSurvey[]> =>
  reefFetch('/api/reef/surveys/open/', { auth: true, signal })
