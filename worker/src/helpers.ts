import z from 'zod'
import type { IRequest } from 'itty-router'

export function redirectTo(targetUrl: string, status = 302): (req: IRequest) => Response {
  return (req: IRequest) => {
    if (targetUrl.startsWith('/')) {
      const newUrl = new URL(targetUrl, req.url)
      return Response.redirect(newUrl.href, status)
    } else {
      return Response.redirect(targetUrl, status)
    }
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
  try {
    const validatedUrl = new URL(url).toString()
    const encodedUrl = encodeURI(validatedUrl)
      .replace(/</g, '%3C')
      .replace(/>/g, '%3E')

    return `<${encodedUrl}>; rel="canonical"`
  } catch (e: unknown) {
    console.error('Invalid canonical url', url, e)
    return undefined
  }
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
export const statusSchema = z.union([
  z.literal('Internet Standard'),
  z.literal('Proposed Standard'),
  z.literal('Draft Standard'),
  z.literal('Best Current Practice'),
  z.literal('Informational'),
  z.literal('Experimental'),
  z.literal('Historic'),
  z.literal('Unknown')
])
type Status = z.infer<typeof statusSchema>
type SearchPathBuilderProps = {
  q: string
  area: string
  stream: string
  status: Status[]
  from: string
  to: string
  showObsoleted?: '1'
}

export const searchPathBuilder = (
  searchParams: Partial<SearchPathBuilderProps>,
  envDomain: string = '',
): string => {
  const hasParams = Object.values(searchParams).join('').trim().length > 0
  return `https://www${envDomain}.rfc-editor.org${SEARCH_PATH}${hasParams ? '?' : ''}${hasParams ?
    Object.keys(searchParams)
      .toSorted() // normalize order
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

export const rfcEditorErrataSearchUrl = (envDomain: string = '') => `https://errata${envDomain}.rfc-editor.org/search/`

export async function emptyFileResponse(req: IRequest): Promise<Response | undefined> {
  const headers = new Headers()
  headers.set('Access-Control-Allow-Origin', '*')
  const contentType = detectContentType(req.normalizedPath)
  if (contentType) {
    headers.set('Content-Type', contentType)
  }
  return new Response('', { headers })
}