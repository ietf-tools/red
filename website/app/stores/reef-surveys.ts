// Every published survey (both visibilities), cached for the life of the tab once loaded.
// ~/utilities/reef-surveys narrows this list down to the one survey, if any, worth offering on
// the current route. Held here rather than refetched per route: the list changes rarely, and
// every route that might offer a survey wants the same one.

import type { AsyncDataRequestStatus } from 'nuxt/app'
import { fetchPublishedSurveys, type OpenSurvey } from '~/utilities/reef-precomputed'

export const useReefSurveysStore = defineStore('reefSurveys', () => {
  const surveys = ref<OpenSurvey[]>([])
  const status = ref<AsyncDataRequestStatus>('idle')
  const isSurveysModalOpenRef = ref<boolean>(false)

  // The in-flight request, so two routes asking at once — or a fast reader navigating again
  // before the first load lands — share the one fetch rather than each starting their own.
  let pending: Promise<OpenSurvey[]> | undefined

  // A failure leaves `status` at 'error' rather than caching the empty result, so the next
  // caller retries instead of being stuck believing there's nothing published.
  const load = (): Promise<OpenSurvey[]> => {
    if (status.value === 'success') {
      return Promise.resolve(surveys.value)
    }
    if (pending) {
      return pending
    }
    status.value = 'pending'
    pending = fetchPublishedSurveys()
      .then((result) => {
        surveys.value = result
        status.value = 'success'
        return result
      })
      .catch((error: unknown) => {
        status.value = 'error'
        throw error
      })
      .finally(() => {
        pending = undefined
      })
    return pending
  }

  return { surveys, status, load, isSurveysModalOpen: isSurveysModalOpenRef }
})
