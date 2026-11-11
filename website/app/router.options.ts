import type { RouterConfig } from '@nuxt/schema'

/**
 * Citations are plain `<a href="#…">` anchors, so the router never records a scroll
 * position for the entry they leave. vue-router runs `scrollBehavior` on every popstate,
 * and Nuxt's default forces `{ top: 0 }` when a hash is removed on the same page.
 * `savedPosition` is written by utilities/hash-link-scroll.ts before such a jump. When
 * it is missing (a hard-loaded page, where the browser's own restoration is still
 * active) returning `false` leaves the scroll position to the browser. Delete the
 * `false` fallback once Nuxt fixes it upstream, https://github.com/nuxt/nuxt/issues/36660
 * https://github.com/ietf-tools/red/issues/441
 */
export default {
  scrollBehavior(to, from, savedPosition) {
    // Same-page (hash) navigation
    if (to.path.replace(/\/$/, '') === from.path.replace(/\/$/, '')) {
      if (from.hash && !to.hash) {
        return savedPosition ?? false
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
