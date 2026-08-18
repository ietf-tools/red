// @vitest-environment nuxt
import { beforeEach, describe, expect, test } from 'vitest'

import { clearReefCaches, REEF_CACHE_PREFIX } from './reef-cache'

const reefKeys = [
  `${REEF_CACHE_PREFIX}user-rating.reader-1.rfc9110`,
  `${REEF_CACHE_PREFIX}user-rating.reader-1.rfc2119`,
  `${REEF_CACHE_PREFIX}subscriptions.reader-1`,
  `${REEF_CACHE_PREFIX}sets.reader-1`,
  // Another reader's, left behind by an earlier session in this tab: the point of clearing is that
  // nothing cached for anyone survives a sign-out, so a sweep that only covered the reader who just
  // left would miss this.
  `${REEF_CACHE_PREFIX}subscriptions.reader-2`
]

describe('clearReefCaches', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  test('removes every cached Reef answer, whichever reader or feature it belongs to', () => {
    reefKeys.forEach((key) => {
      window.sessionStorage.setItem(key, '"cached"')
    })

    clearReefCaches()

    // Each one named, rather than asserting on the total, so a sweep that skipped over entries as it
    // removed them — the mistake collecting the keys first exists to avoid — fails here by naming
    // which one it left behind.
    reefKeys.forEach((key) => {
      expect(window.sessionStorage.getItem(key)).toBeNull()
    })
  })

  test('leaves everything else in the tab alone', () => {
    window.sessionStorage.setItem(`${REEF_CACHE_PREFIX}sets.reader-1`, '[]')
    window.sessionStorage.setItem('red.something-else', 'kept')
    window.sessionStorage.setItem('unrelated', 'kept')

    clearReefCaches()

    expect(window.sessionStorage.getItem('red.something-else')).toBe('kept')
    expect(window.sessionStorage.getItem('unrelated')).toBe('kept')
  })
})
