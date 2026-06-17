<template>
  <div class="rr-validator">
    <div class="rr-validator-row">
      <label :for="inputId" class="rr-validator-label">Test input</label>
      <div class="rr-validator-field">
        <input
          :id="inputId"
          v-model="inputValue"
          type="text"
          class="rr-validator-input"
          :class="statusClass"
          :placeholder="placeholder"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          :aria-describedby="statusId" />
      </div>
      <span :id="statusId" class="rr-validator-status" :class="statusClass" aria-live="polite">
        {{ statusText }}
      </span>
    </div>
    <!-- Partial-match progress bar -->
    <div v-if="partialPct !== null" class="rr-validator-bar" aria-hidden="true">
      <div class="rr-validator-bar-fill" :style="{ width: `${partialPct}%` }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { validate } from './validator/validate'
import { generateExample } from './validator/generate'
import type { AbnfRule } from './parser/types'

const props = defineProps<{
  ruleName: string
  ruleMap: Map<string, AbnfRule>
}>()

const inputId = computed(() => `rr-input-${props.ruleName}`)
const statusId = computed(() => `rr-status-${props.ruleName}`)
const placeholder = computed(() => {
  const ex = generateExample(props.ruleName, props.ruleMap)
  return ex ? `e.g. ${ex}` : ''
})

const inputValue = ref('')

type Status = 'idle' | 'ok' | 'partial' | 'err'

const result = computed(() => {
  const v = inputValue.value
  if (!v) return null
  return validate(v, props.ruleName, props.ruleMap)
})

const status = computed((): Status => {
  if (!inputValue.value) return 'idle'
  const r = result.value!
  if (!r.ok) return 'err'
  if (r.end === inputValue.value.length) return 'ok'
  return 'partial' // matched but didn't consume the full input
})

const statusText = computed(() => {
  if (status.value === 'idle') return ''
  const r = result.value!
  if (status.value === 'ok') return '✓ valid'
  if (status.value === 'partial') {
    const matched = inputValue.value.slice(0, r.ok ? r.end : 0)
    return `matched ${r.ok ? r.end : 0}/${inputValue.value.length} chars`
  }
  // err
  if (!r.ok) {
    const exp = [...new Set(r.expected)].slice(0, 3).join(', ')
    return `✗ invalid at position ${r.pos}${exp ? ` — expected ${exp}` : ''}`
  }
  return ''
})

const statusClass = computed(() => ({
  'rr-status-ok': status.value === 'ok',
  'rr-status-partial': status.value === 'partial',
  'rr-status-err': status.value === 'err'
}))

const partialPct = computed(() => {
  if (status.value !== 'partial') return null
  const r = result.value
  if (!r?.ok) return null
  return Math.round((r.end / inputValue.value.length) * 100)
})
</script>

<style>
.rr-validator {
  margin-top: 0.5rem;
  font-size: 0.85rem;
}

.rr-validator-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rr-validator-label {
  color: var(--rr-muted, #888);
  white-space: nowrap;
  font-size: 0.8rem;
}

.rr-validator-field {
  flex: 1;
  min-width: 8rem;
  max-width: 28rem;
}

.rr-validator-input {
  width: 100%;
  font-family: monospace;
  font-size: 0.85rem;
  padding: 0.2rem 0.4rem;
  border: 1px solid var(--rr-border, #ccc);
  border-radius: 3px;
  background: var(--rr-input-bg, #fff);
  color: inherit;
  outline: none;
  transition: border-color 0.15s;
}

.rr-validator-input:focus {
  border-color: var(--rr-focus, #4a90d9);
  box-shadow: 0 0 0 2px var(--rr-focus-ring, rgba(74, 144, 217, 0.3));
}

.rr-validator-input.rr-status-ok {
  border-color: #2e9f47;
}
.rr-validator-input.rr-status-partial {
  border-color: #d4860a;
}
.rr-validator-input.rr-status-err {
  border-color: #c9353f;
}

.rr-validator-status {
  font-size: 0.78rem;
  white-space: nowrap;
}

.rr-validator-status.rr-status-ok {
  color: #2e9f47;
}
.rr-validator-status.rr-status-partial {
  color: #d4860a;
}
.rr-validator-status.rr-status-err {
  color: #c9353f;
}

.rr-validator-bar {
  margin-top: 3px;
  height: 3px;
  background: var(--rr-border, #e0e0e0);
  border-radius: 2px;
  overflow: hidden;
  max-width: calc(28rem + 5.5rem); /* match field + label */
}

.rr-validator-bar-fill {
  height: 100%;
  background: #d4860a;
  border-radius: 2px;
  transition: width 0.1s;
}

html.dark .rr-validator-input {
  background: var(--rr-input-bg-dark, #1e1e1e);
  border-color: var(--rr-border-dark, #444);
}
</style>
