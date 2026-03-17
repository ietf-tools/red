<template>
  <TabsRoot v-model="selectedTab" class="min-h-0 flex flex-col">
    <TabsList class="border-b-2 border-gray-400">
      <HorizontalScrollable
        :inner-class="[
          'flex flex-row gap-5',
          { 'px-2': props.mode === 'mobile' }
        ]"
      >
        <TabsIndicator class="absolute" />
        <TabsTrigger
          v-if="props.hasTableOfContents"
          :class="[
            DEFAULT_CLASS,
            {
              [SELECTED_CLASS]: selectedTab === 0,
              [UNSELECTED_CLASS]: selectedTab !== 0
            }
          ]"
          :value="0"
        >
          Contents
        </TabsTrigger>
        <TabsTrigger
          :class="[
            DEFAULT_CLASS,
            {
              [SELECTED_CLASS]: selectedTab === 1,
              [UNSELECTED_CLASS]: selectedTab !== 1
            }
          ]"
          :value="1"
        >
          About this RFC
        </TabsTrigger>
        <TabsTrigger
          :class="[
            DEFAULT_CLASS,
            {
              [SELECTED_CLASS]: selectedTab === 2,
              [UNSELECTED_CLASS]: selectedTab !== 2
            }
          ]"
          :value="2"
        >
          Erratum
          <DiamondText
            v-if="
              props.rfcBucketHtmlDocument.errataList &&
              props.rfcBucketHtmlDocument.errataList.length > 0
            "
            :text="props.rfcBucketHtmlDocument.errataList.length.toString()"
          />
        </TabsTrigger>
      </HorizontalScrollable>
    </TabsList>

    <TabsContent
      v-if="
        props.hasTableOfContents && props.rfcBucketHtmlDocument.tableOfContents
      "
      :value="0"
      :class="[
        TAB_CONTENT_CLASS,
        {
          'px-4': props.mode === 'mobile'
        }
      ]"
    >
      <TableOfContentsHighlight
        v-if="props.mode === 'desktop'"
        :toc="props.rfcBucketHtmlDocument.tableOfContents"
        list-type="ordered"
        wrapper-class="min-h-0 pt-4 pb-2 px-4"
        list-class="mr-1"
        nested-list-class="pl-2"
        :links-class="`block text-sm py-2 dark:border-t-gray-500 ${ANCHOR_TAILWIND_STYLE}`"
        links-active-class="toc-highlight"
        link-class="block no-underline hover:underline"
        last-link-class="flex-1"
      >
        <Heading level="2" style-level="5" class="mt-4 mb-1 sr-only">
          In this section
        </Heading>
      </TableOfContentsHighlight>
      <TableOfContents
        v-else-if="props.mode === 'mobile'"
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
        <Heading level="2" style-level="5" class="mt-4 mb-1 sr-only">
          In this section
        </Heading>
      </TableOfContents>
    </TabsContent>
    <TabsContent
      :value="1"
      :class="[
        TAB_CONTENT_CLASS,
        {
          'px-4': props.mode === 'mobile'
        }
      ]"
    >
      <VerticalScrollable>
        <Heading level="3" style-level="4" class="mt-4"> Details </Heading>
        <dl class="text-sm">
          <template
            v-if="
              props.rfcBucketHtmlDocument.rfc.updates &&
              props.rfcBucketHtmlDocument.rfc.updates.length > 0
            "
          >
            <dt class="font-bold mt-2">
              Updates ({{ props.rfcBucketHtmlDocument.rfc.updates.length }})
            </dt>
            <dd>
              <RFCTabsReferences
                :rfcs="props.rfcBucketHtmlDocument.rfc.updates"
              />
            </dd>
          </template>
          <template
            v-if="
              props.rfcBucketHtmlDocument.rfc.updated_by &&
              props.rfcBucketHtmlDocument.rfc.updated_by.length > 0
            "
          >
            <dt class="font-bold mt-2">
              Updated by ({{
                props.rfcBucketHtmlDocument.rfc.updated_by.length
              }})
            </dt>
            <dd>
              <RFCTabsReferences
                :rfcs="props.rfcBucketHtmlDocument.rfc.updated_by"
              />
            </dd>
          </template>
          <template
            v-if="
              props.rfcBucketHtmlDocument.rfc.obsoletes &&
              props.rfcBucketHtmlDocument.rfc.obsoletes.length > 0
            "
          >
            <dt class="font-bold mt-2">
              Obsoletes ({{ props.rfcBucketHtmlDocument.rfc.obsoletes.length }})
            </dt>
            <dd>
              <RFCTabsReferences
                :rfcs="props.rfcBucketHtmlDocument.rfc.obsoletes"
              />
            </dd>
          </template>
          <template
            v-if="
              props.rfcBucketHtmlDocument.rfc.obsoleted_by &&
              props.rfcBucketHtmlDocument.rfc.obsoleted_by.length > 0
            "
          >
            <dt class="font-bold mt-2">
              Obsoleted by ({{
                props.rfcBucketHtmlDocument.rfc.obsoleted_by.length
              }})
            </dt>
            <dd>
              <RFCTabsReferences
                :rfcs="props.rfcBucketHtmlDocument.rfc.obsoleted_by"
              />
            </dd>
          </template>

          <dt class="font-bold mt-2">Date published</dt>
          <dd>{{ formattedPublished }}</dd>

          <template v-if="props.rfcBucketHtmlDocument.rfc.authors.length > 0">
            <dt class="font-bold mt-2">Authors</dt>
            <dd>
              <ul class="-mt-1 leading-[1.75]">
                <li
                  v-for="(author, authorIndex) in props.rfcBucketHtmlDocument
                    .rfc.authors"
                  :key="authorIndex"
                  class="inline"
                >
                  <span class="whitespace-nowrap">
                    <a
                      v-if="author.datatracker_person_path"
                      :href="
                        datatrackerAuthorUrlBuilder(
                          author.datatracker_person_path
                        )
                      "
                      :class="[ANCHOR_TAILWIND_STYLE, ' py-0.5 pr-0.5 mb-0.5']"
                    >
                      <RFCDocumentAuthor :author="author" />
                      <Icon
                        name="fluent:window-new-20-regular"
                        class="text-lg align-middle ml-1"
                      />
                    </a>
                    <span v-else>
                      <RFCDocumentAuthor :author="author" />
                    </span>
                    <template
                      v-if="
                        authorIndex <
                        props.rfcBucketHtmlDocument.rfc.authors.length - 1
                      "
                    >
                      {{ COMMA }} {{ NONBREAKING_SPACE }}
                    </template>
                  </span>
                  {{ SPACE }}
                </li>
              </ul>
            </dd>
          </template>

          <template v-if="shouldShowGroup(props.rfcBucketHtmlDocument.rfc)">
            <dt class="font-bold mt-2">
              <template
                v-if="
                  // https://github.com/ietf-tools/red/issues/147#issuecomment-3417450159
                  props.rfcBucketHtmlDocument.rfc.stream.slug === 'IRTF'
                "
              >
                Research group
              </template>
              <template v-else>Working group</template>
            </dt>
            <dd>
              <Anchor
                :href="
                  workingGroupUrlBuilder(props.rfcBucketHtmlDocument.rfc.group)
                "
                :class="ANCHOR_TAILWIND_STYLE"
              >
                {{ props.rfcBucketHtmlDocument.rfc.group?.name }}

                <template v-if="props.rfcBucketHtmlDocument.rfc.group?.acronym">
                  ({{ props.rfcBucketHtmlDocument.rfc.group.acronym }})
                </template>
                <Icon
                  name="fluent:window-new-20-regular"
                  class="text-lg align-middle ml-1"
                />
              </Anchor>
            </dd>
          </template>

          <template v-if="shouldShowArea(props.rfcBucketHtmlDocument.rfc)">
            <dt class="font-bold mt-2">Area</dt>
            <dd>
              <Anchor
                :href="
                  areaGroupUrlBuilder(props.rfcBucketHtmlDocument.rfc.area)
                "
                :class="ANCHOR_TAILWIND_STYLE"
              >
                {{ props.rfcBucketHtmlDocument.rfc.area?.name }}

                <template v-if="props.rfcBucketHtmlDocument.rfc.area?.acronym">
                  ({{ props.rfcBucketHtmlDocument.rfc.area.acronym }})
                </template>

                <Icon
                  name="fluent:window-new-20-regular"
                  class="text-lg align-middle ml-1"
                />
              </Anchor>
            </dd>
          </template>

          <dt class="font-bold mt-2">Publication Stream</dt>
          <dd>
            <template
              v-if="streamUrlBuilder(props.rfcBucketHtmlDocument.rfc.stream)"
            >
              <Anchor
                :href="streamUrlBuilder(props.rfcBucketHtmlDocument.rfc.stream)"
                :class="ANCHOR_TAILWIND_STYLE"
              >
                {{ props.rfcBucketHtmlDocument.rfc.stream.name }}
                <Icon
                  name="fluent:window-new-20-regular"
                  class="text-lg align-middle ml-1"
                />
              </Anchor>
            </template>
            <template v-else>
              {{ props.rfcBucketHtmlDocument.rfc.stream.name }}
            </template>
          </dd>

          <template v-if="props.rfcBucketHtmlDocument.rfc.identifiers">
            <template
              v-for="(identifier, identifierIndex) in props
                .rfcBucketHtmlDocument.rfc.identifiers"
              :key="identifierIndex"
            >
              <dt class="font-bold mt-2">
                <template v-if="identifier.type === 'doi'">
                  <abbr title="Digital object identifier" class="no-underline">
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
                <Anchor
                  v-if="identifier.type === 'doi'"
                  :href="`https://doi.org/${encodeURI(identifier.value)}`"
                  :class="ANCHOR_TAILWIND_STYLE"
                >
                  {{ `https://doi.org/${identifier.value}` }}
                  <Icon
                    name="fluent:window-new-20-regular"
                    class="text-lg align-middle ml-1"
                  />
                </Anchor>
                <template v-else>
                  {{ identifier.value }}
                </template>
              </dd>
            </template>
          </template>

          <template v-if="props.rfcBucketHtmlDocument.rfc.formats?.length > 0">
            <dt class="font-bold mt-2">Area</dt>
            <dd>
              <ul class="text-sm">
                <li
                  v-for="(formatItem, formatIndex) in props
                    .rfcBucketHtmlDocument.rfc.formats"
                  :key="formatIndex"
                  class="inline"
                >
                  <a
                    :href="
                      // This needs to be <a> not <Anchor> because it's outside the Nuxt app but is on the same domain
                      rfcFormatPathBuilder(
                        `rfc${props.rfcBucketHtmlDocument.rfc.number}`,
                        formatItem.format
                      )
                    "
                    :class="ANCHOR_TAILWIND_STYLE"
                  >
                    {{ formatItem.format }}
                  </a>
                  <template
                    v-if="
                      formatIndex <
                      props.rfcBucketHtmlDocument.rfc.formats.length - 1
                    "
                  >
                    {{ COMMA }}
                    {{ SPACE }}
                  </template>
                  <template v-else>
                    {{ FULLSTOP }}
                  </template>
                </li>
              </ul>
            </dd>
          </template>
        </dl>
      </VerticalScrollable>
    </TabsContent>
    <TabsContent
      :value="2"
      :class="[
        TAB_CONTENT_CLASS,
        {
          'px-4': props.mode === 'mobile'
        }
      ]"
    >
      <VerticalScrollable class="pl-1">
        <Heading level="3" style-level="4" class="mt-3 mb-1">
          About Errata
        </Heading>
        <p class="text-sm leading-[1.5]">
          RFC Errata are official records of technical or editorial errors found
          in published RFCs, which remain unchanged once issued. You can report
          Errata only after verifying the issue is not already documented and
          constitutes a genuine error in the text rather than a request for new
          features or protocol changes.
        </p>
        <p class="border-b-1 border-gray-200 py-6 mb-4">
          <Anchor
            :href="RFC_EDITOR_ERRATA_SUBSITE_URL"
            class="bg-blue-300 text-white dark:bg-blue-800 border-0 text-sm no-underline hover:underline focus:underline rounded my-2 p-3 font-bold"
          >
            Report a new erratum
            <Icon
              name="fluent:window-new-20-regular"
              class="text-lg align-middle ml-1"
            />
          </Anchor>
        </p>

        <ErrataList :errata-list="props.rfcBucketHtmlDocument.errataList" />
      </VerticalScrollable>
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
import { formatDatePublished } from '~/utilities/rfc-converters-utils'
import { COMMA, FULLSTOP, NONBREAKING_SPACE, SPACE } from '~/utilities/strings'
import { ANCHOR_TAILWIND_STYLE } from '~/utilities/theme'
import {
  areaGroupUrlBuilder,
  datatrackerAuthorUrlBuilder,
  RFC_EDITOR_ERRATA_SUBSITE_URL,
  rfcFormatPathBuilder,
  streamUrlBuilder,
  workingGroupUrlBuilder
} from '~/utilities/url'
import type { RfcBucketHtmlDocument } from '~/utilities/rfc'
import type { RfcCommon } from '~/utilities/rfc-validators'

type Props = {
  rfcBucketHtmlDocument: RfcBucketHtmlDocument
  hasTableOfContents: boolean
  mode: 'desktop' | 'mobile'
}

const props = defineProps<Props>()

const selectedTab = defineModel<number>()

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
  if (
    rfc.stream.slug === 'IETF' &&
    (rfc.group?.type === 'wg' || rfc.group?.type === 'ag')
  ) {
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

const TAB_CONTENT_CLASS = 'flex flex-col min-h-0 text-black dark:text-white'
const DEFAULT_CLASS =
  'py-4 px-[1px] whitespace-nowrap border-b-2 hover:bg-gray-100 dark:hover:bg-gray-900 text-sm md:text-md cursor-pointer'
const SELECTED_CLASS =
  'text-shadow-bold text-gray-900 dark:text-gray-100 border-b-blue-900 dark:border-b-white font-medium'
const UNSELECTED_CLASS = 'border-b-transparent text-gray-800 dark:text-gray-300'
</script>
