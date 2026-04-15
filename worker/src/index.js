import { env } from 'cloudflare:workers'
import { IttyRouter } from 'itty-router'
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
import { addNormalizedPath, redirectTo } from './helpers'

const router = IttyRouter()

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
  .get('/ien/ien-index.html', redirectTo('/ien/ien-index/', 302))
  .get('/current_queue.php', redirectTo('/authors/rfc-edit/pub-queue/', 302))

  // Dynamic Redirects
  .get('/authors/:extra+', (req) =>
    Response.redirect(`https://auth48-transition.rfc-editor.org/authors/${req.params.extra}`, 302)
  )
  .get('/cluster_info.php', (req) => {
    if (req.query?.cid?.startsWith('C')) {
      return Response.redirect(`https://queue${env.ENV_DOMAIN}.rfc-editor.org/clusters/${req.query.cid.slice(1)}`, 302)
    }
  })
  .get('/in-notes/prerelease/*', addNormalizedPath, (req) => {
    const match = req.normalizedPath.match(/^\/in-notes\/prerelease\/rfc(?<num>\d+)\.notprepped\.xml$/i)
    if (match?.groups?.num) {
      return Response.redirect(
        `https://datatracker${env.ENV_DOMAIN}.ietf.org/doc/rfc${match.groups.num}/notprepped/`,
        302
      )
    }
  })
  .get('/auth48/*', addNormalizedPath, (req) => {
    let match = req.normalizedPath.match(/^\/auth48\/c(?<num>\d+)$/i)
    if (match?.groups?.num) {
      return Response.redirect(`https://queue${env.ENV_DOMAIN}.rfc-editor.org/final-review/C${match.groups.num}`, 302)
    }

    match = req.normalizedPath.match(/^\/auth48\/rfc(?<num>\d+)$/i)
    if (match?.groups?.num) {
      return Response.redirect(`https://queue${env.ENV_DOMAIN}.rfc-editor.org/final-review/rfc${match.groups.num}`, 302)
    }
  })
  .get('/in-notes/:extra+', (req) => Response.redirect(`https://in-notes.rfc-editor.org/${req.params.extra}`, 302))
  .get('/materials/:extra+', (req) => Response.redirect(`https://materials.rfc-editor.org/${req.params.extra}`, 302))

  // Auth
  // -> enable to restrict some paths to datatracker login
  // .get('/oidc', oidc.login)
  // .get('/oidc/callback', oidc.callback)

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
  .all('*', async (req) => {
    let resp = await fetch(req, {
      cf: {
        cacheTtl: 300,
        cacheEverything: true
      }
    })
    resp = new Response(resp.body, resp)
    resp.headers.set('Cache-Control', 'max-age=600')
    return resp
  })

export default {
  ...router
}
