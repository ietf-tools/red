import { createBlobResponse, createBlobNotFoundResponse } from './helpers'

/**
 * RFC blobs
 */
export async function blobsRfc(req, env) {
  const RFC_PREFIX = '/rfc/'

  // -> Strip /rfc/ from path
  const objectPath = req.normalizedPath.substring(RFC_PREFIX.length)

  // -> Fetch R2 object from RFC bucket
  if (['.html', '.json', '.pdf', '.txt', '.xml'].some((ft) => objectPath.endsWith(ft))) {
    const fileType = objectPath.split('.').at(-1)
    const object = await env.RFC_BUCKET.get(`${fileType}/${objectPath}`)
    if (object) {
      return createBlobResponse(object)
    }
  }

  return createBlobNotFoundResponse()
}

/**
 * Refs blobs
 */
export async function blobsRefs(req, env) {
  const REFS_PREFIX = '/refs/ref'

  if (req.normalizedPath.startsWith(REFS_PREFIX)) {
    // -> Strip /refs/ref from path
    const objectPath = req.normalizedPath.substring(REFS_PREFIX.length)

    // -> Fetch R2 object from RED bucket
    if (objectPath.endsWith('.txt')) {
      const bucketPath = `rfc-ref/${objectPath}`
      const object = await env.RED_BUCKET.get(bucketPath)
      if (object) {
        return createBlobResponse(object, 'text/plain;charset=utf-8')
      }
    }

    return createBlobNotFoundResponse()
  }
}

/**
 * API RFC HTML blobs
 */
export async function blobsApiRfcHtml(req, env) {
  const RFC_HTML_PREFIX = '/api/v1/rfc-html/'

  // -> Strip /api/v1/rfc-html/ from path
  const objectPath = req.normalizedPath.substring(RFC_HTML_PREFIX.length)

  // -> Fetch R2 object
  if (objectPath.endsWith('.json') || objectPath.endsWith('.png')) {
    const object = await env.RED_BUCKET.get(`rfc/${objectPath}`)
    if (object) {
      return createBlobResponse(object, 'application/json;charset=utf-8')
    }
  }

  return createBlobNotFoundResponse()
}

/**
 * API RFC Common blobs
 */
export async function blobsApiRfcCommon(req, env) {
  const RFC_COMMON_PREFIX = '/api/v1/rfc-common/'

  // -> Strip /api/v1/rfc-common/ from path
  const objectPath = req.normalizedPath.substring(RFC_COMMON_PREFIX.length)

  // -> Fetch R2 object
  if (objectPath.endsWith('.json')) {
    const object = await env.RED_BUCKET.get(`rfc-common/${objectPath}`)
    if (object) {
      return createBlobResponse(object, 'application/json;charset=utf-8')
    }
  }

  return createBlobNotFoundResponse()
}

/**
 * API Info Subseries blobs
 */
export async function blobsApiInfoSubseries(req, env) {
  const INFO_SUBSERIES_PREFIX = '/api/v1/info-subseries/'

  // -> Strip /api/v1/info-subseries/ from path
  const objectPath = req.normalizedPath.substring(INFO_SUBSERIES_PREFIX.length)

  // -> Fetch R2 object
  if (objectPath.endsWith('.json')) {
    const object = await env.RED_BUCKET.get(`rfc-common/${objectPath}`)
    if (object) {
      return createBlobResponse(object, 'application/json;charset=utf-8')
    }
  }

  return createBlobNotFoundResponse()
}

/**
 * API Meta Thumbnail blobs
 */
export async function blobsApiMetaThumbnail(req, env) {
  const META_THUMBNAIL_PREFIX = '/api/v1/meta-thumbnail/'

  // -> Strip /api/v1/meta-thumbnail/ from path
  const objectPath = req.normalizedPath.substring(META_THUMBNAIL_PREFIX.length)

  // -> Fetch R2 object
  if (objectPath.endsWith('.png')) {
    const object = await env.RED_BUCKET.get(`thumbnail/${objectPath}`)
    if (object) {
      return createBlobResponse(object, 'image/png')
    }
  }

  return createBlobNotFoundResponse()
}

/**
 * API Favicon blobs
 */
export async function blobsApiFavicon(req, env) {
  const FAVICON_PREFIX = '/api/v1/favicon/'

  // -> Strip /api/v1/favicon/ from path
  const objectPath = req.normalizedPath.substring(FAVICON_PREFIX.length)

  // -> Fetch R2 object
  if (objectPath.endsWith('.png')) {
    const object = await env.RED_BUCKET.get(`other/favicon-${objectPath}`)
    if (object) {
      return createBlobResponse(object, 'image/png')
    }
  }

  return createBlobNotFoundResponse()
}

/**
 * API RFC JSON blobs
 */
export async function blobsApiRfcJson(req, env) {
  const RFC_JSON_PREFIX = '/api/v1/rfc/rfc'

  if (req.normalizedPath.startsWith(RFC_JSON_PREFIX)) {
    // -> Strip /refs/ref from path
    const objectPath = req.normalizedPath.substring(RFC_JSON_PREFIX.length)

    // -> Fetch R2 object from RED bucket
    if (objectPath.endsWith('.json')) {
      const bucketPath = `rfc-json/${objectPath}`
      const object = await env.RED_BUCKET.get(bucketPath)
      if (object) {
        return createBlobResponse(object, 'application/json;charset=utf-8')
      }
    }

    return createBlobNotFoundResponse()
  }
}

/**
 * Sitemap blobs
 */
export async function blobsSitemap(req, env) {
  const SITEMAP_NUMBER_PREFIX = '/sitemap-'

  if (req.normalizedPath.startsWith(SITEMAP_NUMBER_PREFIX)) {
    // -> Strip /sitemap- from path
    const objectPath = req.normalizedPath.substring(SITEMAP_NUMBER_PREFIX.length)

    // -> Fetch R2 object from RED bucket
    if (objectPath.endsWith('.xml')) {
      const bucketPath = `other/sitemap-${objectPath}`
      const object = await env.RED_BUCKET.get(bucketPath)
      if (object) {
        return createBlobResponse(object, 'application/xml;charset=utf-8')
      }
    }

    return createBlobNotFoundResponse()
  }
}

/**
 * Static mappings to blobs
 */
export async function blobsStatics(req, env) {
  const mappings = [
    {
      from: '/favicon.ico',
      to: 'other/favicon-32x32.png'
    },
    {
      from: '/api/v1/homepage-latest.json',
      to: 'other/homepage-latest.json'
    },
    {
      from: '/api/v1/rfc-mini-index.json',
      to: 'other/rfc-mini-index.json'
    },
    {
      from: '/api/v1/errata.json',
      to: 'other/errata.json'
    },
    {
      from: '/rfc-index.txt',
      to: 'other/rfc-index.txt'
    },
    {
      from: '/rfc-index.xml',
      to: 'other/rfc-index.xml'
    },
    {
      from: '/rfc-index.xsd',
      to: 'other/rfc-index.xsd'
    },
    {
      from: '/std/std-index.txt',
      to: 'other/std-index.txt'
    },
    {
      from: '/bcp/bcp-index.txt',
      to: 'other/bcp-index.txt'
    },
    {
      from: '/fyi/fyi-index.txt',
      to: 'other/fyi-index.txt'
    },
    {
      from: '/rfcrss.xml',
      to: 'other/rfcrss.xml'
    },
    {
      from: '/rfcatom.xml',
      to: 'other/rfcatom.xml'
    },
    {
      from: '/in-notes/rfc-ref.txt',
      to: 'other/in-notes/rfc-ref.txt'
    },
    {
      from: '/robots.txt',
      to: 'other/robots.txt'
    },
    {
      from: '/sitemap.xml',
      to: 'other/sitemap.xml'
    },
    {
      from: '/reports/CurrQstats.txt',
      to: 'other/reports/CurrQstats.txt'
    }
  ]

  const mapping = mappings.find((mapping) => mapping.from === req.normalizedPath)
  if (mapping) {
    const objectPath = mapping.to

    // -> Fetch R2 object
    const object = await env.RED_BUCKET.get(objectPath)
    if (object) {
      let contentType = null
      if (mapping.to.includes('.')) {
        const extension = mapping.to.substring(mapping.to.lastIndexOf('.'))
        switch (extension) {
          case '.json':
            contentType = 'application/json;charset=utf-8'
            break
          case '.ico':
            contentType = 'image/png'
            break
          case '.txt':
            contentType = 'text/plain;charset=utf-8'
            break
          case '.xml':
            if (mapping.from.endsWith('rfcatom.xml')) {
              // Atom has a specific mime type
              contentType = 'application/atom+xml;charset=utf-8'
            } else {
              // Note that RSS doesn't have a mime type from IANA (but Atom does!)
              // see https://www.iana.org/assignments/media-types/media-types.xhtml
              //
              // per RFC 7303 don't use `text/xml` and instead use `application/xml`.
              contentType = 'application/xml;charset=utf-8'
            }
            break
        }
      }
      return createBlobResponse(object, contentType)
    }

    return createBlobNotFoundResponse()
  }
}
