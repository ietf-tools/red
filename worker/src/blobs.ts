import type { IRequest } from 'itty-router'
import { createBlobResponse, createBlobNotFoundResponse, detectContentType } from './helpers'

const RFC_PREFIX = '/rfc/'
const INLINE_ERRATA_PREFIX = 'inline-errata/'
const INLINE_ERRATA_CSS_BUCKET_PREFIX = 'inline-errata/css/css/'
const RFC_REF_TXT = 'rfc-ref.txt'

export async function blobsRfc(req: IRequest, env: Env): Promise<Response | undefined> {
  const inlineErrataCssPrefix = `${INLINE_ERRATA_PREFIX}css/`

  const objectPath = req.normalizedPath.substring(RFC_PREFIX.length)

  const { origin } = new URL(req.url)
  let canonicalUrl = ''
  const rfcParts = objectPath.match(/(rfc(\d+))/i)
  if (rfcParts && rfcParts[2]) {
    const rfcNumber = parseInt(rfcParts[2], 10)
    canonicalUrl = `${origin}/info/rfc${rfcNumber}/`
    if (
      // if rfc has leading zeros we might need to redirect
      // ie `/rfc/rfc0100.pdf` should redirect to `/rfc/rfc100.pdf`
      rfcParts[2].startsWith('0')
    ) {
      const withoutLeadingZeros = req.normalizedPath.replace(/rfc0+/gi, 'rfc').replace(/ref0+/gi, 'ref')
      return Response.redirect(`${origin}${withoutLeadingZeros}`, 302)
    }
  }

  if (objectPath.startsWith(INLINE_ERRATA_PREFIX)) {
    if (['.html'].some((ft) => objectPath.endsWith(ft))) {
      const object = await env.INLINE_ERRATA_BUCKET.get(objectPath)
      if (object) {
        return createBlobResponse(req, object, detectContentType(objectPath), canonicalUrl)
      }
    } else if (
      objectPath.startsWith(inlineErrataCssPrefix) &&
      ['.css', '.png', '.js'].some((ft) => objectPath.endsWith(ft))
    ) {
      const cssBucketPath = `${INLINE_ERRATA_CSS_BUCKET_PREFIX}${objectPath.substring(inlineErrataCssPrefix.length)}`
      const object = await env.INLINE_ERRATA_BUCKET.get(cssBucketPath)
      if (object) {
        return createBlobResponse(req, object, detectContentType(objectPath))
      }
    }
  } else if (objectPath === RFC_REF_TXT) {
    // Keep bucket path in sync with precomputer upload bucket path. Same variable name used
    const IN_NOTES_RFC_REF_DOT_TXT_PATH = 'other/in-notes/rfc-ref.txt' as const
    // Note RED bucket usage
    const object = await env.RED_BUCKET.get(IN_NOTES_RFC_REF_DOT_TXT_PATH)
    if (object) {
      return createBlobResponse(req, object, detectContentType(objectPath), canonicalUrl)
    }
  } else if (['.html', '.json', '.pdf', '.txt', '.xml'].some((ft) => objectPath.endsWith(ft))) {
    const fileType = objectPath.split('.').at(-1)
    const object = await env.RFC_BUCKET.get(`${fileType}/${objectPath}`)
    if (object) {
      return createBlobResponse(req, object, detectContentType(objectPath), canonicalUrl)
    }
  }

  // Links to `/rfc/rfc1234` without a file extension should redirect to the `/info/rfc1234/` page
  const extensionlessMatch = objectPath.match(/^(rfc(\d+)\/?)$/i)
  if (extensionlessMatch && canonicalUrl) {
    return Response.redirect(canonicalUrl, 302)
  }

  return createBlobNotFoundResponse()
}

export async function blobsRefs(req: IRequest, env: Env): Promise<Response | undefined> {
  const REFS_PREFIX = '/refs/ref'

  if (req.normalizedPath.startsWith(REFS_PREFIX)) {
    const { origin } = new URL(req.url)
    const objectPath = req.normalizedPath.substring(REFS_PREFIX.length)

    if (
      // if ref has leading zeros we might need to redirect
      // ie `/refs/ref0212.txt` should redirect to `/refs/ref212.txt`
      objectPath.startsWith('0')
    ) {
      const withoutLeadingZeros = req.normalizedPath.replace(/ref0+/gi, 'ref')
      return Response.redirect(`${origin}${withoutLeadingZeros}`, 302)
    }

    if (objectPath.endsWith('.txt')) {
      const object = await env.RED_BUCKET.get(`rfc-ref/${objectPath}`)
      if (object) {
        return createBlobResponse(req, object, detectContentType(objectPath))
      }
    }

    return createBlobNotFoundResponse()
  }
}

export async function blobsApiRfcHtml(req: IRequest, env: Env): Promise<Response> {
  const RFC_HTML_PREFIX = '/api/v1/rfc-html/'

  const objectPath = req.normalizedPath.substring(RFC_HTML_PREFIX.length)

  if (objectPath.endsWith('.json') || objectPath.endsWith('.png')) {
    const object = await env.RED_BUCKET.get(`rfc/${objectPath}`)
    if (object) {
      return createBlobResponse(req, object, detectContentType(objectPath))
    }
  }

  return createBlobNotFoundResponse()
}

export async function blobsApiRfcCommon(req: IRequest, env: Env): Promise<Response> {
  const RFC_COMMON_PREFIX = '/api/v1/rfc-common/'

  const objectPath = req.normalizedPath.substring(RFC_COMMON_PREFIX.length)

  if (objectPath.endsWith('.json')) {
    const object = await env.RED_BUCKET.get(`rfc-common/${objectPath}`)
    if (object) {
      return createBlobResponse(req, object, detectContentType(objectPath))
    }
  }

  return createBlobNotFoundResponse()
}

export async function blobsApiInfoSubseries(req: IRequest, env: Env): Promise<Response> {
  const INFO_SUBSERIES_PREFIX = '/api/v1/info-subseries/'

  const objectPath = req.normalizedPath.substring(INFO_SUBSERIES_PREFIX.length)

  if (objectPath.endsWith('.json')) {
    const object = await env.RED_BUCKET.get(`subseries/${objectPath}`)
    if (object) {
      return createBlobResponse(req, object, detectContentType(objectPath))
    }
  }

  return createBlobNotFoundResponse()
}

export async function blobsApiMetaThumbnail(req: IRequest, env: Env): Promise<Response> {
  const META_THUMBNAIL_PREFIX = '/api/v1/meta-thumbnail/'

  const objectPath = req.normalizedPath.substring(META_THUMBNAIL_PREFIX.length)

  if (objectPath.endsWith('.png')) {
    const object = await env.RED_BUCKET.get(`thumbnail/${objectPath}`)
    if (object) {
      return createBlobResponse(req, object, detectContentType(objectPath))
    }
  }

  return createBlobNotFoundResponse()
}

export async function blobsApiFavicon(req: IRequest, env: Env): Promise<Response> {
  const FAVICON_PREFIX = '/api/v1/favicon/'

  const objectPath = req.normalizedPath.substring(FAVICON_PREFIX.length)

  if (objectPath.endsWith('.png')) {
    const object = await env.RED_BUCKET.get(`other/favicon-${objectPath}`)
    if (object) {
      return createBlobResponse(req, object, detectContentType(objectPath))
    }
  }

  return createBlobNotFoundResponse()
}

export async function blobsApiRfcJson(req: IRequest, env: Env): Promise<Response | undefined> {
  const RFC_JSON_PREFIX = '/api/v1/rfc/rfc'

  if (req.normalizedPath.startsWith(RFC_JSON_PREFIX)) {
    const rfcNumber = req.normalizedPath.match(/^\/api\/v1\/rfc\/rfc(?<num>\d+)$/i)?.groups?.num

    if (rfcNumber) {
      const blobPath = `json/rfc${rfcNumber}.json`
      const object = await env.RFC_BUCKET.get(blobPath)
      if (object) {
        return createBlobResponse(req, object, detectContentType(blobPath))
      }
    }

    return createBlobNotFoundResponse()
  }
}

export async function blobsApiContentJson(req: IRequest, env: Env): Promise<Response> {
  const CONTENT_PREFIX = '/api/v1/content/'

  const objectPath = req.normalizedPath.substring(CONTENT_PREFIX.length)

  if (objectPath.endsWith('.json')) {
    const object = await env.RED_BUCKET.get(`content/${objectPath}`)
    if (object) {
      return createBlobResponse(req, object, detectContentType(objectPath))
    }
  }

  return createBlobNotFoundResponse()
}

export async function blobsSitemap(req: IRequest, env: Env): Promise<Response | undefined> {
  const SITEMAP_NUMBER_PREFIX = '/sitemap-'

  if (req.normalizedPath.startsWith(SITEMAP_NUMBER_PREFIX)) {
    const objectPath = req.normalizedPath.substring(SITEMAP_NUMBER_PREFIX.length)

    if (objectPath.endsWith('.xml')) {
      const bucketPath = `other/sitemap-${objectPath}`
      const object = await env.RED_BUCKET.get(bucketPath)
      if (object) {
        return createBlobResponse(req, object, detectContentType(objectPath))
      }
    }

    return createBlobNotFoundResponse()
  }
}

export async function blobsNuxtAssets(req: IRequest, env: Env): Promise<Response | undefined> {
  const NUXT_ASSETS_PREFIX = '/_nuxt/'

  const objectPath = req.normalizedPath.substring(NUXT_ASSETS_PREFIX.length)
  const bucketPath = `other/nuxt-assets/${objectPath}`
  const object = await env.RED_BUCKET.get(bucketPath)
  if (object) {
    return createBlobResponse(req, object, detectContentType(objectPath), undefined, 3600)
  }
}

export async function blobsStatics(req: IRequest, env: Env): Promise<Response | undefined> {
  const mappings = [
    { from: '/favicon.ico', to: 'other/favicon-32x32.png' },
    { from: '/api/v1/homepage-latest.json', to: 'other/homepage-latest.json' },
    { from: '/api/v1/rfc-mini-index.json', to: 'other/rfc-mini-index.json' },
    { from: '/api/v1/errata.json', to: 'other/errata.json' },
    { from: '/rfc-index.txt', to: 'other/rfc-index.txt' },
    { from: '/rfc-index.xml', to: 'other/rfc-index.xml' },
    { from: '/rfc-index.xsd', to: 'other/rfc-index.xsd' },
    { from: '/std/std-index.txt', to: 'other/std-index.txt' },
    { from: '/bcp/bcp-index.txt', to: 'other/bcp-index.txt' },
    { from: '/fyi/fyi-index.txt', to: 'other/fyi-index.txt' },
    { from: '/rfcrss.xml', to: 'other/rfcrss.xml' },
    { from: '/rfcatom.xml', to: 'other/rfcatom.xml' },
    { from: '/in-notes/rfc-ref.txt', to: 'other/in-notes/rfc-ref.txt' },
    { from: '/robots.txt', to: 'other/robots.txt' },
    { from: '/sitemap.xml', to: 'other/sitemap.xml' },
    { from: '/reports/CurrQstats.txt', to: 'other/reports/CurrQstats.txt' },
    { from: '/api/v1/unusable-rfc-numbers.json', to: 'other/unusable-rfc-numbers.json' },
    { from: '/js/metadata.min.js', to: 'other/legacy/metadata.min.js' }
  ]

  const mapping = mappings.find((mapping) => mapping.from === req.normalizedPath)
  if (mapping) {
    const objectPath = mapping.to
    const object = await env.RED_BUCKET.get(objectPath)
    if (object) {
      return createBlobResponse(req, object, detectContentType(mapping.to))
    }

    return createBlobNotFoundResponse()
  }
}
