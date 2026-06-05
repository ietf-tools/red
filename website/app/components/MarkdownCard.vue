<template>
  <Card :href="props.id" heading-level="3" has-cover-link>
    <template #headingTitle>{{ page?.title }} {{ error }}</template>
    <CardContent>
      <p v-if="description" class="text-base mt-2 text-blue-900 dark:text-white">
        {{ description }}
      </p>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { MarkdownPageSchema } from '~/utilities/rfc-validators'
import { apiMarkdownPagePathBuilder, useApiV1UrlOrigin } from '~/utilities/url'
import type { markdownPathBuilder } from '~/utilities/url'

type ValidMarkdownPaths = Parameters<typeof markdownPathBuilder>[0]

type Props = {
  id: ValidMarkdownPaths
}
const props = defineProps<Props>()

const apiV1UrlOrigin = useApiV1UrlOrigin()

const normalizedSlug = props.id.replace(/^\//, '').replace(/\/$/, '')

const { error, data: page } = await useAsyncData(
  `markdown-card-${normalizedSlug}`,
  async () => {
    const apiPath = apiMarkdownPagePathBuilder(normalizedSlug)
    const json = await $fetch(apiPath, {
      method: 'GET',
      baseURL: import.meta.server ? apiV1UrlOrigin : undefined
    })
    const { data } = MarkdownPageSchema.safeParse(json)
    return data ?? null
  },
  {
    server: true
  }
)

const description = computed(() => page.value?.description)
</script>
