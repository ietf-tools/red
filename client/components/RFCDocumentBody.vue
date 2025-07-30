<template>
  <GraphicsIETFMotif
    class="absolute mt-8 -mb-[600px] left-0 w-[80vw] h-[80vh] max-h-[600px] print:hidden"
    :opacity="0.02"
  />

  <div class="flex flex-col">
    <Breadcrumbs
      :breadcrumb-items="breadcrumbItems"
      class="flex-1"
    />
    <button
      type="button"
      class="fixed right-0 mt-3 font-bold rounded-l z-10 bg-white dark:bg-black border border-r-0 border-gray-200 align-middle flex items-center px-3 py-2 text-sm lg:hidden print:hidden shadow-lg shadow-gray-300 dark:shadow-blue-900"
      aria-label="Open details modal"
      @click="isModalOpen = true"
    >
      <GraphicsExpandSidebar class="inline-block mr-1" />
      Info
    </button>
  </div>

  <Heading
    level="1"
    class="mb-2 pl-2 xs:px-0 print:px-0"
  >
    <component :is="formatTitleAsVNode(`${rfcId.type}${rfcId.number}`)" />
  </Heading>

  <Heading
    level="2"
    class="mb-2 pl-2 xs:px-0 print:px-0"
  >
    {{ rfc.title }}
  </Heading>

  <RFCDocumentBodyPill :rfc="props.rfc" />

  <Alert
    v-if="props.rfc.obsoleted_by?.length"
    variant="warning"
    heading="This RFC is now obsolete"
  >
    <div class="text-base">
      For more information, please refer to
      <ul>
        <li
          v-for="(obsoletedByItem, obsoletedByItemIndex) in props.rfc
            .obsoleted_by"
          :key="obsoletedByItemIndex"
        >
          <A :href="infoRfcPathBuilder(`RFC${obsoletedByItem.number}`)">
            <component :is="formatTitleAsVNode(`RFC${obsoletedByItem.number}`)" />
            {{ obsoletedByItem.title }}
          </A>
        </li>
      </ul>
    </div>
  </Alert>

  <div
    :class="`rfc-content rfc-content-type-${props.rfcBucketHtmlDocument.documentHtmlType} wrap-anywhere mt-10 sm:text-base lg:text-base`"
  >
    <Renderable :val="enrichedDocument" />
  </div>

  <RFCMobileBanner
    :rfc="rfc"
    :is-fixed="true"
  />
</template>

<script setup lang="ts">
import { createTextVNode } from 'vue'
import AMaybeRFCLink from './AMaybeRFCLink.vue'
import HorizontalScrollable from './HorizontalScrollable.vue'
import Fragment from './Fragment.vue'
import {
  formatTitleAsVNode,
  parseRFCId,
  type RfcBucketHtmlDocument,
  type RfcCommon
} from '~/utilities/rfc'
import { infoRfcPathBuilder } from '~/utilities/url'
import type { BreadcrumbItem } from '~/components/BreadcrumbsTypes'
import type { DocumentPojo, NodePojo } from '~/utilities/rfc-validators'

type Props = {
  rfc: RfcCommon
  rfcBucketHtmlDocument: RfcBucketHtmlDocument
  gotoErrata: () => void
  breadcrumbItems: BreadcrumbItem[]
  changeTab: (index: number) => void
}

const props = defineProps<Props>()

const isModalOpen = defineModel<boolean>('isModalOpen')

const rfcId = computed(() => parseRFCId(`rfc${props.rfc.number}`))

const enrichedDocument = computed<VNode>(() =>
  renderDocumentPojo(props.rfcBucketHtmlDocument.documentHtmlObj)
)

/**
 * Walks the DOM within the RFC and replaces some elements with Vue components.
 *
 * Be careful to avoid any Layout Shift https://web.dev/articles/cls when replacing
 * elements (ie, page elements should not move around).
 *
 * Consider whether you should instead modify the HTML string provided by
 * https://github.com/ietf-tools/red-rfc-html-extractor see
 * `getXml2RfcRfcDocument` and `getPlaintextRfcDocument` etc
 */
const renderDocumentPojo = (nodes: DocumentPojo): VNode => {
  const unwrapChildrenForVue = (vnodes: VNode[]) => {
    switch (vnodes.length) {
      case 0:
        return undefined
      case 1:
        return vnodes[0]
      default:
        return vnodes
    }
  }

  const renderNodePojo = (node: NodePojo): VNode => {
    if (node.type === 'Element') {
      const children = node.children.map(renderNodePojo)
      const childrenForVue = unwrapChildrenForVue(children)
      switch (node.nodeName) {
        case 'a':
          // Note that children is a function, as required by Vue for non-HTML components,
          // so that it can defer rendering children
          return h(AMaybeRFCLink, node.attributes, () => childrenForVue)
        case 'HorizontalScrollable':
          // Note that children is a function, as required by Vue for non-HTML components,
          // so that it can defer rendering children
          return h(HorizontalScrollable, node.attributes, () => childrenForVue)
      }
      return h(node.nodeName, node.attributes, childrenForVue)
    } else if (node.type === 'Text') {
      return createTextVNode(node.textContent)
    }
    throw Error(`Unhandled NodePojo ${JSON.stringify(node)}`)
  }

  const children = nodes.map(renderNodePojo)
  return h(Fragment, () => children)
}
</script>

<style lang="postcss">
/** Note that this is postcss so we can use @nested-import */

.rfc-content {

  ol,
  ul {
    /* revert some tailwind reset styles because the imported CSS expect different defaults */
    all: revert;
  }
}

.rfc-content-type-xml2rfc {
  --layout-bleed-left: 10px;
  --layout-bleed-right: 10px;

  /* Using postcss-nested-import to scope these imported styles,
     so that we can sandbox them and use them safely without major changes,
     to reduce maintenance burden.
  */
  @nested-import "../assets/css/upstream-xml2rfc.css"
}

html.dark .rfc-content-type-xml2rfc {
  @nested-import "../assets/css/xml2rfc-darkmode-patches.css"
}

.rfc-content-type-plaintext {
  /** container used to scale `font-size` with units like `cqi`
      https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries
  */
  container-type: inline-size;
  --preformatted-max-line-length: v-bind(props.rfcBucketHtmlDocument.maxPreformattedLineLength);

  /* Using postcss-nested-import scope these imported styles */
  @nested-import "../assets/css/rfc-plaintext.css";
}
</style>