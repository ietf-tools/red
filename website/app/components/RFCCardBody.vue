<template>
  <div class="md:pr-5 flex-1">
    <Pill
      v-if="tagText.length > 0"
      size="small"
      :text="tagText"
      class="print:m-0 my-2"
    />
    <ul
      v-if="props.rfc.authors"
      class="hidden lg:block print:block text-base text-gray-800 dark:text-white"
    >
      <li
        v-for="(author, index) in props.rfc.authors"
        :key="index"
        class="inline"
      >
        <GraphicsDiamond v-if="index > 0" />
        <RFCDocumentAuthor :author="author" />
      </li>
    </ul>
    <ul
      v-if="list2"
      class="hidden lg:block print:block text-base text-gray-800 mt-1 dark:text-white"
    >
      <li
        v-if="isAprilFool"
        class="inline pr-2"
      >
        <AprilFools />
      </li>
      <li
        v-for="(part, index) in list2"
        :key="index"
        class="inline text-slate-600 dark:text-slate-300 text-[0.9rem]"
      >
        <GraphicsDiamond
          v-if="index > 0"
          class="align-middle"
        />{{ part }}
      </li>
    </ul>
    <template v-if="props.showAbstract && props.rfc.abstract">
      <div class="block lg:hidden">
        <!-- mobile abstract -->
        <button
          type="button"
          :aria-expanded="isMobileAbstractOpen"
          :aria-controls="abstractDomId"
          class="relative z-50 text-blue-800 cursor-pointer dark:text-blue-100 underline text-base p-3 -left-3 -top-3 -mb-3 print:hidden"
          @click="isMobileAbstractOpen = !isMobileAbstractOpen"
        >
          <template v-if="isMobileAbstractOpen">Hide abstract</template>
          <template v-else>Show abstract</template>
        </button>
        <div
          :id="abstractDomId"
          :class="[
            'mt-3',
            {
              'block ': isMobileAbstractOpen,
              'hidden print:block': !isMobileAbstractOpen
            }
          ]"
        >
          <Heading
            level="4"
            style-level="5"
            class="text-blue-900 dark:text-gray-300 pt-3 border-t inline-block"
          >
            Abstract
          </Heading>
          <div
            class="leading-snug text-gray-800 dark:text-gray-300 text-pretty"
            v-html="props.rfc.abstract"
          >
          </div>
        </div>
      </div>
    </template>
    <p
      v-if="obsoletedBy"
      :class="[
        'text-red-700 dark:text-red-300 text-base print:text-black',
        { 'mt-2': isMobileAbstractOpen }
      ]"
    >
      <Renderable :val="obsoletedBy" />
    </p>
  </div>
</template>

<script setup lang="ts">
import { DateTime } from 'luxon'
import { infoSeriesPathBuilder } from '../utilities/url'
import { getRfcPillText, isAprilFoolsRfc, type RfcCommon } from '~/utilities/rfc'
import { formatTitlePlaintext } from '~/utilities/rfc-converters-utils'

type Props = {
  rfc: RfcCommon
  showAbstract?: boolean
  showTagDate?: boolean
}

const props = defineProps<Props>()

const isMobileAbstractOpen = ref<boolean>(false)

const abstractDomId = useId()

function formatDate(isoDate: string): string {
  const datetime = DateTime.fromISO(isoDate)
  return datetime.toLocaleString({
    month: 'long',
    year: 'numeric',
    ...(isAprilFool.value && { day: 'numeric' })
  })
}

function formatObsoletedBy(
  obsoletedBy: RfcCommon['obsoleted_by']
): VNode | undefined {
  if (!obsoletedBy || obsoletedBy.length === 0) return undefined

  return h(
    'span',
    obsoletedBy.reduce(
      (acc, obsoletedByItem, index) => {
        if (index > 0) {
          acc.push(', ')
        }
        acc.push(
          h(
            'a',
            {
              href: infoSeriesPathBuilder(`rfc${obsoletedByItem.number}`),
              title: `${formatTitlePlaintext(`RFC${obsoletedByItem.number}`)}: ${obsoletedByItem.title}`,
              class: 'relative z-50 underline p-1 -m-1 hover:bg-gray-100'
            },
            ['RFC', h('b', obsoletedByItem.number)]
          )
        )

        return acc
      },
      ['Obsoleted by '] as (string | VNode)[]
    )
  )
}

const obsoletedBy = computed(() => {
  return formatObsoletedBy(props.rfc.obsoleted_by)
})

const list2 = computed(
  () =>
    [
      props.rfc.published ? formatDate(props.rfc.published) : undefined,
      props.rfc.stream?.name && formatStreamName(props.rfc.stream.name),
      props.rfc.area?.name
    ].filter(Boolean) as string[]
)

const formatStreamName = (streamName: string) => {
  switch (streamName.toLowerCase()) {
    case 'ise':
    case 'independent':
    case 'independent submission':
      return 'Independent Submission'
  }
  return `${streamName} publication`
}

const tagText = computed(() => getRfcPillText(props.rfc))

const isAprilFool = computed(() => isAprilFoolsRfc(props.rfc))
</script>
