<template>
  <div>
    <label :for="sliderDomId" class="block font-bold">{{ label }}</label>
    <div class="flex items-center gap-3">
      <input
        :id="sliderDomId"
        v-model.number="draft"
        type="range"
        :min="min"
        :max="max"
        :step="step"
        :aria-valuetext="valueText"
        :aria-describedby="description ? descriptionDomId : undefined"
        class="w-full max-w-2xs accent-blue-600 cursor-pointer"
        @change="emit('commit', draft)" />
      <output class="text-sm tabular-nums min-w-14">{{ valueText }}</output>
      <!-- type="button" because a reset button would also run the browser's own form reset, which puts
       the slider back to a value of its own choosing without telling the store. -->
      <button
        type="button"
        :aria-label="`Reset ${label.toLowerCase()} to default`"
        class="cursor-pointer rounded-md border-1 border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-900 shadow-xs transition-colors hover:bg-gray-100 hover:border-gray-400 active:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 dark:hover:border-gray-500 dark:active:bg-gray-700"
        @click="emit('reset')">
        Reset
      </button>
    </div>
    <p v-if="description" :id="descriptionDomId" class="pt-1 text-sm text-gray-800 dark:text-gray-200">
      {{ description }}
    </p>
  </div>
</template>

<script setup lang="ts">
type Props = {
  label: string
  modelValue: number
  min: number
  max: number
  step: number
  formatValue: (value: number) => string
  description?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  commit: [value: number]
  reset: []
}>()

const sliderDomId = useId()
const descriptionDomId = useId()

// The slider tracks its own value while it's being dragged and only reports on `change`, so a drag
// doesn't persist to localStorage on every pixel of travel. Keyboard adjustment fires `change` per
// keypress, so it commits at once.
const draft = ref<number>(props.modelValue)

const valueText = computed(() => props.formatValue(draft.value))

watch(
  () => props.modelValue,
  (value) => {
    draft.value = value
  }
)
</script>
