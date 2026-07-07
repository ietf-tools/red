<template>
  <form :role="landmark ? 'search' : undefined" :class="classNames?.root" @submit.prevent="submit">
    <div :class="classNames?.row1">
      <label :for="inputDomId" :class="classNames?.label" :style="showLabel ? undefined : SR_ONLY_STYLE">
        <slot name="label">{{ label }}</slot>
      </label>
      <div :class="classNames?.inputAndButtons">
        <input
          :id="inputDomId"
          type="search"
          :class="classNames?.input"
          :placeholder="placeholder"
          :value="query"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          :aria-describedby="descriptionDomId"
          @input="onInput"
          @focus="onFocus"
          @blur="onBlur" />
        <button type="submit" :class="classNames?.submit" :aria-label="submitLabel">
          <slot name="submit-icon">{{ submitLabel }}</slot>
        </button>
        <button
          v-if="query.length > 0"
          type="button"
          :class="classNames?.reset"
          :aria-label="resetLabel"
          @click="clear">
          <slot name="reset-icon">{{ resetLabel }}</slot>
        </button>
      </div>
      <span v-if="isSearchStalled" :class="classNames?.loadingIndicator" role="status">
        <slot name="loading-indicator">{{ loadingLabel }}</slot>
      </span>
    </div>
    <p v-if="description" :id="descriptionDomId" :class="classNames?.description">{{ description }}</p>
  </form>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import { useSearchBox } from '../connectors/useSearchBox'
import { SR_ONLY_STYLE } from '../utils/srOnly'
import type { ClassNames } from '../types'

type Props = {
  classNames?: ClassNames
  label?: string
  description?: string
  descriptionId?: string
  showLabel?: boolean
  placeholder?: string
  submitLabel?: string
  resetLabel?: string
  loadingLabel?: string
  debounceMs?: number
  /**
   * Expose the form as a `search` landmark. Default true for standalone use; set false
   * when the host wraps the whole search facility in its own `search` landmark, to avoid
   * duplicate/ambiguous landmarks.
   */
  landmark?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Search',
  showLabel: true,
  placeholder: '',
  submitLabel: 'Search',
  resetLabel: 'Clear the search query',
  loadingLabel: 'Searching…',
  debounceMs: 300,
  landmark: true
})

const inputDomId = useId()
const descriptionUseId = useId()

const descriptionDomId = computed(() => {
  if (props.descriptionId) {
    return props.descriptionId
  }
  if (props.description) {
    return descriptionUseId
  }
  return undefined
})

const { query, setQuery, submit, clear, onFocus, onBlur, isSearchStalled } = useSearchBox({
  debounceMs: props.debounceMs
})

const onInput = (event: Event) => {
  if (!(event.target instanceof HTMLInputElement)) {
    console.error('[internal error] Expected event.target to be HTMLInputElement', event.target, event)
    return
  }
  setQuery(event.target.value)
}
</script>
