import { env } from 'cloudflare:workers'
import { IttyRouter, error } from 'itty-router'
import type { IRequest } from 'itty-router'
import {
  blobsApiFavicon,
  blobsApiContentJson,
  blobsApiInfoSubseries,
  blobsApiMetaThumbnail,
  blobsApiRfcCommon,
  blobsApiRfcHtml,
  blobsApiRfcJson,
  blobsNuxtAssets,
  blobsRefs,
  blobsRfc,
  blobsSitemap,
  blobsStatics
} from './blobs'
import { addNormalizedPath, emptyFileResponse, notFoundResponse, redirectTo, staleWhileRevalidate } from './helpers'
import { isNuxtIslandPath, rejectBogusPaths, rejectNonOriginPaths, rejectPhpPaths } from './request-filter'
import { legacySearchRedirectPathBuilder } from './legacy-search-redirect'
import { serverSearch } from './server-search'
import { legacyErrataSearchRedirectUrlBuilder } from './legacy-errata-search-redirect'

// Temporary - Exclude the paths from being redirected to auth48-transition.rfc-editor.org
const excludeAuthorRedirects = [
  '/authors/rfc-edit',
  '/authors/rfc-how-to',
  '/authors/rfc-independent-submissions',
  '/authors/rfc-style-guide',
  '/authors/rfc-edit/auth48',
  '/authors/rfc-edit/doc-clusters',
  '/authors/rfc-edit/pub-queue',
  '/authors/ise/ise-checklist',
  '/authors/ise/iseb',
  '/authors/ise/ise-reviewer-guidelines'
]

const subseriesRedirect = (req: IRequest) => {
  const url = new URL(req.normalizedPath, req.url)
  // handle paths like
  //  * `/bcp/bcp78`
  //  * `/fyi/fyi3`
  //  * `/std/std3`
  // by redirecting to /info/bcp78/ etc
  if (
    url.pathname.match(/^\/bcp\/bcp[0-9]+$/) ||
    url.pathname.match(/^\/std\/std[0-9]+$/) ||
    url.pathname.match(/^\/fyi\/fyi[0-9]+$/)
  ) {
    url.pathname = url.pathname.replace(/^\/(bcp|std|fyi)\//, '/info/')
    url.pathname += '/' // add the trailing space expected on the new site
    return redirectTo(url.toString(), 302)(req)
  }
}

const excludeInNotesRedirects = ['/in-notes/rfc-ref.txt', '/in-notes/rfc-index.txt']

// Paths that must always reach origin fresh and never be cached (e.g. health
// checks, whose whole purpose is to report the current origin state).
const cacheBypassPaths = ['/api/v1/healthcheck.json', '/api/v1/systemcheck.json']

const router = IttyRouter<IRequest, [Env, ExecutionContext]>()

router
  /**
   * Runs before every route: a path whose shape no route here could ever match
   * is answered with a 404 straight away, rather than being decoded, matched
   * against every route below, and eventually forwarded to the origin.
   */
  .all('*', rejectBogusPaths)
  /**
   * Order matters. `addNormalizedPath` decodes the path, which throws on
   * malformed percent-encoding, and the gate above has just ruled that out — so
   * it has to sit here rather than any higher. Every route below can rely on
   * `req.normalizedPath` being set.
   */
  .all('*', addNormalizedPath)

  // Static Redirects
  .get('/about', redirectTo('/about/rfc-editor/', 302))
  .get('/about/clusters/', redirectTo('https://authors.ietf.org/rfc-publication-process#clusters', 302))
  .get('/about/governing', redirectTo('/about/rfc-editor/', 302))
  .get('/about/independent', redirectTo('/authors/rfc-independent-submissions/', 302))
  .get('/about/iseb', redirectTo('/authors/rfc-independent-submissions/', 302))
  .get('/about/pubprocess/', redirectTo('https://authors.ietf.org/rfc-publication-process', 302))
  .get('/about/queue/', redirectTo(`https://queue${env.ENV_DOMAIN}.rfc-editor.org/about/`, 302))
  .get('/about/queue/flowchart/', redirectTo(`https://queue${env.ENV_DOMAIN}.rfc-editor.org/about/`, 302))
  .get('/about/rsag/', redirectTo('/about/', 302))
  .get('/all_clusters.php', redirectTo(`https://queue${env.ENV_DOMAIN}.rfc-editor.org/clusters/`, 302))
  .get('/bcps', redirectTo('/search/?status=Best+Current+Practice', 302))
  .get('/contact', redirectTo('/about/contact/', 302))
  .get('/contact/at-ietf', redirectTo('/about/contact/', 302))
  .get('/current_queue.php', redirectTo(`https://queue${env.ENV_DOMAIN}.rfc-editor.org`, 302))
  .get('/errata.json', redirectTo('/api/v1/errata.json', 302))
  .get('/errata.php', redirectTo(`https://errata${env.ENV_DOMAIN}.rfc-editor.org`, 302))
  .get('/errata-definitions', redirectTo('/series/rfc-errata/'))
  .get('/faq/', redirectTo('/series/rfc-faq/', 302))
  .get('/history/', redirectTo('https://history.rfc-editor.org', 302))
  .get('/how-to-report/', redirectTo('/series/rfc-errata/', 302))
  .get('/how-to-verify', redirectTo('/series/errata/how-to-verify/', 302))
  .get('/ien/', redirectTo('https://history.rfc-editor.org/ien/', 302))
  .get('/ien/ien-index.html', redirectTo('https://history.rfc-editor.org/ien/', 302))
  .get('/other/', redirectTo('https://authors.ietf.org', 302))
  .get('/pubprocess/', redirectTo('https://authors.ietf.org/rfc-publication-process', 302))
  .get('/queue.html', redirectTo(`https://queue${env.ENV_DOMAIN}.rfc-editor.org/`, 302))
  .get('/queue.xml', redirectTo(`https://queue${env.ENV_DOMAIN}.rfc-editor.org/api/v1/queue.xml`, 302))
  .get('/queue2.html', redirectTo(`https://queue${env.ENV_DOMAIN}.rfc-editor.org/`, 302))
  .get('/queue2.xml', redirectTo(`https://queue${env.ENV_DOMAIN}.rfc-editor.org/api/v1/queue.xml`, 302))
  .get('/retrieve/', redirectTo('/search/', 302))
  .get('/retrieve/bulk', redirectTo('/series/rfc-download/', 302))
  .get('/retrieve/rsync/', redirectTo('/series/rfc-download/', 302))
  .get('/rfc-index-100a.html', redirectTo('/rfc-index/', 302))
  .get('/rfc-index-100d.html', redirectTo('/rfc-index/', 302))
  .get('/rfc-index.html', redirectTo('/rfc-index/', 302))
  .get('/rfc-index2.html', redirectTo('/rfc-index/', 302))
  .get('/rfc-online-2000.html', redirectTo('https://history.rfc-editor.org/', 302))
  .get('/rfcs-per-year/', redirectTo('/about/rpc-reports/', 302))
  .get('/source-definitions', redirectTo('/series/rfc-tips/', 302))
  .get('/source-definitions/', redirectTo('/series/rfc-tips/', 302))
  .get('/staff/', redirectTo(`https://purple${env.ENV_DOMAIN}.rfc-editor.org/`, 302))
  .get('/staff/add_draft.php', redirectTo(`https://purple${env.ENV_DOMAIN}.rfc-editor.org/`, 302))
  .get('/staff/auth48_edit.php', redirectTo(`https://purple${env.ENV_DOMAIN}.rfc-editor.org/final-review`, 302))
  .get('/staff/current_queue.php', redirectTo(`https://purple${env.ENV_DOMAIN}.rfc-editor.org/`, 302))
  .get('/staff/index_controls.php', redirectTo(`https://purple${env.ENV_DOMAIN}.rfc-editor.org/`, 302))
  .get('/staff/list_drafts.php', redirectTo(`https://purple${env.ENV_DOMAIN}.rfc-editor.org/`, 302))
  .get('/staff/track_by_editor.php', redirectTo(`https://purple${env.ENV_DOMAIN}.rfc-editor.org/team`, 302))
  .get('/standards/', redirectTo('/search/?status=Internet+Standard', 302))
  .get('/status_changes.php', redirectTo('/status-changes/', 302))
  .get('/styleguide.html', redirectTo('/authors/rfc-style-guide/', 302))
  .get('/styleguide/', redirectTo('/authors/rfc-style-guide/', 302))
  .get('/styleguide/headers-and-boilerplate/', redirectTo('/authors/rfc-style-guide/#rfc-headers-and-boilerplate', 302))
  .get('/styleguide/part2/', redirectTo('/authors/rfc-style-guide/', 302))
  .get('/styleguide/tips/', redirectTo('/authors/rfc-style-guide/', 302))

  // Dynamic Redirects
  .get('/auth48/*', (req: IRequest) => {
    let match = req.normalizedPath.match(/^\/auth48\/c(?<num>\d+)$/i)
    if (match?.groups?.num) {
      return Response.redirect(`https://queue${env.ENV_DOMAIN}.rfc-editor.org/final-review/C${match.groups.num}`, 302)
    }

    match = req.normalizedPath.match(/^\/auth48\/rfc(?<num>\d+)$/i)
    if (match?.groups?.num) {
      return Response.redirect(`https://queue${env.ENV_DOMAIN}.rfc-editor.org/final-review/rfc${match.groups.num}`, 302)
    }
  })
  .get('/authors/:extra+', (req: IRequest) => {
    if (!excludeAuthorRedirects.some((p) => req.normalizedPath.startsWith(p))) {
      return Response.redirect(`https://auth48-transition.rfc-editor.org/authors/${req.params.extra}`, 302)
    }
  })
  .get('/cluster_info.php', (req: IRequest) => {
    if (typeof req.query?.cid === 'string' && req.query.cid.startsWith('C')) {
      return Response.redirect(`https://queue${env.ENV_DOMAIN}.rfc-editor.org/clusters/${req.query.cid.slice(1)}`, 302)
    }
  })
  .get('/errata/:extra+', (req: IRequest) =>
    Response.redirect(`https://errata${env.ENV_DOMAIN}.rfc-editor.org/${req.params.extra}`, 302)
  )
  .get('/errata_search.php', (req: IRequest) =>
    Response.redirect(legacyErrataSearchRedirectUrlBuilder(req.url, env.ENV_DOMAIN), 302)
  )
  .get('/ien/:extra+', (req: IRequest) =>
    Response.redirect(`https://history.rfc-editor.org/ien/${req.params.extra}`, 302)
  )
  .get('/in-notes/museum/:extra+', (req: IRequest) => {
    return Response.redirect(`https://history.rfc-editor.org/${req.params.extra}`, 302)
  })
  .get('/in-notes/prerelease/*', (req: IRequest) => {
    const match = req.normalizedPath.match(/^\/in-notes\/prerelease\/rfc(?<num>\d+)\.notprepped\.xml$/i)
    if (match?.groups?.num) {
      return Response.redirect(
        `https://datatracker${env.ENV_DOMAIN}.ietf.org/doc/rfc${match.groups.num}/notprepped/`,
        302
      )
    }
  })
  .get('/in-notes/:extra+', (req: IRequest) => {
    if (!excludeInNotesRedirects.some((p) => req.normalizedPath.startsWith(p))) {
      return error(404)
    }
  })
  .get('/materials/format/svg/', redirectTo('https://github.com/rfc-editor/svg-examples'))
  .get(
    '/materials/format/SVG-1.2-RFC.rnc',
    redirectTo('https://raw.githubusercontent.com/ietf-tools/RFCXML/main/SVG-1.2-RFC.rnc')
  )
  .get('/search/rfc_search.php', (req: IRequest) =>
    Response.redirect(legacySearchRedirectPathBuilder(req.url, env.ENV_DOMAIN), 302)
  )
  .get('/search/rfc_search_detail.php', (req: IRequest) =>
    Response.redirect(legacySearchRedirectPathBuilder(req.url, env.ENV_DOMAIN), 302)
  )

  /**
   * Every legacy `.php` URL the site still honours is registered above and has
   * already returned its redirect, so anything reaching here with `.php` in it
   * is a scan or a mangled link — `/errata_search.php./rfc4641`, say, or
   * `/cluster_info.php` without a cluster id. None of it goes to the origin.
   */
  .all('*', rejectPhpPaths)

  .get('/rfc/bcp-ref.txt', redirectTo('/std/bcp-index.txt', 302))
  .get('/rfc/rfc-index.txt', redirectTo('/rfc-index.txt', 302))
  .get('/in-notes/rfc-index.txt', redirectTo('/rfc-index.txt', 302))
  .get('/rfc/rfc-index.xml', redirectTo('/rfc-index.xml', 302))
  // Many RFCs at /rfc/rfc* refer to this CSS file.
  // Apparently it was added so that devs could override the path and add custom CSS when displaying RFCs,
  // but in the 2026-era there are other ways of inserting CSS (via UserScripts, Greasemonkey etc)
  .get('/rfc/rfc-local.css', emptyFileResponse)
  .get('/rfc/std-ref.txt', redirectTo('/std/std-index.txt', 302))
  // note that /rfc/fyi-ref.txt doesn't exist, and /rfc/rfc-ref.txt is not a redirect and is a blob still served

  .get('/bcp/*', subseriesRedirect)
  .get('/fyi/*', subseriesRedirect)
  .get('/std/*', subseriesRedirect)

  .get('/refs/bibxml/:extra+', (req: IRequest) =>
    Response.redirect(`https://bib.ietf.org/public/rfc/bibxml/${req.params.extra}`, 302)
  )

  // Blobs
  .get('/api/v1/content/*', blobsApiContentJson)
  .get('/api/v1/favicon/*', blobsApiFavicon)
  .get('/api/v1/info-subseries/*', blobsApiInfoSubseries)
  .get('/api/v1/meta-thumbnail/*', blobsApiMetaThumbnail)
  .get('/api/v1/rfc-common/*', blobsApiRfcCommon)
  .get('/api/v1/rfc-html/*', blobsApiRfcHtml)
  .get('/api/v1/rfc/*', blobsApiRfcJson)
  .get('/api/v1/search/', serverSearch)
  .get('/refs/*', blobsRefs)
  .get('/rfc/*', blobsRfc)
  .get('/_nuxt/*', blobsNuxtAssets)
  .get('/*', blobsSitemap)
  .get('/*', blobsStatics)

  /**
   * The last gate before the origin: by this point every path the worker serves
   * itself has been answered above, so anything still travelling is either a
   * page the Nuxt origin renders or junk. Only the former is forwarded.
   */
  .all('*', rejectNonOriginPaths)

  // Fallback to origin. The site is read-only, so allow GET (and therefore HEAD,
  // which the entrypoint below has already rewritten to GET) and reject everything
  // else. Those get stale-while-revalidate caching: fresh for maxAgeSeconds, then
  // served stale for a further additionalStaleWhileRevalidateSeconds while
  // revalidating in the background.
  .all('*', async (req: IRequest, _env: Env, ctx: ExecutionContext) => {
    if (req.method !== 'GET') {
      return new Response('405 - Method not allowed', {
        status: 405,
        headers: { 'Content-Type': 'text/plain;charset=utf-8', Allow: 'GET, HEAD' }
      })
    }

    const { pathname } = new URL(req.url)
    if (cacheBypassPaths.includes(pathname)) {
      return fetch(req)
    }

    /**
     * Islands are addressed by their query string — `<NuxtIsland>` puts the
     * component's props there, and the origin rejects a request whose props
     * don't match the hash in its path. `staleWhileRevalidate` strips the query
     * from both its cache key and its origin request, which would collapse every
     * island onto one entry and hand the origin props it can't verify. So they
     * skip it, query intact.
     */
    if (isNuxtIslandPath(req.normalizedPath)) {
      return fetch(req)
    }

    return staleWhileRevalidate(
      req,
      ctx,
      { maxAgeSeconds: 600, additionalStaleWhileRevalidateSeconds: 3000 },
      { cache: caches.default, fetch: (request) => fetch(request), now: () => Date.now() }
    )
  })

export default {
  /**
   * Every route above is registered with `.get()`, and itty-router matches on the
   * request method exactly, so HEAD would otherwise match nothing and fall through
   * to the origin fallback — bypassing all of the redirects and blob serving.
   *
   * Instead HEAD is routed as GET (safe: a HEAD request has no body, and `cf` is
   * preserved when constructing a Request from a Request), then the body is dropped
   * on the way out. Per RFC 9110 a HEAD response carries the same headers as the
   * GET it stands in for, with no body — so every `.get()` route serves HEAD too,
   * and the two share one cache entry.
   */
  fetch: async (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> => {
    const isHead = request.method === 'HEAD'
    const response: Response | undefined = await router.fetch(
      isHead ? new Request(request, { method: 'GET' }) : request,
      env,
      ctx
    )
    if (!response) {
      // Unreachable: the `.all('*')` fallback answers anything the routes above don't.
      return notFoundResponse()
    }
    return isHead ? new Response(null, response) : response
  }
}
