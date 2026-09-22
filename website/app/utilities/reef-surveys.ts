// The survey popover: after the reader has had time to settle into the page, offer any open
// survey as a dismissible toast. ~/stores/notifications owns queuing and displaying it; this is
// only where the delay and the fetch live.

import { until } from '@vueuse/core'
import type { OpenSurvey } from '~/utilities/reef-precomputed'
import { useNotificationsStore, type Notification } from '~/stores/notifications'
import { useReefSurveysStore } from '~/stores/reef-surveys'
import { reefDocumentKey } from '~/utilities/reef-documents'
import { parseSeriesId, type SeriesId } from './rfc'

const LOAD_SURVEYS_AFTER_MS = 5_000

// How long to wait for ~/utilities/oidc's session restore to settle before giving up and treating
// the reader as signed out. Covers both outcomes it can still be waiting on this far in — an
// Authentik round trip, or finding no session cookie at all — with room to spare, and also the
// oidc feature flag being off entirely, which otherwise leaves authStore.hasCheckedAuth false
// forever and this waiting for good.
const AUTH_CHECK_TIMEOUT_MS = 5_000

// slug is what a dismissal is keyed on (see OpenSurvey), so it's the notification's id too —
// not a derived string of our own that could drift from what the reader already dismissed.
export const openSurveyNotification = (survey: OpenSurvey): Notification => ({
  id: survey.slug,
  title: `Survey: ${survey.title}`,
  readMoreText: 'Take Survey',
  description: survey.description,
  url: survey.url,
  delayMs: 0,
  durationMs: 60_000,
  allowDismiss: true,
  position: 'bottom'
})

type Narrowing = {
  dismissedIds: string[]
  isAuthenticated: boolean
  seriesId?: SeriesId
}

export const chooseSurvey = (openSurveys: OpenSurvey[], narrowing: Narrowing): OpenSurvey | null => {
  let narrowedSurveys = openSurveys.filter((survey) => !narrowing.dismissedIds.includes(survey.slug))

  const anonymousSurveys = narrowedSurveys.filter((survey) => survey.visibility === 'open')
  const authenticatedSurveys = narrowedSurveys.filter((survey) => survey.visibility === 'authenticated')
  narrowedSurveys =
    narrowing.isAuthenticated && authenticatedSurveys.length > 0 ? authenticatedSurveys : anonymousSurveys

  const seriesIdString = narrowing.seriesId ? reefDocumentKey(narrowing.seriesId) : ''
  const seriesSurveys = narrowedSurveys.filter((survey) => survey.documents?.includes(seriesIdString))
  narrowedSurveys = narrowing.seriesId && seriesSurveys.length > 0 ? seriesSurveys : narrowedSurveys

  if (narrowedSurveys.length === 0) {
    return null
  }
  return narrowedSurveys[Math.floor(Math.random() * narrowedSurveys.length)] ?? null
}

const loadOpenSurveys = async (): Promise<void> => {
  const authStore = useAuthStore()
  const notificationsStore = useNotificationsStore()
  const notificationsStoreRefs = storeToRefs(notificationsStore)
  const reefSurveysStore = useReefSurveysStore()
  const router = useRouter()
  // Only /info/[id].vue's route carries an `id` param, so this is undefined — correctly, no
  // narrowing — everywhere else. Read from the route rather than parseSeriesId-ing the path
  // itself: a full path like /info/rfc9000/ splits into more than the two parts it expects and
  // never parses.
  const idParam = router.currentRoute.value.params.id
  const seriesId = typeof idParam === 'string' ? parseSeriesId(idParam) : undefined
  await until(() => authStore.hasCheckedAuth).toBe(true, { timeout: AUTH_CHECK_TIMEOUT_MS })
  try {
    const surveys = await reefSurveysStore.load()
    const narrowing: Narrowing = {
      dismissedIds: notificationsStoreRefs.dismissedIds.value,
      isAuthenticated: authStore.isAuthenticated,
      seriesId
    }
    const survey = chooseSurvey(surveys, narrowing)
    if (survey) {
      console.info('[survey]', `valid survey found`, { survey, surveys, narrowing })
      notificationsStore.add(openSurveyNotification(survey))
    } else {
      console.info('[survey]', `no valid surveys found`, surveys, narrowing)
    }
  } catch (error) {
    console.error('Unable to load open surveys.', error)
  }
}

export const initReefSurveys = (): void => {
  setTimeout(loadOpenSurveys, LOAD_SURVEYS_AFTER_MS)
}
