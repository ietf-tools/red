<template>
  <div class="flex flex-col px-3">
    <Breadcrumbs :breadcrumb-items="breadcrumbItems" class="flex-1" />
    <RFCDocumentMobileInfoButton @click="isModalOpen = true">Info</RFCDocumentMobileInfoButton>
  </div>

  <Heading level="1"
    class="mb-2 ml-2 px-3 xs:px-0 print:mt-5 print:text-lg print:border-b-2 print:border-black print:text-center">
    <component :is="formattedTitle" />
    <RFCTitleSubseries :rfc="props.rfcBucketHtmlDocument.rfc" />
  </Heading>

  <Heading level="2" class="mb-2 ml-2 px-3 xs:px-0 print:text-center">
    {{ props.rfcBucketHtmlDocument.rfc.title }}

    <span v-if="isAprilFool" class="inline pr-2">
      <AprilFools />
    </span>
  </Heading>

  <ul class="block px-3 ml-2 print:text-center">
    <li v-for="(author, authorIndex) in props.rfcBucketHtmlDocument.rfc.authors" :key="authorIndex"
      class="inline-block">
      <span>
        {{ author.name }}
      </span>
      <template v-if="authorIndex < props.rfcBucketHtmlDocument.rfc.authors.length - 1">
        {{ COMMA }}
        {{ NONBREAKING_SPACE }}
      </template>
    </li>
  </ul>

  <RFCDocumentBodyPill :rfc="props.rfcBucketHtmlDocument.rfc" />

  <Alert v-if="props.rfcBucketHtmlDocument.rfc.obsoleted_by?.length" variant="warning"
    heading="This RFC is now obsolete">
    <div class="text-base">
      For more information, please refer to
      <ul>
        <li v-for="(obsoletedByItem, obsoletedByItemIndex) in obsoletedBy" :key="obsoletedByItemIndex">
          <Anchor :href="obsoletedByItem.href">
            <component :is="obsoletedByItem.formattedTitle" />
          </Anchor>
        </li>
      </ul>
    </div>
  </Alert>

  <div :class="`rfc-content rfc-content-type-${props.rfcBucketHtmlDocument.documentHtmlType} relative mt-5 ml-2 sm:text-base lg:text-base px-3 ${
    //
    ' leading-[1.75] ' // WCAG requires 1.5 minimum
    }`">
    <component :is="enrichedDocument" />
  </div>

  <div class="text-blue-300 dark:text-blue-100">
    <!-- FIXME: this is to ensure tailwind includes these colors so we can use css color vars, but there must be a better way of doing this -->
  </div>

  <RFCMobileBanner :rfc="rfcBucketHtmlDocument.rfc" :is-fixed="true" />
</template>

<script setup lang="ts">
import { createTextVNode } from 'vue'
import { pickBy } from 'lodash-es'
import AMaybeRFCLink from './AMaybeRFCLink.vue'
import HorizontalScrollable from './HorizontalScrollable.vue'
import PdfPages from './PdfPages.vue'
import AbsoluteHorizontalScrollable from './AbsoluteHorizontalScrollable.vue'
import Fragment from './Fragment.vue'
import RFCTitleSubseries from './RFCTitleSubseries.vue'
import {
  formatTitleAsVNode,
  isAprilFoolsRfc,
  parseSeriesId,
} from '~/utilities/rfc'
import { infoSeriesPathBuilder } from '~/utilities/url'
import { COMMA, NONBREAKING_SPACE } from '~/utilities/strings'
import { nodePojoWalker } from '~/utilities/dom'
import type { BreadcrumbItem } from '~/components/BreadcrumbsTypes'
import type { DocumentPojo, ElementPojo, NodePojo } from '~/utilities/rfc-validators'
import type { RfcBucketHtmlDocument } from '~/utilities/rfc'

type Props = {
  rfcBucketHtmlDocument: RfcBucketHtmlDocument
  gotoErrata: () => void
  breadcrumbItems: BreadcrumbItem[]
  changeTab: (index: number) => void
}

const props = defineProps<Props>()

const isModalOpen = defineModel<boolean>('isModalOpen')

const rfcId = computed(() => parseSeriesId(`rfc${props.rfcBucketHtmlDocument.rfc.number}`))

const formattedTitle = computed(() => rfcId.value ? formatTitleAsVNode(`${rfcId.value.type}${rfcId.value.number}`) : h('span'))

const obsoletedBy = computed(() => props.rfcBucketHtmlDocument.rfc.obsoleted_by?.map(obsoletedByItem => ({
  href: infoSeriesPathBuilder(`RFC${obsoletedByItem.number}`),
  formattedTitle: h('span', [
    formatTitleAsVNode(`RFC${obsoletedByItem.number}`),
    ' ',
    obsoletedByItem.title
  ])
})))

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
 * the 'precomputer' in Red see `getXml2RfcRfcDocument` and `getPlaintextRfcDocument`
 * etc
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
      const ATTR_COMPONENT = 'data-component'
      const componentAttr = node.attributes[ATTR_COMPONENT]
      if (node.nodeName === 'a') {
        // Note that children is a function, as required by Vue for non-HTML components,
        // so that it can defer children
        return h(AMaybeRFCLink, { 'href': '', ...node.attributes }, () => childrenForVue)
      } else if (node.nodeName === 'svg') {
        return h(
          node.nodeName,
          {
            ...node.attributes,
            class: `dark:contrast-125 dark:brightness-85 dark:invert ${node.attributes.class ?? ''}`
          },
          childrenForVue
        )
      } else if (componentAttr === 'HorizontalScrollable') {
        const ATTR_ABSOLUTE = 'data-component-absolute'
        if (ATTR_ABSOLUTE in node.attributes) {
          const isAbsolute = node.attributes[ATTR_ABSOLUTE] === true.toString()
          if (isAbsolute) {
            const ATTR_ABSOLUTE_CHILDWIDTH = 'data-component-childwidth'
            const childWidthAttr = node.attributes[ATTR_ABSOLUTE_CHILDWIDTH]
            const ATTR_ABSOLUTE_CHILDHEIGHT = 'data-component-childheight'
            const childHeightAttr = node.attributes[ATTR_ABSOLUTE_CHILDHEIGHT]
            if (childWidthAttr && childHeightAttr) {
              const deleteDataAttributes = (attributes: ElementPojo["attributes"]): ElementPojo["attributes"] =>
                pickBy(attributes, (_value, key) => !key.startsWith('data-'))
              return h(
                AbsoluteHorizontalScrollable,
                {
                  ...deleteDataAttributes(node.attributes),
                  childWidthAttr,
                  childHeightAttr,
                  innerClass: 'py-3 rfc-content-padding-left rfc-content-padding-right'
                },
                () => childrenForVue
              )
            } else {
              console.warn(`Unable to render AbsoluteHorizontalScrollable ${ATTR_ABSOLUTE} because attributes ${ATTR_ABSOLUTE_CHILDWIDTH}=${JSON.stringify(childWidthAttr)} ${ATTR_ABSOLUTE_CHILDHEIGHT}${JSON.stringify(childHeightAttr)}`)
            }
          }
        }
        // Note that children is a function, as required by Vue for non-HTML components,
        // so that it can defer rendering children
        return h(
          HorizontalScrollable,
          node.attributes,
          () => childrenForVue
        )
      } else if (componentAttr === 'Placeholder') {
        // FIXME: delete this case once the component is removed from the bucket
        return h(
          'div',
          node.attributes,
          childrenForVue
        )
      } else if (componentAttr === 'PdfPages') {
        const pdfPagesChildrenForVue = nodePojoWalker(node.children, (node) => {
          if (node.type === 'Element' && node.nodeName.toLowerCase() === 'img') {
            node.attributes['class'] = 'w-full min-w-[425px] max-w-[1000px] dark:contrast-125 dark:brightness-85 dark:invert'
          }
          return node
        }).map(renderNodePojo)

        return h(
          PdfPages,
          node.attributes,
          () => pdfPagesChildrenForVue
        )
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

const maxPreformattedLineLength = computed(() =>
  props.rfcBucketHtmlDocument.maxPreformattedLineLength.max
)

const isAprilFool = computed(() => isAprilFoolsRfc(props.rfcBucketHtmlDocument.rfc))
</script>

<style lang="postcss">
/** Note that this is postcss so we can use @nested-import */

.rfc-content {
  --layout-bleed-left: 10px;
  --layout-bleed-right: 10px;

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
  /* Using postcss-nested-import to scope these imported styles,
     so that we can sandbox them and use them safely without major changes,
     to reduce maintenance burden.
  */
  @nested-import "../assets/css/upstream-xml2rfc.css"
}

html.dark .rfc-content-type-xml2rfc {
  /* Using postcss-nested-import scope these imported styles */
  @nested-import "../assets/css/xml2rfc-darkmode-patches.css"
}

.rfc-content-type-plaintext {
  /** container used to scale `font-size` with units like `cqi`
      https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries
  */
  padding-left: var(--layout-bleed-left);
  padding-right: var(--layout-bleed-right);
  container-type: inline-size;
  --preformatted-max-line-length: v-bind(maxPreformattedLineLength);

  /* Using postcss-nested-import scope these imported styles */
  @nested-import "../assets/css/rfc-plaintext.css";
}

html.dark .rfc-content-type-plaintext {
  /* Using postcss-nested-import scope these imported styles */
  @nested-import "../assets/css/rfc-plaintext-darkmode-patches.css"
}

.rfc-content-padding-left {
  padding-left: var(--layout-bleed-left, 10px);
}

.rfc-content-padding-right {
  padding-right: var(--layout-bleed-right, 10px);
}
</style>