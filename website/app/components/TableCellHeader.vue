<template>
  <th
    :class="[
      'sticky top-0 border-b-1 border-b-blue-300/30 py-2 px-3 text-left wrap-normal',
      {
        'bg-[rgba(30,30,30,0.07)] dark:bg-[rgba(255,255,255,0.1)] even:bg-[rgba(30,30,30,0.15)] dark:even:bg-[rgba(255,255,255,0.15)]':
          props.background === 'transparent',
        'bg-[#e5e6e8] dark:bg-[#13232a] even:bg-[#d5d6d7] dark:even:bg-[#213136]': props.background === 'solid'
      }
    ]">
    <slot />
  </th>
</template>

<script setup lang="ts">
type Props = {
  background: 'solid' | 'transparent'
}

const props = withDefaults(defineProps<Props>(), {
  background: 'solid'
})
</script>
