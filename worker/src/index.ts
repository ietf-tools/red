import { env } from 'cloudflare:workers'
import { IttyRouter, error } from 'itty-router'
import type { IRequest } from 'itty-router'
// import * as oidc from './oidc'
import {
  blobsApiFavicon,
  blobsApiInfoSubseries,
  blobsApiMetaThumbnail,
  blobsApiRfcCommon,
  blobsApiRfcHtml,
  blobsApiRfcJson,
  blobsRefs,
  blobsRfc,
  blobsSitemap,
  blobsStatics
} from './blobs'
import { addNormalizedPath, emptyFileResponse, redirectTo } from './helpers'
import { legacySearchRedirectPathBuilder } from './legacy-search-redirect'

import { legacyErrataSearchRedirectUrlBuilder } from './legacy-errata-search-redirect'

// Temporary - Exclude the paths from being redirected to auth48-transition.rfc-editor.org
const excludeAuthorRedirects = [
  '/authors/rfc-edit',
  '/authors/rfc-how-to',
  '/authors/rfc-independent-submissions',
  '/authors/rfc-style-guide',
  '/authors/rfc-edit/auth48',
  '/authors/rfc-edit/doc-clusters',
  '/authors/rfc-edit/pub-queue'
]

const excludeInNotesRedirects = ['/in-notes/rfc-ref.txt']

const router = IttyRouter<IRequest, [Env]>()

router
  // Static Redirects
  .get('/contact', redirectTo('/about/contact/', 302))
  .get('/contact/at-ietf', redirectTo('/about/contact/', 302))
  .get('/about', redirectTo('/about/rfc-editor/', 302))
  .get('/about/governing', redirectTo('/about/rfc-editor/', 302))
  .get('/about/independent', redirectTo('/authors/rfc-independent-submissions/', 302))
  .get('/about/iseb', redirectTo('/authors/rfc-independent-submissions/', 302))
  .get('/retrieve/', redirectTo('/search/', 302))
  .get('/retrieve/rsync/', redirectTo('/series/rfc-download/', 302))
  .get('/source-definitions/', redirectTo('/series/rfc-tips/', 302))
  .get('/how-to-report/', redirectTo('/series/rfc-errata/', 302))
  .get('/history/', redirectTo('https://history.rfc-editor.org', 302))
  .get('/about/clusters/', redirectTo('/authors/rfc-edit/doc-clusters/', 302))
  .get('/about/pubprocess/', redirectTo('/authors/rfc-edit/', 302))
  .get('/about/queue/', redirectTo('/authors/rfc-edit/pub-queue/', 302))
  .get('/about/queue/flowchart/', redirectTo('/authors/rfc-edit/pub-queue/', 302))
  .get('/styleguide/', redirectTo('/authors/rfc-style-guide/', 302))
  .get('/styleguide/part2/', redirectTo('/authors/rfc-style-guide/', 302))
  .get('/styleguide/tips/', redirectTo('/authors/rfc-style-guide/', 302))
  .get('/other/', redirectTo('https://authors.ietf.org', 302))
  .get('/errata.json', redirectTo('/api/v1/errata.json', 302))
  .get('/rfc-index.html', redirectTo('/search/', 302))
  .get('/rfc-index2.html', redirectTo('/search/', 302))
  .get('/rfc-index-100a.html', redirectTo('/search/', 302))
  .get('/rfc-index-100d.html', redirectTo('/search/', 302))
  .get('/status_changes.php', redirectTo('/status-changes/', 302))
  .get('/all_clusters.php', redirectTo(`https://queue${env.ENV_DOMAIN}.rfc-editor.org/clusters/`, 302))
  .get('/standards/', redirectTo('/search/?status=Internet+Standard', 302))
  .get('/errata.php', redirectTo(`https://errata${env.ENV_DOMAIN}.rfc-editor.org`, 302))
  .get('/source-definitions', redirectTo('/series/rfc-tips/', 302))
  .get('/how-to-verify', redirectTo('/series/rfc-errata/', 302))
  .get('/ien/', redirectTo('https://history.rfc-editor.org/ien/', 302))
  .get('/ien/ien-index.html', redirectTo('https://history.rfc-editor.org/ien/', 302))
  .get('/current_queue.php', redirectTo(`https://queue${env.ENV_DOMAIN}.rfc-editor.org`, 302))
  .get('/queue2.xml', redirectTo(`https://queue${env.ENV_DOMAIN}.rfc-editor.org/api/v1/queue.xml`, 302))
  .get('/queue.xml', redirectTo(`https://queue${env.ENV_DOMAIN}.rfc-editor.org/api/v1/queue.xml`, 302))
  .get('/queue.html', redirectTo(`https://queue${env.ENV_DOMAIN}.rfc-editor.org/`, 302))
  .get('/queue2.html', redirectTo(`https://queue${env.ENV_DOMAIN}.rfc-editor.org/`, 302))
  .get('/staff/', redirectTo(`https://purple${env.ENV_DOMAIN}.rfc-editor.org/`, 302))
  // Purple redirects
  .get('/staff/add_draft.php', redirectTo(`https://purple${env.ENV_DOMAIN}.rfc-editor.org/`, 302))
  .get('/staff/list_drafts.php', redirectTo(`https://purple${env.ENV_DOMAIN}.rfc-editor.org/`, 302))
  .get('/staff/index_controls.php', redirectTo(`https://purple${env.ENV_DOMAIN}.rfc-editor.org/`, 302))
  .get('/staff/current_queue.php', redirectTo(`https://purple${env.ENV_DOMAIN}.rfc-editor.org/`, 302))
  .get('/staff/track_by_editor.php', redirectTo(`https://purple${env.ENV_DOMAIN}.rfc-editor.org/team`, 302))
  .get('/staff/auth48_edit.php', redirectTo(`https://purple${env.ENV_DOMAIN}.rfc-editor.org/final-review`, 302))

  // Dynamic Redirects
  .get('/authors/:extra+', addNormalizedPath, (req: IRequest) => {
    if (!excludeAuthorRedirects.some((p) => req.normalizedPath.startsWith(p))) {
      return Response.redirect(`https://auth48-transition.rfc-editor.org/authors/${req.params.extra}`, 302)
    }
  })
  .get('/cluster_info.php', (req: IRequest) => {
    if (typeof req.query?.cid === 'string' && req.query.cid.startsWith('C')) {
      return Response.redirect(`https://queue${env.ENV_DOMAIN}.rfc-editor.org/clusters/${req.query.cid.slice(1)}`, 302)
    }
  })
  .get('/in-notes/prerelease/*', addNormalizedPath, (req: IRequest) => {
    const match = req.normalizedPath.match(/^\/in-notes\/prerelease\/rfc(?<num>\d+)\.notprepped\.xml$/i)
    if (match?.groups?.num) {
      return Response.redirect(
        `https://datatracker${env.ENV_DOMAIN}.ietf.org/doc/rfc${match.groups.num}/notprepped/`,
        302
      )
    }
  })
  .get('/in-notes/museum/:extra+', addNormalizedPath, (req: IRequest) => {
    return Response.redirect(`https://history.rfc-editor.org/${req.params.extra}`, 302)
  })
  .get('/auth48/*', addNormalizedPath, (req: IRequest) => {
    let match = req.normalizedPath.match(/^\/auth48\/c(?<num>\d+)$/i)
    if (match?.groups?.num) {
      return Response.redirect(`https://queue${env.ENV_DOMAIN}.rfc-editor.org/final-review/C${match.groups.num}`, 302)
    }

    match = req.normalizedPath.match(/^\/auth48\/rfc(?<num>\d+)$/i)
    if (match?.groups?.num) {
      return Response.redirect(`https://queue${env.ENV_DOMAIN}.rfc-editor.org/final-review/rfc${match.groups.num}`, 302)
    }
  })
  .get('/in-notes/:extra+', addNormalizedPath, (req: IRequest) => {
    if (!excludeInNotesRedirects.some((p) => req.normalizedPath.startsWith(p))) {
      return error(404)
    }
  })
  .get('/materials/:extra+', (req: IRequest) => Response.redirect(`https://materials.rfc-editor.org/${req.params.extra}`, 302))
  .get('/errata/:extra+', (req: IRequest) =>
    Response.redirect(`https://errata${env.ENV_DOMAIN}.rfc-editor.org/${req.params.extra}`, 302)
  )
  .get('/search/rfc_search_detail.php', (req: IRequest) =>
    Response.redirect(legacySearchRedirectPathBuilder(req.url, env.ENV_DOMAIN), 302)
  )
  .get('/search/rfc_search.php', (req: IRequest) =>
    Response.redirect(legacySearchRedirectPathBuilder(req.url, env.ENV_DOMAIN), 302)
  )
  .get('/errata_search.php', (req: IRequest) =>
    Response.redirect(legacyErrataSearchRedirectUrlBuilder(req.url, env.ENV_DOMAIN), 302)
  )

  // Auth
  // -> enable to restrict some paths to datatracker login
  // .get('/oidc', oidc.login)
  // .get('/oidc/callback', oidc.callback)

  .get('/rfc/std-ref.txt', redirectTo('/std/std-index.txt', 302))
  .get('/rfc/bcp-ref.txt', redirectTo('/std/bcp-index.txt', 302))
  // note that /rfc/fyi-ref.txt doesn't exist, and /rfc/rfc-ref.txt is not a redirect and is a blob still served

  .get('/rfc/rfc-index.txt', redirectTo('/rfc-index.txt', 302))
  .get('/rfc/rfc-index.xml', redirectTo('/rfc-index.xml', 302))

  .get('/rfc/rfc-local.css', addNormalizedPath, emptyFileResponse)

  // Blobs
  .get('/rfc/*', addNormalizedPath, blobsRfc)
  .get('/refs/*', addNormalizedPath, blobsRefs)
  .get('/api/v1/rfc-html/*', addNormalizedPath, blobsApiRfcHtml)
  .get('/api/v1/rfc-common/*', addNormalizedPath, blobsApiRfcCommon)
  .get('/api/v1/info-subseries/*', addNormalizedPath, blobsApiInfoSubseries)
  .get('/api/v1/meta-thumbnail/*', addNormalizedPath, blobsApiMetaThumbnail)
  .get('/api/v1/favicon/*', addNormalizedPath, blobsApiFavicon)
  .get('/api/v1/rfc/*', addNormalizedPath, blobsApiRfcJson)
  .get('/*', addNormalizedPath, blobsSitemap)
  .get('/*', addNormalizedPath, blobsStatics)

  // Fallback to origin
  .all('*', async (req: IRequest) => {
    let resp = await fetch(req, {
      cf: {
        cacheTtl: 60,
        cacheEverything: true
      }
    })
    resp = new Response(resp.body, resp)
    resp.headers.set('Cache-Control', 'max-age=120')
    return resp
  })

export default {
  ...router
}
