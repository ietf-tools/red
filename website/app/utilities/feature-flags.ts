import { z } from 'zod'
import { type ComputedRef, type Ref } from 'vue'
import { HOME_PATH, SEARCH_PATH, SUBJECTS_PATH } from './url'

export const FeatureFlagsSchema = z.object({
  // Ensure all top-level fields are optional so that browsers
  // with old versions saved in localStorage values can still validate
  isDidYouMeanActive: z.boolean().optional(),
  isAbnfDiagramsActive: z.boolean().optional(),
  // narrowerRfcs: z.union([ENUM_STRING_UNDEFINED, z.literal('narrow-left'), z.literal('narrow-center')]).optional(),
  formatsAlsoViewAs: z.boolean().optional(),
  searchObsoletedDefaults: z.boolean().optional(),
  oidc: z.boolean().optional(),
  hasTextScale: z.boolean().optional()
})

// this is commented out until next time we need a string union value in feature flags.
// string union feature flag values being optional is difficult to model in TS
// so we'll use a JS falsey value so that Boolean() can evaluate as false
// const ENUM_STRING_UNDEFINED = z.literal('')

export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>

export const featureFlagsKey = Symbol() as InjectionKey<Ref<FeatureFlags>>

export const hasFeatureFlagsLoadedKey = Symbol() as InjectionKey<Ref<boolean>>

export type FeatureFlagUIRow = {
  title: string
  description?: string
  storageType: 'boolean' | string[]
}

const featureFlagsUI: Record<keyof FeatureFlags, FeatureFlagUIRow> = {
  hasTextScale: {
    title: 'Text scaling option',
    description: 'Text scaling affects line spacing, letter spacing, word spacing, and spacing after paragraphs.',
    storageType: 'boolean'
  },
  oidc: {
    title: 'Personalisation / OIDC',
    description: `Enables account sign-in (OIDC via account.ietf.org) and the personalisation features layered on top, such as saved preferences, subscriptions, and browsing the series by subject at ${SUBJECTS_PATH}.`,
    storageType: 'boolean'
  },
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
  hasTextScale: false,
  isDidYouMeanActive: false,
  isAbnfDiagramsActive: false,
  // narrowerRfcs: '',
  formatsAlsoViewAs: false,
  // showPreCopyButton: '',
  searchObsoletedDefaults: false,
  oidc: false
}

export const featureFlagsUIRows = Object.entries(featureFlagsUI)

export type WatchInputForFeatureFlagExperimentsProps = {
  inputValueRef: Ref<string>
  isFeatureFlagsModalVisibleRef: Ref<boolean>
}

const LOCALSTORAGE_KEY = 'feature-flag-experiments'

export const loadFeatureFlagsFromLocalStorage = (
  hasFeatureFlagsLoadedKey: Ref<boolean>,
  featureFlagsRef: Ref<FeatureFlags>
) => {
  hasFeatureFlagsLoadedKey.value = true
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

export const useHasFeatureFlagsLoaded = (): Ref<boolean> => {
  const hasFeatureFlagsLoadedRef = inject(hasFeatureFlagsLoadedKey)

  if (!hasFeatureFlagsLoadedRef) {
    throw Error('Expected provide(hasFeatureFlagsLoadedKey) above in component tree.')
  }

  return hasFeatureFlagsLoadedRef
}

// Whether whatever a flag gates may be shown. Flags are read from localStorage after mount, so a
// server render and the first client render have nothing to decide on yet: 'pending' is neither a
// yes nor a no, and is what keeps a gated feature from being drawn and then taken away again.
export type FeatureFlagWallStatus = 'pending' | 'enabled' | 'disabled'

/**
 * Gates a feature on a flag, sending anyone whose flags do not carry it to the homepage.
 *
 * The key is taken as a getter because it arrives as a prop, which can change under a wall that
 * stays mounted.
 */
export const useFeatureFlagWall = (getFeatureFlagKey: () => keyof FeatureFlags): ComputedRef<FeatureFlagWallStatus> => {
  const featureFlagsRef = useFeatureFlags()
  const hasFeatureFlagsLoadedRef = useHasFeatureFlagsLoaded()

  const status = computed<FeatureFlagWallStatus>(() => {
    if (!hasFeatureFlagsLoadedRef.value) {
      return 'pending'
    }
    // Truthiness rather than `=== true`, so that a flag which later becomes a string union works
    // here too: its "unset" value is the falsey sentinel described above.
    return featureFlagsRef.value[getFeatureFlagKey()] ? 'enabled' : 'disabled'
  })

  watch(
    status,
    (status) => {
      if (status !== 'disabled') {
        return
      }
      // Replaced rather than pushed: this is an address the reader cannot be at, so leaving it in
      // history would make Back a way of arriving here again.
      void navigateTo(HOME_PATH, { replace: true })
    },
    { immediate: true }
  )

  return status
}

export const calculateIfFeatureFlagsAreEnabled = (featureFlags: FeatureFlags): boolean => {
  const entries = Object.entries(featureFlags)
  console.log(entries)
  const isEnabled = entries.reduce((acc, [_key, value]) => (acc ? acc : Boolean(value)), false)
  return isEnabled
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

    return calculateIfFeatureFlagsAreEnabled(featureFlags)
  })

  return areFeatureFlagsEnabled
}
