<template>
  <span
    :class="[
      'inline-block mx-2 rotate-45 align-middle print:bg-black print:opacity-100 print-with-background',
      props.color === 'gray' ?
        'bg-gray-600 dark:bg-white opacity-50'
      : 'bg-yellow-400 dark:bg-yellow-800',
      props.size === '5px' ? 'w-[5px] h-[5px]' : 'w-[10px] h-[10px] '
    ]"
  />
</template>

<script setup lang="ts">
type Props = {
  color?: 'gray' | 'yellow'
  size?: '5px' | '10px'
}

const props = withDefaults(defineProps<Props>(), { color: 'gray', size: '5px' })
</script>
