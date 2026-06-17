<template>
  <div class="rr-viewer">
    <!-- Parse errors summary -->
    <details v-if="parseResult.errors.length > 0" class="rr-errors">
      <summary class="rr-errors-summary">
        {{ parseResult.errors.length }} rule{{ parseResult.errors.length === 1 ? '' : 's' }} could not be parsed
      </summary>
      <ul class="rr-errors-list">
        <li v-for="(err, i) in parseResult.errors" :key="i" class="rr-error-item">
          <code>Line {{ err.line }}:{{ err.col }}</code> — {{ err.message }}
        </li>
      </ul>
    </details>

    <!-- Rule diagrams — core rules (ALPHA, DIGIT …) are omitted unless the
         ABNF text redefines them, to avoid cluttering the viewer with boilerplate. -->
    <AbnfRuleDiagram v-for="rule in userRules" :key="rule.name" :rule="rule" :rule-map="ruleMap" />

    <p v-if="userRules.length === 0 && parseResult.errors.length === 0" class="rr-empty">No ABNF rules found.</p>
  </div>
</template>

<script setup lang="ts">
import AbnfRuleDiagram from './AbnfRuleDiagram.vue'
import { parseAbnf, buildRuleMap } from './parser/parser'
import { CORE_RULE_MAP } from './parser/core-rules'
import type { AbnfRule } from './parser/types'

const props = defineProps<{ abnfText: string }>()

const parseResult = computed(() => parseAbnf(props.abnfText))

// Rules explicitly written in the ABNF text (not injected core rules).
const userRules = computed(() => parseResult.value.rules)

// Full rule map: core rules + user rules (user overrides core).
const ruleMap = computed<Map<string, AbnfRule>>(() => buildRuleMap(parseResult.value.rules))
</script>

<style>
.rr-viewer {
  display: flex;
  flex-direction: column;
}

.rr-errors {
  margin-bottom: 0.75rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d4860a;
  border-radius: 4px;
  background: rgba(212, 134, 10, 0.08);
  font-size: 0.85rem;
}

.rr-errors-summary {
  cursor: pointer;
  color: #d4860a;
  font-weight: 500;
}

.rr-errors-list {
  margin: 0.4rem 0 0;
  padding-left: 1.2rem;
}

.rr-error-item {
  margin: 0.2rem 0;
  color: var(--rr-muted, #666);
}

.rr-error-item code {
  font-family: monospace;
  font-size: 0.85em;
}

.rr-empty {
  color: var(--rr-muted, #888);
  font-size: 0.9rem;
}
</style>
