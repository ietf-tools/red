<template>
    <component :is="formattedTitle" /><template v-if="!props.hideTitle">: {{ props.rfc.title }}</template>
</template>

<script setup lang="ts">
import { formatTitleAsVNode } from '~/utilities/rfc-title'

type Props = {
    rfc: {
        number: number
        title: string
    }
    hideTitle?: boolean
}

const props = defineProps<Props>()

const formattedTitle = computed(() => formatTitleAsVNode(`rfc${props.rfc.number}`, true))
</script>