import { z } from 'zod'

export const SupersededModeSchema = z.union([z.literal('full'), z.literal('compact')]).optional()

const RFCUiSettingsSchema = z
  .object({
    obsoletedByMode: SupersededModeSchema,
    updatedByMode: SupersededModeSchema
  })
  .optional()

export type RFCUiKey = keyof NonNullable<z.infer<typeof RFCUiSettingsSchema>>

type RFCUiSettings = z.infer<typeof RFCUiSettingsSchema>

type SupersededMode = NonNullable<z.infer<typeof SupersededModeSchema>>

const LOCALSTORAGE_KEY = 'rfc-ui'

const DEFAULT_SUPERSEDED_MODE: SupersededMode = 'compact'

export const useRfcUiStore = defineStore('rfcUi', () => {
  const obsoletedByModeRef = ref<SupersededMode>(DEFAULT_SUPERSEDED_MODE)
  const updatedByModeRef = ref<SupersededMode>(DEFAULT_SUPERSEDED_MODE)

  const setSupersededMode = (key: RFCUiKey, mode: SupersededMode) => {
    switch (key) {
      case 'obsoletedByMode':
        obsoletedByModeRef.value = mode
        break
      case 'updatedByMode':
        updatedByModeRef.value = mode
        break
    }

    const rfcSettings: RFCUiSettings = {
      obsoletedByMode: obsoletedByModeRef.value,
      updatedByMode: updatedByModeRef.value
    }
    try {
      const val = JSON.stringify(rfcSettings)
      window.localStorage.setItem(LOCALSTORAGE_KEY, val)
      console.log('[rfc-ui-settings] saved ui state to localStorage', val)
    } catch (e) {
      const errorTitle = `Error writing to localStorage (this is expected behaviour if localStorage is disabled). ${e}`
      console.log(`[rfc-ui-settings] ${errorTitle}`, e)
    }
  }

  onMounted(() => {
    try {
      const valString = window.localStorage.getItem(LOCALSTORAGE_KEY)
      if (!valString) {
        // no value in local storage
        return
      }
      const val = JSON.parse(valString)
      const { data, error } = RFCUiSettingsSchema.safeParse(val)
      if (error || !data) {
        const errorTitle = 'Unable to validate RFC UI settings JSON. Resetting localStorage config.'
        console.log(errorTitle, error, valString)
        window.localStorage.removeItem(LOCALSTORAGE_KEY)
        throw Error(errorTitle)
      }
      obsoletedByModeRef.value = data.obsoletedByMode ?? DEFAULT_SUPERSEDED_MODE
      updatedByModeRef.value = data.updatedByMode ?? DEFAULT_SUPERSEDED_MODE
    } catch (e: unknown) {
      const errorTitle = `Error loading from localStorage (this is expected behaviour if localStorage is disabled). ${e}`
      console.log(`[rfc-ui-settings] ${errorTitle}`, e)
    }
  })

  return { obsoletedByMode: obsoletedByModeRef, updatedByMode: updatedByModeRef, setSupersededMode }
})
