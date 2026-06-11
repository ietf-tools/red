import { DateTime } from 'luxon'
import { usePublicSiteUrlOrigin } from '~/utilities/url'

/**
 * Health check
 */
export default defineEventHandler(async (event) => {
  const publicSiteUrlOrigin = usePublicSiteUrlOrigin()
  const timestampIso = DateTime.now().toISO()

  setResponseHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  setResponseHeader(event, 'Pragma', 'no-cache')
  setResponseHeader(event, 'Expires', '0')

  setResponseStatus(event, 200)

  return {
    ok: true,
    publicSiteUrlOrigin,
    timestampIso
  }
})
