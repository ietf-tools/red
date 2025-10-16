<template>
  <GraphicsIETFMotif
    class="absolute text-black w-[110px] h-[100px] right-0 top-0 print:hidden"
    :opacity="0.04"
  />
  <p class="text-base text-blue-900 dark:text-white font-bold leading-5">
    {{ props.rfcJson.title }}
  </p>
  <div class="pt-1">
    <Tag
      size="small"
      :text="tagText"
    />
  </div>
  <p class="leading-5 pt-2 text-xs text-pretty">
    {{ props.rfcJson.abstract }}
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
  <p
    v-if="obsoletedBy"
    :class="[
      'text-red-700 dark:text-red-300 text-base print:text-black',
      { 'mt-2': isMobileAbstractOpen }
    ]"
  >
    <component :is="obsoletedBy" />
  </p>

  <div class="inline-block border-black dark:border-gray-700 border-t-1 w-1/2 min-w-3xs mt-3 mb-3"></div>

  <p class="text-xs mt-2 text-black dark:text-gray-300">
    That was a preview of
    <component :is="formattedTitle" />. To read the
    complete document click the following link:
  </p>

  <p class="clear-both text-right mt-6 mb-10">
    <A
      :href="rfcPathBuilder(props.rfcJson.doc_id)"
      class="flex-inline rounded no-underline hover:underline focus:underline justify-center items-center bg-gray-100 dark:bg-gray-700 text-blue-400 dark:text-white px-4 pt-3 pb-4 mr-6"
    >
      <component :is="formattedTitle" />
      <GraphicsChevron class="ml-2 inline -rotate-90" />
    </A>
  </p>
</template>

<script setup lang="ts">
// TODO: Track preview analytics as it might siphon off visitors to RFCs
import { DateTime } from 'luxon'
import { infoSeriesPathBuilder, rfcPathBuilder } from '../utilities/url'
import Anchor from './A.vue'
import { formatTitleAsVNode } from '~/utilities/rfc'
import type { RFCJSON } from '~/utilities/rfc-validators'
import {
  formatTitlePlaintext,
  parseRfcJsonPubDateToISO
} from '~/utilities/rfc-converters-utils'
import { analyticsMatomoTrackLinkPreview } from '~/utilities/analytics-matomo'

type Props = {
  rfcJson: RFCJSON
}

const props = defineProps<Props>()

onMounted(() => {
  analyticsMatomoTrackLinkPreview(props.rfcJson.doc_id)
})

const isMobileAbstractOpen = ref<boolean>(false)

function formatAuthors(authors: RFCJSON['authors']): string {
  if (authors.length === 0) {
    return ''
  }
  if (authors.length === 1) {
    return `${authors[0]}`
  }

  return authors.join(', ')
}

function formatStreamAndArea(rfc: RFCJSON): string[] {
  return [rfc.source].filter(Boolean) as string[]
}

function formatDate(isoDate: string | undefined): string | undefined {
  if (isoDate === undefined) return undefined
  const datetime = DateTime.fromISO(isoDate)
  return datetime.toLocaleString({ month: 'long', year: 'numeric' })
}

function formatObsoletedBy(
  rfcJson: RFCJSON
): (() => VNode) | undefined {
  const { obsoleted_by: obsoletedBy } = rfcJson

  if (!obsoletedBy || obsoletedBy.length === 0) {
    return undefined
  }

  return () => h(
    'span',
    obsoletedBy.reduce(
      (acc, obsoletedByItem, index) => {
        if (index > 0) {
          acc.push(', ')
        }
        acc.push(
          h(
            Anchor,
            {
              href: infoSeriesPathBuilder(obsoletedByItem),
              title: `${formatTitlePlaintext(obsoletedByItem)}`,
              class: 'relative underline p-1 -m-1 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-red-200'
            },
            [h('b', obsoletedByItem)]
          )
        )

        return acc
      },
      [`${rfcJson.doc_id} obsoleted by `] as (string | VNode)[]
    )
  )
}

const formattedTitle = computed(() => formatTitleAsVNode(props.rfcJson.doc_id))

const obsoletedBy = computed(() =>
  formatObsoletedBy(props.rfcJson)
)

const list1 = computed(() => [
  formatAuthors(props.rfcJson.authors),
  formatDate(parseRfcJsonPubDateToISO(props.rfcJson.pub_date))
])

const list2 = computed(() => formatStreamAndArea(props.rfcJson))

const tagText = computed(() => {
  const pubDateIso = parseRfcJsonPubDateToISO(props.rfcJson.pub_date)
  if (!pubDateIso) return []

  const tagText: (string | VNode)[] = [props.rfcJson.status]
  const datetime = DateTime.fromISO(pubDateIso)
  const relativeCalendar = datetime.toRelativeCalendar()
  const tooltip = `${props.rfcJson.pub_date} (${relativeCalendar})`
  if (relativeCalendar) {
    tagText.push(
      h(
        'span',
        {
          class: 'w-full h-full',
          'aria-label': tooltip,
          title: tooltip
        },
        [relativeCalendar]
      )
    )
  }
  return tagText
})
</script>
