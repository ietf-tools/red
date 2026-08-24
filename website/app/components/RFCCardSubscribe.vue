<template>
  <RFCDocumentSubscribe
    :rfc-number="props.rfcNumber"
    :reef-stats="reefStats"
    :user="authStore.user"
    v-model="isSubscribedToThisRFC" />
</template>

<script setup lang="ts">
import { useUserRFCSubscription } from '~/utilities/reef-subscriptions'
import type { ReefRFCStats } from '~/utilities/rfc-validators'

type Props = {
  rfcNumber: number
  reefStats?: ReefRFCStats
}

const props = defineProps<Props>()

const isSubscribedToThisRFC = useUserRFCSubscription(() => props.rfcNumber)

const authStore = useAuthStore()
</script>
