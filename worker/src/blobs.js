import * as cookie from 'cookie'
import { verify } from './oidc'

export async function blobs(request, env) {
  const url = new URL(request.url)
  const normalizedPath = decodeURIComponent(url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname)
  const isBetaWebsite = url.hostname === 'www-beta.rfc-editor.org'

  // Beta Website only - Check for access (exclude non-html pages)
  if (isBetaWebsite && !url.pathname.includes('.')) {
    const cookies = cookie.parse(request.headers.get('Cookie') ?? '')

    if (!cookies.jwt) {
      return Response.redirect(`${url.origin}/oidc?p=${encodeURIComponent(url.pathname)}`, 302)
    }

    const jwtState = await verify(env, cookies.jwt)
    if (!jwtState.isValid || jwtState.isExpired) {
      return Response.redirect(`${url.origin}/oidc?p=${encodeURIComponent(url.pathname)}`, 302)
    }
  }

  /**
   * RFC bucket usage (note env.RFC_BUCKET)
   */
  const RFC_PREFIX = '/rfc/'
  if (normalizedPath.startsWith(RFC_PREFIX)) {
    const objectPath = normalizedPath.substring(RFC_PREFIX.length)

    // -> Fetch R2 object
    if (['.html', '.json', '.pdf', '.txt', '.xml'].some(ft => objectPath.endsWith(ft))) {
      const fileType = objectPath.split('.').at(-1)
      const object = await env.RFC_BUCKET.get(`${fileType}/${objectPath}`)
      if (object) {
        const headers = new Headers()
        object.writeHttpMetadata(headers)
        headers.set('etag', object.httpEtag)
        headers.set('Cf-R2-Served', '1')
        headers.set('Access-Control-Allow-Origin', '*')
        headers.set('Content-Encoding', 'gzip')

        return new Response(object.body, {
          headers
        })
      }
    }
  }

  /**
   * RED bucket usage (note env.RED_BUCKET)
   */
  const REFS_PREFIX = '/refs/ref'
  if (normalizedPath.startsWith(REFS_PREFIX)) {
    const objectPath = normalizedPath.substring(REFS_PREFIX.length)

    // -> Fetch R2 object
    if (objectPath.endsWith('.txt')) {
      const bucketPath = `rfc-ref/${objectPath}`
      const object = await env.RED_BUCKET.get(bucketPath)
      if (object) {
        const headers = new Headers()
        object.writeHttpMetadata(headers)
        headers.set('etag', object.httpEtag)
        headers.set('Cf-R2-Served', '1')
        headers.set('Access-Control-Allow-Origin', '*')
        headers.set('Content-Encoding', 'gzip')
        headers.set('Content-Type', 'text/plain;charset=utf-8')

        return new Response(object.body, {
          headers
        })
      }
    }
  }

  const RFC_HTML_PREFIX = '/api/v1/rfc-html/'
  if (normalizedPath.startsWith(RFC_HTML_PREFIX)) {
    const objectPath = normalizedPath.substring(RFC_HTML_PREFIX.length)

    // -> Fetch R2 object
    if (objectPath.endsWith('.json') || objectPath.endsWith('.png')) {
      const object = await env.RED_BUCKET.get(`rfc/${objectPath}`)
      if (object) {
        const headers = new Headers()
        object.writeHttpMetadata(headers)
        headers.set('etag', object.httpEtag)
        headers.set('Cf-R2-Served', '1')
        headers.set('Access-Control-Allow-Origin', '*')
        headers.set('Content-Encoding', 'gzip')
        headers.set('Content-Type', 'application/json;charset=utf-8')

        return new Response(object.body, {
          headers
        })
      }
    }
  }

  const RFC_COMMON_PREFIX = '/api/v1/rfc-common/'
  if (normalizedPath.startsWith(RFC_COMMON_PREFIX)) {
    const objectPath = normalizedPath.substring(RFC_COMMON_PREFIX.length)

    // -> Fetch R2 object
    if (objectPath.endsWith('.json')) {
      const object = await env.RED_BUCKET.get(`rfc-common/${objectPath}`)
      if (object) {
        const headers = new Headers()
        object.writeHttpMetadata(headers)
        headers.set('etag', object.httpEtag)
        headers.set('Cf-R2-Served', '1')
        headers.set('Access-Control-Allow-Origin', '*')
        headers.set('Content-Encoding', 'gzip')
        headers.set('Content-Type', 'application/json;charset=utf-8')

        return new Response(object.body, {
          headers
        })
      }
    }
  }

  const INFO_SUBSERIES_PREFIX = '/api/v1/info-subseries/'
  if (normalizedPath.startsWith(INFO_SUBSERIES_PREFIX)) {
    const objectPath = normalizedPath.substring(INFO_SUBSERIES_PREFIX.length)

    // -> Fetch R2 object
    if (objectPath.endsWith('.json')) {
      const object = await env.RED_BUCKET.get(`subseries/${objectPath}`)
      if (object) {
        const headers = new Headers()
        object.writeHttpMetadata(headers)
        headers.set('etag', object.httpEtag)
        headers.set('Cf-R2-Served', '1')
        headers.set('Access-Control-Allow-Origin', '*')
        headers.set('Content-Encoding', 'gzip')
        headers.set('Content-Type', 'application/json;charset=utf-8')

        return new Response(object.body, {
          headers
        })
      }
    }
  }

  const META_THUMBNAIL_PREFIX = '/api/v1/meta-thumbnail/'
  if (normalizedPath.startsWith(META_THUMBNAIL_PREFIX)) {
    const objectPath = normalizedPath.substring(META_THUMBNAIL_PREFIX.length)

    // -> Fetch R2 object
    if (objectPath.endsWith('.png')) {
      const object = await env.RED_BUCKET.get(`thumbnail/${objectPath}`)
      if (object) {
        const headers = new Headers()
        object.writeHttpMetadata(headers)
        headers.set('etag', object.httpEtag)
        headers.set('Cf-R2-Served', '1')
        headers.set('Access-Control-Allow-Origin', '*')
        headers.set('Content-Encoding', 'gzip')
        headers.set('Content-Type', 'image/png')

        return new Response(object.body, {
          headers
        })
      }
    }
  }

  const FAVICON_PREFIX = '/api/v1/favicon/'
  if (normalizedPath.startsWith(FAVICON_PREFIX)) {
    const objectPath = normalizedPath.substring(FAVICON_PREFIX.length)

    // -> Fetch R2 object
    if (objectPath.endsWith('.png')) {
      const object = await env.RED_BUCKET.get(`other/favicon-${objectPath}`)
      if (object) {
        const headers = new Headers()
        object.writeHttpMetadata(headers)
        headers.set('etag', object.httpEtag)
        headers.set('Cf-R2-Served', '1')
        headers.set('Access-Control-Allow-Origin', '*')
        headers.set('Content-Encoding', 'gzip')
        headers.set('Content-Type', 'image/png')

        return new Response(object.body, {
          headers
        })
      }
    }
  }

  const RFC_JSON_PREFIX = '/api/v1/rfc/rfc'
  if (normalizedPath.startsWith(RFC_JSON_PREFIX)) {
    console.log("accessing", RFC_JSON_PREFIX)
    const objectPath = normalizedPath.substring(RFC_JSON_PREFIX.length)
    console.log({ objectPath })

    // -> Fetch R2 object
    if (objectPath.endsWith('.json')) {
      const object = await env.RED_BUCKET.get(`rfc-json/${objectPath}`)
      if (object) {
        const headers = new Headers()
        object.writeHttpMetadata(headers)
        headers.set('etag', object.httpEtag)
        headers.set('Cf-R2-Served', '1')
        headers.set('Access-Control-Allow-Origin', '*')
        headers.set('Content-Encoding', 'gzip')
        headers.set('Content-Type', 'application/json;charset=utf-8')

        return new Response(object.body, {
          headers
        })
      } else {
        console.log("Object not found")
      }
    }
  }

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
      from: '/reports/CurrQstats.txt',
      to: 'other/reports/CurrQstats.txt'
    }
  ]

  const mapping = mappings.find(mapping => mapping.from === normalizedPath)
  if (mapping) {
    const objectPath = mapping.to
    // -> Fetch R2 object
    const object = await env.RED_BUCKET.get(objectPath)
    if (object) {
      const headers = new Headers()
      object.writeHttpMetadata(headers)
      headers.set('etag', object.httpEtag)
      headers.set('Cf-R2-Served', '1')
      headers.set('Access-Control-Allow-Origin', '*')
      headers.set('Content-Encoding', 'gzip')
      if (mapping.to.includes('.')) {
        const extension = mapping.to.substring(mapping.to.lastIndexOf('.'))
        switch (extension) {
          case '.json':
            headers.set('Content-Type', 'application/json;charset=utf-8')
            break
          case '.txt':
            headers.set('Content-Type', 'text/plain;charset=utf-8')
            break;
          case '.xml':
            if (mapping.from.endsWith('rfcatom.xml')) {
              // Atom has a specific mime type
              headers.set('Content-Type', 'application/atom+xml;charset=utf-8')
            } else {
              // per RFC 7303 don't use `text/xml` and instead use `application/xml`.
              //
              // Note that RSS doesn't have a mime type from IANA (but Atom does!)
              // see https://www.iana.org/assignments/media-types/media-types.xhtml
              headers.set('Content-Type', 'application/xml;charset=utf-8')
            }
            break;
        }
      }

      return new Response(object.body, {
        headers
      })
    }
  }

  // Beta website only - fetch origin without cache
  if (isBetaWebsite) {
    return await fetch(request)
  }

  /**
   * Fetch from origin as fallback
   */
  let response = await fetch(request, {
    cf: {
      cacheTtl: 300,
      cacheEverything: true
    }
  })
  response = new Response(response.body, response)
  response.headers.set('Cache-Control', 'max-age=600')
  return response
}
