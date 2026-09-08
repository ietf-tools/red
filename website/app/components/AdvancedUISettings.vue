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
  </div>
</template>

<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot, RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { TEXT_SCALE_MAX, TEXT_SCALE_MIN, TEXT_SCALE_STEP, useUiSettingsStore } from '~/stores/ui-settings'
import { useFeatureFlags } from '~/utilities/feature-flags'
import { WORD_BREAK_MODE_OPTIONS, WordBreakModeSchema, type WordBreakMode } from '~/utilities/word-break-mode'

const uiSettings = useUiSettingsStore()
const { disableRFCLinkPreview, textScale, wordBreakMode } = storeToRefs(uiSettings)
const { setDisabledRFCLinkPreview, setTextScale, setWordBreakMode } = uiSettings

const featureFlags = useFeatureFlags()

const textScaleLabelDomId = useId()
const textScaleDescriptionDomId = useId()
const linkPreviewLabelDomId = useId()
const linkPreviewDescriptionDomId = useId()
const wordBreakLabelDomId = useId()
const wordBreakDescriptionDomId = useId()
const wordBreakOptionsDomId = useId()

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
