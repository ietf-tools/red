<template>
    <div class="min-h-[100vh]">
        <BodyLayoutDocument :class="{ 'lg:pr-[300px]': !showToc }">
            <template #sidebar>
                <TableOfContentsMarkdownDesktop
                    v-if="showToc && toc"
                    :toc="toc"
                />
            </template>
            <div class="wrap-anywhere">
                <Breadcrumbs :breadcrumb-items="breadcrumbItems" />
                <ContentRenderer
                    v-if="page"
                    :value="page"
                />
            </div>
            <ContentDocModifiedDateTime
                v-if="modifiedDateTime"
                :modified-date-time="modifiedDateTime"
            />
        </BodyLayoutDocument>
    </div>
</template>

<script setup lang="ts">
import { provide } from 'vue'
import { DateTime } from 'luxon'
import _contentMetadata from '../../generated/content-metadata.json'
import type { ContentMetadata } from '../../modules/generate-content-metadata'
import type { BreadcrumbItem } from '~/components/BreadcrumbsTypes'
import {
    nuxtContentTocToRfcEditorToc,
    tocKey
} from '~/utilities/tableOfContents'
import { PUBLIC_SITE } from '~/utilities/url'
import { useRfcEditorHead } from '~/utilities/head'

const route = useRoute()

const slug = route.path

const normalizedSlug = slug.replace(/^\//, '').replace(/\/$/, '')

const markdownPath = `/${normalizedSlug}`

const { error, data: page } = await useAsyncData(markdownPath, () =>
    queryCollection('content').path(markdownPath).first()
)

if (error.value || page.value === null) {
    throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        fatal: true
    })
}

const canonicalPath = `/${normalizedSlug}/`
const canonicalUrl = `${PUBLIC_SITE}${canonicalPath}`

if (route.fullPath !== canonicalPath) {
    await navigateTo({
        path: canonicalPath
    })
}

const breadcrumbItems = computed((): BreadcrumbItem[] => {
    return [
        { url: '/', label: 'Home' },
        { url: undefined, label: page.value?.title ?? '' }
    ]
})

const showToc = Boolean(page.value?.showToc)

const toc =
    page.value?.body.toc && nuxtContentTocToRfcEditorToc(page.value.body.toc)

/**
 * We want the mobile TOC to appear inline below the <h1> which is rendered in markdown by
 * ContentRenderer, so we'll `provide()` the details for `ProseH1.vue` to render it.
 */
provide(tocKey, { showToc, toc })

const contentMetadata: ContentMetadata = _contentMetadata
const thisRouteContentMetadata = contentMetadata[route.path]

let modifiedDateTime: DateTime | undefined = undefined

if (thisRouteContentMetadata) {
    modifiedDateTime = DateTime.fromISO(thisRouteContentMetadata.mtime)
}

useRfcEditorHead({
    title: page.value?.title ?? '',
    canonicalUrl,
    description: page.value?.description ?? '',
    modifiedDateTime,
    contentType: 'article'
})
</script>