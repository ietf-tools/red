# Deployment smoke tests

Playwright tests that run against an **already-deployed** environment — staging, production, or a
local dev server you started yourself. They answer "did this deployment actually work?"

They run in the "Build and Deploy Website" workflow after the staging deploy, so a report is
waiting by the time you decide whether to approve the production deploy. The job is **report-only**
and does not gate `demo` or `prod`.

This is a different suite from [`../e2e/`](../e2e/), which runs under **vitest** with
`@nuxt/test-utils` and boots its own Nuxt dev server — so it can only ever test locally. Specs here
are named `*.spec.ts` rather than `*.e2e.ts` so vitest's `e2e` project glob doesn't pick them up.

## Running them

```bash
npm run test:smoke:prod        # no authentication needed
npm run test:smoke:staging     # needs a Cloudflare Access session — see below
npm run test:smoke:local       # against a dev server you already have running on :3000
npm run test:smoke:report      # open the HTML report from the last run
```

Everything is driven by env vars, so anything else is reachable too:

| Variable                                          | Default   | Purpose                                                     |
| ------------------------------------------------- | --------- | ----------------------------------------------------------- |
| `SMOKE_TARGET`                                    | `staging` | `local` \| `staging` \| `prod`                              |
| `SMOKE_BASE_URL`                                  | —         | Override the target's base URL, e.g. to point at demo       |
| `EXPECT_WEBSITE_VERSION`                          | —         | Wait for this version to be live before testing (see below) |
| `SMOKE_VERSION_TIMEOUT_MS`                        | `600000`  | How long to wait for that version                           |
| `SMOKE_ALLOW_OVERFLOW`                            | —         | Comma-separated RFCs to skip in `mobile-overflow.spec.ts`   |
| `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` | —         | Cloudflare Access service token (CI)                        |

`local` never starts or restarts a dev server — that's yours to manage.

## Authenticating to staging

Staging sits behind **Cloudflare Access with a GitHub IdP**. Both routes below produce the same
artifact — a Playwright `storageState` file at `smoke/.auth/<target>.json` holding the
`CF_Authorization` cookie — so the specs themselves know nothing about Cloudflare.

### Interactively (you, locally)

```bash
npm run test:smoke:login
```

Opens a browser, waits for you to complete the sign-in, and saves the session. If `cloudflared` is
on your `PATH` it's used instead, which needs no browser window. Re-run it when the session
expires; the specs fail with a message telling you to.

Staging has a same-host gate in front of Access: unauthenticated _page_ requests are redirected to
`/preview`, which is what starts the sign-in. Once you're signed in the app serves normally at the
root, so nothing here needs a path prefix. `/api/v1/*` and `/robots.txt` are served at the root
unauthenticated either way. The auth check looks for the app's own build assets rather than just a
200, so landing on that gate is reported as "not signed in" rather than passing silently.

### In CI (Cloudflare Access service token)

CI has no browser to click through SSO, so it uses a **service token**: two secret headers that
Cloudflare Access accepts in place of an interactive login.

One-time setup, which has to be done in the Cloudflare and GitHub dashboards:

1. **Cloudflare Zero Trust → Access → Service Auth** → create a service token, e.g. `red-e2e-ci`.
   It gives you a Client ID (`<uuid>.access`) and a Client Secret, shown only once.
2. On the **staging Access application**, add a _new_ policy (don't modify the human one):
   - Action: **Service Auth** — an `Allow` policy will not accept the token headers.
   - Include: **Service Token** → `red-e2e-ci`.
3. **GitHub → Settings → Environments → `staging`** → add secrets `CF_ACCESS_CLIENT_ID` and
   `CF_ACCESS_CLIENT_SECRET`, alongside the existing `CF_R2_STATIC_KEY_*` ones.

[`auth-cloudflare.ts`](auth-cloudflare.ts) then exchanges the token for the same session cookie the
interactive flow produces. It deliberately does _not_ set Playwright's `use.extraHTTPHeaders`,
because those are sent to **every** origin a page touches — `static.ietf.org`, Matomo,
`typesense.staging.ietf.org`, `account.ietf.org` — which would leak the token to third parties. A
cookie is scoped to the target host alone. If Cloudflare doesn't return a usable cookie, it falls
back to injecting the headers via request interception filtered to the target origin, which keeps
that property.

**Rotating the token:** create a new one in Cloudflare, add it to the Access policy, update the two
GitHub secrets, then delete the old token. Nothing in the repo needs changing.

**If you'd rather use Vault:** replace the two `secrets.*` lines in the workflow with a
`hashicorp/vault-action` step that exports the same two env vars. Nothing else changes — this suite
only cares that `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` are in the environment.

Note that Authentik (`account.ietf.org`) is _not_ involved here. It's the app's own user OIDC, not
what guards staging. It's the right tool for testing signed-in user features, which this suite
doesn't do yet.

## The deployed-version gate

The workflow's `staging` job only _dispatches_ `deploy.yml` in `ietf-tools/infra-k8s` and returns —
the rollout is asynchronous. Without waiting, the smoke tests would race it and silently test the
previous build.

So when `EXPECT_WEBSITE_VERSION` is set, [`global-setup.ts`](global-setup.ts) polls `/` until the
served HTML references `/_nuxt/<version>/` (`app.buildAssetsDir` in `nuxt.config.ts`, which encodes
the deployed version) before any spec runs. Unset locally, so manual runs start immediately.

## What's covered

| Spec                                                 | Checks                                                                                              |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [`health.spec.ts`](health.spec.ts)                   | `/api/v1/healthcheck.json` is ok and reports the right origin; `systemcheck.json` responds          |
| [`routes.spec.ts`](routes.spec.ts)                   | Key routes return 200 with the right content type; bare paths redirect to their trailing-slash form |
| [`homepage.spec.ts`](homepage.spec.ts)               | Homepage renders "Latest RFCs" and hydrates without page errors                                     |
| [`info-rfc.spec.ts`](info-rfc.spec.ts)               | An RFC info page renders title, metadata, abstract, document body and TOC                           |
| [`search.spec.ts`](search.spec.ts)                   | Typing a query returns hits from the environment's Typesense index; empty state works               |
| [`mobile-overflow.spec.ts`](mobile-overflow.spec.ts) | 11 structurally varied RFCs have no horizontal window scroll at 320px                               |

Everything is read-only and safe to run against production.

### About the overflow spec

The RFCs it covers are the regression set from an earlier scrolling investigation — the pages that
actually broke, plus a spread chosen for structural variety (tables, nested definition lists, SVG,
ABNF, source code, figures, and one plaintext-format RFC, which renders down a different path).

Three things to know:

- It uses a **locked 320px viewport, never device emulation**. With `isMobile: true` Chromium
  shrink-to-fits: `window.innerWidth` expands to the content width and an overflowing page reports
  no overflow at all. The locked viewport is what exposes it.
- `rfc9618` **currently fails on production**, overflowing by ~24px. That's a real open defect, not
  a broken test: the culprit is the `constrained_` chunk inside
  `authority_constrained_policy_set`, which has no further semantic break opportunity and is short
  enough that the `<wbr>` algorithm deliberately won't split it. `rfc9880` and `rfc9553` were in the
  same state and now pass, having been re-precomputed.
- These overflows are generally fixed by the word-break (`<wbr>`) work in `precomputer/`, not in
  this app, so a fix only clears here once the target environment's RFC HTML has been
  re-precomputed. Mute known cases with `SMOKE_ALLOW_OVERFLOW` rather than editing the spec, so the
  muting is visible in the run that used it.
- **Environments carry different RFC corpora** — staging lags production, so a very new RFC can
  404 there. The spec skips those with a reason rather than failing, and prefers RFCs old enough to
  exist everywhere. A genuinely broken `/info` route can't hide behind that skip:
  `info-rfc.spec.ts` asserts `rfc9000` unconditionally.

## Adding a spec

Import from [`fixtures.ts`](fixtures.ts), not `@playwright/test` directly — it wires up Cloudflare
auth, the `pageIssues` collector and the overflow helper:

```ts
import { expect, test } from './fixtures'

test('...', async ({ page, pageIssues }) => {
  /* ... */
})
```

Keep specs self-contained: no imports from `app/` or `shared/`. There's no Nuxt context here, so an
app import drags its whole dependency chain (and tsconfig project membership) along with it. Small
duplications like `infoPath()` are the deliberate price.

`npm run test:types` typechecks this directory via [`tsconfig.json`](tsconfig.json) — it isn't
covered by any of the generated `.nuxt/tsconfig.*.json` projects.
