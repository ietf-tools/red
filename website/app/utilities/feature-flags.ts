import { z } from 'zod'
import { type Ref } from 'vue'
import { SEARCH_PATH } from './url'

// string union feature flag values being optional is difficult to model in TS so we'll use a JS falsey value so that Boolean() can evaluate as false
// const ENUM_STRING_UNDEFINED = z.literal('')

export const FeatureFlagsSchema = z.object({
  // Ensure all top-level fields are optional so that browsers
  // with old versions saved in localStorage values can still validate
  isDidYouMeanActive: z.boolean().optional(),
  isAbnfDiagramsActive: z.boolean().optional(),
  // narrowerRfcs: z.union([ENUM_STRING_UNDEFINED, z.literal('narrow-left'), z.literal('narrow-center')]).optional(),
  formatsAlsoViewAs: z.boolean().optional(),
  searchObsoletedDefaults: z.boolean().optional()
})

export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>

export const featureFlagsKey = Symbol() as InjectionKey<Ref<FeatureFlags>>

export type FeatureFlagUIRow = {
  title: string
  description?: string
  storageType: 'boolean' | string[]
}

const featureFlagsUI: Record<keyof FeatureFlags, FeatureFlagUIRow> = {
  isDidYouMeanActive: {
    title: 'Homepage direct RFC/subseries links',
    description: `Homepage search box feature suggesting direct links to RFCs/BCPs/etc when typing "RFCn" or "BCP n" etc into the homepage search box. This only occurs on the homepage, not on the ${SEARCH_PATH} route.`,
    storageType: 'boolean'
  },
  isAbnfDiagramsActive: {
    title: 'ABNF railroad diagrams',
    description: `Renders ABNF grammar blocks in RFC documents as interactive railroad diagrams, making protocol grammars easier to read at a glance.`,
    storageType: 'boolean'
  },
  // narrowerRfcs: {
  //   title: 'Narrower /info/ RFCs',
  //   description: 'Reduce space between /info/rfcN/ content and the sidebar',
  //   storageType: ['', 'narrow-left', 'narrow-center']
  // },
  formatsAlsoViewAs: {
    title: 'RFC formats "Also view as" links',
    description: 'On the info route adds a list of formats to the top-right of the RFC content',
    storageType: 'boolean'
  },
  searchObsoletedDefaults: {
    title: 'Search default filter includes obsoleted',
    description: 'On the search route include obsoleted results by default',
    storageType: 'boolean'
  }
}

export const DEFAULT_FEATURE_FLAGS: Required<FeatureFlags> = {
  isDidYouMeanActive: false,
  isAbnfDiagramsActive: false,
  // narrowerRfcs: '',
  formatsAlsoViewAs: false,
  // showPreCopyButton: '',
  searchObsoletedDefaults: false
}

export const featureFlagsUIRows = Object.entries(featureFlagsUI)

export type WatchInputForFeatureFlagExperimentsProps = {
  inputValueRef: Ref<string>
  isFeatureFlagsModalVisibleRef: Ref<boolean>
}

const LOCALSTORAGE_KEY = 'feature-flag-experiments'

export const loadFeatureFlagsFromLocalStorage = (featureFlagsRef: Ref<FeatureFlags>) => {
  try {
    const valString = window.localStorage.getItem(LOCALSTORAGE_KEY)
    if (!valString) {
      // no value in local storage
      return
    }
    const val = JSON.parse(valString)
    const { data, error } = FeatureFlagsSchema.safeParse(val)
    if (error || !data) {
      const errorTitle = 'Unable to validate feature flag JSON. Resetting localStorage config.'
      console.log(errorTitle, valString)
      window.localStorage.removeItem(LOCALSTORAGE_KEY)
      throw Error(errorTitle)
    }
    featureFlagsRef.value = {
      // merge current value as default data so that all keys will be present
      ...featureFlagsRef.value,
      ...data
    }
  } catch (e: unknown) {
    const _errorTitle = `Error loading from localStorage (this is expected behaviour if localStorage is disabled). ${e}`
    // console.log(`[feature-flag-experiments] ${errorTitle}`, e)
  }
}

const ENABLE_FEATURE_FLAGS_INPUT_VALUE = '//feature-flag-experiments'

export const watchInputForFeatureFlagExperiments = ({
  inputValueRef,
  isFeatureFlagsModalVisibleRef
}: WatchInputForFeatureFlagExperimentsProps): void => {
  watch(inputValueRef, () => {
    const { value } = inputValueRef
    if (value.trim() === ENABLE_FEATURE_FLAGS_INPUT_VALUE) {
      console.log('Opening feature flag experiments modal')
      isFeatureFlagsModalVisibleRef.value = true
    }
  })
}

export const isFeatureFlagsModalVisibleKey = Symbol() as InjectionKey<Ref<boolean>>

export const useFeatureFlags = () => {
  const featureFlagsRef = inject(featureFlagsKey)

  if (!featureFlagsRef) {
    throw Error('Expected provide(featureFlagsKey) above in component tree.')
  }

  watch(
    () => featureFlagsRef?.value ?? undefined,
    () => {
      if (!featureFlagsRef) {
        throw Error('Expected inject(featureFlagsKey) to be available')
      }
      try {
        // localStorage APIs can throw Errors if browser storage is disabled or storage is full etc
        window.localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(featureFlagsRef.value))
      } catch (e: unknown) {
        console.log(
          `[feature-flag-experiments]  Error saving config to localStorage (this is expected behaviour if browser localStorage is disabled or full)`,
          e
        )
      }
    }
  )

  return featureFlagsRef
}

export const useAreFeatureFlagsEnabled = () => {
  const featureFlagsRef = inject(featureFlagsKey)
  const isMounted = ref(false)
  onMounted(() => {
    isMounted.value = true
  })
  onUnmounted(() => {
    isMounted.value = false
  })

  if (!featureFlagsRef) {
    console.warn('Expected provide(featureFlagsKey) above in component tree.')
  }

  const areFeatureFlagsEnabled = computed(() => {
    const featureFlags = featureFlagsRef?.value
    if (!featureFlags) {
      console.warn('Expected provide(featureFlagsKey) above in component tree.')
      return false
    }
    // Do nothing in server renders
    if (isMounted.value === false) {
      return false
    }
    const entries = Object.entries(featureFlags)
    const isEnabled = entries.reduce((acc, [_key, value]) => (acc ? acc : Boolean(value)), false)
    return isEnabled
  })

  return areFeatureFlagsEnabled
}
