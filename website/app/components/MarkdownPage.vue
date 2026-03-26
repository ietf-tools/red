<template>
    <div class="min-h-[100vh]">
        <BodyLayoutDocument :class="{ 'lg:pr-[300px]': !showToc }">
            <template #sidebar>
                <TableOfContentsMarkdownDesktop
                    v-if="showToc && toc"
                    :toc="toc"
                />
            </template>
            <div class="wrap-anywhere leading-[1.75]">
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
import { z } from 'zod'
import { provide } from 'vue'
import { DateTime } from 'luxon'
import _contentMetadata from '../../generated/content-metadata.json'
import type { BreadcrumbItem } from '~/components/BreadcrumbsTypes'
import {
    nuxtContentTocToRfcEditorToc,
    tocKey
} from '~/utilities/tableOfContents'
import { usePublicSiteUrlOrigin } from '~/utilities/url'
import { useRfcEditorHead } from '~/utilities/head'

const route = useRoute()

const slug = route.path

const normalizedSlug = slug.replace(/^\//, '').replace(/\/$/, '')

const markdownPath = `/${normalizedSlug}`

// Changing this schema? Be sure to copy changes to generate-content-metadata.ts
const ContentMetadataSchema = z.record(
    /**
     * path within content directory
     */
    z.string(),
    z
        .object({
            /**
             * timestamp ISO 8601
             */
            mtime: z.string()
        })
        .optional()
)

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
const canonicalUrl = `${usePublicSiteUrlOrigin()}${canonicalPath}`

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

const showTocFrontmatter = page.value?.showToc ?? 'auto'

const toc =
    page.value?.body.toc && nuxtContentTocToRfcEditorToc(page.value.body.toc)

const showToc = showTocFrontmatter === 'auto' ?
    toc ? toc.sections.length > 1 : false
    : showTocFrontmatter

/**
 * We want the mobile TOC to appear inline below the <h1> which is rendered in markdown by
 * ContentRenderer, so we'll `provide()` the details for `ProseH1.vue` to render it.
 */
provide(tocKey, { showToc, toc })

const contentMetadata = ContentMetadataSchema.parse(_contentMetadata)
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