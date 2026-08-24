<template>
  <div v-if="featureFlags.formatsAlsoViewAs">
    <p class="sm:-mt-10 pl-4 pr-4 sm:pr-14 lg:pr-0 pt-2 text-base text-right text-gray-800 dark:text-gray-200">
      View as: <DocumentPojo :value="formatsPojo" />
    </p>
  </div>

  <div class="px-2">
    <div class="flex flex-col">
      <RFCDocumentMobileInfoButton @click="isModalOpen = true"> Info </RFCDocumentMobileInfoButton>
    </div>

    <Heading
      level="1"
      class="mt-4 mb-2 ml-2 max-w-[var(--max-text-block-width)] px-0 print:text-lg print:border-b-2 print:border-black print:text-center font-feature-settings-calt-off">
      <RFCTitle :rfc="props.rfcBucketHtmlDocument.rfc" hide-title has-trailing-colon />
      {{ SPACE }}
      <RFCTitleSubseries :rfc="props.rfcBucketHtmlDocument.rfc" has-trailing-colon has-underline />
      {{ SPACE }}
      <span class="font-normal">{{ props.rfcBucketHtmlDocument.rfc.title }}</span>
    </Heading>

    <Heading v-if="isAprilFool" level="2" class="mb-2 px-3 xs:px-0 print:text-center">
      <span class="inline pr-2">
        <AprilFools />
      </span>
    </Heading>

    <ul class="block print:text-center font-feature-settings-calt-off ml-2.5">
      <li
        v-for="(author, authorIndex) in props.rfcBucketHtmlDocument.rfc.authors"
        :key="authorIndex"
        class="inline-block">
        <RFCDocumentAuthor :author="author" />
        <template v-if="authorIndex < props.rfcBucketHtmlDocument.rfc.authors.length - 1">
          {{ COMMA }} {{ NONBREAKING_SPACE }}
        </template>
      </li>
    </ul>

    <RFCDocumentBodyPill :rfc="props.rfcBucketHtmlDocument.rfc" />

    <RFCDocumentReef v-if="featureFlags.oidc" :rfc-number="rfcBucketHtmlDocument.rfc.number" :reef-stats="reefStats" />

    <RFCDocumentSuperseded
      :data="obsoleted_by"
      variant="warning"
      heading-text="This RFC is now obsolete"
      ui-settings-key="obsoletedByMode" />

    <RFCDocumentSuperseded
      :data="updated_by"
      variant="info"
      heading-text="This RFC was updated"
      ui-settings-key="updatedByMode" />

    <div
      :class="[
        `rfc-content rfc-content-type-${props.rfcBucketHtmlDocument.documentHtmlType} relative mt-5 sm:text-base lg:text-base font-feature-settings-calt-off`,
        props.rfcBucketHtmlDocument.documentHtmlType === 'xml2rfc' && featureFlags.hasTextScale
          ? {
              // Line height, letter spacing, word spacing and paragraph spacing are
              // tweened together, anchored on DEFAULT_TEXT_SCALE so that the default
              // renders 1.5/0.12em/0.16em/2rem and each half of the range still reaches
              // its extreme: TEXT_SCALE_MIN gives 1/0em/0em/0rem and TEXT_SCALE_MAX gives
              // 2/0.5em/1em/3rem. WCAG requires a line height of 1.5 minimum, so scales
              // below DEFAULT_TEXT_SCALE trade that away for density.
              'leading-[1] tracking-[0em] [word-spacing:0em] [&_p]:mb-[0rem]': uiSettingsStore.textScale === 1,
              'leading-[1.1] tracking-[0.024em] [word-spacing:0.032em] [&_p]:mb-[0.4rem]':
                uiSettingsStore.textScale === 1.1,
              'leading-[1.2] tracking-[0.048em] [word-spacing:0.064em] [&_p]:mb-[0.8rem]':
                uiSettingsStore.textScale === 1.2,
              'leading-[1.3] tracking-[0.072em] [word-spacing:0.096em] [&_p]:mb-[1.2rem]':
                uiSettingsStore.textScale === 1.3,
              'leading-[1.4] tracking-[0.096em] [word-spacing:0.128em] [&_p]:mb-[1.6rem]':
                uiSettingsStore.textScale === 1.4,
              'leading-[1.5] tracking-[0.12em] [word-spacing:0.16em] [&_p]:mb-[2rem]':
                uiSettingsStore.textScale === 1.5,
              'leading-[1.6] tracking-[0.196em] [word-spacing:0.328em] [&_p]:mb-[2.2rem]':
                uiSettingsStore.textScale === 1.6,
              'leading-[1.7] tracking-[0.272em] [word-spacing:0.496em] [&_p]:mb-[2.4rem]':
                uiSettingsStore.textScale === 1.7,
              'leading-[1.8] tracking-[0.348em] [word-spacing:0.664em] [&_p]:mb-[2.6rem]':
                uiSettingsStore.textScale === 1.8,
              'leading-[1.9] tracking-[0.424em] [word-spacing:0.832em] [&_p]:mb-[2.8rem]':
                uiSettingsStore.textScale === 1.9,
              'leading-[2] tracking-[0.5em] [word-spacing:1em] [&_p]:mb-[3rem]': uiSettingsStore.textScale === 2
            }
          : 'leading-[1.5]' // WCAG requires 1.5 minimum
      ]">
      <component :is="enrichedDocument" />
    </div>
  </div>
</template>

<script setup lang="ts">
import RFCTitleSubseries from './RFCTitleSubseries.vue'
import { isAprilFoolsRfc } from '~/utilities/rfc'
import { parseMaybeRfcLink, rfcFormatPathBuilder } from '~/utilities/url'
import { COMMA, NONBREAKING_SPACE, FULLSTOP, SPACE } from '~/utilities/strings'
import type { BreadcrumbItem } from '~/components/BreadcrumbsTypes'
import type { RfcBucketHtmlDocument } from '~/utilities/rfc'
import { ANCHOR_COLOR_TAILWIND_STYLE } from '~/utilities/theme'
import {
  renderDocumentPojo,
  renderNodePojo,
  defaultRenderer,
  type ElementRenderers,
  nodePojoToInnerText,
  renderNodePojoToHtmlString
} from '~/utilities/renderDocumentPojo'
import { AMaybeRFCLink, HorizontalScrollable, PdfPages } from '#components'
import { nodePojoWalker } from '~/utilities/dom'
import { useFeatureFlags } from '~/utilities/feature-flags'
import { useRfcReefStats } from '~/utilities/reef-stats'
import AbnfViewerAsync from './abnf-viewer/AbnfViewerAsync.vue'
import type { DocumentPojo, RfcCommon, RfcCommonFormatName } from '~/utilities/rfc-validators.js'

type Props = {
  rfcBucketHtmlDocument: RfcBucketHtmlDocument
  gotoErrata: () => void
  breadcrumbItems: BreadcrumbItem[]
  changeTab: (index: number) => void
}

const props = defineProps<Props>()

const isModalOpen = defineModel<boolean>('isModalOpen')

const uiSettingsStore = useUiSettingsStore()

const featureFlags = useFeatureFlags()

// Loaded here rather than in RFCDocumentReef, which is where they're rendered, because the Reef row
// is behind a feature flag read from localStorage: nothing inside that v-if exists during the server
// render, so a loader placed there could only ever run in the browser. Here it runs on the server and
// the numbers reach the page as payload.
const reefStats = useRfcReefStats(
  () => props.rfcBucketHtmlDocument.rfc.number,
  () => props.rfcBucketHtmlDocument.reefStats
)

const RFC_LINK_FORCE_NOWRAP_MAXIMUM_CHARACTER_COUNT = 10

const rfcHtmlPojoRenderers: ElementRenderers = {
  ...defaultRenderer,
  a: (node, childrenForVue) => {
    const isRfcLink = parseMaybeRfcLink(node.attributes.href ?? '')

    if (!isRfcLink) {
      return h(
        AMaybeRFCLink,
        {
          href: '',
          ...node.attributes
        },
        () => childrenForVue
      )
    }

    const rfcLinkText = node.children.map(renderNodePojoToHtmlString).join('')
    const canPreventWrappingWithoutCausingLayoutProblems =
      rfcLinkText.length <= RFC_LINK_FORCE_NOWRAP_MAXIMUM_CHARACTER_COUNT

    return h(
      AMaybeRFCLink,
      {
        href: '',
        ...node.attributes,
        class: [node.attributes.class, canPreventWrappingWithoutCausingLayoutProblems ? 'whitespace-nowrap' : undefined]
          .filter(Boolean)
          .join(' ')
      },
      () => childrenForVue
    )
  },
  svg: (node, childrenForVue) =>
    h(
      node.nodeName,
      {
        ...node.attributes,
        class: `dark:contrast-125 dark:brightness-85 dark:invert ${node.attributes.class ?? ''}`
      },
      childrenForVue
    ),
  pre: (node, childrenForVue) => {
    if (props.rfcBucketHtmlDocument.documentHtmlType === 'xml2rfc') {
      if (featureFlags.value.isAbnfDiagramsActive && node.attributes.class?.includes('lang-abnf')) {
        const abnfText = nodePojoToInnerText(node.children)
        return h(AbnfViewerAsync, { abnfText })
      }
    }
    return h(
      node.nodeName,
      {
        ...node.attributes,
        class: ` ${node.attributes?.class ?? ''}`
      },
      childrenForVue
    )
  },
  HorizontalScrollable: (node, childrenForVue) => {
    const {
      'data-component': _dataComponent,
      'data-copy-mode': dataCopyModeBoolString,
      class: classAttr,
      ...attributes
    } = node.attributes
    return h(
      HorizontalScrollable,
      {
        ...attributes,
        class: `mb-2 md:mb-4 ${classAttr ?? ''}`,
        copyMode: dataCopyModeBoolString === true.toString()
      },
      () => childrenForVue
    )
  },
  Placeholder: (node, childrenForVue) => {
    // FIXME: delete this case once the component is removed from the bucket
    console.warn('[rfc-info]', 'Found deprecated `Placeholder` component.')
    return h('div', node.attributes, () => childrenForVue)
  },
  PdfPages: (node) => {
    const children = nodePojoWalker(node.children, (n) => {
      if (n.type === 'Element' && n.nodeName.toLowerCase() === 'img') {
        n.attributes['class'] = 'w-full min-w-[425px] max-w-[1000px] dark:contrast-125 dark:brightness-85 dark:invert'
      }
      return n
    }).map((node) => renderNodePojo(node, rfcHtmlPojoRenderers))
    return h(PdfPages, node.attributes, () => children)
  }
}

const enrichedDocument = computed<VNode>(() =>
  renderDocumentPojo(props.rfcBucketHtmlDocument.documentHtmlObj, rfcHtmlPojoRenderers)
)

const maxPreformattedLineLength = computed(() => props.rfcBucketHtmlDocument.maxPreformattedLineLength.max)

const isAprilFool = computed(() => isAprilFoolsRfc(props.rfcBucketHtmlDocument.rfc))

const obsoleted_by = computed(() => {
  return props.rfcBucketHtmlDocument.rfc.obsoleted_by?.toSorted((a, b) => a.number - b.number)
})

const updated_by = computed(() => {
  return props.rfcBucketHtmlDocument.rfc.updated_by?.toSorted((a, b) => a.number - b.number)
})

const formatsPojo = computed((): DocumentPojo => {
  const rfcNumber = props.rfcBucketHtmlDocument.rfc.number
  const formats = props.rfcBucketHtmlDocument.rfc.formats
  if (formats.length === 0) return []

  const LINK_CLASS = `${ANCHOR_COLOR_TAILWIND_STYLE} cursor-pointer underline hover:underline focus:underline`

  const friendlyFormatName = (format: RfcCommonFormatName): string => {
    switch (format) {
      case 'html':
        return 'Compact HTML'
      case 'txt':
        return 'Plain Text'
    }
    return format.toUpperCase()
  }

  const preferredFormatsOrder: RfcCommonFormatName[] = [
    'txt',
    'html',
    'pdf',
    'ps'
    // 'xml',
    // 'json',
    // 'notprepped'
  ]

  const sortedFormats: RfcCommon['formats'] = preferredFormatsOrder
    .map((preferredFormat): RfcCommon['formats'][number] | undefined =>
      formats.find((format) => format.format === preferredFormat)
    )
    .filter((val) => !!val)

  return [
    {
      type: 'Element',
      nodeName: 'ul',
      attributes: { class: 'inline' },
      children: sortedFormats.map(({ format }, index) => ({
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
            children: [{ type: 'Text' as const, textContent: friendlyFormatName(format) }]
          },
          { type: 'Text' as const, textContent: index < sortedFormats.length - 1 ? `${COMMA}${SPACE}` : FULLSTOP }
        ]
      }))
    }
  ]
})
</script>

<style lang="postcss">
/** Note that this is postcss so we can use @nested-import */

.rfc-content {
  --layout-bleed-left: 0px;
  --layout-bleed-right: 0px;

  ol,
  ul {
    /* revert some tailwind reset styles because the imported CSS expect different defaults */
    all: revert;
  }

  pre .hide-in-preformatted-text {
    /* The touch-based UX for RFCRouterLink inserts buttons after RFC links which
       breaks <pre> layout so we hide the buttons in <pre> sections.
       The pointer-based UX still works, as does the touch-based UX in non-<pre>
       sections.
    */
    display: none;
  }
}

.rfc-content-type-xml2rfc {
  max-width: var(--max-text-block-width, 42rem);
  text-wrap: pretty;

  margin-left: calc(var(--spacing) * 2);

  /* Using postcss-nested-import to scope these imported styles,
     so that we can scope/sandbox CSS styles so CSS selectors don't leak out and affect the rest of the page,
     to reduce maintenance burden.
  */
  @nested-import "../assets/css/upstream-xml2rfc.css";
}

html.dark .rfc-content-type-xml2rfc {
  /* Using postcss-nested-import scope these imported styles */
  @nested-import "../assets/css/xml2rfc-darkmode-patches.css";
}

.rfc-content-type-plaintext {
  /** container used to scale `font-size` with units like `cqi`
      https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries
  */
  padding-left: var(--layout-bleed-left);
  padding-right: var(--layout-bleed-right);
  margin-left: calc(var(--spacing) * 2);
  container-type: inline-size;
  --preformatted-max-line-length: v-bind(maxPreformattedLineLength);

  /* Using postcss-nested-import scope these imported styles */
  @nested-import "../assets/css/rfc-plaintext.css";
}

html.dark .rfc-content-type-plaintext {
  /* Using postcss-nested-import to scope/sandbox these imported styles so style rules don't leak out to the rest of the page */
  @nested-import "../assets/css/rfc-plaintext-darkmode-patches.css";
}

.rfc-content-padding-left {
  padding-left: var(--layout-bleed-left, 10px);
}

.rfc-content-padding-right {
  padding-right: var(--layout-bleed-right, 10px);
}
</style>
