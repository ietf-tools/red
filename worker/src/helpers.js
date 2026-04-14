/**
 * Create a redirect response handler
 *
 * @param {string} urlPath Redirect path or full URL
 * @param {number} status Status code
 * @returns {Response} Redirect response
 */
export function redirectTo(urlPath, status = 302) {
  return (req, _env) => {
    if (urlPath.startsWith('/')) {
      const newUrl = new URL(req.url)
      newUrl.pathname = urlPath
      return Response.redirect(newUrl.href, status)
    } else {
      return Response.redirect(urlPath, status)
    }
  }
}

/**
 * Add normalizedPath property with trailing slash removed
 * @param {string} req
 */
export function addNormalizedPath(req) {
  const url = new URL(req.url)
  req.normalizedPath = decodeURIComponent(url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname)
}

/**
 * Create blob object response
 *
 * @param {*} object Blob Object
 * @param {string} [contentType] Content-Type
 * @returns {Response} Blob Response
 */
export function createBlobResponse(object, contentType) {
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('Cf-R2-Served', '1')
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Content-Encoding', 'gzip')
  if (contentType) {
    headers.set('Content-Type', contentType)
  }

  return new Response(object.body, {
    headers
  })
}

/**
 * Create blob not found response
 *
 * @returns {Response} Not Found Response
 */
export function createBlobNotFoundResponse() {
  return new Response('404 - Not found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
  })
}

export function detectContentType(path) {
  if (!path.includes('.')) {
    return
  }

  const extension = path.substring(path.lastIndexOf('.'))
  switch (extension) {
    case '.json':
      return 'application/json;charset=utf-8'
    case '.ico':
      return 'image/png'
    case '.txt':
      return 'text/plain;charset=utf-8'
    case '.png':
      return 'image/png'
    case '.xml':
      if (path.endsWith('rfcatom.xml')) {
        // Atom has a specific mime type
        return 'application/atom+xml;charset=utf-8'
      } else {
        // Note that RSS doesn't have a mime type from IANA (but Atom does!)
        // see https://www.iana.org/assignments/media-types/media-types.xhtml
        //
        // per RFC 7303 don't use `text/xml` and instead use `application/xml`.
        return 'application/xml;charset=utf-8'
      }
  }
}