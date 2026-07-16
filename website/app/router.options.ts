import type { RouterConfig } from '@nuxt/schema'

/**
 * Restoring web functionality broken by Nuxt/vue-router.
 *
 * Bug fix: the browser Back button no longer returns the reader to where they
 * clicked an in-document citation link.
 * See https://github.com/ietf-tools/red/issues/441
 *
 * Non-RFC citations (e.g. `[FIPS-203]`) are plain native `<a href="#…">`
 * anchors, not router links. Clicking one scrolls to the reference natively and
 * the browser records the scroll position for that history entry, exactly as the
 * web platform specifies, so Back button should return the reader to where they were.
 *
 * Nuxt/vue-router breaks this. It installs a global popstate handler that runs
 * its `scrollBehavior` on every Back, including one triggered by a native anchor
 * the router never created (`history.state.scroll` is `null`). With no position
 * of its own to restore, its default overrides the browser's native scroll
 * restoration and forces `{ top: 0 }`, throwing the reader to the top of the
 * page. That is a regression of native browser behaviour caused by the router,
 * not by anything in this app.
 *
 * This restores the native behaviour: for same-page hash navigation the content
 * is already rendered, so we hand scroll restoration back to the browser (return
 * `false`) instead of letting the router clobber it. The cross-page navigation
 * path is unaffected.
 */
export default {
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    // Same-page navigation where only the hash changed (or was removed) — e.g.
    // pressing Back after clicking an in-document citation link. Hand scroll
    // restoration back to the browser (its native behaviour) instead of letting
    // the router force the page to the top.
    if (to.path === from.path) {
      if (to.hash) {
        return { el: to.hash, behavior: 'instant' }
      }
      return false
    }
    // Navigating to a different page: honour a target hash, otherwise scroll to
    // the top.
    if (to.hash) {
      return { el: to.hash, behavior: 'instant' }
    }
    return { left: 0, top: 0 }
  }
} satisfies RouterConfig
