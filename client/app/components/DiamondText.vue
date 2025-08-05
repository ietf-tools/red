<template>
  <div
    :class="[
      'inline-flex flex-col justify-center items-center bg-yellow-400 dark:bg-yellow-800 text-black dark:text-white text-base uppercase font-semibold',
      {
        'w-[20px] h-[20px] [clip-path:polygon(0%_50%,_50%_0%,_50%_0%,100%_50%,50%_100%,50%_100%)]':
          props.text.length === 1,
        'w-[25px] h-[20px] [clip-path:polygon(0%_50%,_25%_0%,_75%_0%,100%_50%,75%_100%,25%_100%)]':
          props.text.length === 2,
        'w-[30px] h-[20px] [clip-path:polygon(0%_50%,_10%_0%,_90%_0%,100%_50%,90%_100%,10%_100%)]':
          props.text.length === 3
        // longer lengths aren't specially styled
      },
      props.class
    ]"
  >
    {{ props.text }}
  </div>
</template>

<script setup lang="ts">
import type { VueStyleClass } from '../utilities/vue'

type Props = {
  text: string
  class?: VueStyleClass
}

const props = defineProps<Props>()
</script>
