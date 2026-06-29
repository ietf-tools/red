<template>
  <img :src="ietfLogo" :width="props.width" :height="props.height" :class="props.class" alt="IETF" />
</template>

<script setup lang="ts">
import ietfLogo from 'assets/ietf-nor-dense-inverted-duotone.svg'
import type { VueStyleClass } from '~/utilities/vue'

type Props = {
  width: string
  height: string
  class?: VueStyleClass
}

const props = defineProps<Props>()
</script>
