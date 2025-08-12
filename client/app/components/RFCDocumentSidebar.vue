<template>
  <div class="h-full print:block">
    <DialogRoot
      v-model:open="isModalOpen"
      @close="isModalOpen = false"
    >
      <DialogTrigger />
      <DialogPortal>
        <DialogOverlay />
        <DialogContent :class="// needs overflow-y-scroll to force scrollbars, to ensure same page width as the main view
          'fixed inset-0 z-50 bg-blue-900 text-white dark:bg-blue-950 dark:text-white overflow-y-scroll h-full'">
          <DialogTitle />

          <RFCMobileBanner
            :rfc="props.rfc"
            :is-fixed="false"
          >
            <button
              class="bg-white rounded-l text-black p-2 flex items-center"
              aria-label="Close"
              @click="isModalOpen = false"
            >
              <GraphicsExpandSidebar class="inline-block mr-1 rotate-180" />
            </button>
          </RFCMobileBanner>
          <div class="pl-4 pr-2 bg-white dark:bg-blue-900">
            <RFCTabs
              ref="mobileRFCTabs"
              v-model="selectedTab"
              :rfc="props.rfc"
              :rfc-bucket-html-doc="props.rfcBucketHtmlDocument"
              :has-table-of-contents="props.hasTableOfContents"
            >
              <template #slot0>
                <TableOfContents
                  v-if="props.rfcBucketHtmlDocument.tableOfContents"
                  :toc="props.rfcBucketHtmlDocument.tableOfContents"
                  list-type="ordered"
                  wrapper-class="flex flex-col min-h-0 pt-4 pb-2 px-4"
                  list-class="mt-2 mr-1 pl-0 -ml-1"
                  nested-list-class="pl-2"
                  :list-item-class="`block text-sm py-2 dark:border-t-gray-500 ${ANCHOR_TAILWIND_STYLE}`"
                  links-active-class="text-shadow-bold"
                  link-class="block no-underline hover:underline"
                  last-link-class="flex-1"
                >
                  <Heading
                    level="2"
                    style-level="5"
                    class="mt-4 mb-1 sr-only"
                  >
                    In this section
                  </Heading>
                </TableOfContents>
              </template>
            </RFCTabs>
          </div>

          <DialogClose />
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <div class="sticky top-0 h-[calc(100vh)] flex flex-col">
      <RFCTabs
        ref="desktopRFCTabs"
        v-model="selectedTab"
        :rfc="props.rfc"
        :rfc-bucket-html-doc="props.rfcBucketHtmlDocument"
        :has-table-of-contents="props.hasTableOfContents"
      >
        <template #slot0>
          <TableOfContentsHighlight
            v-if="props.rfcBucketHtmlDocument.tableOfContents"
            :toc="props.rfcBucketHtmlDocument.tableOfContents"
            list-type="ordered"
            wrapper-class="flex flex-col min-h-0 pt-4 pb-2 px-4"
            list-class="mr-1"
            nested-list-class="pl-2"
            :links-class="`block text-sm py-2 dark:border-t-gray-500 ${ANCHOR_TAILWIND_STYLE}`"
            links-active-class="text-shadow-bold"
            link-class="block no-underline hover:underline"
            last-link-class="flex-1"
          >
            <Heading
              level="2"
              style-level="5"
              class="mt-4 mb-1 sr-only"
            >
              In this section
            </Heading>
          </TableOfContentsHighlight>
        </template>
        <template #slot1>
          <Heading
            level="3"
            style-level="4"
            class="mt-4"
          >
            Details
          </Heading>
          <dl class="text-sm">
            <template v-if="rfc.updates && rfc.updates.length > 0">
              <dt class="font-bold mt-2">Updates ({{ rfc.updates.length }})</dt>
              <dd>
                <span
                  v-for="(update, updateIndex) in props.rfc.updates"
                  :key="updateIndex"
                >
                  <RFCRouterLink :href="infoRfcPathBuilder(`rfc${update.number}`)">
                    <component :is="formatTitleAsVNode(`rfc${update.number}`)" />:
                    {{ update.title }}
                  </RFCRouterLink>
                </span>
              </dd>
            </template>

            <dt class="font-bold mt-2">Date published</dt>
            <dd>{{ formattedPublished }}</dd>

            <dt class="font-bold mt-2">Authors</dt>
            <dd>
              <ul class="-mt-1">
                <li
                  v-for="(author, authorIndex) in props.rfc.authors"
                  :key="authorIndex"
                  class="inline"
                >
                  <A
                    v-if="author.email"
                    :href="mailToBuilder(author.email)"
                    class="whitespace-nowrap underline inline-block py-0.5 pr-1 mb-0.5"
                  >
                    {{ author.name }}
                  </A>
                  <span v-else>
                    {{ author.name }}
                  </span>
                  <template v-if="authorIndex < props.rfc.authors.length - 1">
                    {{ COMMA }}
                    {{ SPACE }}
                  </template>
                  <template v-else>.</template>
                </li>
              </ul>
            </dd>

            <dt class="font-bold mt-2">Working group</dt>
            <dd>
              <template v-if="props.rfc.group.acronym">
                {{ props.rfc.group.acronym.toUpperCase() }}
              </template>
              {{ props.rfc.group.name }}
            </dd>

            <dt class="font-bold mt-2">Area</dt>
            <dd>
              <template v-if="props.rfc.area?.acronym">
                {{ props.rfc.area.acronym.toUpperCase() }}
              </template>
              {{ props.rfc.area?.name }}
            </dd>

            <dt class="font-bold mt-2">Stream</dt>
            <dd>{{ props.rfc.stream.name }}</dd>

            <template v-if="props.rfc.identifiers">
              <template
                v-for="(identifier, identifierIndex) in props.rfc.identifiers"
                :key="identifierIndex"
              >
                <dt class="font-bold mt-2">
                  <template v-if="identifier.type === 'doi'">
                    <abbr
                      title="Digital object identifier"
                      class="no-underline"
                    >
                      DOI
                    </abbr>
                  </template>
                  <template v-else-if="identifier.type === 'issn'">
                    <abbr
                      title="International Standard Serial Number"
                      class="no-underline"
                    >
                      ISSN
                    </abbr>
                  </template>
                  <template v-else>
                    {{ identifier.type }}
                  </template>
                </dt>
                <dd>
                  {{ identifier.value }}
                </dd>
              </template>
            </template>
          </dl>

          <!-- <Heading level="3" class="mt-5 mb-2">Cite this RFC</Heading>
          <ul class="text-sm flex flex-col gap-2">
            <li v-for="(citation, citationIndex) in props.rfc.citations" :key="citationIndex">
              <A :href="citation.url" class="underline block px-2 -ml-2">
                {{ citation.title }}
              </A>
            </li>
          </ul> -->

          <Heading
            level="3"
            class="mt-5 mb-2"
          >
            Formats
          </Heading>
          <ul class="text-sm flex flex-col gap-2">
            <li
              v-for="(format, formatIndex) in props.rfc.formats"
              :key="formatIndex"
            >
              <A
                :href="format"
                class="underline block px-2 -ml-2"
              >
                {{ format }}
              </A>
            </li>
          </ul>
        </template>
        <template #slot3>
          <ul class="text-sm">
            <li
              v-for="(errataItem, errataIndex) in props.rfc.obsoleted_by"
              :key="errataIndex"
            >
              {{ errataItem }}
            </li>
          </ul>
        </template>
      </RFCTabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger
} from 'reka-ui'
import { DateTime } from 'luxon'
import { formatTitleAsVNode, type RfcBucketHtmlDocument, type RfcCommon } from '~/utilities/rfc'
import { ANCHOR_TAILWIND_STYLE } from '~/utilities/theme'
import { COMMA, SPACE } from '~/utilities/strings'
import {
  infoRfcPathBuilder,
  mailToBuilder,
} from '~/utilities/url'
import { formatDatePublished } from '~/utilities/rfc-converters-utils'
import { closeModalAndScrollToId } from '~/utilities/tableOfContents'

type Props = {
  rfc: RfcCommon
  rfcBucketHtmlDocument: RfcBucketHtmlDocument
  gotoErrata: () => void
  hasTableOfContents: boolean
}

const isModalOpen = defineModel<boolean>('isModalOpen')

const selectedTab = defineModel<number>('selectedTab')

const props = defineProps<Props>()

const formattedPublished = computed(() => {
  const dt = DateTime.fromISO(props.rfc.published)
  return formatDatePublished(dt, true)
})

const handleCloseAndNavigate = (id: string) => {
  isModalOpen.value = false
  nextTick(() => {
    // nextTick() because we need to wait for the modal to render closed, and then attempt to scroll
    window.location.hash = id
  })
}

provide(closeModalAndScrollToId, handleCloseAndNavigate)
</script>