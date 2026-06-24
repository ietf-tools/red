import { z } from 'zod'

export const SupersededModeSchema = z.union([z.literal('full'), z.literal('compact')]).optional()

const RfcUiSettingsSchema = z.object({ supersededMode: SupersededModeSchema }).optional()

type RfcUiSettings = z.infer<typeof RfcUiSettingsSchema>

type SupersededMode = NonNullable<RfcUiSettings>['supersededMode']

const LOCALSTORAGE_KEY = 'rfc-ui'

const DEFAULT_SUPERSEDED_MODE: SupersededMode = 'compact'

export const useRfcUiStore = defineStore('rfcUi', () => {
  const supersededModeRef = ref<SupersededMode>(DEFAULT_SUPERSEDED_MODE)

  const setSupersededMode = (mode: SupersededMode) => {
    supersededModeRef.value = mode

    const rfcSettings: RfcUiSettings = {
      supersededMode: supersededModeRef.value
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
      const { data, error } = RfcUiSettingsSchema.safeParse(val)
      if (error || !data) {
        const errorTitle = 'Unable to validate RFC UI settings JSON. Resetting localStorage config.'
        console.log(errorTitle, error, valString)
        window.localStorage.removeItem(LOCALSTORAGE_KEY)
        throw Error(errorTitle)
      }
      supersededModeRef.value = data.supersededMode ?? DEFAULT_SUPERSEDED_MODE
    } catch (e: unknown) {
      const errorTitle = `Error loading from localStorage (this is expected behaviour if localStorage is disabled). ${e}`
      console.log(`[rfc-ui-settings] ${errorTitle}`, e)
    }
  })

  return { supersededMode: supersededModeRef, setSupersededMode }
})
