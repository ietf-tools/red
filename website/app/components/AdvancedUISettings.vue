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
      aria-label="Text size"
      class="border-1 border-gray-200 p-2 rounded">
      <SettingSlider
        label="Text size"
        :model-value="textScale"
        :min="TEXT_SCALE_MIN"
        :max="TEXT_SCALE_MAX"
        :step="TEXT_SCALE_STEP"
        :format-value="formatTextSize"
        description="Make the text in RFCs larger or smaller."
        @commit="setTextScale"
        @reset="setTextScale(DEFAULT_TEXT_SCALE)" />
    </div>

    <div
      v-if="featureFlags.hasTextScale"
      role="group"
      :aria-labelledby="textSpacingLabelDomId"
      :aria-describedby="textSpacingDescriptionDomId"
      class="border-1 border-gray-200 p-2 rounded flex flex-col gap-4">
      <div class="flex flex-wrap items-center justify-start gap-2">
        <Heading :id="textSpacingLabelDomId" level="3" style-level="5" class="mt-0 mb-0">Text spacing</Heading>
        <button
          type="button"
          class="cursor-pointer rounded-md border-1 border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-900 shadow-xs transition-colors hover:bg-gray-100 hover:border-gray-400 active:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 dark:hover:border-gray-500 dark:active:bg-gray-700"
          @click="resetTextSpacing">
          Reset all spacing
        </button>
      </div>
      <p :id="textSpacingDescriptionDomId" class="text-sm text-gray-800 dark:text-gray-200">
        Adjust the space between lines, letters, words and paragraphs in RFCs.
      </p>
      <SettingSlider
        label="Line spacing"
        :model-value="lineSpacingStep"
        :min="0"
        :max="MAX_LINE_SPACING_STEP"
        :step="1"
        :format-value="(step) => describeStep(step, DEFAULT_LINE_SPACING_STEP)"
        @commit="setLineSpacingStep"
        @reset="setLineSpacingStep(DEFAULT_LINE_SPACING_STEP)" />
      <SettingSlider
        label="Letter spacing"
        :model-value="letterSpacingStep"
        :min="0"
        :max="MAX_LETTER_SPACING_STEP"
        :step="1"
        :format-value="(step) => describeStep(step, DEFAULT_LETTER_SPACING_STEP)"
        @commit="setLetterSpacingStep"
        @reset="setLetterSpacingStep(DEFAULT_LETTER_SPACING_STEP)" />
      <!-- Words are kept at least as far apart as the letters are, because letters spaced out with
       tight words between them read more slowly, so the slider cannot go below the letter spacing. -->
      <SettingSlider
        label="Word spacing"
        :model-value="effectiveWordSpacingStep(spacingSteps)"
        :min="letterSpacingStep"
        :max="MAX_WORD_SPACING_STEP"
        :step="1"
        :format-value="(step) => describeStep(step, DEFAULT_WORD_SPACING_STEP)"
        description="Never less than the letter spacing, so words stay easy to tell apart."
        @commit="setWordSpacingStep"
        @reset="setWordSpacingStep(DEFAULT_WORD_SPACING_STEP)" />
      <SettingSlider
        label="Paragraph spacing"
        :model-value="paragraphSpacingStep"
        :min="0"
        :max="MAX_PARAGRAPH_SPACING_STEP"
        :step="1"
        :format-value="(step) => describeStep(step, DEFAULT_PARAGRAPH_SPACING_STEP)"
        @commit="setParagraphSpacingStep"
        @reset="setParagraphSpacingStep(DEFAULT_PARAGRAPH_SPACING_STEP)" />
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
            <button
              type="button"
              @click="resetReadingRate"
              class="cursor-pointer border-1 border-black text-sm px-2 py-1">
              Reset to default
            </button>
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
  DEFAULT_TEXT_SCALE,
  READING_RATE_MAX,
  READING_RATE_MIN,
  READING_RATE_STEP,
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  TEXT_SCALE_STEP,
  useUiSettingsStore
} from '~/stores/ui-settings'
import {
  DEFAULT_LETTER_SPACING_STEP,
  DEFAULT_LINE_SPACING_STEP,
  DEFAULT_PARAGRAPH_SPACING_STEP,
  DEFAULT_WORD_SPACING_STEP,
  MAX_LETTER_SPACING_STEP,
  MAX_LINE_SPACING_STEP,
  MAX_PARAGRAPH_SPACING_STEP,
  MAX_WORD_SPACING_STEP,
  describeStep,
  effectiveWordSpacingStep
} from '~/utilities/text-spacing'
import { useReadingModeSupport } from '~/utilities/reading-mode/support'
import { useSpeechVoices } from '~/utilities/reading-mode/voices'
import { useFeatureFlags } from '~/utilities/feature-flags'
import { WORD_BREAK_MODE_OPTIONS, WordBreakModeSchema, type WordBreakMode } from '~/utilities/word-break-mode'

const uiSettings = useUiSettingsStore()
const {
  disableRFCLinkPreview,
  textScale,
  lineSpacingStep,
  letterSpacingStep,
  wordSpacingStep,
  paragraphSpacingStep,
  wordBreakMode,
  readAloudPreformatted,
  readingRate,
  readingVoiceUri
} = storeToRefs(uiSettings)
const {
  setDisabledRFCLinkPreview,
  setTextScale,
  setLineSpacingStep,
  setLetterSpacingStep,
  setWordSpacingStep,
  setParagraphSpacingStep,
  resetTextSpacing,
  setWordBreakMode,
  setReadAloudPreformatted,
  setReadingRate,
  setReadingVoiceUri
} = uiSettings

const { voices, totalVoiceCount } = useSpeechVoices()
const { isUnsupported: isReadingModeUnsupported } = useReadingModeSupport()

const featureFlags = useFeatureFlags()

const textSpacingLabelDomId = useId()
const textSpacingDescriptionDomId = useId()
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

const formatTextSize = (value: number): string => `${value.toFixed(1)}×`

const spacingSteps = computed(() => ({
  lineSpacing: lineSpacingStep.value,
  letterSpacing: letterSpacingStep.value,
  wordSpacing: wordSpacingStep.value,
  paragraphSpacing: paragraphSpacingStep.value
}))

// Tracked while dragged and written on `change`, so a drag does not persist on every pixel of travel.
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
