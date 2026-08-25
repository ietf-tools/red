<template>
  <RFCDocumentSubscribe
    :rfc-number="props.rfcNumber"
    :reef-stats="stats"
    :user="authStore.user"
    :icon-only="props.iconOnly"
    v-model="isSubscribedToThisRFC" />
</template>

<script setup lang="ts">
import { useUserRFCSubscription } from '~/utilities/reef-subscriptions'
import { useReefDocument } from '~/utilities/reef-documents'

type Props = {
  rfcNumber: number
  iconOnly?: boolean
}

const props = defineProps<Props>()

// Read, not loaded: whatever page this card is on declares the whole list of documents it
// shows, so by the time this renders the answer is either in the store or on its way.
const { stats } = useReefDocument(() => props.rfcNumber)

const isSubscribedToThisRFC = useUserRFCSubscription(() => props.rfcNumber)

const authStore = useAuthStore()
</script>
