import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import type { X2jOptions, XmlBuilderOptions } from 'fast-xml-parser'
import { textToAnchorId } from '../url'

/**
 *
 * This file is test utilities
 */

export type XMLParserConfig = X2jOptions

/**
 * XML Parser has some defaults (eg discarding whitespace) that don't suit our needs
 * so here's our default config
 */
const parserDefaultConfig: X2jOptions = {
  preserveOrder: true,
  ignoreAttributes: false,
  trimValues: false, // preserve whitespace
  processEntities: false
}

export const getXMLParser = (additionalConfig?: X2jOptions) =>
  new XMLParser({
    ...parserDefaultConfig,
    ...additionalConfig
  })

export type XMLBuilderOptions = XmlBuilderOptions

/**
 * XML Builder has some defaults (eg discarding attributes) that don't suit our needs
 * so here's our default config
 */
const builderDefaultConfig: XmlBuilderOptions = {
  ignoreAttributes: false
}

export const getXMLBuilder = (additionalConfig: XmlBuilderOptions) =>
  new XMLBuilder({ ...builderDefaultConfig, ...additionalConfig })

/**
 * This should only be used in tests.
 * It's useful because it returns a JSON serializable data structure (rather than objects)
 * so vitest can test/diff data structures easily.
 *
 * If you need an HTML parser but not for tests (eg in Vue/Nuxt) then try
 * The Platform[tm] https://developer.mozilla.org/en-US/docs/Web/API/DOMParser
 */
export const parseHtml = (html: string) => {
  const parser = getXMLParser({
    // HTML parse mode config
    unpairedTags: ['hr', 'br', 'link', 'meta'],
    stopNodes: ['*.pre', '*.script'],
    htmlEntities: true
  })
  return parser.parse(html)
}

type NodeHandler = (node: unknown) => Promise<void>

export const walkNodes = async (
  nodeList: unknown[],
  nodeHandler: NodeHandler
) => {
  // using a for-loop rather than await Promise.all(nodeList.map(...)) because we want
  // to run async code sequentially rather than concurrently
  // ie each nodeHandler(node) should complete before the next one is called.
  // to avoid race conditions in async nodeHandler code
  for (const node of nodeList) {
    await nodeHandler(node)

    if (node && typeof node === 'object') {
      const keys = Object.keys(node)
      for (const key of keys) {
        const item = (node as Record<string, unknown>)[key]
        if (Array.isArray(item)) {
          // recursion
          await walkNodes(item, nodeHandler)
        }
      }
    } else {
      console.log(node)
      throw Error('Unexpected state')
    }
  }
}

export const getInnerText = async (nodeList: unknown[]): Promise<string> => {
  const innerText: string[] = []

  await walkNodes(nodeList, async (node) => {
    if (!node || typeof node !== 'object' || !('#text' in node)) return

    const textNodeValue = node['#text']
    if (typeof textNodeValue !== 'string') throw Error('unable to extract text')
    innerText.push(textNodeValue)
  })

  return innerText.join('')
}

export const filterByElementName = (
  nodeList: unknown[],
  elementName: string
): unknown[] => {
  return nodeList.filter((node) => {
    return node && typeof node === 'object' && elementName in node
  })
}

/**
 * For a node in a document returned by `parseHtml()`
 *
 * expects a data structure that looks a bit like
 * ```json
 * {
 *   "A": { "#text": "zombo" },
 *   ":@href": "http://zombo.com/"
 * }
 * ```
 */
export const attemptToGetAttribute = (
  node: unknown,
  elementName: string | undefined,
  attributeName: string
): string | undefined => {
  const NODE_ATTRIBUTES_KEY = ':@'
  if (
    !node ||
    typeof node !== 'object' ||
    (elementName && !(elementName in node)) ||
    !(NODE_ATTRIBUTES_KEY in node)
  ) {
    return
  }

  const attributes = node[NODE_ATTRIBUTES_KEY]

  if (!attributes || typeof attributes !== 'object') {
    return
  }

  const nodeKey = `@_${attributeName}`
  const attribute = (attributes as Record<string, unknown>)[nodeKey]

  if (typeof attribute === 'string') {
    return attribute
  }
}

/**
 * Generate a heading anchor id by normalising the innerText
 */
export const generateHeadingId = async (
  headingNode: unknown
): Promise<string | undefined> => {
  if (
    !headingNode ||
    typeof headingNode !== 'object' ||
    !(
      'h1' in headingNode ||
      'h2' in headingNode ||
      'h3' in headingNode ||
      'h4' in headingNode ||
      'h5' in headingNode ||
      'h6' in headingNode
    )
  ) {
    console.error(JSON.stringify(headingNode, null, 2))
    throw Error('Argument is not a heading node (h1, h2, h3, h4, h5, h6)')
  }
  const computedAnchorId = textToAnchorId(await getInnerText([headingNode]))

  return computedAnchorId
}
