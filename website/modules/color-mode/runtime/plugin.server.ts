import { reactive, ref } from 'vue'

import type { ColorModeInstance } from './types'
import { defineNuxtPlugin, useHead, useState, useRouter, useRequestHeaders } from '#imports'
import { preference, dataValue, storage, storageKey } from '#build/color-mode-options.mjs'

export default defineNuxtPlugin((nuxtApp) => {
  const colorMode = nuxtApp.ssrContext?.islandContext
    ? ref<Partial<ColorModeInstance>>({}).value
    : useState<ColorModeInstance>('color-mode', () =>
        reactive({
          preference,
          value: preference,
          unknown: true,
          forced: false
        })
      ).value

  const htmlAttrs: Record<string, string> = {}

  if (storage === 'cookie') {
    const { cookie } = useRequestHeaders(['cookie'])

    // Cookie header format: "name1=value1; name2=value2; ..."
    //
    // Naive parsing with s.split('=') breaks when a cookie value contains '=' characters,
    // which is common for base64-encoded values (e.g. "abc==" becomes ["abc", "", ""])
    // and the destructure [, value] captures only the segment between the first and
    // second '=', silently truncating the rest.
    //
    // The correct approach is to split only on the FIRST '=' using indexOf, so that
    // everything after the first '=' is treated as the value verbatim, regardless of
    // how many '=' characters it contains.
    //
    // Example:
    //   "nuxt-color-mode=dark"      → key="nuxt-color-mode", value="dark"      ✓
    //   "nuxt-color-mode=abc==def"  → key="nuxt-color-mode", value="abc==def"  ✓ (was "abc" before fix)
    const cookieValue = cookie
      ?.split('; ')
      .map((s) => {
        const eqIndex = s.indexOf('=')
        return eqIndex === -1 ? [s, ''] : [s.slice(0, eqIndex), s.slice(eqIndex + 1)]
      })
      .find(([k]) => k === storageKey)?.[1]

    if (cookieValue) {
      colorMode.preference = cookieValue
    }
  }
  useHead({ htmlAttrs })

  useRouter().afterEach((to) => {
    const forcedColorMode = to.meta.colorMode

    if (forcedColorMode && forcedColorMode !== 'system') {
      htmlAttrs['data-color-mode-forced'] = forcedColorMode
      // @ts-expect-error readonly property
      colorMode.value = forcedColorMode
      if (dataValue) {
        htmlAttrs[`data-${dataValue}`] = colorMode.value
      }
      colorMode.forced = true
    } else if (forcedColorMode === 'system') {
      console.warn('You cannot force the colorMode to system at the page level.')
    }
  })

  nuxtApp.provide('colorMode', colorMode)
})
