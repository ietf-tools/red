<template>
  <div class="min-h-screen">
    <NuxtLayout :name="seriesId.type === 'rfc' ? 'white' : 'default'">
      <template #subheader>
        <template v-if="isSubseries">
          <SectionHeader>
            <Heading level="1" class="ml-6 pb-6">
              <component :is="formattedTitle" />
            </Heading>
          </SectionHeader>
        </template>
      </template>
      <template v-if="seriesId.type === 'rfc'">
        <RFCDocument :rfc-id="seriesId" />
      </template>
      <template v-else-if="isSubseries">
        <SubseriesDocument :subseries-id="seriesId" />
      </template>
      <template v-else>
        <div class="container mx-auto">
          <Alert level="1" variant="warning" heading="Error">
            No page found (404)
          </Alert>
        </div>
      </template>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { parseSeriesId } from '~/utilities/rfc'
import type { SeriesId } from '~/utilities/rfc'
import { formatTitleAsVNode } from '~/utilities/rfc-title'

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

const isSubseries = computed(() => seriesId && (seriesId.type === 'bcp' || seriesId.type === 'fyi' || seriesId.type === 'std'))

const formattedTitle = computed(() => seriesId ? formatTitleAsVNode(`${seriesId.type}${seriesId.number}`) : '')

const supportedTypes: SeriesId["type"][] = ['rfc', 'bcp', 'fyi', 'std']

if (!seriesId || !supportedTypes.includes(seriesId.type)) {
  console.error(`Unsupported route param of ${paramsId}`)
  throw createError({
    statusCode: 404,
    statusMessage: `No ${JSON.stringify(paramsId)} page found.`,
    fatal: true
  })
}

definePageMeta({
  layout: false
})
</script>
