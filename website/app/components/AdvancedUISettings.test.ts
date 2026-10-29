// @vitest-environment nuxt
//
// The word-breaking group in the settings panel: absent without its feature flag, present with it,
// and writing the chosen mode to the store.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
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

afterEach(() => {
  vi.unstubAllGlobals()
})

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

describe('AdvancedUISettings reading mode', () => {
  beforeEach(() => {
    const store = useUiSettingsStore()
    store.setReadAloudPreformatted(false)
    store.setReadingRate(1)
    store.setReadingVoiceUri('')
    window.localStorage.clear()
  })

  test('is absent while the flag is off', async () => {
    const wrapper = await renderSettings()
    expect(wrapper.text()).not.toContain('Reading mode')
  })

  test('replaces the controls with a notice when the browser cannot do reading mode', async () => {
    // the test environment has no CSS Custom Highlight API
    const wrapper = await renderSettings({ hasReadingMode: true })
    expect(wrapper.text()).toContain("Reading aloud isn't available in this browser")
    expect(wrapper.find('input[type="range"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Read ASCII art and ABNF aloud')
  })

  describe('in a browser that supports reading mode', () => {
    const supportReadingMode = (voices: Partial<SpeechSynthesisVoice>[] = []) => {
      vi.stubGlobal('speechSynthesis', {
        getVoices: () => voices,
        addEventListener: () => {},
        removeEventListener: () => {}
      })
      vi.stubGlobal('SpeechSynthesisUtterance', class {})
      vi.stubGlobal('Highlight', class {})
      vi.stubGlobal('CSS', { highlights: new Map() })
    }

    test('offers the diagram checkbox and rate when the flag is on', async () => {
      supportReadingMode([{ name: 'Test English', lang: 'en-GB', voiceURI: 'test-en' }])
      const wrapper = await renderSettings({ hasReadingMode: true })
      expect(wrapper.text()).toContain('Reading mode')
      expect(wrapper.text()).toContain('Read ASCII art and ABNF aloud')
      expect(wrapper.find('input[type="range"]').exists()).toBe(true)
      expect(wrapper.text()).not.toContain("Reading aloud isn't available")
    })

    test('offers no controls, only a message, when the browser has no speech voices at all', async () => {
      supportReadingMode()
      const wrapper = await renderSettings({ hasReadingMode: true })
      expect(wrapper.text()).toContain('currently reports no speech voices')
      expect(wrapper.find('select').exists()).toBe(false)
      expect(wrapper.find('input[type="range"]').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('Read ASCII art and ABNF aloud')
    })

    test('keeps the controls but offers no voice select when no voice is English', async () => {
      supportReadingMode([{ name: 'Test French', lang: 'fr-FR', voiceURI: 'test-fr' }])
      const wrapper = await renderSettings({ hasReadingMode: true })
      expect(wrapper.text()).toContain('No English voices were found')
      expect(wrapper.find('select').exists()).toBe(false)
      expect(wrapper.find('input[type="range"]').exists()).toBe(true)
    })

    test('offers a voice select listing the English voices when there are some', async () => {
      supportReadingMode([
        { name: 'Test English', lang: 'en-GB', voiceURI: 'test-en' },
        { name: 'Test French', lang: 'fr-FR', voiceURI: 'test-fr' }
      ])
      const wrapper = await renderSettings({ hasReadingMode: true })
      const options = wrapper.findAll('select option').map((option) => option.text())
      expect(options).toEqual(['Browser default', 'Test English (en-GB)'])
      expect(wrapper.text()).not.toContain('reports no speech voices')
    })

    test('ticking the diagram checkbox writes to the store', async () => {
      supportReadingMode([{ name: 'Test English', lang: 'en-GB', voiceURI: 'test-en' }])
      const wrapper = await renderSettings({ hasReadingMode: true })
      const store = useUiSettingsStore()
      // the link preview checkbox comes first on the panel
      await wrapper.findAll('[role="checkbox"]').at(-1)?.trigger('click')
      expect(store.readAloudPreformatted).toBe(true)
    })

    test('committing the rate slider writes to the store', async () => {
      supportReadingMode([{ name: 'Test English', lang: 'en-GB', voiceURI: 'test-en' }])
      const wrapper = await renderSettings({ hasReadingMode: true })
      const store = useUiSettingsStore()
      const slider = wrapper.find('input[type="range"]')
      await slider.setValue('1.6')
      await slider.trigger('change')
      expect(store.readingRate).toBe(1.6)
    })
  })
})
