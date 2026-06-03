<template>
  <div class="min-h-[100vh] mb-16">
    <BodyLayoutDocument :class="{ 'lg:pr-[300px]': !showToc }">
      <template #sidebar>
        <TableOfContentsMarkdownDesktop v-if="showToc && toc" :toc="toc" />
      </template>
      <div class="wrap-anywhere leading-[1.75]">
        <Breadcrumbs v-if="breadcrumbItems && Array.isArray(breadcrumbItems)" :breadcrumb-items="breadcrumbItems" />
        <component :is="renderedContent" />
      </div>
      <ContentDocModifiedDateTime v-if="modifiedDateTime" :modified-date-time="modifiedDateTime" />
    </BodyLayoutDocument>
  </div>
</template>

<script setup lang="ts">
import { DateTime } from 'luxon'
import { provide, computed } from 'vue'
import _contentMetadata from '../../generated/content-metadata.json'
import type { BreadcrumbItem } from '~/components/BreadcrumbsTypes'
import { tocKey, closeModalAndScrollToId } from '~/utilities/tableOfContents'
import { useRfcEditorHead } from '~/utilities/head'
import { MarkdownPageSchema } from '~/utilities/rfc-validators'
import { apiMarkdownPagePathBuilder, useApiV1UrlOrigin } from '~/utilities/url'
import { renderDocumentPojo, type ElementRenderers } from '~/utilities/renderDocumentPojo'
import ProseA from '~/components/content/ProseA.vue'
import ProseH1 from '~/components/content/ProseH1.vue'
import ProseH2 from '~/components/content/ProseH2.vue'
import ProseH3 from '~/components/content/ProseH3.vue'
import ProseH4 from '~/components/content/ProseH4.vue'
import ProseH5 from '~/components/content/ProseH5.vue'
import ProseH6 from '~/components/content/ProseH6.vue'
import ProseImg from '~/components/content/ProseImg.vue'
import ProseLi from '~/components/content/ProseLi.vue'
import ProseOl from '~/components/content/ProseOl.vue'
import ProsePre from '~/components/content/ProsePre.vue'
import ProseP from '~/components/content/ProseP.vue'
import ProseTable from '~/components/content/ProseTable.vue'
import ProseTd from '~/components/content/ProseTd.vue'
import ProseTh from '~/components/content/ProseTh.vue'
import ProseTr from '~/components/content/ProseTr.vue'
import ProseUl from '~/components/content/ProseUl.vue'
import ErrataSiteSearchLink from '~/components/content/ErrataSiteSearchLink.vue'

const route = useRoute()
const apiV1UrlOrigin = useApiV1UrlOrigin()

const normalizedSlug = route.path.replace(/^\//, '').replace(/\/$/, '')

const canonicalPath = `/${normalizedSlug}/`
if (route.path !== canonicalPath) {
  await navigateTo({ path: canonicalPath })
}

const { data: markdownPage, error } = await useAsyncData(
  `markdown-page-${normalizedSlug}`,
  async () => {
    const apiPath = apiMarkdownPagePathBuilder(normalizedSlug)
    const json = await $fetch(apiPath, {
      method: 'GET',
      baseURL: import.meta.server ? apiV1UrlOrigin : undefined,
    })
    const { data, error: validationError } = MarkdownPageSchema.safeParse(json)
    if (validationError) {
      console.error('Failed to validate markdown page', apiPath, validationError)
      throw createError({ statusCode: 500 })
    }
    return data
  },
  {
    server: true // needs to be server so that we can generate proper 404s for wrong urls
  }
)

if (error.value || !markdownPage.value) {
  console.error("[markdown-page] Error", error.value, markdownPage.value)
  throw createError({ statusCode: 404, statusMessage: 'Not Found', fatal: true })
}

const markdownHtmlPojoRenderers: ElementRenderers = {
  a: (node, childrenForVue) => h(ProseA, node.attributes, () => childrenForVue),
  h1: (node, childrenForVue) => h(ProseH1, node.attributes, () => childrenForVue),
  h2: (node, childrenForVue) => h(ProseH2, node.attributes, () => childrenForVue),
  h3: (node, childrenForVue) => h(ProseH3, node.attributes, () => childrenForVue),
  h4: (node, childrenForVue) => h(ProseH4, node.attributes, () => childrenForVue),
  h5: (node, childrenForVue) => h(ProseH5, node.attributes, () => childrenForVue),
  h6: (node, childrenForVue) => h(ProseH6, node.attributes, () => childrenForVue),
  img: (node) => h(ProseImg, node.attributes),
  li: (node, childrenForVue) => h(ProseLi, node.attributes, () => childrenForVue),
  ol: (node, childrenForVue) => h(ProseOl, node.attributes, () => childrenForVue),
  pre: (node, childrenForVue) => h(ProsePre, node.attributes, () => childrenForVue),
  p: (node, childrenForVue) => h(ProseP, node.attributes, () => childrenForVue),
  table: (node, childrenForVue) => h(ProseTable, node.attributes, () => childrenForVue),
  td: (node, childrenForVue) => h(ProseTd, node.attributes, () => childrenForVue),
  th: (node, childrenForVue) => h(ProseTh, node.attributes, () => childrenForVue),
  tr: (node, childrenForVue) => h(ProseTr, node.attributes, () => childrenForVue),
  ul: (node, childrenForVue) => h(ProseUl, node.attributes, () => childrenForVue),
  erratasitesearchlink: (node, childrenForVue) => h(ErrataSiteSearchLink, node.attributes, () => childrenForVue),
  __default: (node, childrenForVue) => h(node.nodeName, node.attributes, childrenForVue),
}

const renderedContent = computed(() => {
  const { value } = markdownPage
  if (!value) {
    return '404 - Page Not Found'
  }
  return renderDocumentPojo(value.htmlObj, markdownHtmlPojoRenderers)
})

const toc = markdownPage.value.toc

const showToc = markdownPage.value.showToc ?? // auto mode, try to detect if it has enough headings to be worth it
    ((toc && toc.sections.length > 1 ) ?? false)

provide(tocKey, { showToc, toc })

let modifiedDateTime: DateTime | undefined = undefined
if (markdownPage.value.timestampIso) {
  modifiedDateTime = DateTime.fromISO(markdownPage.value.timestampIso)
}

const breadcrumbItems = computed((): BreadcrumbItem[] => [
  { url: '/', label: 'Home' },
  { url: undefined, label: markdownPage.value?.title ?? '' }
])

const handleCloseAndNavigate = (_id: string) => { }
provide(closeModalAndScrollToId, handleCloseAndNavigate)

useRfcEditorHead({
  title: markdownPage.value.title ?? '',
  canonicalPath,
  description: markdownPage.value.description ?? '',
  modifiedDateTime,
  contentType: 'article'
})
</script>
