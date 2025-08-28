<template>
  <div class="min-h-[100vh]">
    <NuxtLayout name="white">
      <template v-if="rfcId.type === 'RFC'">
        <RFCDocument :rfc-id="rfcId" />
      </template>
      <template v-else>
        <div class="container mx-auto">
          <Alert
            level="1"
            variant="warning"
            heading="Error"
          >
            Unsupported {{ paramsId }}
          </Alert>
        </div>
      </template>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { parseRFCId } from '~/utilities/rfc'

const route = useRoute()
const paramsId = route.params.id

if (paramsId === undefined) {
  throw createError({
    statusCode: 500,
    statusMessage: 'Not a valid route param "id"',
    fatal: true
  })
}

const rfcId = parseRFCId(paramsId.toString())

if (rfcId.type !== 'RFC') {
  console.error(`Unsupported info param of ${paramsId}`)
  throw createError({
    statusCode: 404,
    statusMessage: `No ${paramsId} content found.`,
    fatal: true
  })
}

definePageMeta({
  layout: false
})
</script>
