export default defineNuxtPlugin({
  setup(_nuxtApp) {
    useHead({
      script: [
        {
          innerHTML: getMatomoScript()
        }
      ]
    })
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
