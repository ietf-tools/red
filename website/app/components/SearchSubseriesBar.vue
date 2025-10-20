<template>
  <div
    class="bg-emerald-800 text-white font-semibold rounded shadow-sm mt-4 px-4 py-2 flex items-center"
  >
    <Icon
      name="material-symbols:list-alt"
      size="1.5em"
      class="text-emerald-100"
    />
    <a :href="props.href" class="ml-2 no-underline hover:underline">{{
      props.label
    }}</a>
    <div class="grow"></div>
    <span
      class="bg-emerald-900 rounded-sm text-xs font-normal px-2 uppercase py-1 text-emerald-100"
    >
      Subseries
    </span>
  </div>
</template>

<script setup lang="ts">
import type { VueStyleClass } from '~/utilities/vue'

type Props = {
  label: string
  href: string
  class?: VueStyleClass
}

const props = defineProps<Props>()
</script>
