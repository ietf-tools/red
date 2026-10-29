// @vitest-environment nuxt
//
// The reading-mode settings: their defaults, that they persist with the other settings, the clamp on
// the speech rate, and how the load path treats a stored object that predates them.
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { getActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'

import { DEFAULT_READING_RATE, READING_RATE_MAX, READING_RATE_MIN, useUiSettingsStore } from '~/stores/ui-settings'

const LOCALSTORAGE_KEY = 'rfc-ui'

const stored = (): Record<string, unknown> | null => {
  const value = window.localStorage.getItem(LOCALSTORAGE_KEY)
  return value === null ? null : JSON.parse(value)
}

// The store reads localStorage in onMounted, which only fires inside a component.
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

// See ui-settings.test.ts: the Nuxt app's Pinia outlives each test, so the store is disposed and
// its state dropped to let the next mount run the load path afresh.
const resetStore = () => {
  useUiSettingsStore().$dispose()
  const pinia = getActivePinia()
  if (pinia) {
    delete pinia.state.value.uiSettings
  }
  window.localStorage.clear()
}

describe('useUiSettingsStore reading mode', () => {
  beforeEach(() => {
    resetStore()
  })

  test('starts skipping diagrams, at normal rate, on the default voice', () => {
    const store = useUiSettingsStore()
    expect(store.readAloudPreformatted).toBe(false)
    expect(store.readingRate).toBe(DEFAULT_READING_RATE)
    expect(store.readingVoiceUri).toBe('')
  })

  test('persists each setting alongside the others', () => {
    const store = useUiSettingsStore()
    store.setReadAloudPreformatted(true)
    store.setReadingRate(1.5)
    store.setReadingVoiceUri('urn:voice:a')
    expect(stored()).toMatchObject({
      readAloudPreformatted: true,
      readingRate: 1.5,
      readingVoiceUri: 'urn:voice:a'
    })
    expect(stored()).toHaveProperty('textScale')
  })

  test('clamps the rate so what is saved still validates on the next load', () => {
    const store = useUiSettingsStore()
    store.setReadingRate(READING_RATE_MAX + 5)
    expect(store.readingRate).toBe(READING_RATE_MAX)
    store.setReadingRate(READING_RATE_MIN - 5)
    expect(store.readingRate).toBe(READING_RATE_MIN)
  })

  test('loads saved settings', async () => {
    window.localStorage.setItem(
      LOCALSTORAGE_KEY,
      JSON.stringify({ readAloudPreformatted: true, readingRate: 0.8, readingVoiceUri: 'urn:voice:b' })
    )
    const store = await mountStore()
    expect(store.readAloudPreformatted).toBe(true)
    expect(store.readingRate).toBe(0.8)
    expect(store.readingVoiceUri).toBe('urn:voice:b')
  })

  test('a saved settings object written before these keys existed keeps the defaults', async () => {
    window.localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify({ disableRFCLinkPreview: true }))
    const store = await mountStore()
    expect(store.readAloudPreformatted).toBe(false)
    expect(store.readingRate).toBe(DEFAULT_READING_RATE)
    expect(store.disableRFCLinkPreview).toBe(true)
  })

  test('an out-of-range saved rate fails validation and the stored settings are discarded', async () => {
    window.localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify({ readingRate: 9 }))
    const store = await mountStore()
    expect(store.readingRate).toBe(DEFAULT_READING_RATE)
    expect(stored()).toBeNull()
  })
})
