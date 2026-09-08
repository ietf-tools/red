import type { RouterConfig } from '@nuxt/schema'

/**
 * Non-RFC citations are plain `<a href="#…">` anchors. The browser saves the
 * scroll position for that history entry, so Back should return the reader to
 * where they clicked, but vue-router runs `scrollBehavior` on every popstate and
 * Nuxt's default forces `{ top: 0 }` when a hash is removed on the same page.
 * Returning `savedPosition ?? { left: 0, top: 0 }` for that case is Nuxt's
 * upstream fix, https://github.com/nuxt/nuxt/pull/35608; delete this file once
 * the Nuxt in use ships it.
 * https://github.com/ietf-tools/red/issues/441
 */
export default {
  scrollBehavior(to, from, savedPosition) {
    // Same-page (hash) navigation
    if (to.path.replace(/\/$/, '') === from.path.replace(/\/$/, '')) {
      // Back/Forward: restore the saved position; only fall back to the top
      // when there is none (e.g. a programmatic hash removal, not a history pop).
      if (from.hash && !to.hash) {
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
