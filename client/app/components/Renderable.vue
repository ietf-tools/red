<template>
  <template v-if="isVNode(props.val)">
    <component :is="props.val" />
  </template>
  <template v-else>
    {{ props.val }}
  </template>
</template>

<script setup lang="ts">
import { isVNode } from 'vue'
import type { VNode } from 'vue'

type Props = {
  val: string | VNode
}

const props = defineProps<Props>()
</script>
