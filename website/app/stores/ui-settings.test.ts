// @vitest-environment nuxt
//
// The word-break mode setting: its default, that it persists with the other settings, and how the
// load path treats a stored object that lacks it or holds a value it does not recognise.
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { getActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'

import { useUiSettingsStore } from '~/stores/ui-settings'
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
    expect(stored()).toHaveProperty('textScale')
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
