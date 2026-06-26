<template>
  <Icon v-if="props.icon && typeof props.icon === 'string'" :name="props.icon" />
  <component v-else-if="props.icon && typeof props.icon === 'function'" :is="props.icon()" class="w-[18px] h-[18px]" />
</template>

<script setup lang="ts">
import type { MenuItem } from './HeaderNavData'

type Props = {
  icon?: MenuItem['icon']
}

const props = defineProps<Props>()
</script>
