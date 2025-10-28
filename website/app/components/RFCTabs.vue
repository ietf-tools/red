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
              <RFCRouterLink :href="infoSeriesPathBuilder(`rfc${update.number}`)">
                <component :is="formattedTitle" />:
                {{ update.title }}
              </RFCRouterLink>
            </span>
          </dd>
        </template>

        <dt class="font-bold mt-2">Date published</dt>
        <dd>{{ formattedPublished }}</dd>

        <template v-if="props.rfcBucketHtmlDocument.rfc.authors.length > 0">
          <dt class="font-bold mt-2">Authors</dt>
          <dd>
            <ul class="-mt-1">
              <li v-for="(author, authorIndex) in props.rfcBucketHtmlDocument.rfc.authors" :key="authorIndex"
                class="inline">
                <a v-if="author.email" :href="rfcAuthorUrlBuilder(author.email)"
                  class="whitespace-nowrap underline inline-block py-0.5 pr-0.5 mb-0.5">
                  {{ author.name }}
                </a>
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
        </template>

        <template v-if="shouldShowGroup(props.rfcBucketHtmlDocument.rfc)">
          <dt class="font-bold mt-2">
            <template v-if="// https://github.com/ietf-tools/red/issues/147#issuecomment-3417450159
              props.rfcBucketHtmlDocument.rfc.stream.slug === 'IRTF'"
            >
              Research group
            </template>
            <template v-else>Working group</template>
          </dt>
          <dd>
            <Anchor :href="workingGroupUrlBuilder(props.rfcBucketHtmlDocument.rfc.group)">
              {{ props.rfcBucketHtmlDocument.rfc.group?.name }}

              <template v-if="props.rfcBucketHtmlDocument.rfc.group?.acronym">
                ({{ props.rfcBucketHtmlDocument.rfc.group.acronym }})
              </template>
            </Anchor>
          </dd>
        </template>

        <template v-if="shouldShowArea(props.rfcBucketHtmlDocument.rfc)">
          <dt class="font-bold mt-2">Area</dt>
          <dd>
            <Anchor :href="areaGroupUrlBuilder(props.rfcBucketHtmlDocument.rfc.area)">
              {{ props.rfcBucketHtmlDocument.rfc.area?.name }}

              <template v-if="props.rfcBucketHtmlDocument.rfc.area?.acronym">
                ({{ props.rfcBucketHtmlDocument.rfc.area.acronym }})
              </template>
            </Anchor>
          </dd>
        </template>

        <dt class="font-bold mt-2">Publication Stream</dt>
        <dd>
          <template v-if="streamUrlBuilder(props.rfcBucketHtmlDocument.rfc.stream)">
            <Anchor :href="streamUrlBuilder(props.rfcBucketHtmlDocument.rfc.stream)">
              {{ props.rfcBucketHtmlDocument.rfc.stream.name }}
            </Anchor>
          </template>
          <template v-else>
            {{ props.rfcBucketHtmlDocument.rfc.stream.name }}
          </template>
        </dd>

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
              <a v-if="identifier.type === 'doi'" :href="`https://doi.org/${encodeURI(identifier.value)}`">
                {{ `https://doi.org/${identifier.value}` }}
              </a>
              <template v-else>
                {{ identifier.value }}
              </template>
            </dd>
          </template>
        </template>
      </dl>

      <!-- <Heading level="3" class="mt-5 mb-2">Cite this RFC</Heading>
          <ul class="text-sm flex flex-col gap-2">
            <li v-for="(citation, citationIndex) in props.rfc.citations" :key="citationIndex">
              <Anchor :href="citation.url" class="underline block px-2 -ml-2">
                {{ citation.title }}
              </Anchor>
            </li>
          </ul> -->

      <template v-if="props.rfcBucketHtmlDocument.rfc.formats?.length > 0">
        <Heading level="3" class="mt-5 mb-2">
          Formats
        </Heading>
        <ul class="text-sm flex flex-col gap-2">
          <li class="italic">TODO</li>
          <!-- <li v-for="(format, formatIndex) in props.rfcBucketHtmlDocument.rfc.formats" :key="formatIndex">
            <Anchor :href="" class="underline block px-2 -ml-2">
              {{ format }}
            </Anchor>
          </li> -->
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
import { areaGroupUrlBuilder, infoSeriesPathBuilder, rfcAuthorUrlBuilder, streamUrlBuilder, workingGroupUrlBuilder } from '~/utilities/url'
import type { RfcBucketHtmlDocument } from '~/utilities/rfc'
import type { RfcCommon } from '~/utilities/rfc-validators'

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

const shouldShowArea = (rfc: RfcCommon): boolean => {
  // https://github.com/ietf-tools/red/issues/201
  // https://github.com/ietf-tools/red/issues/147#issuecomment-3300346145
  if (!rfc.area) {
    return false
  }
  if (rfc.stream.slug === 'IETF' && (rfc.group?.type === 'wg' || rfc.group?.type === 'ag')) {
    return true
  }
  return false
}

const shouldShowGroup = (rfc: RfcCommon): boolean => {
  switch (rfc.stream.slug) {
    case 'IAB':
    case 'INDEPENDENT':
    case 'Editorial':
    case 'Legacy':
      return false
  }
  return true
}

const TAB_CONTENT_CLASS = 'flex flex-col min-h-0'
const DEFAULT_CLASS = 'py-4 whitespace-nowrap border-b-2 hover:bg-gray-100 dark:hover:bg-gray-900 text-sm md:text-md cursor-pointer'
const SELECTED_CLASS = 'text-shadow-bold text-gray-900 dark:text-gray-100 border-b-blue-900 dark:border-b-white font-medium'
const UNSELECTED_CLASS = 'border-b-transparent text-gray-800 dark:text-gray-300'
</script>