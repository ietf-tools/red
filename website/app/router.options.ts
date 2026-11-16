import type { RouterConfig } from '@nuxt/schema'
import { START_LOCATION } from 'vue-router'

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
        // Back or Forward to an entry that has a hash should return the reader to where they were, which
        // is not necessarily the hash target (they may have scrolled, then followed a citation). The
        // router only supplies `savedPosition` for those, never for a click on a link.
        return savedPosition ?? { el: to.hash, behavior: 'instant' }
      }
      return false
    }
    // Navigating to a different page.
    const position = () => {
      if (savedPosition) {
        return savedPosition
      }
      if (to.hash) {
        return { el: to.hash, behavior: 'instant' as const }
      }
      return { left: 0, top: 0 }
    }
    if (from === START_LOCATION) {
      return position()
    }
    // The router changes the URL before the new page has loaded its data, and the old page stays on
    // screen until then. Scrolling now would resolve the hash against the old page, which lands on
    // whichever of its elements shares the id (every RFC has a `#section-4`). So scroll when the new
    // page has rendered, unless the reader has already moved on.
    const nuxtApp = useNuxtApp()
    const { currentRoute } = useRouter()
    return new Promise((resolve) => {
      nuxtApp.hooks.hookOnce('page:loading:end', () => {
        requestAnimationFrame(() => {
          resolve(currentRoute.value.fullPath === to.fullPath ? position() : false)
        })
      })
    })
  }
} satisfies RouterConfig
