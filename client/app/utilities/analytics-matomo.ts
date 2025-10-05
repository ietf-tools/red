declare global {
  interface Window {
    _paq?: (string | string[])[]
  }
}

export const analyticsMatomoTrackLinkPreview = (id: string): void => {
  const matomoEventQueue = window._paq
  if (Array.isArray(matomoEventQueue)) {
    matomoEventQueue.push(['trackEvent', 'LinkPreview', id])
  } else {
    console.error('Unable to track page view due to lack of `window._paq` variable')
  }
}
