// @vitest-environment nuxt
//
// The word-breaking group in the settings panel: absent without its feature flag, present with it,
// and writing the chosen mode to the store.
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import AdvancedUISettings from './AdvancedUISettings.vue'
import { useUiSettingsStore } from '~/stores/ui-settings'
import {
  DEFAULT_FEATURE_FLAGS,
  featureFlagsKey,
  hasFeatureFlagsLoadedKey,
  type FeatureFlags
} from '~/utilities/feature-flags'
import { DEFAULT_WORD_BREAK_MODE, WORD_BREAK_MODE_OPTIONS } from '~/utilities/word-break-mode'

enableAutoUnmount(afterEach)

const GROUP_HEADING = 'Word breaking'

const renderSettings = async (flags: FeatureFlags = {}) => {
  const featureFlags = ref<FeatureFlags>({ ...DEFAULT_FEATURE_FLAGS, ...flags })
  const hasFeatureFlagsLoaded = ref(true)
  return mountSuspended(AdvancedUISettings, {
    global: {
      provide: {
        [featureFlagsKey]: featureFlags,
        [hasFeatureFlagsLoadedKey]: hasFeatureFlagsLoaded
      }
    }
  })
}

describe('AdvancedUISettings word breaking', () => {
  // The Nuxt app's Pinia outlives each test, so the store is reset by hand.
  beforeEach(() => {
    useUiSettingsStore().setWordBreakMode(DEFAULT_WORD_BREAK_MODE)
    window.localStorage.clear()
  })

  test('is absent while the flag is off', async () => {
    const wrapper = await renderSettings()
    expect(wrapper.text()).not.toContain(GROUP_HEADING)
  })

  test('offers every mode, with the default selected, when the flag is on', async () => {
    const wrapper = await renderSettings({ hasWordBreakMode: true })
    expect(wrapper.text()).toContain(GROUP_HEADING)
    const radios = wrapper.findAll('[role="radio"]')
    expect(radios).toHaveLength(WORD_BREAK_MODE_OPTIONS.length)
    const checked = radios.filter((radio) => radio.attributes('aria-checked') === 'true')
    expect(checked).toHaveLength(1)
    expect(checked[0]?.attributes('value')).toBe(DEFAULT_WORD_BREAK_MODE)
  })

  test('choosing a mode writes it to the store', async () => {
    const wrapper = await renderSettings({ hasWordBreakMode: true })
    const store = useUiSettingsStore()
    const target = wrapper.findAll('[role="radio"]').find((radio) => radio.attributes('value') === 'none')
    expect(target).toBeDefined()
    await target?.trigger('click')
    expect(store.wordBreakMode).toBe('none')
  })
})
