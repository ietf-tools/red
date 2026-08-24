<template>
  <RFCDocumentSets
    :rfc-number="props.rfcNumber"
    :reef-stats="reefStats"
    :user="authStore.user"
    :sets="userSets"
    :create-set="createSet"
    v-model="setIdsWithThisRFC" />
</template>

<script setup lang="ts">
import { useUserSets } from '~/utilities/reef-sets'
import type { ReefRFCStats } from '~/utilities/rfc-validators'

type Props = {
  rfcNumber: number
  reefStats?: ReefRFCStats
}

const props = defineProps<Props>()

const authStore = useAuthStore()

const { sets: userSets, setIdsWithThisRFC, createSet } = useUserSets(() => props.rfcNumber)
</script>
