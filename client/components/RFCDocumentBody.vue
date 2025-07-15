<template>
  <GraphicsIETFMotif
    class="absolute mt-8 -mb-[600px] left-0 w-[80vw] h-[80vh] max-h-[600px] print:hidden"
    :opacity="0.02"
  />

  <Breadcrumbs :breadcrumb-items="breadcrumbItems" />

  <button
    type="button"
    class="fixed right-0 rounded-l bg-white dark:bg-black border border-gray-200 align-middle flex items-center p-1 pr-2 lg:hidden print:hidden"
    aria-label="Open details modal"
    @click="isModalOpen = true"
  >
    <GraphicsExpandSidebar class="inline-block mr-1" />
    Info
  </button>

  <Heading
    level="1"
    class="mb-2 px-1 xs:px-0 print:px-0"
  >
    <component :is="formatTitleAsVNode(`${rfcId.type}${rfcId.number}`)" />
  </Heading>

  <Heading
    level="2"
    class="mb-2 px-1 xs:px-0 print:px-0"
  >
    {{ rfc.title }}
  </Heading>

  <RFCMobileBanner
    :rfc="rfc"
    :is-fixed="true"
  />

  <div class="flex flex-row justify-between items-center flex-wrap">
    <div class="flex align-middle">
      <Tag
        :text="rfcId.type === RFC_TYPE_RFC ?
          ['Internet Standard', `${props.rfc.number}`]
          : [rfcId.type, rfcId.number]
          "
        size="normal"
      />

      <PopoverRoot>
        <PopoverTrigger class="p-2">
          <GraphicsQuestionMarkCircle />
        </PopoverTrigger>
        <PopoverAnchor />
        <PopoverPortal>
          <PopoverContent>
            <PopoverClose />
            <PopoverArrow />
            <p class="leading-6">
              For the definition of <b>Status</b>, see
              <A :href="infoRfcPathBuilder('rfc2026')">
                <component :is="formatTitleAsVNode('rfc2026')" />
              </A>
            </p>
            <p class="leading-6">
              For the definition of <b>Stream</b>, see
              <A :href="infoRfcPathBuilder('rfc8729')">
                <component :is="formatTitleAsVNode('rfc8729')" />
              </A>.
            </p>
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>
    </div>

    <!-- <div v-if="props.rfc">
      <button
        type="button"
        class="text-base underline text-blue-300 dark:text-blue-100 p-2"
        @click="gotoErrata"
      >
        {{ props.rfc.errata }}

        <template v-if="props.errata.length === 1">erratum</template>
<template v-else>errata</template>
</button>
</div> -->
  </div>

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
          <A :href="infoRfcPathBuilder(`RFC${obsoletedByItem}`)">
            <component :is="formatTitleAsVNode(`RFC${obsoletedByItem.number}`)" />
            {{ obsoletedByItem.title }}
          </A>
        </li>
      </ul>
    </div>
  </Alert>

  <p
    v-if="props.rfc.abstract"
    class="px-1 xs:px-0 mb-2 text-base lg:text-xl print:px-0 text-pretty"
  >
    {{ props.rfc.abstract }}
  </p>

  <div
    :class="`rfc-content rfc-content-type-${props.rfcBucketHtmlDoc.documentHtmlType} mt-10 text-[9px] sm:text-base lg:text-base`"
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
</template>

<script setup lang="ts">
import { createTextVNode } from 'vue'
import {
  PopoverAnchor,
  PopoverArrow,
  PopoverClose,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger
} from 'reka-ui'
import AMaybeRFCLink from './AMaybeRFCLink.vue'
import {
  formatTitleAsVNode,
  parseRFCId,
  RFC_TYPE_RFC,
  type RfcBucketHtmlDocument,
  type RfcCommon
} from '~/utilities/rfc'
import { infoRfcPathBuilder } from '~/utilities/url'
import type { BreadcrumbItem } from '~/components/BreadcrumbsTypes'
import {
  elementAttributesToObject,
  isAnchorElement,
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

  enrichedDocument.value = await enrichRfcDocument([...htmlElement.childNodes])
})

const enrichRfcDocument = async (nodes: Node[]): Promise<VNode> => {
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

  const enrichNode = async (node: Node): Promise<VNode> => {
    if (isHtmlElement(node)) {
      const attributes = elementAttributesToObject(node.attributes)
      const children = await Promise.all(
        Array.from(node.childNodes).map(enrichNode)
      )
      const childrenForVue = unwrapChildrenForVue(children)
      if (isAnchorElement(node)) {
        // fix Vue "Non-function value encountered for default slot." performance warning
        // by wrapping children in a function so the Vue can defer rendering
        return h(AMaybeRFCLink, attributes, () => childrenForVue)
      }
      return h(node.nodeName, attributes, childrenForVue)
    } else if (isTextNode(node)) {
      return createTextVNode(node.nodeValue ?? '')
    }
    throw Error(`Unhandled node type ${node.nodeType} ${node}`)
  }

  const children = await Promise.all(nodes.map(enrichNode))
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
  /* Using postcss-nested-import scope these imported styles */
  @nested-import "../assets/css/upstream-xml2rfc.css"
}

.rfc-content-type-plaintext {
  /* Using postcss-nested-import scope these imported styles */
  @nested-import "../assets/css/rfc-plaintext.css"
}
</style>