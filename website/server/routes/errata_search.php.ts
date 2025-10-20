import { legacyErrataSearchRedirectUrlBuilder } from '~/utilities/legacy-errata-search-redirect'

const HTTP_301_PERMANENT_REDIRECT = 301

/**
 * Redirect from the old URL of /search/errata.php
 * to the new path of errata.rfc-editor.org
 */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const newUrl = legacyErrataSearchRedirectUrlBuilder(url.search)
  sendRedirect(event, newUrl, HTTP_301_PERMANENT_REDIRECT)
})
