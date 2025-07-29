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
    :class="`rfc-content rfc-content-type-${props.rfcBucketHtmlDoc.documentHtmlType} wrap-anywhere mt-10 sm:text-base lg:text-base`"
  >
    <div
      v-if="!enrichedDocument"
      ref="rfc-html-container"
      v-html="props.rfcBucketHtmlDoc.documentHtml"
    />
    <Renderable
      v-else
      :val="enrichedDocument"
    />
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
import {
  formatTitleAsVNode,
  parseRFCId,
  type RfcBucketHtmlDocument,
  type RfcCommon
} from '~/utilities/rfc'
import { infoRfcPathBuilder } from '~/utilities/url'
import type { BreadcrumbItem } from '~/components/BreadcrumbsTypes'
import {
  elementAttributesToObject,
  getTagName,
  isHtmlElement,
  isTextNode
} from '~/utilities/dom'

type Props = {
  rfc: RfcCommon
  rfcBucketHtmlDoc: RfcBucketHtmlDocument
  gotoErrata: () => void
  breadcrumbItems: BreadcrumbItem[]
  changeTab: (index: number) => void
}

const props = defineProps<Props>()

const isModalOpen = defineModel<boolean>('isModalOpen')

const rfcId = computed(() => parseRFCId(`rfc${props.rfc.number}`))

const rfcHtmlContainer = useTemplateRef('rfc-html-container')

const enrichedDocument = ref<VNode | undefined>()

onMounted(async () => {
  if (
    // if we've already computed it,
    // TODO: check whether enrichedDocument would reset when navigating to another info RFC page via SPA nav
    enrichedDocument.value
  ) {
    return
  }

  const { value: htmlElement } = rfcHtmlContainer
  if (
    // if the container isn't mounted (this shouldn't happen)
    !htmlElement ||
    !isHtmlElement(htmlElement)
  ) {
    console.error("Unable to enrich RFC document as container hasn't mounted")
    return
  }

  enrichedDocument.value = await enrichRfcDocumentClientside(Array.from(htmlElement.childNodes))
})

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
const enrichRfcDocumentClientside = async (nodes: Node[]): Promise<VNode> => {
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

  const enrichNodeClientside = async (node: Node): Promise<VNode> => {
    if (isHtmlElement(node)) {
      const attributes = elementAttributesToObject(node.attributes)
      const children = await Promise.all(
        Array.from(node.childNodes).map(enrichNodeClientside)
      )
      const childrenForVue = unwrapChildrenForVue(children)
      const tagName = getTagName(node)
      switch (tagName) {
        case 'a':
          // fix Vue "Non-function value encountered for default slot." performance warning
          // by wrapping children in a function so the Vue can defer rendering
          return h(AMaybeRFCLink, attributes, () => childrenForVue)
        case 'div':
          if (attributes['data-component'] === 'HorizontalScrollable') {
            return h(HorizontalScrollable, () => childrenForVue)
          }
      }
      return h(node.nodeName, attributes, childrenForVue)
    } else if (isTextNode(node)) {
      return createTextVNode(node.nodeValue ?? '')
    }
    throw Error(`Unhandled node type ${node.nodeType} ${node}`)
  }

  const children = await Promise.all(nodes.map(enrichNodeClientside))
  return h('div', {}, children)
}
</script>

<style lang="postcss">
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
  --preformatted-max-line-length: v-bind(props.rfcBucketHtmlDoc.maxPreformattedLineLength);

  /* Using postcss-nested-import scope these imported styles */
  @nested-import "../assets/css/rfc-plaintext.css";
}
</style>