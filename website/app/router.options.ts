import type { RouterConfig } from '@nuxt/schema'

/**
 * Restoring web functionality broken by Nuxt/vue-router.
 *
 * Bug fix: the browser Back button no longer returns the reader to where they
 * clicked an in-document citation link.
 * See https://github.com/ietf-tools/red/issues/441
 *
 * Non-RFC citations (e.g. `[FIPS-203]`) are plain native `<a href="#…">`
 * anchors, not router links. Clicking one scrolls to the reference natively; the
 * browser records the scroll position for that history entry, exactly as the web
 * platform specifies, so Back should return the reader to where they were.
 *
 * Nuxt/vue-router breaks this. Its global popstate handler runs `scrollBehavior`
 * on every Back, and its default forces `{ top: 0 }` when the hash is removed on
 * the same page — throwing the reader to the top.
 *
 * ── This override adopts Nuxt's own fix early ──
 * Nuxt fixed this upstream by returning `savedPosition ?? { left: 0, top: 0 }`
 * for the same-page hash-removal case, so the Back button restores the saved
 * position instead of jumping to the top:
 *   https://github.com/nuxt/nuxt/pull/35608  (fixes nuxt#35588)
 *
 * We mirror that approach here so we're already on the upstream behaviour before
 * it ships. Once the fix is released and we bump Nuxt, DELETE this file — the
 * default `scrollBehavior` will then do the right thing on its own.
 *
 * (This is the same-page hash logic from Nuxt's default `router.options.ts` plus
 * the PR #35608 change; it is not a byte-for-byte copy — the async page-load and
 * scroll-margin-top handling of the full default are not needed for these
 * same-document hash navigations.)
 */
export default {
  scrollBehavior(to, from, savedPosition) {
    // Same-page (hash) navigation — mirrors Nuxt's default incl. PR #35608.
    if (to.path.replace(/\/$/, '') === from.path.replace(/\/$/, '')) {
      if (from.hash && !to.hash) {
        // Back/Forward: restore the saved position; only fall back to the top
        // when there is none (e.g. a programmatic hash removal, not a history pop).
        return savedPosition ?? { left: 0, top: 0 }
      }
      if (to.hash) {
        return { el: to.hash, behavior: 'instant' }
      }
      return false
    }
    // Navigating to a different page.
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      return { el: to.hash, behavior: 'instant' }
    }
    return { left: 0, top: 0 }
  }
} satisfies RouterConfig
