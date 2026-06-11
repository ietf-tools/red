// This Nuxt module is supposed to be standalone so it intentionally doesn't import shared code from the rest of the project
declare global {
  interface Window {
    _paq?: string[][]
  }
}

const DEFAULT_MATOMO_STAGING_SITE_ID = 12
const DEFAULT_MATOMO_SITE_URL = 'https://analytics.ietf.org/'

export default defineNuxtPlugin({
  setup(_nuxtApp) {
    if (import.meta.env.TEST || import.meta.env.VITEST || import.meta.env.test || import.meta.env.vitest) {
      return
    }

    const runtimeConfig = useRuntimeConfig()
    const matomoSiteIdString = runtimeConfig.public.matomoSiteId

    if (!matomoSiteIdString) {
      console.warn('No Matomo Site Id env var found. Using default instead:', DEFAULT_MATOMO_STAGING_SITE_ID)
    } else {
      console.log('Using Matomo site id from env of ', JSON.stringify(matomoSiteIdString))
    }

    const matomoSiteId = matomoSiteIdString ? parseInt(matomoSiteIdString, 10) : DEFAULT_MATOMO_STAGING_SITE_ID

    useHead({
      script: [
        {
          innerHTML: getMatomoScript(matomoSiteId)
        }
      ]
    })
    const route = useRoute()

    watch(
      route,
      (value) => {
        try {
          const newUrl = new URL(value.fullPath, location.toString()).toString()
          eventuallyDispatchEvent([['setCustomUrl', newUrl], ['trackPageView']])
        } catch (e) {
          console.error('Analytics matomo error: ', e)
        }
      },
      { deep: true, immediate: true }
    )
  }
})

const getMatomoScript = (siteId: number = DEFAULT_MATOMO_STAGING_SITE_ID) => `
  var _paq = window._paq = window._paq || [];
  /* tracker methods like "setCustomDimension" should be called before "trackPageView" */
  _paq.push(['trackPageView']);
  _paq.push(['enableLinkTracking']);
  (function() {
    var u=${JSON.stringify(DEFAULT_MATOMO_SITE_URL)};
    _paq.push(['setTrackerUrl', u+'matomo.php']);
    _paq.push(['setSiteId', ${JSON.stringify(siteId)}]);
    var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
    g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
  })();`

const eventuallyDispatchEvent = (events: Window['_paq'], attemptsRemaining = 5) => {
  const matomoEventQueue = window._paq
  if (matomoEventQueue !== undefined) {
    events?.forEach((event) => {
      matomoEventQueue.push(event)
      // console.info('Analytics (Matomo) queued:', event)
    })
  } else if (attemptsRemaining > 0) {
    setTimeout(() => {
      eventuallyDispatchEvent(events, attemptsRemaining - 1)
    }, 500)
  } else {
    console.error('Unable to dispatch analytics events', events, '. `window._paq` was ', window._paq)
  }
}
