<template>
  <div>
    <div class="mt-4 mb-8 pt-2 pb-3 px-4 sm:rounded-lg bg-gray-200 dark:bg-gray-800 text-sm max-w-md">
      <Heading level="2" style-level="5" class="text-left mt-1 pl-1"> Table of contents </Heading>
      <div class="text-balance">
        <ul v-if="tableOfContents" class="inline leading-6 mt-1 list-disc text-black dark:text-white">
          <li v-for="(item, index) in tableOfContents" class="inline">
            <span class="text-nowrap">
              <a :href="item.href" :class="[ANCHOR_COLOR_TAILWIND_STYLE, 'inline-block px-1']">
                <component :is="item.labelComponent" />
              </a>
              <template v-if="index === tableOfContents.length - 1">
                {{ FULLSTOP }}
              </template>
              <template v-else>
                {{ COMMA }}
              </template>
            </span>
            {{ SPACE }}
          </li>
        </ul>
      </div>
    </div>

    <table
      class="table-fixed w-full divide-y divide-gray-700 dark:divide-neutral-600 shadow border-1 border-separate border-gray-400 dark:border-gray-500 ml-2 mr-2">
      <thead>
        <tr>
          <TableCellHeader background="solid" class="w-[8em] text-nowrap"> RFC Number </TableCellHeader>
          <TableCellHeader background="solid"> Title </TableCellHeader>
          <TableCellHeader background="solid" class="w-[10em] text-nowrap"> Publish date </TableCellHeader>
        </tr>
      </thead>
      <tbody>
        <tr v-for="rfc in data?.miniIndex" :key="rfc.number">
          <TableCell class="border-b border-gray-300 dark:border-neutral-600 text-nowrap">
            <Anchor
              :href="infoSeriesPathBuilder(`rfc${rfc.number}`)"
              :class="[ANCHOR_COLOR_TAILWIND_STYLE, 'scroll-m-16']"
              :id="`rfc${rfc.number}`">
              <SubseriesTitle :series="parseSeriesId(`rfc${rfc.number}`)" />
            </Anchor>
          </TableCell>
          <TableCell class="border-b border-gray-400 dark:border-neutral-600">
            {{ rfc.title }}
          </TableCell>
          <TableCell class="border-b border-gray-300 dark:border-neutral-600 text-nowrap">
            <span v-if="rfc.published">{{ formatDate(rfc.published) }}</span>
            <i v-else>(unknown)</i>
          </TableCell>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { groupBy, uniqBy } from 'es-toolkit'
import { DateTime } from 'luxon'
import { useRfcEditorHead } from '~/utilities/head'
import { parseSeriesId } from '~/utilities/rfc'
import { formatDatePublished } from '~/utilities/rfc-converters-utils'
import { formatTitleAsVNode } from '~/utilities/rfc-title'
import { RfcMiniIndexSchema } from '~/utilities/rfc-validators'
import { COMMA, FULLSTOP, SPACE } from '~/utilities/strings'
import { ANCHOR_COLOR_TAILWIND_STYLE } from '~/utilities/theme'
import { API_RFC_MINI_INDEX_PATH, infoSeriesPathBuilder, useApiV1UrlOrigin } from '~/utilities/url'

type Props = {
  canonicalPath: string
}

const props = defineProps<Props>()

const TABLE_OF_CONTENTS_CHUNK_SIZE = 1000

const apiV1UrlOrigin = useApiV1UrlOrigin()

const { data, error } = useAsyncData(
  'rfc-index-html',
  async () => {
    const json = await $fetch(API_RFC_MINI_INDEX_PATH, {
      method: 'GET',
      baseURL: import.meta.server ? apiV1UrlOrigin : undefined
    })
    const { data: validatedRfcMiniIndex, error: validationError } = RfcMiniIndexSchema.safeParse(json)
    if (validationError) {
      const errorTitle = 'Unable to parse rfc-mini-index'
      console.error(errorTitle, API_RFC_MINI_INDEX_PATH, { json, validationError })
      throw Error(`${errorTitle}. See console for more. ${JSON.stringify(validationError)} `)
    }
    return validatedRfcMiniIndex
  },
  {
    server: true, // this must be rendered on the server -- it's used by non-JavaScript enabled browsers
    lazy: false
  }
)

if (error.value) {
  console.error(error.value)
  throw createError({
    status: 500,
    statusText: `The RFC index is temporarily unavailable. Please try again later. ${error.value}`,
    fatal: true
  })
}

const formatDate = (published: string) => formatDatePublished(DateTime.fromISO(published), false)

const tableOfContents = computed(() => {
  if (error.value || !data.value) {
    return undefined
  }
  const { value: mini } = data
  const allRfcNumbers = mini.miniIndex.map((rfc) => rfc.number)
  const largestRfcNumber = Math.max(...allRfcNumbers)
  const groups = groupBy(mini.miniIndex, (item) => Math.floor(item.number / TABLE_OF_CONTENTS_CHUNK_SIZE))
  const groupsEntries = Object.entries(groups)
  const menuItems = [
    ...groupsEntries.map(([chunkIndexString, chunkRfcs]) => {
      if (parseInt(chunkIndexString, 10) === 0) {
        // No need to link to RFC 1, it's at the top of the table
        // so skip this one
        return undefined
      }

      if (chunkRfcs.length === 0 || chunkRfcs[0] === undefined) {
        return undefined
      }
      const firstChunkRfc = chunkRfcs[0]
      const lowestChunkRfcsNumber = chunkRfcs.reduce((acc, item) => Math.min(acc, item.number), firstChunkRfc.number)
      return {
        href: `#rfc${lowestChunkRfcsNumber}`,
        labelComponent: formatTitleAsVNode(`rfc${lowestChunkRfcsNumber}`)
      }
    }),
    {
      href: `#rfc${largestRfcNumber}`,
      labelComponent: formatTitleAsVNode(`rfc${largestRfcNumber}`)
    }
  ].filter((item) => typeof item !== 'undefined')

  return uniqBy(
    // make sure we don't link to the same thing twice
    // ie when lowestChunkRfcsNumber and largestRfcNumber are the same or something like that
    menuItems,
    (item) => item.href
  )
})

const modifiedDateTime = data.value ? DateTime.fromISO(data.value.createdOn) : undefined

useRfcEditorHead({
  title: 'RFC Index',
  canonicalPath: props.canonicalPath,
  description: 'Every RFC listed on a single page.',
  modifiedDateTime,
  contentType: 'article'
})
</script>
