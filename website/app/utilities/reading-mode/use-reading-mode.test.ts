// @vitest-environment nuxt
//
// Reading mode is offered from more than one part of the page, so the hook is a singleton: every
// caller shares one status and one speech session, which lives while any of them is mounted.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { DEFAULT_FEATURE_FLAGS, featureFlagsKey } from '~/utilities/feature-flags'
import { RFC_CONTENT_DOM_ID } from './content'
import { useReadingMode, useReadingModeError } from './use-reading-mode'

const OfferReading = defineComponent({
  setup: () => {
    const { status, toggle } = useReadingMode()
    return () => h('button', { onClick: toggle }, status.value)
  }
})

const setup = ({ failWith }: { failWith?: string } = {}) => {
  const spoken: string[] = []
  const highlights = new Map()
  const synth = {
    paused: false,
    speaking: false,
    pending: false,
    cancelCount: 0,
    speak: (utterance: { text: string; onstart?: () => void; onerror?: (event: { error: string }) => void }) => {
      synth.speaking = true
      spoken.push(utterance.text)
      if (failWith) {
        utterance.onerror?.({ error: failWith })
      } else {
        utterance.onstart?.()
      }
    },
    cancel: () => {
      synth.speaking = false
      synth.cancelCount += 1
    },
    pause: () => {},
    resume: () => {},
    getVoices: () => [],
    addEventListener: () => {},
    removeEventListener: () => {}
  }
  vi.stubGlobal('speechSynthesis', synth)
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string
      constructor(text: string) {
        this.text = text
      }
    }
  )
  vi.stubGlobal('Highlight', class {})
  vi.stubGlobal('CSS', { highlights })
  return { spoken, synth, highlights }
}

const addContent = (html: string) => {
  const content = document.createElement('div')
  content.id = RFC_CONTENT_DOM_ID
  content.innerHTML = html
  document.body.append(content)
  return content
}

describe('useReadingMode', () => {
  let content: HTMLElement
  const mounted = new Set<VueWrapper>()

  const mountOffer = async ({ hasReadingMode = true } = {}) => {
    const featureFlags = ref({ ...DEFAULT_FEATURE_FLAGS, hasReadingMode })
    const wrapper = await mountSuspended(OfferReading, { global: { provide: { [featureFlagsKey]: featureFlags } } })
    mounted.add(wrapper)
    return wrapper
  }

  const unmountOffer = (wrapper: VueWrapper) => {
    mounted.delete(wrapper)
    wrapper.unmount()
  }

  beforeEach(() => {
    content = addContent('<p>The first sentence is here. A second one follows.</p>')
  })

  // Unmounting tears the session down, which clears highlights through the stubbed CSS, so the
  // stubs have to outlive it.
  afterEach(() => {
    mounted.forEach(unmountOffer)
    content.remove()
    vi.unstubAllGlobals()
  })

  test('callers share one status and one session', async () => {
    const { spoken } = setup()
    const first = await mountOffer()
    const second = await mountOffer()
    await first.trigger('click')
    expect(spoken).toEqual(['The first sentence is here.'])
    expect(first.text()).toBe('playing')
    expect(second.text()).toBe('playing')
    await second.trigger('click')
    expect(first.text()).toBe('paused')
    expect(spoken).toHaveLength(1)
  })

  test('the session survives the first caller unmounting and ends with the last', async () => {
    const { synth } = setup()
    const first = await mountOffer()
    const second = await mountOffer()
    await first.trigger('click')
    unmountOffer(first)
    expect(second.text()).toBe('playing')
    const cancelsBefore = synth.cancelCount
    unmountOffer(second)
    expect(synth.cancelCount).toBeGreaterThan(cancelsBefore)
  })

  test('finds the content by its id whichever caller is mounted', async () => {
    const { spoken } = setup()
    content.remove()
    const wrapper = await mountOffer()
    // mounted before the content exists, as a sidebar can be
    addContent('<p>Content that arrived later.</p>')
    await wrapper.trigger('click')
    expect(spoken).toEqual(['Content that arrived later.'])
    document.getElementById(RFC_CONTENT_DOM_ID)?.remove()
  })

  describe('clicking the text', () => {
    // happy-dom has no hit testing, so the caret a click lands on is supplied
    const clickInParagraph = () => {
      const paragraph = content.querySelector('p')
      const text = paragraph?.firstChild
      if (!paragraph || !text) {
        throw Error('expected a paragraph with text')
      }
      Object.defineProperty(document, 'caretRangeFromPoint', {
        value: () => {
          const range = document.createRange()
          range.setStart(text, 4)
          return range
        },
        configurable: true
      })
      paragraph.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    }

    afterEach(() => {
      Reflect.deleteProperty(document, 'caretRangeFromPoint')
    })

    test('marks nothing before reading has been started', async () => {
      const { highlights } = setup()
      await mountOffer()
      clickInParagraph()
      expect(highlights.size).toBe(0)
    })

    test('marks the word clicked once reading has started', async () => {
      const { highlights } = setup()
      const wrapper = await mountOffer()
      await wrapper.trigger('click')
      await wrapper.trigger('click')
      clickInParagraph()
      expect(highlights.has('rfc-reading-word')).toBe(true)
    })

    test('marks nothing once speech has failed for want of a voice', async () => {
      const { highlights } = setup({ failWith: 'synthesis-failed' })
      const wrapper = await mountOffer()
      await wrapper.trigger('click')
      expect(useReadingModeError().value).toEqual({ kind: 'no-voices' })
      clickInParagraph()
      expect(highlights.size).toBe(0)
      useReadingModeError().value = undefined
    })

    test('marks nothing after a failure with voices present either', async () => {
      const { highlights } = setup({ failWith: 'synthesis-failed' })
      vi.stubGlobal('speechSynthesis', {
        ...window.speechSynthesis,
        getVoices: () => [{ name: 'Test English', lang: 'en-GB', voiceURI: 'test-en' }]
      })
      const wrapper = await mountOffer()
      await wrapper.trigger('click')
      expect(useReadingModeError().value).toEqual({ kind: 'voice-failed' })
      clickInParagraph()
      expect(highlights.size).toBe(0)
      useReadingModeError().value = undefined
    })

    test('marks nothing after any failure to start', async () => {
      const { highlights } = setup({ failWith: 'not-allowed' })
      const wrapper = await mountOffer()
      await wrapper.trigger('click')
      expect(useReadingModeError().value).toEqual({ kind: 'blocked' })
      clickInParagraph()
      expect(highlights.size).toBe(0)
      useReadingModeError().value = undefined
    })
  })

  test('does nothing with the feature flag off', async () => {
    const { highlights, spoken } = setup()
    const wrapper = await mountOffer({ hasReadingMode: false })
    const paragraph = content.querySelector('p')
    const text = paragraph?.firstChild
    if (!paragraph || !text) {
      throw Error('expected a paragraph with text')
    }
    Object.defineProperty(document, 'caretRangeFromPoint', {
      value: () => {
        const range = document.createRange()
        range.setStart(text, 4)
        return range
      },
      configurable: true
    })
    paragraph.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.trigger('click')
    Reflect.deleteProperty(document, 'caretRangeFromPoint')
    expect(highlights.size).toBe(0)
    expect(spoken).toHaveLength(0)
    useReadingModeError().value = undefined
  })

  test('reports an unsupported browser through the shared error', async () => {
    // nothing stubbed: the test environment has no speech or highlight support
    const wrapper = await mountOffer()
    await wrapper.trigger('click')
    expect(useReadingModeError().value).toEqual({ kind: 'unsupported' })
    useReadingModeError().value = undefined
  })
})
