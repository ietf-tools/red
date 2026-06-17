<template>
  <section :id="`rule-${rule.name}`" class="rr-rule" :aria-label="`ABNF rule: ${rule.name}`">
    <h3 class="rr-rule-name">
      <code>{{ rule.name }}</code>
      <span class="rr-rule-eq"> =</span>
    </h3>

    <AbnfDiagramSvg :rule="rule" :rule-map="ruleMap" :rule-name="rule.name" />

    <AbnfValidatorInput :rule-name="rule.name" :rule-map="ruleMap" />
  </section>
</template>

<script setup lang="ts">
import AbnfDiagramSvg from './AbnfDiagramSvg.vue'
import AbnfValidatorInput from './AbnfValidatorInput.vue'
import type { AbnfRule } from './parser/types'

defineProps<{
  rule: AbnfRule
  ruleMap: Map<string, AbnfRule>
}>()
</script>

<style>
.rr-rule {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--rr-divider, #e5e5e5);
}

.rr-rule:last-child {
  border-bottom: none;
}

.rr-rule-name {
  font-size: 0.9rem;
  font-weight: normal;
  margin: 0;
  line-height: 1.2;
}

.rr-rule-name code {
  font-family: monospace;
  font-size: inherit;
  font-weight: bold;
}

.rr-rule-eq {
  color: var(--rr-muted, #888);
  margin-left: 0.2em;
}

html.dark .rr-rule {
  --rr-divider: #333;
}
</style>
