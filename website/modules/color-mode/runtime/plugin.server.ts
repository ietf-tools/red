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

    // Split each cookie on its first '=' only: values are often base64 and can themselves
    // contain '='.
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
