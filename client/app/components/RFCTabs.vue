<template>
  <TabsRoot v-model="selectedTab" class="min-h-0 flex flex-col" @change="changeTab">
    <TabsList class="border-b-2 border-gray-400">
      <HorizontalScrollable :inner-class="[
        'flex flex-row gap-5',
        { 'px-2': props.isMobile }
      ]">
        <TabsIndicator class="absolute" />
        <TabsTrigger v-if="props.hasTableOfContents" :class="[
          DEFAULT_CLASS,
          {
            [SELECTED_CLASS]: selectedTab === 0,
            [UNSELECTED_CLASS]: selectedTab !== 0
          }
        ]" :value="0">
          Contents
        </TabsTrigger>
        <TabsTrigger :class="[
          DEFAULT_CLASS,
          {
            [SELECTED_CLASS]: selectedTab === 1,
            [UNSELECTED_CLASS]: selectedTab !== 1
          }
        ]" :value="1">
          About this RFC
        </TabsTrigger>
        <TabsTrigger :class="[
          DEFAULT_CLASS,
          {
            [SELECTED_CLASS]: selectedTab === 2,
            [UNSELECTED_CLASS]: selectedTab !== 2
          }
        ]" :value="2">
          Erratum
          <DiamondText
            v-if="props.rfcBucketHtmlDocument.rfc.errata && props.rfcBucketHtmlDocument.rfc.errata.length > 0"
            :text="`${props.rfcBucketHtmlDocument.rfc.errata ? props.rfcBucketHtmlDocument.rfc.errata.length : 0}`" />
        </TabsTrigger>
      </HorizontalScrollable>
    </TabsList>

    <TabsContent v-if="props.hasTableOfContents && props.rfcBucketHtmlDocument.tableOfContents" :value="0" :class="[TAB_CONTENT_CLASS, {
      'px-4': props.isMobile,
    }]">
      <TableOfContentsHighlight v-if="props.isMobile === false" :toc="props.rfcBucketHtmlDocument.tableOfContents"
        list-type="ordered" wrapper-class="min-h-0 pt-4 pb-2 px-4" list-class="mr-1" nested-list-class="pl-2"
        :links-class="`block text-sm py-2 dark:border-t-gray-500 ${ANCHOR_TAILWIND_STYLE}`"
        links-active-class="text-shadow-bold" link-class="block no-underline hover:underline" last-link-class="flex-1">
        <Heading level="2" style-level="5" class="mt-4 mb-1 sr-only">
          In this section
        </Heading>
      </TableOfContentsHighlight>
      <TableOfContents v-else-if="props.isMobile === true" :toc="props.rfcBucketHtmlDocument.tableOfContents"
        list-type="ordered" wrapper-class="flex flex-col min-h-0 pt-4 pb-2 px-4" list-class="mt-2 mr-1 pl-0 -ml-1"
        nested-list-class="pl-2" :list-item-class="`block text-sm py-2 dark:border-t-gray-500 ${ANCHOR_TAILWIND_STYLE}`"
        links-active-class="text-shadow-bold" link-class="block no-underline hover:underline" last-link-class="flex-1">
        <Heading level="2" style-level="5" class="mt-4 mb-1 sr-only">
          In this section
        </Heading>
      </TableOfContents>
    </TabsContent>
    <TabsContent :value="1" :class="[TAB_CONTENT_CLASS, {
      'px-4': props.isMobile,
    }]">
      <Heading level="3" style-level="4" class="mt-4">
        Details
      </Heading>
      <dl class="text-sm">
        <template v-if="props.rfcBucketHtmlDocument.rfc.updates && props.rfcBucketHtmlDocument.rfc.updates.length > 0">
          <dt class="font-bold mt-2">Updates ({{ props.rfcBucketHtmlDocument.rfc.updates.length }})</dt>
          <dd>
            <span v-for="(update, updateIndex) in props.rfcBucketHtmlDocument.rfc.updates" :key="updateIndex">
              <RFCRouterLink :href="infoRfcPathBuilder(`rfc${update.number}`)">
                <component :is="formattedTitle" />:
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
            <li v-for="(author, authorIndex) in props.rfcBucketHtmlDocument.rfc.authors" :key="authorIndex"
              class="inline">
              <A v-if="author.email" :href="mailToBuilder(author.email)"
                class="whitespace-nowrap underline inline-block py-0.5 pr-0.5 mb-0.5">
                {{ author.name }}
                <Icon name="fluent:mail-32-regular" class="inline-block h-5 w-2" />
              </A>
              <span v-else>
                {{ author.name }}
              </span>
              <template v-if="authorIndex < props.rfcBucketHtmlDocument.rfc.authors.length - 1">
                {{ COMMA }}
                {{ NONBREAKING_SPACE }}
              </template>
            </li>
          </ul>
        </dd>

        <dt class="font-bold mt-2">Working group</dt>
        <dd>
          <template v-if="props.rfcBucketHtmlDocument.rfc.group?.acronym">
            {{ props.rfcBucketHtmlDocument.rfc.group.acronym.toUpperCase() }}
          </template>
          {{ props.rfcBucketHtmlDocument.rfc.group?.name }}
        </dd>

        <dt class="font-bold mt-2">Area</dt>
        <dd>
          <template v-if="props.rfcBucketHtmlDocument.rfc.area?.acronym">
            {{ props.rfcBucketHtmlDocument.rfc.area.acronym.toUpperCase() }}
          </template>
          {{ props.rfcBucketHtmlDocument.rfc.area?.name }}
        </dd>

        <dt class="font-bold mt-2">Stream</dt>
        <dd>{{ props.rfcBucketHtmlDocument.rfc.stream.name }}</dd>

        <template v-if="props.rfcBucketHtmlDocument.rfc.identifiers">
          <template v-for="(identifier, identifierIndex) in props.rfcBucketHtmlDocument.rfc.identifiers"
            :key="identifierIndex">
            <dt class="font-bold mt-2">
              <template v-if="identifier.type === 'doi'">
                <abbr title="Digital object identifier" class="no-underline">
                  DOI
                </abbr>
              </template>
              <template v-else-if="identifier.type === 'issn'">
                <abbr title="International Standard Serial Number" class="no-underline">
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

      <template v-if="props.rfcBucketHtmlDocument.rfc.formats?.length > 0">
        <Heading level="3" class="mt-5 mb-2">
          Formats
        </Heading>
        <ul class="text-sm flex flex-col gap-2">
          <li v-for="(format, formatIndex) in props.rfcBucketHtmlDocument.rfc.formats" :key="formatIndex">
            <A :href="format" class="underline block px-2 -ml-2">
              {{ format }}
            </A>
          </li>
        </ul>
      </template>
    </TabsContent>
    <TabsContent :value="2" :class="[TAB_CONTENT_CLASS, {
      'px-4': props.isMobile,
    }]">
      <p class="border-b-1 border-gray-200 py-6">
        <AValidHref href="https://errata.rfc-editor.org/"
          class="bg-blue-300 text-white dark:bg-blue-800 border-0 text-sm no-underline hover:underline focus:underline rounded my-2 p-3 font-bold">
          Report a new erratum
        </AValidHref>
      </p>

      <ul v-if="props.rfcBucketHtmlDocument.rfc.errata && props.rfcBucketHtmlDocument.rfc.errata.length > 0"
        class="list-disc text-sm">
        <li v-for="(errataItem, errataIndex) in props.rfcBucketHtmlDocument.rfc.errata" :key="errataIndex">
          {{ errataItem }}
        </li>
      </ul>
      <p v-else class="text-sm mt-5 lg:mt-5">
        No erratum currently.
      </p>
    </TabsContent>
  </TabsRoot>
</template>

<script setup lang="ts">
import { DateTime } from 'luxon'
import {
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsRoot,
  TabsTrigger
} from 'reka-ui'
import { formatTitleAsVNode } from '~/utilities/rfc'
import { formatDatePublished } from '~/utilities/rfc-converters-utils'
import { COMMA, NONBREAKING_SPACE } from '~/utilities/strings'
import { ANCHOR_TAILWIND_STYLE } from '~/utilities/theme'
import { infoRfcPathBuilder, mailToBuilder } from '~/utilities/url'
import type { RfcBucketHtmlDocument } from '~/utilities/rfc'

type Props = {
  rfcBucketHtmlDocument: RfcBucketHtmlDocument
  hasTableOfContents: boolean
  isMobile: boolean
}

const props = defineProps<Props>()

const selectedTab = defineModel<number>()

function changeTab(index: number) {
  selectedTab.value = index
}

const formattedTitle = computed(() => formatTitleAsVNode(`rfc${props.rfcBucketHtmlDocument.rfc.number}`))

const formattedPublished = computed(() => {
  if (!props.rfcBucketHtmlDocument.rfc.published) return
  const dt = DateTime.fromISO(props.rfcBucketHtmlDocument.rfc.published)
  return formatDatePublished(dt, true)
})

const TAB_CONTENT_CLASS = 'flex flex-col min-h-0'
const DEFAULT_CLASS = 'py-4 whitespace-nowrap border-b-2 hover:bg-gray-100 dark:hover:bg-gray-900 text-sm md:text-md cursor-pointer'
const SELECTED_CLASS = 'text-shadow-bold text-gray-900 dark:text-gray-100 border-b-blue-900 dark:border-b-white font-medium'
const UNSELECTED_CLASS = 'border-b-transparent text-gray-800 dark:text-gray-300'
</script>