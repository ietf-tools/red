import type { IRequest } from 'itty-router'
import { notFoundResponse } from './helpers'

/**
 * Almost everything that reaches this worker for a path it doesn't recognise is
 * junk: vulnerability scanners, mangled links, and crawlers chasing decades-old
 * URLs. `/errata_search.php./rfc4641`, `/pdfrfc/rfc5942.txt.pdf` and
 * `/info/rfc9266>./` are all real examples. Forwarding those to the origin buys
 * an origin round-trip to produce a 404 nobody wanted, so instead the worker
 * answers them itself and only forwards the paths the site actually has.
 *
 * The three gates below are registered at three different points in the router,
 * because each one can only be correct once the routes above it have had their
 * turn — see the comments at each registration site in `index.ts`.
 *
 * Blocked requests get a plain 404, indistinguishable from a genuine miss, so a
 * scanner learns nothing from the difference.
 */

const MAX_PATH_LENGTH = 512
const MAX_PATH_SEGMENTS = 10

/**
 * Every character any path on this site is built from. Uppercase has to be in
 * the set: `/materials/format/SVG-1.2-RFC.rnc`, `/reports/CurrQstats.txt` and
 * `/auth48/C123` are all real routes, and `/rfc/*` matches case-insensitively.
 *
 * Note this is tested against the *decoded* path, so a percent-encoded bogus
 * character is caught too — `%3E` fails on the `>` it decodes to.
 */
const ALLOWED_PATH_CHARACTERS = /^[A-Za-z0-9._\-/]*$/

/**
 * Detects totally bogus request paths that don't exist on the site.
 * These request paths are probably exploit scanners trying known exploitable
 * paths, or fuzzing paths etc. We should filter them out as illegitimate requests.
 *
 * Takes the raw (still percent-encoded) pathname.
 */
export const isBogusPath = (rawPathname: string): boolean => {
  if (rawPathname.length > MAX_PATH_LENGTH) {
    return true
  }

  let pathname: string
  try {
    pathname = decodeURIComponent(rawPathname)
  } catch {
    // Malformed percent-encoding, eg `/rfc/%ZZ`. Worth catching here rather than
    // letting `addNormalizedPath` throw on it further down the chain.
    return true
  }

  if (!ALLOWED_PATH_CHARACTERS.test(pathname)) {
    return true
  }

  // An empty path segment, ie `//`. Nothing here serves one, and it's a standard
  // way of trying to slip past prefix matching.
  if (pathname.includes('//')) {
    return true
  }

  const segments = pathname.split('/').filter(Boolean)

  if (segments.length > MAX_PATH_SEGMENTS) {
    return true
  }

  // Relative segments. A path that arrives with these unencoded is normalized
  // away before the worker sees it, so one surviving to here was encoded to
  // survive, ie sent deliberately.
  return segments.some((segment) => segment === '.' || segment === '..')
}

/**
 * The site's genuine `.php` paths are legacy URLs that redirect somewhere real,
 * and every one of them is registered as an explicit route *above* this gate,
 * so they've already returned a redirect by the time it runs. That's what lets
 * this be a blanket rule rather than a second list that could drift out of sync
 * with the routes: anything still carrying `.php` here is either a scan or a
 * mangled version of one of those legacy URLs.
 */
export const isBlockedPhpPath = (normalizedPath: string): boolean => normalizedPath.toLowerCase().includes('.php')

/**
 * `addNormalizedPath` strips the trailing slash, so the homepage arrives as an
 * empty string.
 */
const HOME_PATH = ''

/**
 * The paths the Nuxt origin serves, which is the whole of what may be forwarded
 * to it. Each is matched as an exact path or as a parent of one, so `/about` and
 * `/about/rfc-editor` both pass but `/aboutus` does not.
 *
 * Everything else the site answers — the RFC documents, the `/api/v1/*` JSON,
 * the sitemaps, the Nuxt build assets — is served from R2 by a route above this
 * gate, so it never gets here. That includes every path with a file extension,
 * which is why `/pdfrfc/rfc5942.txt.pdf` needs no rule of its own.
 *
 * Adding a top-level page to the website means adding it here too.
 */
const ORIGIN_PATHS = [
  '/about',
  '/account',
  '/authors',
  '/images',
  '/never-issued',
  '/rfc-index',
  '/search',
  '/series',
  '/set',
  '/status-changes',
  // The health checks are the only `/api/v1/*` paths the origin owns; the rest
  // are served from R2 above.
  '/api/v1/healthcheck.json',
  '/api/v1/systemcheck.json'
]

/**
 * `/info/` is the most-scanned namespace on the site, and its page accepts only
 * a series id, so it gets a stricter rule than a prefix match — this is the gate
 * that stops 'No "rfc9266>." page found.' being rendered by the origin.
 *
 * Kept deliberately in step with `parseSeriesId()` in the website: the same four
 * series types, digits only. A leading zero is fine, the page parses the number.
 */
const INFO_PREFIX = '/info/'
const SERIES_ID = /^(rfc|bcp|fyi|std)\d+$/

/**
 * `<NuxtIsland>` fetches a server-rendered component from
 * `/__nuxt_island/<Name>_<hash>.json`. Nothing declares itself an island yet, so
 * this exists only so that the first one added doesn't silently 404 here.
 *
 * The key rule mirrors Nuxt's own `isValidIslandKey` (`nuxt/dist/app/plugins/
 * utils.js`): a component name, an underscore, then the props hash — which has
 * `-` and `_` stripped from it, so it's alphanumeric. Nuxt's check is
 * case-insensitive, so folding the path to lower case first is equivalent.
 */
const NUXT_ISLAND_PREFIX = '/__nuxt_island/'
const NUXT_ISLAND_SUFFIX = '.json'
const NUXT_ISLAND_KEY = /^[a-z][a-z\d-]*_[a-z\d]+$/
const MAX_NUXT_ISLAND_KEY_LENGTH = 100

export const isNuxtIslandPath = (normalizedPath: string): boolean => {
  const path = normalizedPath.toLowerCase()

  if (!path.startsWith(NUXT_ISLAND_PREFIX) || !path.endsWith(NUXT_ISLAND_SUFFIX)) {
    return false
  }

  const key = path.slice(NUXT_ISLAND_PREFIX.length, -NUXT_ISLAND_SUFFIX.length)
  return key.length <= MAX_NUXT_ISLAND_KEY_LENGTH && NUXT_ISLAND_KEY.test(key)
}

/**
 * Matching is case-insensitive because the origin's own route matching is —
 * `/Search/` and `/INFO/RFC9266/` both resolve there today, the latter by
 * redirecting to its canonical lower-case form. Refusing them would be a
 * behaviour change beyond keeping junk off the origin, so the path is folded to
 * lower case here and every entry above is written that way.
 */
export const isOriginPath = (normalizedPath: string): boolean => {
  const path = normalizedPath.toLowerCase()

  if (path === HOME_PATH) {
    return true
  }

  if (path.startsWith(INFO_PREFIX) && SERIES_ID.test(path.substring(INFO_PREFIX.length))) {
    return true
  }

  if (isNuxtIslandPath(path)) {
    return true
  }

  return ORIGIN_PATHS.some((originPath) => path === originPath || path.startsWith(`${originPath}/`))
}

/**
 * Registered as the first route, so it runs for every request before anything
 * else gets to look at the path.
 */
export const rejectBogusPaths = (req: IRequest): Response | undefined => {
  if (isBogusPath(new URL(req.url).pathname)) {
    return notFoundResponse()
  }
}

/**
 * These two read `req.normalizedPath`, so both are registered below the
 * `addNormalizedPath` route in `index.ts`.
 */
export const rejectPhpPaths = (req: IRequest): Response | undefined => {
  if (isBlockedPhpPath(req.normalizedPath)) {
    return notFoundResponse()
  }
}

export const rejectNonOriginPaths = (req: IRequest): Response | undefined => {
  if (!isOriginPath(req.normalizedPath)) {
    return notFoundResponse()
  }
}
