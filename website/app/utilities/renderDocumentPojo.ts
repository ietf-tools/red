import { h, createTextVNode } from 'vue'
import type { VNode } from 'vue'
import Fragment from '~/components/Fragment.vue'

import type { DocumentPojo, ElementPojo, NodePojo } from '~/utilities/rfc-validators'
import { EXTERNAL_LINK_REL, htmlEscapeToText } from './html'
import { isExternalLink } from './url'

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

export const defaultRenderer: ElementRenderers = {
  __default: (node, childrenForVue) => {
    if (node.nodeName.match(/[A-Z]/)) {
      console.warn(
        `[DocumentPojo] [default renderer] rendering non-HTML element as HTMLElement? ${JSON.stringify(node.nodeName)}. Should that nodeName be added to your 'ElementRenderers'?`
      )
    }
    return h(node.nodeName, node.attributes, childrenForVue)
  }
}

type ChildrenForVue = VNode | VNode[] | undefined
type ElementRenderer = (node: ElementPojo, childrenForVue: ChildrenForVue) => VNode
/**
 * Defines a mapping between nodeNames of a DocumentPojo and a renderer. There's also a `__default`
 */
export type ElementRenderers = Record<string, ElementRenderer> & { __default: ElementRenderer }

export const renderNodePojo = (node: NodePojo, elementRenderers: ElementRenderers): VNode => {
  if (node.type === 'Element') {
    const children = node.children.map((node) => renderNodePojo(node, elementRenderers))
    const childrenForVue = unwrapChildrenForVue(children)
    const key = node.attributes['data-component'] ?? node.nodeName
    const renderer = elementRenderers[key] ?? elementRenderers.__default
    return renderer(node, childrenForVue)
  } else if (node.type === 'Text') {
    return createTextVNode(node.textContent)
  }
  throw Error(`Unhandled NodePojo ${JSON.stringify(node)}`)
}

export const renderNodePojoToHtmlString = (node: NodePojo): string => {
  if (node.type === 'Element') {
    const { nodeName } = node
    let nodeNameToUse = nodeName
    switch (nodeName) {
      case 'Anchor':
        nodeNameToUse = 'a'
        break
      case 'Icon':
        nodeNameToUse = 'span'
        const { name } = node.attributes
        if (name) {
          return `<span class="iconify i-${htmlEscapeToText(name)} text-lg align-middle ml-1" aria-hidden="true"></span>`
        }
        break
    }

    const attributesEntries = Object.entries({
      ...node.attributes,
      ...(node.attributes.href && isExternalLink(node.attributes.href) ? { rel: EXTERNAL_LINK_REL } : {}),
    })
    return `<${htmlEscapeToText(nodeNameToUse)} ${attributesEntries
      .map(([attributeName, attributeValue]) => {
        return `${htmlEscapeToText(attributeName)}="${htmlEscapeToText(attributeValue)}"`
      })
      .join(' ')}>${node.children.map(renderNodePojoToHtmlString).join('')}</${htmlEscapeToText(nodeNameToUse)}>`
  } else if (node.type === 'Text') {
    return htmlEscapeToText(node.textContent)
  }
  throw Error(`Unhandled NodePojo ${JSON.stringify(node)}`)
}

/**
 * This does not sanitise its output so if you tell it to render onclick
 * or href="javascript:" then it will.
 */
export const renderDocumentPojo = (nodes: DocumentPojo, elementRenderers: ElementRenderers): VNode => {
  const children = nodes.map((node) => renderNodePojo(node, elementRenderers))
  return h(Fragment, () => children)
}

export const renderDocumentPojoToHtmlString = (nodes: DocumentPojo): string => {
  return nodes.map((node) => renderNodePojoToHtmlString(node)).join('')
}
