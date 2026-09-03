// @vitest-environment nuxt
//
// The wall on its own, with the flags provided by hand rather than read from localStorage: what it
// draws at each of the three answers a flag can give, and where it sends a reader who is refused.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import FeatureFlagWall from './FeatureFlagWall.vue'
import {
  DEFAULT_FEATURE_FLAGS,
  featureFlagsKey,
  hasFeatureFlagsLoadedKey,
  type FeatureFlags
} from '~/utilities/feature-flags'
import { HOME_PATH } from '~/utilities/url'

// Stubbed rather than driven: what the wall owes a refused reader is one replaced navigation, and
// that is what these assert. Hoisted because mockNuxtImport is — the factory runs when the mocked
// import resolves, before a plain `const` here would have been initialised.
const { navigateTo } = vi.hoisted(() => ({ navigateTo: vi.fn() }))

mockNuxtImport('navigateTo', () => navigateTo)

// A wall left mounted goes on watching flags the next test owns, and its redirect would land on
// that test's mock.
enableAutoUnmount(afterEach)

beforeEach(() => {
  navigateTo.mockReset()
})

const WALLED_TEXT = 'Behind the wall'

type RenderProps = {
  hasLoaded: boolean
  flags?: FeatureFlags
}

const renderWall = async ({ hasLoaded, flags }: RenderProps) => {
  const hasFeatureFlagsLoaded = ref(hasLoaded)
  const featureFlags = ref<FeatureFlags>({ ...DEFAULT_FEATURE_FLAGS, ...flags })
  const wall = await mountSuspended(FeatureFlagWall, {
    props: { featureFlagKey: 'oidc' },
    slots: { default: `<p>${WALLED_TEXT}</p>` },
    global: {
      provide: {
        [featureFlagsKey]: featureFlags,
        [hasFeatureFlagsLoadedKey]: hasFeatureFlagsLoaded
      }
    }
  })

  return { wall, featureFlags, hasFeatureFlagsLoaded }
}

describe('FeatureFlagWall', () => {
  test('draws nothing while the flags are still unknown', async () => {
    // The flag this would be gated on is on, so what keeps the slot off the page is that nothing
    // has been read yet rather than the answer.
    const { wall } = await renderWall({ hasLoaded: false, flags: { oidc: true } })

    expect(wall.text()).not.toContain(WALLED_TEXT)
    // Nor is an unknown answer a refusal: a reader turned away here would be sent home on every
    // arrival, including their own, before the flags had a chance to say yes.
    expect(navigateTo).not.toHaveBeenCalled()
  })

  test('draws what it gates once the flags say yes', async () => {
    const { wall } = await renderWall({ hasLoaded: true, flags: { oidc: true } })

    expect(wall.text()).toContain(WALLED_TEXT)
    expect(navigateTo).not.toHaveBeenCalled()
  })

  test('sends the reader to the homepage when the flags say no', async () => {
    const { wall } = await renderWall({ hasLoaded: true, flags: { oidc: false } })

    expect(wall.text()).not.toContain(WALLED_TEXT)
    expect(navigateTo).toHaveBeenCalledTimes(1)
    expect(navigateTo).toHaveBeenCalledWith(HOME_PATH, { replace: true })
  })

  test('answers the flags as they arrive', async () => {
    const { wall, hasFeatureFlagsLoaded } = await renderWall({ hasLoaded: false, flags: { oidc: false } })

    hasFeatureFlagsLoaded.value = true
    await nextTick()

    expect(wall.text()).not.toContain(WALLED_TEXT)
    expect(navigateTo).toHaveBeenCalledTimes(1)
    expect(navigateTo).toHaveBeenCalledWith(HOME_PATH, { replace: true })
  })

  test('turns the reader away when the flag is switched off under them', async () => {
    const { wall, featureFlags } = await renderWall({ hasLoaded: true, flags: { oidc: true } })

    featureFlags.value = { ...featureFlags.value, oidc: false }
    await nextTick()

    expect(wall.text()).not.toContain(WALLED_TEXT)
    expect(navigateTo).toHaveBeenCalledWith(HOME_PATH, { replace: true })
  })

  test('follows the key it is given rather than the one it mounted with', async () => {
    const { wall } = await renderWall({ hasLoaded: true, flags: { oidc: true, hasTextScale: false } })

    await wall.setProps({ featureFlagKey: 'hasTextScale' })

    expect(wall.text()).not.toContain(WALLED_TEXT)
    expect(navigateTo).toHaveBeenCalledWith(HOME_PATH, { replace: true })
  })
})
