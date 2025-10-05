declare global {
  interface Window {
    _paq?: (string | string[])[]
  }
}

export const analyticsMatomoTrackLinkPreview = (id: string): void => {
  if ('VITEST' in import.meta) {
    console.log('Not running Analytics during test')
    return
  } else {
    console.log('Not in test environment')
  }
  eventuallyDispatchEvent([['trackEvent', 'LinkPreview', id]])
}

const eventuallyDispatchEvent = (
  events: Window['_paq'],
  attemptsRemaining = 5
) => {
  const matomoEventQueue = window._paq
  if (matomoEventQueue !== undefined) {
    events?.forEach((event) => {
      matomoEventQueue.push(event)
      console.info('Analytics (Matomo) queued:', event)
    })
  } else if (attemptsRemaining > 0) {
    setTimeout(() => {
      eventuallyDispatchEvent(events, attemptsRemaining - 1)
    }, 500)
  } else {
    console.error(
      'Unable to dispatch analytics events',
      events,
      '. `window._paq` was ',
      window._paq
    )
  }
}
