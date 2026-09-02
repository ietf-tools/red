import { z } from 'zod'

export const SupersededModeSchema = z.union([z.literal('full'), z.literal('compact')]).optional()

// Whether a subject listing shows each subject's description or only its name.
export const SubjectDensitySchema = z.union([z.literal('full'), z.literal('compact')]).optional()

// Bounds of the text-scale slider, shared with AdvancedUISettings.vue so the
// control and the persisted value can't disagree.
export const TEXT_SCALE_MIN = 1
export const TEXT_SCALE_MAX = 2
export const TEXT_SCALE_STEP = 0.1
export const DEFAULT_TEXT_SCALE = 1.5

const TextScaleSchema = z.number().min(TEXT_SCALE_MIN).max(TEXT_SCALE_MAX)

const UiSettingsSchema = z
  .object({
    obsoletedByMode: SupersededModeSchema,
    updatedByMode: SupersededModeSchema,
    disableRFCLinkPreview: z.boolean(),
    textScale: TextScaleSchema.optional(),
    subjectDensity: SubjectDensitySchema
  })
  .optional()

export type UiSettingsKey = keyof NonNullable<z.infer<typeof UiSettingsSchema>>

type UiSettings = z.infer<typeof UiSettingsSchema>

type SupersededMode = NonNullable<z.infer<typeof SupersededModeSchema>>

export type SubjectDensity = NonNullable<z.infer<typeof SubjectDensitySchema>>

const LOCALSTORAGE_KEY = 'rfc-ui'

const DEFAULT_SUPERSEDED_MODE: SupersededMode = 'compact'

// Names alone, so a listing reads as an index rather than as prose.
export const DEFAULT_SUBJECT_DENSITY: SubjectDensity = 'compact'

export const useUiSettingsStore = defineStore('uiSettings', () => {
  // Whether the UI Settings dialog is showing. Deliberately not persisted: it's
  // transient UI state, not a setting.
  const isUiSettingsModalOpenRef = ref<boolean>(false)

  const obsoletedByModeRef = ref<SupersededMode>(DEFAULT_SUPERSEDED_MODE)
  const updatedByModeRef = ref<SupersededMode>(DEFAULT_SUPERSEDED_MODE)
  const disableRFCLinkPreviewRef = ref<boolean>(false)
  const textScaleRef = ref<number>(DEFAULT_TEXT_SCALE)
  const subjectDensityRef = ref<SubjectDensity>(DEFAULT_SUBJECT_DENSITY)

  const saveSettings = () => {
    const uiSettings: UiSettings = {
      obsoletedByMode: obsoletedByModeRef.value,
      updatedByMode: updatedByModeRef.value,
      disableRFCLinkPreview: disableRFCLinkPreviewRef.value,
      textScale: textScaleRef.value,
      subjectDensity: subjectDensityRef.value
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
      textScaleRef.value = data.textScale ?? textScaleRef.value
      subjectDensityRef.value = data.subjectDensity ?? subjectDensityRef.value
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

  // Clamped rather than trusted: an out-of-bounds value would fail TextScaleSchema
  // on the next load, which resets every other setting along with it.
  const setTextScale = (textScale: number) => {
    textScaleRef.value = Math.min(Math.max(textScale, TEXT_SCALE_MIN), TEXT_SCALE_MAX)
    saveSettings()
  }

  const setSubjectDensity = (subjectDensity: SubjectDensity) => {
    subjectDensityRef.value = subjectDensity
    saveSettings()
  }

  const setIsUiSettingsModalOpen = (isOpen: boolean) => {
    isUiSettingsModalOpenRef.value = isOpen
  }

  onMounted(() => {
    loadSettings()
  })

  return {
    isUiSettingsModalOpen: isUiSettingsModalOpenRef,
    setIsUiSettingsModalOpen,
    obsoletedByMode: obsoletedByModeRef,
    updatedByMode: updatedByModeRef,
    setSupersededMode,
    disableRFCLinkPreview: disableRFCLinkPreviewRef,
    setDisabledRFCLinkPreview,
    textScale: textScaleRef,
    setTextScale,
    subjectDensity: subjectDensityRef,
    setSubjectDensity
  }
})
