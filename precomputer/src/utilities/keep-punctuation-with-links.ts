import type { NodePojo } from '../../../website/app/utilities/rfc-validators.ts'

/**
 * Styled in website/app/assets/css/tailwind.css. This is a hand-written class, not a Tailwind
 * utility, because Tailwind only emits classes it finds in the website sources and would never
 * see one that only appears in the generated pojo JSON.
 */
export const KEEP_TOGETHER_CLASS = 'keep-together'

const LEADING_PUNCTUATION = /^[,.;:!?)\]]+/

/**
 * Browsers allow a line break between a link's trailing icon and the punctuation that follows the
 * link, which leaves a comma or full stop at the start of the next line. Wrapping the link and that
 * punctuation in a KEEP_TOGETHER_CLASS element makes them move as one unit.
 */
export const keepPunctuationWithLinks = (nodes: NodePojo[]): NodePojo[] => {
  const result: NodePojo[] = []

  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index]
    if (node.type !== 'Element') {
      result.push(node)
      continue
    }

    const element: NodePojo = { ...node, children: keepPunctuationWithLinks(node.children) }
    const next = nodes[index + 1]
    const punctuation =
      node.nodeName === 'a' && next?.type === 'Text' ? LEADING_PUNCTUATION.exec(next.textContent)?.[0] : undefined

    if (punctuation === undefined || next?.type !== 'Text') {
      result.push(element)
      continue
    }

    result.push({
      type: 'Element',
      nodeName: 'span',
      attributes: { class: KEEP_TOGETHER_CLASS },
      children: [element, { type: 'Text', textContent: punctuation }]
    })

    const remainder = next.textContent.slice(punctuation.length)
    if (remainder !== '') {
      result.push({ type: 'Text', textContent: remainder })
    }
    index++
  }

  return result
}
