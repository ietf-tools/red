<template>
  <RFCTabsCollapseButton v-if="mode === 'desktop'" />
  <TabsRoot
    v-if="!isSidebarCollapsed"
    v-model="selectedTab"
    :class="[
      'min-h-0 flex flex-col',
      // WCAG requires 1.5 minimum.
      'leading-normal',
      textScaleClasses(uiSettings.textScale)
    ]">
    <div v-html="noScriptTabsHtml"></div>
    <TabsList class="border-b-2 border-gray-400">
      <HorizontalScrollable
        v-if="!isSidebarCollapsed"
        :inner-class="['flex flex-row gap-5', { 'px-2': props.mode === 'mobile' }]">
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
          :disabled="
            !isMounted // ensure they're not clickable buttons in non-JS
          "
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
          :disabled="
            !isMounted // ensure they're not clickable buttons in non-JS
          "
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
          :disabled="
            !isMounted // ensure they're not clickable buttons in non-JS
          "
          :value="2">
          Errata
          {{ NONBREAKING_SPACE }}
          <DiamondText
            v-if="props.rfcBucketHtmlDocument.errataList && props.rfcBucketHtmlDocument.errataList.length > 0"
            :text="props.rfcBucketHtmlDocument.errataList.length.toString()" />
        </TabsTrigger>
        <TabsTrigger
          :class="[
            DEFAULT_CLASS,
            {
              [ONMOUNTED_CLASS]: isMounted,
              [ONUNMOUNTED_CLASS]: !isMounted,
              [SELECTED_CLASS]: selectedTab === 3 && isMounted,
              [UNSELECTED_CLASS]: selectedTab !== 3
            }
          ]"
          :disabled="
            !isMounted // ensure they're not clickable buttons in non-JS
          "
          :value="3">
          Participate
        </TabsTrigger>
      </HorizontalScrollable>
    </TabsList>

    <TabsContent
      v-if="props.hasTableOfContents && props.rfcBucketHtmlDocument.tableOfContents"
      v-show="!isSidebarCollapsed"
      :value="0"
      :class="[
        TAB_CONTENT_CLASS,
        {
          'px-4': props.mode === 'mobile'
        }
      ]">
      <TableOfContentsHighlight
        v-if="tableOfContents && props.mode === 'desktop'"
        :toc="tableOfContents"
        list-type="ordered"
        wrapper-class="min-h-0 pt-4 pb-2 px-4"
        list-class="mr-1"
        nested-list-class="pl-2"
        :links-class="`block py-2 dark:border-t-gray-500 ${ANCHOR_COLOR_TAILWIND_STYLE}`"
        links-active-class="text-bold-without-layout-shift"
        link-class="block no-underline hover:underline no-underline hover:underline focus:underline"
        last-link-class="flex-1"
        navAriaLabel="In this section">
        <Heading level="2" style-level="5" class="mt-4 mb-1 sr-only"> In this section </Heading>
      </TableOfContentsHighlight>
      <TableOfContents
        v-else-if="tableOfContents && props.mode === 'mobile'"
        :toc="tableOfContents"
        list-type="ordered"
        wrapper-class="flex flex-col min-h-0 pt-4 pb-2 px-4"
        list-class="mt-2 mr-1 pl-0 -ml-1"
        nested-list-class="pl-2"
        :list-item-class="`block py-2 dark:border-t-gray-500 ${ANCHOR_COLOR_TAILWIND_STYLE}`"
        links-active-class="text-bold-without-layout-shift"
        link-class="block no-underline hover:underline"
        last-link-class="flex-1">
        <Heading level="2" style-level="5" class="mt-4 mb-1 sr-only"> In this section </Heading>
      </TableOfContents>
    </TabsContent>
    <TabsContent
      v-show="!isSidebarCollapsed"
      :value="1"
      :class="[
        TAB_CONTENT_CLASS,
        {
          'px-4': props.mode === 'mobile'
        }
      ]">
      <VerticalScrollable>
        <Heading level="2" style-level="4" class="mt-4"> Details </Heading>
        <dl class="pb-6">
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
                    <LinkWithIcon
                      v-if="author.datatracker_person_path"
                      :href="datatrackerAuthorUrlBuilder(author.datatracker_person_path)"
                      :class="[ANCHOR_COLOR_TAILWIND_STYLE, ' py-0.5 pr-0.5 mb-0.5']">
                      <RFCDocumentAuthor :author="author" />
                    </LinkWithIcon>
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
              <DocumentPojo :value="groupValuePojo" />
            </dd>
          </template>

          <template v-if="shouldShowArea(props.rfcBucketHtmlDocument.rfc)">
            <dt class="font-bold mt-2">Area</dt>
            <dd>
              <DocumentPojo :value="areaValuePojo" />
            </dd>
          </template>

          <dt class="font-bold mt-2">{{ streamName }}</dt>
          <dd v-if="shouldShowStreamValue(props.rfcBucketHtmlDocument.rfc)">
            <DocumentPojo :value="streamValuePojo" />
          </dd>

          <DocumentPojo :value="identifierValuePojo" />

          <DocumentPojo :value="formatsValuePojo" />

          <dt class="font-bold mt-2">Cite this RFC</dt>
          <dd><DocumentPojo :value="citeValuePojo" /></dd>

          <dt class="font-bold mt-2">Document history</dt>
          <dd>
            <LinkWithIcon :href="datatrackerRFCUrl" :class="ANCHOR_COLOR_TAILWIND_STYLE">
              View history of <component :is="formattedTitle" />
            </LinkWithIcon>
          </dd>

          <dt class="font-bold mt-2">IPR Disclosures</dt>
          <dd>
            <LinkWithIcon :href="datatrackerIprSearchUrl" :class="ANCHOR_COLOR_TAILWIND_STYLE">
              Find IPR Disclosures from the IETF
            </LinkWithIcon>
          </dd>
        </dl>
      </VerticalScrollable>
    </TabsContent>
    <TabsContent
      v-show="!isSidebarCollapsed"
      :value="2"
      :class="[
        TAB_CONTENT_CLASS,
        {
          'px-4': props.mode === 'mobile'
        }
      ]">
      <VerticalScrollable class="pl-1">
        <Heading level="2" style-level="4" class="mt-3 mb-1"> About Errata </Heading>
        <p class="leading-[1.5]">
          RFC Errata are official records of technical or editorial errors found in published RFCs, which remain
          unchanged once issued. You can report Errata only after verifying the issue is not already documented and
          constitutes a genuine error in the text rather than a request for new features or protocol changes.
        </p>
        <p class="border-b-1 border-gray-200 py-6 mb-4">
          <LinkWithIcon
            :href="errataSearchForThisRfc"
            class="bg-blue-300 text-white dark:bg-blue-800 border-0 no-underline hover:underline focus:underline rounded my-2 p-3 font-bold">
            Report a new erratum
          </LinkWithIcon>
        </p>
        <ErrataList :errata-list="props.rfcBucketHtmlDocument.errataList" />
      </VerticalScrollable>
    </TabsContent>
    <TabsContent
      v-show="!isSidebarCollapsed"
      :value="3"
      :class="[
        TAB_CONTENT_CLASS,
        {
          'px-4': props.mode === 'mobile'
        }
      ]">
      <VerticalScrollable class="pl-1">
        <Heading level="2" style-level="4" class="mt-3 mb-1"> Participate </Heading>
        <div class="flex flex-col gap-2">
          <DocumentPojo :value="participateValuePojo" />
        </div>
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
  rfcFormatPathBuilder,
  streamUrlBuilder,
  useWorkingGroupUrlBuilder,
  rfcCitePathBuilder,
  doiUrlBuilder,
  useRfcEditorErrataSearchForRfcUrl,
  infoSeriesPathBuilder,
  useDatatrackerRFCUrlBuilder,
  useDatatrackerIprSearchForRfcUrlBuilder,
  IAB_URL_ORIGIN,
  INDEPENDENT_SUBMISSIONS_URL,
  IETF_URL_ORIGIN,
  IRTF_URL_ORIGIN,
  DATATRACKER_IESG_STATEMENT_NON_WORKING_GROUP_URL,
  areaAboutUrlBuilder
} from '~/utilities/url'
import type { RfcBucketHtmlDocument } from '~/utilities/rfc'
import { realGroup } from '~/utilities/rfc'
import type { DocumentPojo, NodePojo, RfcCommon } from '~/utilities/rfc-validators'
import { htmlEscapeToText } from '~/utilities/html'
import { renderDocumentPojoToHtmlString, renderNodePojoToHtmlString } from '~/utilities/renderDocumentPojo'
import { mergeAdjacentLinks } from '../utilities/tableOfContents'
import { formatTitleAsVNode } from '~/utilities/rfc-title'
import { useUiSettingsStore } from '~/stores/ui-settings'

type Props = {
  rfcBucketHtmlDocument: RfcBucketHtmlDocument
  hasTableOfContents: boolean
  mode: 'desktop' | 'mobile'
}

const props = defineProps<Props>()

const selectedTab = defineModel<number>()

const uiSettings = useUiSettingsStore()

const isSidebarCollapsed = computed(() => props.mode === 'desktop' && uiSettings.isRfcSidebarEffectivelyCollapsed)

const textScaleClasses = (textScale: number): string => {
  if (textScale <= 1) {
    return 'text-sm'
  }
  if (textScale <= 1.1) {
    return 'text-base'
  }
  if (textScale <= 1.2) {
    return 'text-lg'
  }
  if (textScale <= 1.3) {
    return 'text-xl'
  }
  if (textScale <= 1.4) {
    return 'text-2xl'
  }

  return 'text-2xl'
}

const formattedPublished = computed(() => {
  if (!props.rfcBucketHtmlDocument.rfc.published) return
  const dt = DateTime.fromISO(props.rfcBucketHtmlDocument.rfc.published)
  return formatDatePublished(dt, true)
})

const tableOfContents = computed(() => {
  const { tableOfContents } = props.rfcBucketHtmlDocument
  if (!tableOfContents) {
    return undefined
  }
  return mergeAdjacentLinks(tableOfContents)
})

const shouldShowArea = (rfc: RfcCommon): boolean => {
  // Area is only meaningful for IETF-stream WG/AG documents.
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
    // 'Legacy' is a placeholder stream, not one worth showing.
    // https://github.com/ietf-tools/red/issues/147#issuecomment-4337849819
    rfc.stream.slug === 'Legacy'
  ) {
    return false
  }
  return true
}

const shouldShowGroup = (rfc: RfcCommon): boolean => {
  const { stream, group } = rfc
  if (
    // The datatracker gives every document without a group the "Individual Submissions" group, but
    // that wording only means something in the IETF stream.
    // https://github.com/ietf-tools/red/issues/460
    stream.slug !== 'IETF' &&
    (group?.type === 'individ' || group?.type === 'area')
  ) {
    return false
  }
  switch (stream.slug) {
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

const areaAboutUrl = computed(() => areaAboutUrlBuilder(props.rfcBucketHtmlDocument.rfc.area))

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

const formattedTitle = computed(() => formatTitleAsVNode(`rfc${props.rfcBucketHtmlDocument.rfc.number}`, true))

const datatrackerRFCUrl = computed(() => useDatatrackerRFCUrlBuilder(props.rfcBucketHtmlDocument.rfc.number))
const datatrackerIprSearchUrl = computed(() =>
  useDatatrackerIprSearchForRfcUrlBuilder(props.rfcBucketHtmlDocument.rfc.number)
)

const errataSearchForThisRfc = computed(() => useRfcEditorErrataSearchForRfcUrl(props.rfcBucketHtmlDocument.rfc.number))

const isMounted = ref(false)

onMounted(() => (isMounted.value = true))

type RfcReferences = NonNullable<
  RfcCommon['updates'] | RfcCommon['updated_by'] | RfcCommon['obsoletes'] | RfcCommon['obsoleted_by']
>

const groupName = (rfc: RfcCommon): string => {
  if (
    // IRTF documents come from research groups, not working groups.
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

// Drawn by OutsideLinkIcon.vue, so a link to one of the IETF community's sites (see utilities/url-destination.ts) gets no icon
const outsideLinkIconPojo = (href: string): NodePojo => ({
  type: 'Element',
  nodeName: 'OutsideLinkIcon',
  attributes: { href },
  children: []
})

const paragraphPojo = (children: NodePojo[]): NodePojo => ({
  type: 'Element',
  nodeName: 'p',
  attributes: { class: 'leading-[1.5] py-1' },
  children
})

const anchorPojo = (href: string, text: string): NodePojo => ({
  type: 'Element',
  nodeName: 'Anchor',
  attributes: { href, class: LINK_CLASS },
  children: [{ type: 'Text', textContent: text }]
})

const groupValuePojo = computed((): DocumentPojo => {
  const { rfc } = props.rfcBucketHtmlDocument
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

  const groupHref = useWorkingGroupUrlBuilder(group) ?? ''
  const children: NodePojo[] = []
  if (group?.name) children.push({ type: 'Text', textContent: group.name })
  if (group?.acronym) children.push({ type: 'Text', textContent: ` (${group.acronym.toUpperCase()})` })

  return [
    {
      type: 'Element',
      nodeName: 'Anchor',
      attributes: {
        href: groupHref,
        class: LINK_CLASS
      },
      children: [...children, outsideLinkIconPojo(groupHref)]
    }
  ]
})

const areaValuePojo = computed((): DocumentPojo => {
  const { rfc } = props.rfcBucketHtmlDocument
  const { area } = rfc

  const areaHref = areaGroupUrlBuilder(area) ?? ''
  const children: NodePojo[] = []
  if (area?.name) children.push({ type: 'Text', textContent: area.name })
  if (area?.acronym) children.push({ type: 'Text', textContent: ` (${area.acronym.toUpperCase()})` })

  return [
    {
      type: 'Element',
      nodeName: 'Anchor',
      attributes: {
        href: areaHref,
        class: LINK_CLASS
      },
      children: [...children, outsideLinkIconPojo(areaHref)]
    }
  ]
})

const identifierValuePojo = computed((): DocumentPojo => {
  const { identifiers } = props.rfcBucketHtmlDocument.rfc
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
                outsideLinkIconPojo(doiUrlBuilder(value, true))
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
})

const formatsValuePojo = computed((): DocumentPojo => {
  const { value: availableFormats } = formats
  const { number: rfcNumber } = props.rfcBucketHtmlDocument.rfc
  if (availableFormats.length === 0) return []

  return [
    {
      type: 'Element',
      nodeName: 'dt',
      attributes: { class: 'font-bold mt-2' },
      children: [{ type: 'Text', textContent: availableFormats.length === 1 ? 'Format' : 'Formats' }]
    },
    {
      type: 'Element',
      nodeName: 'dd',
      attributes: {} as Record<string, string>,
      children: [
        {
          type: 'Element',
          nodeName: 'ul',
          attributes: {},
          children: availableFormats.map(({ format }, index) => ({
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
              {
                type: 'Text' as const,
                textContent: index < availableFormats.length - 1 ? `${COMMA}${SPACE}` : FULLSTOP
              }
            ]
          }))
        }
      ]
    }
  ]
})

const citeValuePojo = computed((): DocumentPojo => {
  const { number: rfcNumber } = props.rfcBucketHtmlDocument.rfc
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
})

const streamValuePojo = computed((): DocumentPojo => {
  const { stream } = props.rfcBucketHtmlDocument.rfc
  const href = streamUrlBuilder(stream)

  if (href) {
    return [
      {
        type: 'Element',
        nodeName: 'Anchor',
        attributes: { href, class: LINK_CLASS },
        children: [{ type: 'Text', textContent: stream.name }, outsideLinkIconPojo(href)]
      }
    ]
  }

  return [{ type: 'Text', textContent: stream.name }]
})

const participateValuePojo = computed((): DocumentPojo => {
  const { rfc } = props.rfcBucketHtmlDocument
  const { area } = rfc
  const group = realGroup(rfc.group)
  const streamPojo = (): DocumentPojo => {
    switch (rfc.stream.slug) {
      case 'Editorial':
      case 'IRTF':
      case 'IETF': {
        const groupKind = rfc.stream.slug === 'IRTF' ? 'research group' : 'working group'
        if (!group)
          return [paragraphPojo([{ type: 'Text', textContent: `There is no ${groupKind} associated with this RFC.` }])]
        const about = useWorkingGroupUrlBuilder(group, 'about')
        const documents = useWorkingGroupUrlBuilder(group, 'documents')
        const meetings = useWorkingGroupUrlBuilder(group, 'meetings')
        return [
          ...(group.state === 'concluded'
            ? [paragraphPojo([{ type: 'Text', textContent: `This ${groupKind} has concluded.` }])]
            : []),
          ...(about ? [paragraphPojo([anchorPojo(about, group.name)])] : []),
          ...(documents ? [paragraphPojo([anchorPojo(documents, 'Read work in progress')])] : []),
          ...(meetings ? [paragraphPojo([anchorPojo(meetings, 'Meetings')])] : [])
        ]
      }
      case 'IAB':
        return [
          {
            type: 'Text',
            textContent:
              'The Internet Architecture Board (IAB) provides long-range technical direction for Internet development, ensuring the Internet continues to grow and evolve as a platform for global communication and innovation. The board consists of nominated members. To learn more, visit '
          },
          {
            type: 'Element',
            nodeName: 'Anchor',
            attributes: {
              href: IAB_URL_ORIGIN,
              class: LINK_CLASS
            },
            children: [{ type: 'Text', textContent: 'iab.org' }]
          },
          { type: 'Text', textContent: '.' }
        ]
      case 'INDEPENDENT':
        return [
          {
            type: 'Text',
            textContent:
              'The Independent Submission Stream allows RFC publication for some documents that are outside the official processes of the IETF, IAB, and IRTF but are relevant to the Internet community. '
          },
          {
            type: 'Element',
            nodeName: 'Anchor',
            attributes: {
              href: INDEPENDENT_SUBMISSIONS_URL,
              class: LINK_CLASS
            },
            children: [{ type: 'Text', textContent: 'Read more' }]
          },
          { type: 'Text', textContent: ' about submitting an independent RFC. ' }
        ]
      case 'Legacy':
        return [
          {
            type: 'Text',
            textContent: 'This publication predates the establishment of the '
          },
          {
            type: 'Element',
            nodeName: 'Anchor',
            attributes: {
              href: IETF_URL_ORIGIN,
              class: LINK_CLASS
            },
            children: [{ type: 'Text', textContent: 'IETF' }]
          },
          { type: 'Text', textContent: ', ' },
          {
            type: 'Element',
            nodeName: 'Anchor',
            attributes: {
              href: IRTF_URL_ORIGIN,
              class: LINK_CLASS
            },
            children: [{ type: 'Text', textContent: 'IRTF' }]
          },
          { type: 'Text', textContent: ', and ' },
          {
            type: 'Element',
            nodeName: 'Anchor',
            attributes: {
              href: IAB_URL_ORIGIN,
              class: LINK_CLASS
            },
            children: [{ type: 'Text', textContent: 'IAB' }]
          },
          {
            type: 'Text',
            textContent:
              '. If you are interested in current work, visit the relevant sites or check out the working groups that have published more recent RFCs on this topic.'
          }
        ]
    }

    return []
  }
  return [
    ...streamPojo(),
    paragraphPojo([
      anchorPojo(DATATRACKER_IESG_STATEMENT_NON_WORKING_GROUP_URL, 'Guidance on Area Director Sponsoring of Documents')
    ]),
    ...(areaAboutUrl.value && area ? [paragraphPojo([anchorPojo(areaAboutUrl.value, `${area.name} Director`)])] : [])
  ]
})

/** For non-JS users */
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
                  return `${renderNodePojoToHtmlString({
                    type: 'Element',
                    nodeName: 'Anchor',
                    attributes: {
                      href: datatrackerAuthorUrlBuilder(author.datatracker_person_path),
                      class: LINK_CLASS
                    },
                    children: [{ type: 'Text', textContent: author.titlepage_name ?? '(no name)' }]
                  })}${punctuation}`
                }
                return `${htmlEscapeToText(author.titlepage_name ?? '(no name)')}${punctuation}`
              })
              .join('')}</dd>`
          : ''
      }
      ${shouldShowGroup(rfc) ? `<dt class="font-bold mt-2">${htmlEscapeToText(groupName(rfc))}</dt><dd>${renderDocumentPojoToHtmlString(groupValuePojo.value)}</dd>` : ''}
      ${shouldShowArea(rfc) ? `<dt class="font-bold mt-2">Area</dt><dd>${renderDocumentPojoToHtmlString(areaValuePojo.value)}</dd>` : ''}
      ${shouldShowStreamValue(rfc) ? `<dt class="font-bold mt-2">${htmlEscapeToText(streamName.value)}</dt><dd>${renderDocumentPojoToHtmlString(streamValuePojo.value)}</dd>` : ''}
      ${rfc.identifiers ? renderDocumentPojoToHtmlString(identifierValuePojo.value) : ''}
      ${formats.value.length > 0 ? renderDocumentPojoToHtmlString(formatsValuePojo.value) : ''}
      <dt class="font-bold mt-2">Cite this RFC</dt><dd class="text-sm">${renderDocumentPojoToHtmlString(citeValuePojo.value)}</dd>
      <dt class="font-bold mt-2">Document history</dt><dd class="text-sm">${anchorHtml(datatrackerRFCUrl.value, ANCHOR_COLOR_TAILWIND_STYLE, `View history of RFC ${rfc.number}`)}</dd>
      <dt class="font-bold mt-2">IPR Disclosures</dt><dd class="text-sm">${anchorHtml(datatrackerIprSearchUrl.value, ANCHOR_COLOR_TAILWIND_STYLE, 'Find IPR Disclosures from the IETF')}</dd>
    </dl>
    <h3 class="text-lg font-bold mt-4">Errata</h3>
    <p>${anchorHtml(errataSearchForThisRfc.value, LINK_CLASS, `RFC ${rfc.number} Errata`)}</p>
    <h3 class="text-lg font-bold mt-4">Participate</h3>
    ${renderDocumentPojoToHtmlString(participateValuePojo.value)}
    </div>
  </noscript>`
})

// Through the pojo renderer so these get the same `rel` as every other link off the site
const anchorHtml = (href: string, className: string, text: string) =>
  renderNodePojoToHtmlString({
    type: 'Element',
    nodeName: 'Anchor',
    attributes: { href, class: className },
    children: [{ type: 'Text', textContent: text }]
  })

const noScriptTabsHtml = computed(() => {
  return `<noscript data-nosnippet><div style="background-color: #ffc9c9; color: #9f0712; padding: 7px; text-size: .9rem;">Your browser has JavaScript disabled so the following tabs will not work. The 'About this RFC' and 'Errata' tabs are instead displayed after the table of contents.</div></noscript>`
})

const LINK_CLASS = `${ANCHOR_COLOR_TAILWIND_STYLE} cursor-pointer underline`
const TAB_CONTENT_CLASS = 'flex flex-col min-h-0 text-black dark:text-white'
const DEFAULT_CLASS = 'py-4 px-[1px] whitespace-nowrap border-b-2'
const ONUNMOUNTED_CLASS = 'border-b-transparent'
const ONMOUNTED_CLASS = 'hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer'
const SELECTED_CLASS =
  'text-bold-without-layout-shift text-gray-900 dark:text-gray-100 border-b-blue-900 dark:border-b-white font-medium'
const UNSELECTED_CLASS = 'border-b-transparent text-gray-800 dark:text-gray-300'
</script>
