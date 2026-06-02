<template>
  <TabsRoot v-model="selectedTab" class="min-h-0 flex flex-col">
    <div v-html="noScriptTabsHtml"></div>
    <TabsList class="border-b-2 border-gray-400">
      <HorizontalScrollable :inner-class="['flex flex-row gap-5', { 'px-2': props.mode === 'mobile' }]">
        <TabsIndicator class="absolute" />
        <TabsTrigger
          v-if="props.hasTableOfContents"
          :class="[
            DEFAULT_CLASS,
            {
              [ONMOUNTED_CLASS]: isMounted,
              [ONUNMOUNTED_CLASS]: !isMounted,
              [SELECTED_CLASS]: selectedTab === 0 && isMounted,
              [UNSELECTED_CLASS]: selectedTab !== 0
            }
          ]"
          :disabled="!isMounted"
          :value="0">
          Contents
        </TabsTrigger>
        <TabsTrigger
          :class="[
            DEFAULT_CLASS,
            {
              [ONMOUNTED_CLASS]: isMounted,
              [ONUNMOUNTED_CLASS]: !isMounted,
              [SELECTED_CLASS]: selectedTab === 1 && isMounted,
              [UNSELECTED_CLASS]: selectedTab !== 1
            }
          ]"
          :disabled="!isMounted"
          :value="1">
          About this RFC
        </TabsTrigger>
        <TabsTrigger
          :class="[
            DEFAULT_CLASS,
            {
              [ONMOUNTED_CLASS]: isMounted,
              [ONUNMOUNTED_CLASS]: !isMounted,
              [SELECTED_CLASS]: selectedTab === 2 && isMounted,
              [UNSELECTED_CLASS]: selectedTab !== 2
            }
          ]"
          :disabled="!isMounted"
          :value="2">
          Errata
          <DiamondText
            v-if="props.rfcBucketHtmlDocument.errataList && props.rfcBucketHtmlDocument.errataList.length > 0"
            :text="props.rfcBucketHtmlDocument.errataList.length.toString()" />
        </TabsTrigger>
      </HorizontalScrollable>
    </TabsList>

    <TabsContent
      v-if="props.hasTableOfContents && props.rfcBucketHtmlDocument.tableOfContents"
      :value="0"
      :class="[
        TAB_CONTENT_CLASS,
        {
          'px-4': props.mode === 'mobile'
        }
      ]">
      <TableOfContentsHighlight
        v-if="props.mode === 'desktop'"
        :toc="props.rfcBucketHtmlDocument.tableOfContents"
        list-type="ordered"
        wrapper-class="min-h-0 pt-4 pb-2 px-4"
        list-class="mr-1"
        nested-list-class="pl-2"
        :links-class="`block text-sm py-2 dark:border-t-gray-500 ${ANCHOR_COLOR_TAILWIND_STYLE}`"
        links-active-class="text-bold-without-layout-shift"
        link-class="block no-underline hover:underline no-underline hover:underline focus:underline"
        last-link-class="flex-1">
        <Heading level="2" style-level="5" class="mt-4 mb-1 sr-only"> In this section </Heading>
      </TableOfContentsHighlight>
      <TableOfContents
        v-else-if="props.mode === 'mobile'"
        :toc="props.rfcBucketHtmlDocument.tableOfContents"
        list-type="ordered"
        wrapper-class="flex flex-col min-h-0 pt-4 pb-2 px-4"
        list-class="mt-2 mr-1 pl-0 -ml-1"
        nested-list-class="pl-2"
        :list-item-class="`block text-sm py-2 dark:border-t-gray-500 ${ANCHOR_COLOR_TAILWIND_STYLE}`"
        links-active-class="text-bold-without-layout-shift"
        link-class="block no-underline hover:underline"
        last-link-class="flex-1">
        <Heading level="2" style-level="5" class="mt-4 mb-1 sr-only"> In this section </Heading>
      </TableOfContents>
    </TabsContent>
    <TabsContent
      :value="1"
      :class="[
        TAB_CONTENT_CLASS,
        {
          'px-4': props.mode === 'mobile'
        }
      ]">
      <VerticalScrollable>
        <Heading level="3" style-level="4" class="mt-4"> Details </Heading>
        <dl class="text-sm pb-6">
          <template
            v-if="props.rfcBucketHtmlDocument.rfc.updates && props.rfcBucketHtmlDocument.rfc.updates.length > 0">
            <dt class="font-bold mt-2">Updates ({{ props.rfcBucketHtmlDocument.rfc.updates.length }})</dt>
            <dd>
              <RFCTabsReferences :rfcs="props.rfcBucketHtmlDocument.rfc.updates" />
            </dd>
          </template>
          <template
            v-if="props.rfcBucketHtmlDocument.rfc.updated_by && props.rfcBucketHtmlDocument.rfc.updated_by.length > 0">
            <dt class="font-bold mt-2">Updated by ({{ props.rfcBucketHtmlDocument.rfc.updated_by.length }})</dt>
            <dd>
              <RFCTabsReferences :rfcs="props.rfcBucketHtmlDocument.rfc.updated_by" />
            </dd>
          </template>
          <template
            v-if="props.rfcBucketHtmlDocument.rfc.obsoletes && props.rfcBucketHtmlDocument.rfc.obsoletes.length > 0">
            <dt class="font-bold mt-2">Obsoletes ({{ props.rfcBucketHtmlDocument.rfc.obsoletes.length }})</dt>
            <dd>
              <RFCTabsReferences :rfcs="props.rfcBucketHtmlDocument.rfc.obsoletes" />
            </dd>
          </template>
          <template
            v-if="
              props.rfcBucketHtmlDocument.rfc.obsoleted_by && props.rfcBucketHtmlDocument.rfc.obsoleted_by.length > 0
            ">
            <dt class="font-bold mt-2">Obsoleted by ({{ props.rfcBucketHtmlDocument.rfc.obsoleted_by.length }})</dt>
            <dd>
              <RFCTabsReferences :rfcs="props.rfcBucketHtmlDocument.rfc.obsoleted_by" />
            </dd>
          </template>

          <template v-if="props.rfcBucketHtmlDocument.rfc.published">
            <dt class="font-bold mt-2">Date published</dt>
            <dd>
              <time :datetime="props.rfcBucketHtmlDocument.rfc.published">
                {{ formattedPublished }}
              </time>
            </dd>
          </template>

          <template v-if="props.rfcBucketHtmlDocument.rfc.authors.length > 0">
            <dt class="font-bold mt-2">Authors</dt>
            <dd>
              <ul class="-mt-1 leading-[1.75]">
                <li
                  v-for="(author, authorIndex) in props.rfcBucketHtmlDocument.rfc.authors"
                  :key="authorIndex"
                  class="inline">
                  <span class="whitespace-nowrap">
                    <a
                      v-if="author.datatracker_person_path"
                      :href="datatrackerAuthorUrlBuilder(author.datatracker_person_path)"
                      :class="[ANCHOR_COLOR_TAILWIND_STYLE, ' py-0.5 pr-0.5 mb-0.5']">
                      <RFCDocumentAuthor :author="author" />
                      <Icon name="fluent:window-new-20-regular" class="text-lg align-middle ml-1" />
                    </a>
                    <span v-else>
                      <RFCDocumentAuthor :author="author" />
                    </span>
                    <template v-if="authorIndex < props.rfcBucketHtmlDocument.rfc.authors.length - 1">
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
              {{ groupName(props.rfcBucketHtmlDocument.rfc) }}
            </dt>
            <dd>
              <DocumentPojo :value="groupValuePojo(props.rfcBucketHtmlDocument.rfc)" />
            </dd>
          </template>

          <template v-if="shouldShowArea(props.rfcBucketHtmlDocument.rfc)">
            <dt class="font-bold mt-2">Area</dt>
            <dd>
              <DocumentPojo :value="areaValuePojo(props.rfcBucketHtmlDocument.rfc)" />
            </dd>
          </template>

          <dt class="font-bold mt-2">{{ streamName }}</dt>
          <dd v-if="shouldShowStreamValue(props.rfcBucketHtmlDocument.rfc)">
            <DocumentPojo :value="streamValuePojo(props.rfcBucketHtmlDocument.rfc)" />
          </dd>

          <DocumentPojo :value="identifierValuePojo(props.rfcBucketHtmlDocument.rfc.identifiers)" />

          <DocumentPojo :value="formatsValuePojo(formats, props.rfcBucketHtmlDocument.rfc.number)" />

          <dt class="font-bold mt-2">Cite this RFC</dt>
          <dd><DocumentPojo :value="citeValuePojo(props.rfcBucketHtmlDocument.rfc.number)" /></dd>
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
      ]">
      <VerticalScrollable class="pl-1">
        <Heading level="3" style-level="4" class="mt-3 mb-1"> About Errata </Heading>
        <p class="text-sm leading-[1.5]">
          RFC Errata are official records of technical or editorial errors found in published RFCs, which remain
          unchanged once issued. You can report Errata only after verifying the issue is not already documented and
          constitutes a genuine error in the text rather than a request for new features or protocol changes.
        </p>
        <p class="border-b-1 border-gray-200 py-6 mb-4">
          <Anchor
            :href="errataUrlOrigin"
            class="bg-blue-300 text-white dark:bg-blue-800 border-0 text-sm no-underline hover:underline focus:underline rounded my-2 p-3 font-bold">
            Report a new erratum
            <Icon name="fluent:window-new-20-regular" class="text-lg align-middle ml-1" />
          </Anchor>
        </p>

        <ErrataList :errata-list="props.rfcBucketHtmlDocument.errataList" />
      </VerticalScrollable>
    </TabsContent>
  </TabsRoot>
  <div v-html="noScriptHtml"></div>
</template>

<script setup lang="ts">
import { DateTime } from 'luxon'
import { TabsContent, TabsIndicator, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { formatDatePublished } from '~/utilities/rfc-converters-utils'
import { COMMA, FULLSTOP, NONBREAKING_SPACE, SPACE } from '~/utilities/strings'
import { ANCHOR_COLOR_TAILWIND_STYLE } from '~/utilities/theme'
import {
  areaGroupUrlBuilder,
  datatrackerAuthorUrlBuilder,
  useErrataUrlOrigin,
  rfcFormatPathBuilder,
  streamUrlBuilder,
  useWorkingGroupUrlBuilder,
  rfcCitePathBuilder,
  doiUrlBuilder,
  useRfcEditorErrataSearchForRfcUrl,
  infoSeriesPathBuilder
} from '~/utilities/url'
import type { RfcBucketHtmlDocument } from '~/utilities/rfc'
import type { DocumentPojo, NodePojo, RfcCommon } from '~/utilities/rfc-validators'
import { htmlEscapeToText } from '~/utilities/html'
import { renderDocumentPojoToHtmlString } from '~/utilities/renderDocumentPojo'

type Props = {
  rfcBucketHtmlDocument: RfcBucketHtmlDocument
  hasTableOfContents: boolean
  mode: 'desktop' | 'mobile'
}

const props = defineProps<Props>()

const selectedTab = defineModel<number>()

const errataUrlOrigin = useErrataUrlOrigin()

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

const shouldShowStreamValue = (rfc: RfcCommon): boolean => {
  if (
    // https://github.com/ietf-tools/red/issues/147#issuecomment-4337849819
    rfc.stream.slug === 'Legacy'
  ) {
    return false
  }
  return true
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

const streamName = computed(() => {
  switch (props.rfcBucketHtmlDocument.rfc.stream.slug) {
    case 'IAB':
      return 'IAB Stream'
    case 'INDEPENDENT':
      return 'Independent Stream'
    case 'Editorial':
      return 'Editorial Stream'
    case 'Legacy':
      return 'Legacy Stream'
    default:
      return 'Publication Stream'
  }
})

const formats = computed(() =>
  props.rfcBucketHtmlDocument.rfc.formats.filter((format) => {
    switch (format.format) {
      case 'notprepped':
      case 'json':
        return false
    }
    return true
  })
)

const errataSearchForThisRfc = useRfcEditorErrataSearchForRfcUrl(props.rfcBucketHtmlDocument.rfc.number)

const isMounted = ref(false)

onMounted(() => (isMounted.value = true))

type RfcReferences = NonNullable<
  RfcCommon['updates'] | RfcCommon['updated_by'] | RfcCommon['obsoletes'] | RfcCommon['obsoleted_by']
>

const groupName = (rfc: RfcCommon): string => {
  if (
    // https://github.com/ietf-tools/red/issues/147#issuecomment-3417450159
    rfc.stream.slug === 'IRTF'
  ) {
    return 'Research group'
  }
  if (rfc.group?.type === 'individ' || rfc.group?.type === 'area') {
    return 'Source'
  }
  return 'Working group'
}

const groupValuePojo = (rfc: RfcCommon): DocumentPojo => {
  const group = rfc.group

  if (group?.type === 'individ') {
    return [{ type: 'Text', textContent: 'Individual Submission' }]
  }

  if (group?.type === 'area') {
    return [
      { type: 'Text', textContent: 'Individual Submission in the ' },
      {
        type: 'Element',
        nodeName: 'abbr',
        attributes: { title: group.name.replace(/ Area$/i, '') },
        children: [{ type: 'Text', textContent: group.acronym.toUpperCase() }]
      },
      { type: 'Text', textContent: ' area' }
    ]
  }

  const children: NodePojo[] = []
  if (group?.name) children.push({ type: 'Text', textContent: group.name })
  if (group?.acronym) children.push({ type: 'Text', textContent: ` (${group.acronym.toUpperCase()})` })

  return [
    {
      type: 'Element',
      nodeName: 'Anchor',
      attributes: {
        href: useWorkingGroupUrlBuilder(group) ?? '',
        class: LINK_CLASS
      },
      children: [
        ...children,
        {
          type: 'Element',
          nodeName: 'Icon',
          attributes: { name: 'fluent:window-new-20-regular', class: 'text-lg align-middle ml-1' },
          children: []
        }
      ]
    }
  ]
}

const areaValuePojo = (rfc: RfcCommon): DocumentPojo => {
  const { area } = rfc

  const children: NodePojo[] = []
  if (area?.name) children.push({ type: 'Text', textContent: area.name })
  if (area?.acronym) children.push({ type: 'Text', textContent: ` (${area.acronym.toUpperCase()})` })

  return [
    {
      type: 'Element',
      nodeName: 'Anchor',
      attributes: {
        href: areaGroupUrlBuilder(area) ?? '',
        class: LINK_CLASS
      },
      children: [
        ...children,
        {
          type: 'Element',
          nodeName: 'Icon',
          attributes: { name: 'fluent:window-new-20-regular', class: 'text-lg align-middle ml-1' },
          children: []
        }
      ]
    }
  ]
}

const identifierValuePojo = (identifiers: RfcCommon['identifiers']): DocumentPojo => {
  if (!identifiers) return []

  return identifiers.flatMap(({ type, value }) => {
    const labelNode: NodePojo =
      type === 'doi'
        ? {
            type: 'Element',
            nodeName: 'abbr',
            attributes: { title: 'Digital object identifier', class: 'no-underline' },
            children: [{ type: 'Text', textContent: 'DOI' }]
          }
        : {
            type: 'Element',
            nodeName: 'abbr',
            attributes: { title: 'International Standard Serial Number', class: 'no-underline' },
            children: [{ type: 'Text', textContent: 'ISSN' }]
          }

    const ddChildren: NodePojo[] =
      type === 'doi'
        ? [
            {
              type: 'Element',
              nodeName: 'Anchor',
              attributes: { href: doiUrlBuilder(value, true), class: LINK_CLASS },
              children: [
                { type: 'Text', textContent: doiUrlBuilder(value, false) },
                {
                  type: 'Element',
                  nodeName: 'Icon',
                  attributes: { name: 'fluent:window-new-20-regular', class: 'text-lg align-middle ml-1' },
                  children: []
                }
              ]
            }
          ]
        : [{ type: 'Text', textContent: value }]

    return [
      {
        type: 'Element',
        nodeName: 'dt',
        attributes: { class: 'font-bold mt-2' },
        children: [labelNode]
      },
      {
        type: 'Element',
        nodeName: 'dd',
        attributes: {} as Record<string, string>,
        children: ddChildren
      }
    ]
  })
}

const formatsValuePojo = (formats: RfcCommon['formats'], rfcNumber: number): DocumentPojo => {
  if (formats.length === 0) return []

  return [
    {
      type: 'Element',
      nodeName: 'dt',
      attributes: { class: 'font-bold mt-2' },
      children: [{ type: 'Text', textContent: formats.length === 1 ? 'Format' : 'Formats' }]
    },
    {
      type: 'Element',
      nodeName: 'dd',
      attributes: {} as Record<string, string>,
      children: [
        {
          type: 'Element',
          nodeName: 'ul',
          attributes: { class: 'text-sm' },
          children: formats.map(({ format }, index) => ({
            type: 'Element' as const,
            nodeName: 'li',
            attributes: { class: 'inline' },
            children: [
              {
                type: 'Element' as const,
                // This needs to be <a> not <Anchor> because the path is outside the Nuxt app
                // (served direct from blob storage) but is on the same domain
                nodeName: 'a',
                attributes: {
                  href: rfcFormatPathBuilder(`rfc${rfcNumber}`, format),
                  class: LINK_CLASS
                },
                children: [{ type: 'Text' as const, textContent: format.toUpperCase() }]
              },
              { type: 'Text' as const, textContent: index < formats.length - 1 ? `${COMMA}${SPACE}` : FULLSTOP }
            ]
          }))
        }
      ]
    }
  ]
}

const citeValuePojo = (rfcNumber: number): DocumentPojo => {
  const rfcId = `rfc${rfcNumber}`
  return [
    {
      type: 'Element',
      nodeName: 'Anchor',
      attributes: {
        href: rfcCitePathBuilder(rfcId, 'txt'),
        'aria-label': 'Cite TXT URL',
        class: LINK_CLASS
      },
      children: [{ type: 'Text', textContent: 'TXT' }]
    },
    { type: 'Text', textContent: `${COMMA}${SPACE}` },
    {
      type: 'Element',
      nodeName: 'Anchor',
      attributes: {
        href: rfcCitePathBuilder(rfcId, 'xml'),
        'aria-label': 'Cite XML URL',
        class: LINK_CLASS
      },
      children: [{ type: 'Text', textContent: 'XML' }]
    },
    { type: 'Text', textContent: `${COMMA}${SPACE}` },
    {
      type: 'Element',
      nodeName: 'Anchor',
      attributes: {
        href: rfcCitePathBuilder(rfcId, 'bibTeX'),
        'aria-label': 'Cite BibTeX URL',
        class: LINK_CLASS
      },
      children: [{ type: 'Text', textContent: 'BibTeX' }]
    },
    { type: 'Text', textContent: `${FULLSTOP}${SPACE}` }
  ]
}

const streamValuePojo = (rfc: RfcCommon): DocumentPojo => {
  const { stream } = rfc
  const href = streamUrlBuilder(stream)

  if (href) {
    return [
      {
        type: 'Element',
        nodeName: 'Anchor',
        attributes: { href, class: LINK_CLASS },
        children: [
          { type: 'Text', textContent: stream.name },
          {
            type: 'Element',
            nodeName: 'Icon',
            attributes: { name: 'fluent:window-new-20-regular', class: 'text-lg align-middle ml-1' },
            children: []
          }
        ]
      }
    ]
  }

  return [{ type: 'Text', textContent: stream.name }]
}

/**
 * For non-JS users
 */
const noScriptHtml = computed(() => {
  const { rfc } = props.rfcBucketHtmlDocument
  const renderRfcList = (rfcs: RfcReferences): string =>
    rfcs
      .map((rfc, index, arr) => {
        const punctuation = index < arr.length - 1 ? ', ' : '.'
        return `<a href="${infoSeriesPathBuilder(`rfc${rfc.number}`)}" class="${LINK_CLASS}">RFC ${rfc.number}: ${htmlEscapeToText(rfc.title)}</a>${punctuation}`
      })
      .join('')
  return `<noscript data-nosnippet><div class="pb-4">
    <h2 class="text-lg font-bold mt-4">About this RFC</h2>
    <h3 class="text-sm font-bold mt-2">Details</h3>
    <dl>
      ${rfc.updates?.length ? `<dt class="font-bold mt-2">Updates (${rfc.updates.length})</dt><dd>${renderRfcList(rfc.updates)}</dd>` : ''}
      ${rfc.updated_by?.length ? `<dt class="font-bold mt-2">Updated by (${rfc.updated_by.length})</dt><dd>${renderRfcList(rfc.updated_by)}</dd>` : ''}
      ${rfc.obsoletes?.length ? `<dt class="font-bold mt-2">Obsoletes (${rfc.obsoletes.length})</dt><dd>${renderRfcList(rfc.obsoletes)}</dd>` : ''}
      ${rfc.obsoleted_by?.length ? `<dt class="font-bold mt-2">Obsoleted by (${rfc.obsoleted_by.length})</dt><dd>${renderRfcList(rfc.obsoleted_by)}</dd>` : ''}
      ${rfc.published ? `<dt class="font-bold mt-2">Date published</dt><dd>${formattedPublished.value}</dd>` : ''}
      ${
          rfc.authors.length > 0
            ? `<dt class="font-bold mt-2">Authors</dt><dd>${rfc.authors
                .map((author, index, arr) => {
                  const punctuation = index < arr.length - 1 ? ', ' : '.'
                  if (author.datatracker_person_path) {
                    return `<a href="${htmlEscapeToText(datatrackerAuthorUrlBuilder(author.datatracker_person_path))}" class="${LINK_CLASS}">${htmlEscapeToText(author.titlepage_name ?? '(no name)')}</a>${punctuation}`
                  }
                  return `${htmlEscapeToText(author.titlepage_name ?? '(no name)')}${punctuation}`
                })
                .join('')}</dd>`
            : ''
        }
      ${shouldShowGroup(rfc) ? `<dt class="font-bold mt-2">${htmlEscapeToText(groupName(rfc))}</dt><dd>${renderDocumentPojoToHtmlString(groupValuePojo(rfc))}</dd>` : ''}
      ${shouldShowArea(rfc) ? `<dt class="font-bold mt-2">Area</dt><dd>${renderDocumentPojoToHtmlString(areaValuePojo(rfc))}</dd>` : ''}
      ${shouldShowStreamValue(rfc) ? `<dt class="font-bold mt-2">${htmlEscapeToText(streamName.value)}</dt><dd>${renderDocumentPojoToHtmlString(streamValuePojo(rfc))}</dd>` : ''}
      ${rfc.identifiers ? renderDocumentPojoToHtmlString(identifierValuePojo(rfc.identifiers)) : ''}
      ${formats.value.length > 0 ? renderDocumentPojoToHtmlString(formatsValuePojo(formats.value, rfc.number)) : ''}
      <dt class="font-bold mt-2">Cite this RFC</dt><dd class="text-sm">${renderDocumentPojoToHtmlString(citeValuePojo(rfc.number))}</dd>
    </dl>
    <h2 class="text-lg font-bold mt-4">Errata</h2>
    <p><a href="${htmlEscapeToText(errataSearchForThisRfc)}" class="${LINK_CLASS}">RFC ${rfc.number} Errata</a></p>
    </div>
  </noscript>`
})

const noScriptTabsHtml = computed(() => {
  return `<noscript data-nosnippet><div style="background-color: #ffc9c9; color: #9f0712; padding: 7px; text-size: .9rem;">Your browser has JavaScript disabled so the following tabs will not work. The 'About this RFC' and 'Errata' tabs are instead displayed after the table of contents.</div></noscript>`
})

const LINK_CLASS = `${ANCHOR_COLOR_TAILWIND_STYLE} cursor-pointer underline`
const TAB_CONTENT_CLASS = 'flex flex-col min-h-0 text-black dark:text-white'
const DEFAULT_CLASS = 'py-4 px-[1px] whitespace-nowrap border-b-2 text-sm md:text-md'
const ONUNMOUNTED_CLASS = 'border-b-transparent'
const ONMOUNTED_CLASS = 'hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer'
const SELECTED_CLASS =
  'text-bold-without-layout-shift text-gray-900 dark:text-gray-100 border-b-blue-900 dark:border-b-white font-medium'
const UNSELECTED_CLASS = 'border-b-transparent text-gray-800 dark:text-gray-300'
</script>
