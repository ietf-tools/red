<template>
  <RFCDocumentSubscribe
    :rfc-number="props.rfcNumber"
    :reef-stats="reefStats"
    :user="authStore.user"
    :status="status"
    :icon-only="props.iconOnly"
    v-model="isSubscribedToThisRFC" />
</template>

<script setup lang="ts">
import { useUserRFCSubscription } from '~/utilities/reef-subscriptions'
import type { ReefRFCStats } from '~/utilities/rfc-validators'

type Props = {
  rfcNumber: number
  reefStats?: ReefRFCStats
  iconOnly?: boolean
}

const props = defineProps<Props>()

const { isSubscribed: isSubscribedToThisRFC, status } = useUserRFCSubscription(() => props.rfcNumber)

const authStore = useAuthStore()
</script>
