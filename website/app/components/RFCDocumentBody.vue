<template>
  <div class="px-2">
    <div class="flex flex-col">
      <Breadcrumbs :breadcrumb-items="breadcrumbItems" class="flex-1" />
      <RFCDocumentMobileInfoButton @click="isModalOpen = true"> Info </RFCDocumentMobileInfoButton>
    </div>

    <Heading
      level="1"
      class="mb-2 px-0 mt-2 ml-2 print:text-lg print:border-b-2 print:border-black print:text-center font-feature-settings-calt-off">
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

    <Alert
      v-if="obsoleted_by && obsoleted_by.length > 0"
      variant="warning"
      heading="This RFC is now obsolete"
      class="ml-1">
      <div class="text-base">
        For more information, please refer to
        <ul class="mt-1 flex flex-col gap-2">
          <li v-for="(obsoletedByItem, obsoletedByItemIndex) in obsoleted_by" :key="obsoletedByItemIndex">
            <AMaybeRFCLink
              :href="infoSeriesPathBuilder(`RFC${obsoletedByItem.number}`)"
              :class="ANCHOR_COLOR_IN_ALERT_INFO_TAILWIND_STYLE">
              <RFCTitle :rfc="obsoletedByItem" />
            </AMaybeRFCLink>
          </li>
        </ul>
      </div>
    </Alert>

    <Alert v-if="updated_by && updated_by.length > 0" variant="info" heading="This RFC was updated" class="ml-1">
      <div class="text-base mt-1">
        See also
        <ul class="flex flex-col gap-2">
          <li v-for="(updatedByItem, updatedByItemIndex) in updated_by" :key="updatedByItemIndex">
            <AMaybeRFCLink
              :href="infoSeriesPathBuilder(`RFC${updatedByItem.number}`)"
              :class="ANCHOR_COLOR_IN_ALERT_INFO_TAILWIND_STYLE">
              <RFCTitle :rfc="updatedByItem" />
            </AMaybeRFCLink>
          </li>
        </ul>
      </div>
    </Alert>

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
import { infoSeriesPathBuilder } from '~/utilities/url'
import { COMMA, NONBREAKING_SPACE, SPACE } from '~/utilities/strings'
import type { BreadcrumbItem } from '~/components/BreadcrumbsTypes'
import type { RfcBucketHtmlDocument } from '~/utilities/rfc'
import { ANCHOR_COLOR_IN_ALERT_INFO_TAILWIND_STYLE } from '~/utilities/theme'
import {
  renderDocumentPojo,
  renderNodePojo,
  defaultRenderer,
  type ElementRenderers
} from '~/utilities/renderDocumentPojo'
import { AbsoluteHorizontalScrollable, AMaybeRFCLink, HorizontalScrollable, PdfPages } from '#components'
import { nodePojoWalker } from '~/utilities/dom'
import PreCopyButton from './PreCopyButton.vue'

type Props = {
  rfcBucketHtmlDocument: RfcBucketHtmlDocument
  gotoErrata: () => void
  breadcrumbItems: BreadcrumbItem[]
  changeTab: (index: number) => void
}

const props = defineProps<Props>()

const isModalOpen = defineModel<boolean>('isModalOpen')

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
      return h(PreCopyButton, node.attributes, () => childrenForVue)
    }
    return h(node.nodeName, node.attributes, childrenForVue)
  },
  HorizontalScrollable: (node, childrenForVue) => {
    const ATTR_ABSOLUTE = 'data-component-absolute'
    if (ATTR_ABSOLUTE in node.attributes) {
      const isAbsolute = node.attributes[ATTR_ABSOLUTE] === true.toString()
      if (isAbsolute) {
        const ATTR_ABSOLUTE_CHILDWIDTH = 'data-component-childwidth'
        const childWidthAttr = node.attributes[ATTR_ABSOLUTE_CHILDWIDTH]
        const ATTR_ABSOLUTE_CHILDHEIGHT = 'data-component-childheight'
        const childHeightAttr = node.attributes[ATTR_ABSOLUTE_CHILDHEIGHT]
        if (childWidthAttr && childHeightAttr) {
          const filteredAttributes = Object.fromEntries(
            Object.entries(node.attributes).filter(([key]) => !key.startsWith('data-'))
          )
          return h(
            AbsoluteHorizontalScrollable,
            {
              ...filteredAttributes,
              childWidthAttr,
              childHeightAttr,
              innerClass: 'py-3 rfc-content-padding-left rfc-content-padding-right'
            },
            () => childrenForVue
          )
        } else {
          console.warn(
            `Unable to render AbsoluteHorizontalScrollable ${ATTR_ABSOLUTE} because attributes ${ATTR_ABSOLUTE_CHILDWIDTH}=${JSON.stringify(childWidthAttr)} ${ATTR_ABSOLUTE_CHILDHEIGHT}=${JSON.stringify(childHeightAttr)}`
          )
        }
      }
    }
    return h(HorizontalScrollable, node.attributes, () => childrenForVue)
  },
  // FIXME: delete this case once the component is removed from the bucket
  Placeholder: (node, childrenForVue) => h('div', node.attributes, () => childrenForVue),
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
