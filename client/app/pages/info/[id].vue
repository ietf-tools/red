<template>
  <div class="min-h-[100vh]">
    <NuxtLayout name="white">
      <template #subheader>
        <template v-if="seriesId.type === 'bcp' || seriesId.type === 'fyi' || seriesId.type === 'std'">
          <SectionHeader>
            <Heading level="1" class="ml-6 pb-6">{{ seriesId.type.toUpperCase() }}{{ seriesId.number }}</Heading>
          </SectionHeader>
        </template>
      </template>
      <template v-if="seriesId.type === 'rfc'">
        <RFCDocument :rfc-id="seriesId" />
      </template>
      <template v-if="seriesId.type === 'bcp' || seriesId.type === 'fyi' || seriesId.type === 'std'">
        <SubseriesDocument :subseries-id="seriesId" />
      </template>
      <template v-else>
        <div class="container mx-auto">
          <Alert level="1" variant="warning" heading="Error">
            Unsupported {{ paramsId }}
          </Alert>
        </div>
      </template>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { parseSeriesId, type SeriesId } from '~/utilities/rfc'

const route = useRoute()
const paramsId = route.params.id

if (paramsId === undefined) {
  throw createError({
    statusCode: 500,
    statusMessage: 'Not a valid route param "id"',
    fatal: true
  })
}

const seriesId = parseSeriesId(paramsId.toString())

const supportedTypes: SeriesId["type"][] = ['rfc', 'bcp', 'fyi', 'std']

if (!seriesId || !supportedTypes.includes(seriesId.type)) {
  console.error(`Unsupported route param of ${paramsId}`)
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
