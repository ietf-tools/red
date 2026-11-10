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

  test('replaces the controls with a notice when the browser cannot do reading mode', async () => {
    // the test environment has no CSS Custom Highlight API
    const wrapper = await renderSettings()
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
      const wrapper = await renderSettings()
      expect(wrapper.text()).toContain('Reading mode')
      expect(wrapper.text()).toContain('Read ASCII art and ABNF aloud')
      expect(wrapper.find('input[type="range"]').exists()).toBe(true)
      expect(wrapper.text()).not.toContain("Reading aloud isn't available")
    })

    test('offers no controls, only a message, when the browser has no speech voices at all', async () => {
      supportReadingMode()
      const wrapper = await renderSettings()
      expect(wrapper.text()).toContain('currently reports no speech voices')
      expect(wrapper.find('select').exists()).toBe(false)
      expect(wrapper.find('input[type="range"]').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('Read ASCII art and ABNF aloud')
    })

    test('keeps the controls but offers no voice select when no voice is English', async () => {
      supportReadingMode([{ name: 'Test French', lang: 'fr-FR', voiceURI: 'test-fr' }])
      const wrapper = await renderSettings()
      expect(wrapper.text()).toContain('No English voices were found')
      expect(wrapper.find('select').exists()).toBe(false)
      expect(wrapper.find('input[type="range"]').exists()).toBe(true)
    })

    test('offers a voice select listing the English voices when there are some', async () => {
      supportReadingMode([
        { name: 'Test English', lang: 'en-GB', voiceURI: 'test-en' },
        { name: 'Test French', lang: 'fr-FR', voiceURI: 'test-fr' }
      ])
      const wrapper = await renderSettings()
      const options = wrapper.findAll('select option').map((option) => option.text())
      expect(options).toEqual(['Browser default', 'Test English (en-GB)'])
      expect(wrapper.text()).not.toContain('reports no speech voices')
    })

    test('ticking the diagram checkbox writes to the store', async () => {
      supportReadingMode([{ name: 'Test English', lang: 'en-GB', voiceURI: 'test-en' }])
      const wrapper = await renderSettings()
      const store = useUiSettingsStore()
      // the link preview checkbox comes first on the panel
      await wrapper.findAll('[role="checkbox"]').at(-1)?.trigger('click')
      expect(store.readAloudPreformatted).toBe(true)
    })

    test('committing the rate slider writes to the store', async () => {
      supportReadingMode([{ name: 'Test English', lang: 'en-GB', voiceURI: 'test-en' }])
      const wrapper = await renderSettings()
      const store = useUiSettingsStore()
      const slider = wrapper.find('input[type="range"]')
      await slider.setValue('1.6')
      await slider.trigger('change')
      expect(store.readingRate).toBe(1.6)
    })
  })
})

describe('AdvancedUISettings text size and spacing', () => {
  beforeEach(() => {
    const store = useUiSettingsStore()
    store.setTextScale(1)
    store.resetTextSpacing()
    window.localStorage.clear()
  })

  const sliderFor = (wrapper: Awaited<ReturnType<typeof renderSettings>>, label: string) => {
    const slider = wrapper.findAll('label').find((element) => element.text() === label)
    expect(slider).toBeDefined()
    return wrapper.find(`#${slider?.attributes('for')}`)
  }

  const resetFor = (wrapper: Awaited<ReturnType<typeof renderSettings>>, label: string) =>
    wrapper.find(`button[aria-label="Reset ${label.toLowerCase()} to default"]`)

  test('is absent while the flag is off', async () => {
    const wrapper = await renderSettings()
    expect(wrapper.text()).not.toContain('Text spacing')
    expect(wrapper.text()).not.toContain('Text size')
  })

  test('offers a size slider and four spacing sliders, each with its own reset', async () => {
    const wrapper = await renderSettings({ hasTextScale: true })
    for (const label of ['Text size', 'Line spacing', 'Letter spacing', 'Word spacing', 'Paragraph spacing']) {
      expect(sliderFor(wrapper, label).exists()).toBe(true)
      expect(resetFor(wrapper, label).exists()).toBe(true)
    }
  })

  test('never mentions the standard the values come from', async () => {
    const wrapper = await renderSettings({ hasTextScale: true })
    expect(wrapper.text()).not.toMatch(/WCAG|SC 1\.4/i)
  })

  test('moving a slider writes its step to the store', async () => {
    const wrapper = await renderSettings({ hasTextScale: true })
    const slider = sliderFor(wrapper, 'Letter spacing')
    await slider.setValue(3)
    await slider.trigger('change')
    expect(useUiSettingsStore().letterSpacingStep).toBe(3)
  })

  test('word spacing cannot be set below the letter spacing', async () => {
    const wrapper = await renderSettings({ hasTextScale: true })
    const store = useUiSettingsStore()
    store.setLetterSpacingStep(4)
    await nextTick()
    const word = sliderFor(wrapper, 'Word spacing')
    expect(word.attributes('min')).toBe('4')
    expect((word.element as HTMLInputElement).value).toBe('4')
  })

  test('a reset button returns its slider, the store and the stored value to the default', async () => {
    const wrapper = await renderSettings({ hasTextScale: true })
    const store = useUiSettingsStore()
    const size = sliderFor(wrapper, 'Text size')
    await size.setValue(1.4)
    await size.trigger('change')
    expect(store.textScale).toBe(1.4)

    await resetFor(wrapper, 'Text size').trigger('click')

    expect(store.textScale).toBe(1)
    expect((size.element as HTMLInputElement).value).toBe('1')
    expect(JSON.parse(window.localStorage.getItem('rfc-ui') ?? '{}')).not.toHaveProperty('textScale')
  })

  test('reset buttons are plain buttons, so the browser does not run its own form reset over the sliders', async () => {
    const wrapper = await renderSettings({ hasTextScale: true })
    const resets = wrapper.findAll('button').filter((button) => button.text().startsWith('Reset'))
    expect(resets.length).toBeGreaterThan(0)
    for (const reset of resets) {
      expect(reset.attributes('type')).toBe('button')
    }
  })

  test('Reset all spacing clears every spacing step but not the text size', async () => {
    const wrapper = await renderSettings({ hasTextScale: true })
    const store = useUiSettingsStore()
    store.setTextScale(1.2)
    store.setLineSpacingStep(5)
    store.setLetterSpacingStep(4)
    store.setParagraphSpacingStep(3)

    const resetAll = wrapper.findAll('button').find((button) => button.text() === 'Reset all spacing')
    await resetAll?.trigger('click')

    expect(store.lineSpacingStep).toBe(3)
    expect(store.letterSpacingStep).toBe(0)
    expect(store.paragraphSpacingStep).toBe(1)
    expect(store.textScale).toBe(1.2)
  })
})
