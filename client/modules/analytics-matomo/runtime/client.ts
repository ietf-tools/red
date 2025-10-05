// This Nuxt module is supposed to be standalone so it intentionally doesn't import shared code from the rest of the project
declare global {
  interface Window {
    _paq?: (string | string[])[]
  }
}

const eventuallyDispatchEvent = (
  events: Window['_paq'],
  attemptsRemaining = 5
) => {
  const matomoEventQueue = window._paq
  if (matomoEventQueue !== undefined) {
    events?.forEach((event) => {
      matomoEventQueue.push(event)
    })
    console.info('Analytic (Matomo) queued:', events)
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

export default defineNuxtPlugin({
  setup(_nuxtApp) {
    useHead({
      script: [
        {
          innerHTML: getMatomoScript()
        }
      ]
    })
    const route = useRoute()

    watch(
      route,
      (value) => {
        try {
          const newUrl = new URL(value.fullPath, location.toString()).toString()
          eventuallyDispatchEvent([['setCustomUrl', newUrl], 'trackPageView'])
        } catch (e) {
          console.error('Analytics matomo error: ', e)
        }
      },
      { deep: true, immediate: true }
    )
  }
})

const MATOMO_STAGING_SITE_ID = 12

const getMatomoScript = (
  siteId: number = MATOMO_STAGING_SITE_ID,
  analyticsUrl: string = 'https://analytics.ietf.org/'
) => `
  var _paq = window._paq = window._paq || [];
  /* tracker methods like "setCustomDimension" should be called before "trackPageView" */
  _paq.push(['trackPageView']);
  _paq.push(['enableLinkTracking']);
  (function() {
    var u=${JSON.stringify(analyticsUrl)};
    _paq.push(['setTrackerUrl', u+'matomo.php']);
    _paq.push(['setSiteId', ${JSON.stringify(siteId)}]);
    var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
    g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
  })();`
