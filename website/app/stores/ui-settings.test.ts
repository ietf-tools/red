// @vitest-environment nuxt
//
// The word-break mode setting: its default, that it persists with the other settings, and how the
// load path treats a stored object that lacks it or holds a value it does not recognise.
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { getActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'

import { DEFAULT_TEXT_SCALE, useUiSettingsStore } from '~/stores/ui-settings'
import {
  DEFAULT_LETTER_SPACING_STEP,
  DEFAULT_LINE_SPACING_STEP,
  DEFAULT_PARAGRAPH_SPACING_STEP,
  DEFAULT_WORD_SPACING_STEP,
  MAX_LINE_SPACING_STEP
} from '~/utilities/text-spacing'
import { DEFAULT_WORD_BREAK_MODE } from '~/utilities/word-break-mode'

const LOCALSTORAGE_KEY = 'rfc-ui'

const stored = (): Record<string, unknown> | null => {
  const value = window.localStorage.getItem(LOCALSTORAGE_KEY)
  return value === null ? null : JSON.parse(value)
}

// The store reads localStorage in onMounted, which only fires inside a component, so the load path
// is driven by mounting the smallest component that uses the store.
const StoreHost = defineComponent({
  setup: () => {
    useUiSettingsStore()
    return () => h('div')
  }
})

const mountStore = async () => {
  await mountSuspended(StoreHost)
  return useUiSettingsStore()
}

enableAutoUnmount(afterEach)

// mountSuspended mounts into the Nuxt app, whose Pinia outlives each test, and a store registers its
// onMounted load only when first created inside a component. Disposing the store and dropping its
// state lets the next mount create it afresh, so every test sees the load path run.
const resetStore = () => {
  useUiSettingsStore().$dispose()
  const pinia = getActivePinia()
  if (pinia) {
    delete pinia.state.value.uiSettings
  }
  window.localStorage.clear()
}

describe('useUiSettingsStore word break mode', () => {
  beforeEach(() => {
    resetStore()
  })

  test('starts on the default mode', () => {
    const store = useUiSettingsStore()
    expect(store.wordBreakMode).toBe(DEFAULT_WORD_BREAK_MODE)
  })

  test('setting a mode persists it alongside the other settings', () => {
    const store = useUiSettingsStore()
    store.setWordBreakMode('overflow-wrap-anywhere')
    expect(store.wordBreakMode).toBe('overflow-wrap-anywhere')
    expect(stored()?.wordBreakMode).toBe('overflow-wrap-anywhere')
    expect(stored()).toHaveProperty('disableRFCLinkPreview')
  })

  test('loads a saved mode', async () => {
    window.localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify({ wordBreakMode: 'none' }))
    const store = await mountStore()
    expect(store.wordBreakMode).toBe('none')
  })

  test('a saved settings object written before the key existed keeps the default', async () => {
    window.localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify({ disableRFCLinkPreview: true }))
    const store = await mountStore()
    expect(store.wordBreakMode).toBe(DEFAULT_WORD_BREAK_MODE)
    expect(store.disableRFCLinkPreview).toBe(true)
  })

  test('an unknown saved mode fails validation and the stored settings are discarded', async () => {
    window.localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify({ wordBreakMode: 'not-a-mode' }))
    const store = await mountStore()
    expect(store.wordBreakMode).toBe(DEFAULT_WORD_BREAK_MODE)
    expect(stored()).toBeNull()
  })
})

describe('useUiSettingsStore text size and spacing', () => {
  beforeEach(() => {
    resetStore()
  })

  test('stores a changed step and leaves nothing stored once it is back at the default', () => {
    const store = useUiSettingsStore()
    store.setTextScale(1.4)
    store.setLetterSpacingStep(3)
    expect(stored()).toMatchObject({ textScale: 1.4, letterSpacingStep: 3 })

    store.setTextScale(DEFAULT_TEXT_SCALE)
    store.setLetterSpacingStep(DEFAULT_LETTER_SPACING_STEP)
    expect(stored()).not.toHaveProperty('textScale')
    expect(stored()).not.toHaveProperty('letterSpacingStep')
  })

  test('resetting the spacing returns every step to its default and clears them from storage', () => {
    const store = useUiSettingsStore()
    store.setLineSpacingStep(5)
    store.setLetterSpacingStep(4)
    store.setWordSpacingStep(6)
    store.setParagraphSpacingStep(3)

    store.resetTextSpacing()

    expect(store.lineSpacingStep).toBe(DEFAULT_LINE_SPACING_STEP)
    expect(store.letterSpacingStep).toBe(DEFAULT_LETTER_SPACING_STEP)
    expect(store.wordSpacingStep).toBe(DEFAULT_WORD_SPACING_STEP)
    expect(store.paragraphSpacingStep).toBe(DEFAULT_PARAGRAPH_SPACING_STEP)
    const keys = Object.keys(stored() ?? {})
    expect(keys.filter((key) => key.endsWith('SpacingStep'))).toEqual([])
  })

  test('clamps a step so what is saved still validates on the next load', () => {
    const store = useUiSettingsStore()
    store.setLineSpacingStep(99)
    store.setLetterSpacingStep(-4)
    expect(store.lineSpacingStep).toBe(MAX_LINE_SPACING_STEP)
    expect(store.letterSpacingStep).toBe(0)
  })

  test('loads saved steps', async () => {
    window.localStorage.setItem(
      LOCALSTORAGE_KEY,
      JSON.stringify({ lineSpacingStep: 4, letterSpacingStep: 2, wordSpacingStep: 3, paragraphSpacingStep: 2 })
    )
    const store = await mountStore()
    expect(store.lineSpacingStep).toBe(4)
    expect(store.letterSpacingStep).toBe(2)
    expect(store.wordSpacingStep).toBe(3)
    expect(store.paragraphSpacingStep).toBe(2)
  })
})
