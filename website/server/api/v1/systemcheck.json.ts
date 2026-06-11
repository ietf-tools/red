import https from 'https'
import { DateTime } from 'luxon'
import { usePublicSiteUrlOrigin } from '~/utilities/url'

/**
 * Health check
 */
export default defineEventHandler(async (event) => {
  const publicSiteUrlOrigin = usePublicSiteUrlOrigin()

  const pathsToCheck = [
    '/',
    '/api/v1/homepage-latest.json',
    '/robots.txt',
    '/sitemap.xml',
    '/rfcrss.xml',
    '/api/v1/info-subseries/bcp4.json', // just a randomly chosen subseries
    '/api/v1/rfc-html/8.json', // randomly chosen RFC PDF
    '/api/v1/rfc-html/8-page-1.png', // randomly RFC PDF page
    '/api/v1/rfc-html/7876.json', // randomly chosen RFC with HTML contents
    '/about/rfc-editor/' // randomly chosen markdown page
  ]

  const checks = await Promise.all(
    pathsToCheck.map((pathToCheck) => httpCheck(new URL(pathToCheck, publicSiteUrlOrigin).toString()))
  )

  const isOk = checks.every((check) => check.ok)

  const failedPathsMessage = checks
    .map((check) => {
      if (!check.ok) {
        return `${check.url} (HTTP ${check.statusCode})`
      }
      return undefined
    })
    .filter(Boolean)
    .join(', ')

  const timestampIso = DateTime.now().toISO()

  setResponseHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  setResponseHeader(event, 'Pragma', 'no-cache')
  setResponseHeader(event, 'Expires', '0')

  setResponseStatus(event, isOk ? 200 : 500)

  return {
    ok: isOk,
    timestampIso,
    message: isOk ? undefined : `Health check failed on ${publicSiteUrlOrigin}: ${failedPathsMessage}`
  }
})

type Check = {
  ok: boolean
  url: string
  statusCode: number
}

const httpCheck = (url: string) => {
  return new Promise<Check>((resolve, reject) => {
    https
      .request(url, { method: 'HEAD' }, (res) => {
        const { statusCode } = res
        if (statusCode === undefined) {
          reject()
          return
        }
        resolve({
          // using fetch response 'ok' definition of ok
          // https://developer.mozilla.org/en-US/docs/Web/API/Response/ok
          ok: statusCode >= 200 && statusCode <= 299,
          url,
          statusCode
        })
      })
      .on('error', (_err) => reject())
      .end()
  })
}
