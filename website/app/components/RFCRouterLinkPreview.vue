<template>
  <GraphicsIETFMotif
    class="absolute text-black w-[110px] h-[100px] right-0 top-0 print:hidden"
    :opacity="0.04"
  />
  <p class="text-base text-blue-900 dark:text-white font-bold leading-5">
    {{ props.rfc.title }}
  </p>
  <ul
    v-if="list1"
    class="text-base text-blue-900 dark:text-white"
  >
    <li
      v-for="(part, index) in list1"
      :key="index"
      class="inline"
    >
      <GraphicsDiamond v-if="index > 0" />{{ part }}
    </li>
  </ul>
  <p
    class="leading-5 pt-2 text-xs text-pretty"
    v-html="props.rfc.abstract"
  ></p>

  <ul
    v-if="list2"
    class="text-base text-gray-800 mt-1 dark:text-white"
  >
    <li
      v-for="(part, index) in list2"
      :key="index"
      class="inline"
    >
      <GraphicsDiamond
        v-if="index > 0"
        class="align-middle"
      />{{ part }}
    </li>
  </ul>

  <div class="inline-block border-black dark:border-gray-700 border-t-1 w-1/2 min-w-3xs mt-3 mb-3"></div>

  <p class="text-xs mt-2 text-black dark:text-gray-300">
    That was a preview of
    <component :is="formattedTitle" />. To read the
    complete document click the following link:
  </p>

  <p class="clear-both text-right mt-6 mb-10">
    <Anchor
      :href="rfcPathBuilder(`RFC${props.rfc.number}`)"
      class="flex-inline rounded no-underline hover:underline focus:underline justify-center items-center bg-gray-100 dark:bg-gray-700 text-blue-400 dark:text-white px-4 pt-3 pb-4 mr-6"
    >
      <component :is="formattedTitle" />
      <GraphicsChevron class="ml-2 inline -rotate-90" />
    </Anchor>
  </p>
</template>

<script setup lang="ts">
import { DateTime } from 'luxon'
import { rfcPathBuilder } from '../utilities/url'
import Anchor from './Anchor.vue'
import { formatTitleAsVNode } from '~/utilities/rfc-title'
import type { RfcCommon } from '~/utilities/rfc-validators'
import { analyticsMatomoTrackLinkPreview } from '~/utilities/analytics-matomo'

type Props = {
  rfc: RfcCommon
}

const props = defineProps<Props>()

onMounted(() => {
  analyticsMatomoTrackLinkPreview(`rfc${props.rfc.number}`)
})

function formatAuthors(authors: RfcCommon['authors']): string {
  if (authors.length === 0) {
    return ''
  }
  return authors.map(author =>
    // titlepage_author might be an empty string, so don't use `??` to fallback, instead use `||`
    author.titlepage_name || '(unnamed)').join(', ')
}

function formatStreamAndArea(rfc: RfcCommon): string[] {
  return [rfc.stream.name, rfc.area?.name].filter(Boolean) as string[]
}

function formatDate(isoDate: string | undefined): string | undefined {
  if (isoDate === undefined) return undefined
  const datetime = DateTime.fromISO(isoDate)
  return datetime.toLocaleString({ month: 'long', year: 'numeric' })
}

const formattedTitle = computed(() => formatTitleAsVNode(`RFC${props.rfc.number}`))

const list1 = computed(() => [
  formatAuthors(props.rfc.authors),
  formatDate(props.rfc.published)
])

const list2 = computed(() => formatStreamAndArea(props.rfc))
</script>
