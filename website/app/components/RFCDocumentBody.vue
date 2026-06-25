<template>
  <div class="container flex justify-between items-center mx-auto pl-2">
    <Breadcrumbs :breadcrumb-items="breadcrumbItems" class="flex-1" />
    <p v-if="featureFlags.formatsAlsoViewAs" class="pt-2 text-sm text-right text-sm text-gray-800 dark:text-gray-200">
      Also view as: <DocumentPojo :value="formatsPojo" />
    </p>
  </div>

  <div class="px-2">
    <div class="flex flex-col">
      <RFCDocumentMobileInfoButton @click="isModalOpen = true"> Info </RFCDocumentMobileInfoButton>
    </div>

    <Heading
      level="1"
      class="mb-2 max-w-[var(--max-text-block-width)] px-0 ml-2 print:text-lg print:border-b-2 print:border-black print:text-center font-feature-settings-calt-off">
      <RFCTitle :rfc="props.rfcBucketHtmlDocument.rfc" hide-title />
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

    <RFCDocumentSuperseded
      :data="obsoleted_by"
      variant="warning"
      heading-text="This RFC is now obsolete"
      intro-text="For more information, please refer to " />

    <RFCDocumentSuperseded
      :data="updated_by"
      variant="info"
      heading-text="This RFC was updated"
      intro-text="See also " />

    <div
      :class="`rfc-content rfc-content-type-${props.rfcBucketHtmlDocument.documentHtmlType} relative mt-5 sm:text-base lg:text-base font-feature-settings-calt-off ${
        //
        ' leading-[1.5] ' // WCAG requires 1.5 minimum
      }`">
      <component :is="enrichedDocument" />
    </div>
  </div>

  <RFCMobileBanner :rfc="rfcBucketHtmlDocument.rfc" :is-fixed="true" />
</template>

<script setup lang="ts">
import RFCTitleSubseries from './RFCTitleSubseries.vue'
import { isAprilFoolsRfc } from '~/utilities/rfc'
import { infoSeriesPathBuilder, rfcFormatPathBuilder } from '~/utilities/url'
import { COMMA, NONBREAKING_SPACE, FULLSTOP, SPACE } from '~/utilities/strings'
import type { BreadcrumbItem } from '~/components/BreadcrumbsTypes'
import type { RfcBucketHtmlDocument } from '~/utilities/rfc'
import { ANCHOR_COLOR_IN_ALERT_INFO_TAILWIND_STYLE, ANCHOR_COLOR_TAILWIND_STYLE } from '~/utilities/theme'
import {
  renderDocumentPojo,
  renderNodePojo,
  defaultRenderer,
  type ElementRenderers,
  nodePojoToInnerText
} from '~/utilities/renderDocumentPojo'
import { AMaybeRFCLink, HorizontalScrollable, PdfPages } from '#components'
import { nodePojoWalker } from '~/utilities/dom'
import { useFeatureFlags } from '~/utilities/feature-flags'
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

const featureFlags = useFeatureFlags()

const rfcHtmlPojoRenderers: ElementRenderers = {
  ...defaultRenderer,
  a: (node, childrenForVue) => h(AMaybeRFCLink, { href: '', ...node.attributes }, () => childrenForVue),
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
      ...attributes
    } = node.attributes
    return h(
      HorizontalScrollable,
      {
        ...attributes,
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

  const LINK_CLASS = `${ANCHOR_COLOR_TAILWIND_STYLE} cursor-pointer underline`

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
      attributes: { class: 'inline text-sm' },
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
