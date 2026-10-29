<template>
  <div class="pt-2 flex flex-col gap-5">
    <Heading level="2" style-level="4" class="mt-0">RFC Info pages</Heading>
    <div role="group" :aria-labelledby="linkPreviewLabelDomId" class="border-1 border-gray-200 p-2 rounded">
      <Heading :id="linkPreviewLabelDomId" level="3" style-level="5" class="mt-0 mb-2">Link Previews</Heading>
      <!-- A checkbox rather than a Disable/Enable button, so the current state is readable
       without having to infer it from what the button offers to do. There's no save button:
       ticking it writes to the store, which persists to localStorage. -->
      <CheckboxRoot
        v-model="isRFCLinkPreviewDisabled"
        :aria-describedby="linkPreviewDescriptionDomId"
        class="flex items-start gap-2 cursor-pointer w-full text-left">
        <span
          class="inline-flex shrink-0 items-center justify-center w-[20px] h-[20px] mt-0.5 border-1 rounded border-current/60">
          <CheckboxIndicator>
            <GraphicsCheckmark class="block w-[14px] h-[14px]" />
          </CheckboxIndicator>
        </span>
        <span>Disable RFC Link Preview</span>
      </CheckboxRoot>
      <p :id="linkPreviewDescriptionDomId" class="pl-7 pt-1 text-sm text-gray-800 dark:text-gray-200">
        Disable the RFC tooltip that activates on some RFC links (typically within RFCs).
      </p>
    </div>

    <div
      v-if="featureFlags.hasTextScale"
      role="group"
      :aria-labelledby="textScaleLabelDomId"
      class="border-1 border-gray-200 p-2 rounded">
      <Heading :id="textScaleLabelDomId" level="3" style-level="5" class="mt-0 mb-2">Text scale</Heading>
      <div class="flex items-center gap-3">
        <input
          v-model.number="draftTextScale"
          type="range"
          :min="TEXT_SCALE_MIN"
          :max="TEXT_SCALE_MAX"
          :step="TEXT_SCALE_STEP"
          :aria-labelledby="textScaleLabelDomId"
          :aria-describedby="textScaleDescriptionDomId"
          :aria-valuetext="textScaleLabel"
          class="w-full max-w-2xs accent-blue-600 cursor-pointer"
          @change="commitTextScale" />
        <output class="text-sm tabular-nums">{{ textScaleLabel }}</output>
        <button type="reset" @click="draftTextScale = DEFAULT_TEXT_SCALE">Reset to default</button>
      </div>

      <p :id="textScaleDescriptionDomId" class="pt-1 text-sm text-gray-800 dark:text-gray-200">
        Scale text line spacing, letter spacing, word spacing, and spacing after paragraphs.
      </p>
    </div>

    <div
      v-if="featureFlags.hasWordBreakMode"
      role="group"
      :aria-labelledby="wordBreakLabelDomId"
      :aria-describedby="wordBreakDescriptionDomId"
      class="border-1 border-gray-200 p-2 rounded">
      <Heading :id="wordBreakLabelDomId" level="3" style-level="5" class="mt-0 mb-2">Word breaking</Heading>
      <p :id="wordBreakDescriptionDomId" class="pb-2 text-sm text-gray-800 dark:text-gray-200">
        How long words and URLs in RFC documents are allowed to break across lines.
      </p>
      <!-- Radios rather than a select, so every option and its description is readable without
       opening anything. Writes to the store on change, which persists to localStorage. -->
      <RadioGroupRoot v-model="wordBreakModeValue" :aria-labelledby="wordBreakLabelDomId" class="flex flex-col gap-2">
        <div v-for="option in WORD_BREAK_MODE_OPTIONS" :key="option.value">
          <RadioGroupItem
            :value="option.value"
            :aria-describedby="wordBreakOptionDescriptionDomId(option.value)"
            class="flex items-start gap-2 cursor-pointer w-full text-left">
            <span
              class="inline-flex shrink-0 items-center justify-center w-[20px] h-[20px] mt-0.5 border-1 rounded-full border-current/60">
              <RadioGroupIndicator>
                <GraphicsCheckmark class="block w-[14px] h-[14px]" />
              </RadioGroupIndicator>
            </span>
            <span>{{ option.label }}</span>
          </RadioGroupItem>
          <p
            :id="wordBreakOptionDescriptionDomId(option.value)"
            class="pl-7 pt-1 text-sm text-gray-800 dark:text-gray-200">
            {{ option.description }}
          </p>
        </div>
      </RadioGroupRoot>
    </div>

    <div
      v-if="featureFlags.hasReadingMode"
      role="group"
      :aria-labelledby="readingLabelDomId"
      class="border-1 border-gray-200 p-2 rounded flex flex-col gap-4">
      <Heading :id="readingLabelDomId" level="3" style-level="5" class="mt-0 mb-0">Reading mode</Heading>

      <RFCReadingModeUnsupportedNotice v-if="isReadingModeUnsupported" />
      <!-- No voices means nothing the controls below would change can be heard, so they are not offered. -->
      <p v-else-if="totalVoiceCount === 0" role="status" class="text-sm text-gray-800 dark:text-gray-200">
        This browser currently reports no speech voices, so reading aloud will not work here. Voices come from your
        operating system, and some browsers cannot reach them.
      </p>
      <template v-else>
        <div>
          <CheckboxRoot
            v-model="isPreformattedReadAloud"
            :aria-describedby="readingPreformattedDescriptionDomId"
            class="flex items-start gap-2 cursor-pointer w-full text-left">
            <span
              class="inline-flex shrink-0 items-center justify-center w-[20px] h-[20px] mt-0.5 border-1 rounded border-current/60">
              <CheckboxIndicator>
                <GraphicsCheckmark class="block w-[14px] h-[14px]" />
              </CheckboxIndicator>
            </span>
            <span>Read ASCII art and ABNF aloud</span>
          </CheckboxRoot>
          <p :id="readingPreformattedDescriptionDomId" class="pl-7 pt-1 text-sm text-gray-800 dark:text-gray-200">
            By default, diagrams and code blocks are skipped. This applies to HTML documents only. Plain text RFCs can't
            tell diagrams from prose, so they are always read in full.
          </p>
        </div>

        <div>
          <label :for="readingRateDomId" class="block">Speech rate</label>
          <div class="flex items-center gap-3">
            <input
              :id="readingRateDomId"
              v-model.number="draftReadingRate"
              type="range"
              :min="READING_RATE_MIN"
              :max="READING_RATE_MAX"
              :step="READING_RATE_STEP"
              :aria-valuetext="readingRateLabel"
              class="w-full max-w-2xs accent-blue-600 cursor-pointer"
              @change="commitReadingRate" />
            <output class="text-sm tabular-nums">{{ readingRateLabel }}</output>
            <button type="reset" @click="resetReadingRate">Reset to default</button>
          </div>
        </div>

        <div>
          <!-- Without an English voice to choose there is nothing to pick between, so no control is offered. -->
          <template v-if="voices.length > 0">
            <label :for="readingVoiceDomId" class="block">Voice</label>
            <select
              :id="readingVoiceDomId"
              v-model="readingVoiceValue"
              :aria-describedby="readingVoiceDescriptionDomId"
              class="max-w-full border-1 rounded border-gray-400 bg-white dark:bg-black px-2 py-1">
              <option value="">Browser default</option>
              <option v-for="voice in voices" :key="voice.voiceURI" :value="voice.voiceURI">
                {{ voice.name }} ({{ voice.lang }})
              </option>
            </select>
          </template>
          <p
            v-if="voices.length === 0"
            :id="readingVoiceDescriptionDomId"
            role="status"
            class="pt-1 text-sm text-gray-800 dark:text-gray-200">
            No English voices were found, so the browser's default voice will be used.
          </p>
          <p v-else :id="readingVoiceDescriptionDomId" class="pt-1 text-sm text-gray-800 dark:text-gray-200">
            Voices come from your browser and operating system. Only English voices are listed.
          </p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot, RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import {
  DEFAULT_READING_RATE,
  READING_RATE_MAX,
  READING_RATE_MIN,
  READING_RATE_STEP,
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  TEXT_SCALE_STEP,
  useUiSettingsStore
} from '~/stores/ui-settings'
import { useReadingModeSupport } from '~/utilities/reading-mode/support'
import { useSpeechVoices } from '~/utilities/reading-mode/voices'
import { useFeatureFlags } from '~/utilities/feature-flags'
import { WORD_BREAK_MODE_OPTIONS, WordBreakModeSchema, type WordBreakMode } from '~/utilities/word-break-mode'

const uiSettings = useUiSettingsStore()
const { disableRFCLinkPreview, textScale, wordBreakMode, readAloudPreformatted, readingRate, readingVoiceUri } =
  storeToRefs(uiSettings)
const {
  setDisabledRFCLinkPreview,
  setTextScale,
  setWordBreakMode,
  setReadAloudPreformatted,
  setReadingRate,
  setReadingVoiceUri
} = uiSettings

const { voices, totalVoiceCount } = useSpeechVoices()
const { isUnsupported: isReadingModeUnsupported } = useReadingModeSupport()

const featureFlags = useFeatureFlags()

const textScaleLabelDomId = useId()
const textScaleDescriptionDomId = useId()
const linkPreviewLabelDomId = useId()
const linkPreviewDescriptionDomId = useId()
const wordBreakLabelDomId = useId()
const wordBreakDescriptionDomId = useId()
const wordBreakOptionsDomId = useId()
const readingLabelDomId = useId()
const readingPreformattedDescriptionDomId = useId()
const readingRateDomId = useId()
const readingVoiceDomId = useId()
const readingVoiceDescriptionDomId = useId()

const wordBreakOptionDescriptionDomId = (mode: WordBreakMode): string => `${wordBreakOptionsDomId}-${mode}`

// The slider tracks its own value while it's being dragged and only writes to the
// store on `change`, so a drag doesn't persist to localStorage on every pixel of
// travel. Keyboard adjustment fires `change` per keypress, so it commits at once.
const draftTextScale = ref<number>(textScale.value)

watch(textScale, (value) => {
  draftTextScale.value = value
})

const commitTextScale = () => {
  setTextScale(draftTextScale.value)
}

const textScaleLabel = computed(() => {
  const val = draftTextScale.value / DEFAULT_TEXT_SCALE
  return `${val.toFixed(1)}×`
})

// Tracked while dragged and written on `change`, for the same reason as the text scale.
const draftReadingRate = ref<number>(readingRate.value)

watch(readingRate, (value) => {
  draftReadingRate.value = value
})

const commitReadingRate = () => {
  setReadingRate(draftReadingRate.value)
}

const resetReadingRate = () => {
  draftReadingRate.value = DEFAULT_READING_RATE
  commitReadingRate()
}

const readingRateLabel = computed(() => `${draftReadingRate.value.toFixed(1)}×`)

const isPreformattedReadAloud = computed<boolean>({
  get: () => readAloudPreformatted.value,
  set: (isRead) => setReadAloudPreformatted(isRead)
})

const readingVoiceValue = computed<string>({
  get: () => readingVoiceUri.value,
  set: (voiceUri) => setReadingVoiceUri(voiceUri)
})

// reka-ui reports the chosen value as a plain string, so it is validated back into the union
// before it reaches the store rather than cast.
const wordBreakModeValue = computed<string>({
  get: () => wordBreakMode.value,
  set: (value) => {
    const parsed = WordBreakModeSchema.safeParse(value)
    if (parsed.success) {
      setWordBreakMode(parsed.data)
    }
  }
})

const isRFCLinkPreviewDisabled = computed<boolean>({
  get: () => disableRFCLinkPreview.value,
  set: (isDisabled) => setDisabledRFCLinkPreview(isDisabled)
})
</script>
