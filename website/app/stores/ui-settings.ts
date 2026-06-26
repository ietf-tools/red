import { z } from 'zod'

export const SupersededModeSchema = z.union([z.literal('full'), z.literal('compact')]).optional()

const UiSettingsSchema = z
  .object({
    obsoletedByMode: SupersededModeSchema,
    updatedByMode: SupersededModeSchema,
    disableRFCLinkPreview: z.boolean()
  })
  .optional()

export type UiSettingsKey = keyof NonNullable<z.infer<typeof UiSettingsSchema>>

type UiSettings = z.infer<typeof UiSettingsSchema>

type SupersededMode = NonNullable<z.infer<typeof SupersededModeSchema>>

const LOCALSTORAGE_KEY = 'rfc-ui'

const DEFAULT_SUPERSEDED_MODE: SupersededMode = 'compact'

export const useUiSettingsStore = defineStore('uiSettings', () => {
  const obsoletedByModeRef = ref<SupersededMode>(DEFAULT_SUPERSEDED_MODE)
  const updatedByModeRef = ref<SupersededMode>(DEFAULT_SUPERSEDED_MODE)
  const disableRFCLinkPreviewRef = ref<boolean>(false)

  const saveSettings = () => {
    const uiSettings: UiSettings = {
      obsoletedByMode: obsoletedByModeRef.value,
      updatedByMode: updatedByModeRef.value,
      disableRFCLinkPreview: disableRFCLinkPreviewRef.value
    }

    try {
      const val = JSON.stringify(uiSettings)
      window.localStorage.setItem(LOCALSTORAGE_KEY, val)
      console.log('[rfc-ui-settings] saved ui state to localStorage', val)
    } catch (e) {
      const errorTitle = `Error writing to localStorage (this is expected behaviour if localStorage is disabled). ${e}`
      console.log(`[rfc-ui-settings] ${errorTitle}`, e)
    }
  }

  const loadSettings = () => {
    try {
      const valString = window.localStorage.getItem(LOCALSTORAGE_KEY)
      if (!valString) {
        // no value in local storage
        return
      }
      const val = JSON.parse(valString)
      const { data, error } = UiSettingsSchema.safeParse(val)
      if (error || !data) {
        const errorTitle = 'Unable to validate RFC UI settings JSON. Resetting localStorage config.'
        console.log(errorTitle, error, valString)
        window.localStorage.removeItem(LOCALSTORAGE_KEY)
        throw Error(errorTitle)
      }
      obsoletedByModeRef.value = data.obsoletedByMode ?? obsoletedByModeRef.value
      updatedByModeRef.value = data.updatedByMode ?? updatedByModeRef.value
      disableRFCLinkPreviewRef.value = data.disableRFCLinkPreview ?? disableRFCLinkPreviewRef.value
    } catch (e: unknown) {
      const errorTitle = `Error loading from localStorage (this is expected behaviour if localStorage is disabled). ${e}`
      console.log(`[rfc-ui-settings] ${errorTitle}`, e)
    }
  }

  const setSupersededMode = (key: UiSettingsKey, mode: SupersededMode) => {
    switch (key) {
      case 'obsoletedByMode':
        obsoletedByModeRef.value = mode
        break
      case 'updatedByMode':
        updatedByModeRef.value = mode
        break
    }
    saveSettings()
  }

  const setDisabledRFCLinkPreview = (isDisabled: boolean) => {
    disableRFCLinkPreviewRef.value = isDisabled
    saveSettings()
  }

  onMounted(() => {
    loadSettings()
  })

  return {
    obsoletedByMode: obsoletedByModeRef,
    updatedByMode: updatedByModeRef,
    setSupersededMode,
    disableRFCLinkPreview: disableRFCLinkPreviewRef,
    setDisabledRFCLinkPreview
  }
})
