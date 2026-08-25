<template>
  <RFCDocumentSets
    :rfc-number="props.rfcNumber"
    :reef-stats="stats"
    :user="authStore.user"
    :sets="userSets"
    :icon-only="props.iconOnly"
    :create-set="createSet"
    v-model="setIdsWithThisRFC" />
</template>

<script setup lang="ts">
import { useUserSets } from '~/utilities/reef-sets'
import { useReefDocument } from '~/utilities/reef-documents'

type Props = {
  rfcNumber: number
  iconOnly?: boolean
}

const props = defineProps<Props>()

// Read, not loaded: whatever page this card is on declares the whole list of documents it
// shows, so by the time this renders the answer is either in the store or on its way.
const { stats } = useReefDocument(() => props.rfcNumber)

const authStore = useAuthStore()

const { sets: userSets, setIdsWithThisRFC, createSet } = useUserSets(() => props.rfcNumber)
</script>
