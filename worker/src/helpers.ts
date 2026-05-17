import type { IRequest } from 'itty-router'

export function redirectTo(targetUrl: string, status = 302): (req: IRequest) => Response {
  return (_req: IRequest) => {
    return Response.redirect(targetUrl, status)
  }
}

export function addNormalizedPath(req: IRequest, ..._args: unknown[]): void {
  const url = new URL(req.url)
  req.normalizedPath = decodeURIComponent(url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname)
}

export function createBlobResponse(object: R2ObjectBody, contentType?: string, canonicalUrl?: string): Response {
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('Cf-R2-Served', '1')
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Content-Encoding', 'gzip')
  if (contentType) {
    headers.set('Content-Type', contentType)
  }
  if (canonicalUrl) {
    const formattedCanonicalUrl = formatCanonicalHeader(canonicalUrl)
    if (formattedCanonicalUrl) {
      headers.set('Link', formattedCanonicalUrl)
    }
  }

  return new Response(object.body, {
    headers
  })
}

export function createBlobNotFoundResponse(): Response {
  return new Response('404 - Not found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
  })
}

export function detectContentType(path: string): string | undefined {
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
    case '.css':
      return 'text/css; charset=utf-8'
    case '.js':
      return 'text/javascript; charset=utf-8'
    case '.xml':
      if (path.endsWith('rfcatom.xml')) {
        return 'application/atom+xml;charset=utf-8'
      } else {
        return 'application/xml;charset=utf-8'
      }
  }
}

function formatCanonicalHeader(url: string): string | undefined {
  const validatedUrl = safeParseURL(url)
  if (!validatedUrl) {
    return undefined
  }
  const validatedUrlString = validatedUrl.toString()
  const encodedUrl = encodeURI(validatedUrlString)
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')

  return `<${encodedUrl}>; rel="canonical"`
}

export const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

/**
 * TypeSense wants spaces encoded as '+' char not '%20'.
 */
export const typeSenseEncodeUriComponent = (uriComponent: string) =>
  encodeURIComponent(uriComponent).replace(/%20/g, '+')

const SEARCH_PATH = '/search/'

type Status =
  | 'Internet Standard'
  | 'Proposed Standard'
  | 'Draft Standard'
  | 'Best Current Practice'
  | 'Informational'
  | 'Experimental'
  | 'Historic'
  | 'Unknown'

type SearchPathBuilderProps = {
  q: string
  area: string
  stream: string
  statuses: string[]
  status: Status[]
  from: string
  to: string
  showObsoleted?: '1'
}

export const searchPathBuilder = (
  searchParams: Partial<SearchPathBuilderProps>
): `${typeof SEARCH_PATH}${string}` => {
  const hasParams = Object.values(searchParams).join('').trim().length > 0
  return `${SEARCH_PATH}${hasParams ? '?' : ''}${hasParams ?
    Object.keys(searchParams)
      .sort() // normalize order
      .map((searchKey) => {
        const typesenseSearchKey = searchKey
        const searchValue =
          searchParams[searchKey as keyof SearchPathBuilderProps]

        return searchValue ?
          `${encodeURIComponent(typesenseSearchKey)}=${typeSenseEncodeUriComponent(
            Array.isArray(searchValue) ? searchValue.join(',') : searchValue
          )}`
          : ''
      })
      .filter(Boolean)
      .join('&')
    : ''
    }`
}

export const rfcEditorErrataSearchUrl = (envDomain: string = '') => `https://errata${envDomain}.rfc-editor.org`

export const safeParseURL = (url: string): URL | undefined => {
  try {
    return new URL(url, 'https://localhost/')
  } catch (e: unknown) {
    console.error(`[safeParseURL] Unable to parse URL ${JSON.stringify(url)}`, e)
    return undefined
  }
}