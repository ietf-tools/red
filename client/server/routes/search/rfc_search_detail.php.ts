import { legacySearchRedirectPathBuilder } from '~/utilities/legacy-search-redirect'
import { SEARCH_PATH } from '~/utilities/url'

const HTTP_301_PERMANENT_REDIRECT = 301

/**
 * Redirect from the old URL of /search/rfc_search_detail.php
 * to the new path of /search/
 * while translating all the params (that's the hard bit..see adjacent tests)
 */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const params = legacySearchRedirectPathBuilder(url.search)

  sendRedirect(
    event,
    `${SEARCH_PATH}${params ? `?${params}` : ''}`,
    HTTP_301_PERMANENT_REDIRECT
  )
})
