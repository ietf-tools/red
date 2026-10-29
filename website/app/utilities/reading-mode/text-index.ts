import { getTagName, isHtmlElement, isTextNode } from '../dom'

export type TextSegment = {
  node: Text
  start: number
  end: number
}

export type TextSentence = {
  start: number
  end: number
}

export type TextBounds = {
  start: number
  end: number
}

export type DomPosition = {
  node: Text
  offset: number
}

export type TextIndexOptions = {
  skipPreformatted: boolean
}

export type TextIndex = {
  text: string
  segments: TextSegment[]
  sentences: TextSentence[]
  toOffset: (node: Node, nodeOffset: number) => number | undefined
  toDomPosition: (offset: number) => DomPosition | undefined
  toRange: (start: number, end: number) => Range | undefined
  // The sentence containing the offset, or the next one when the offset is between sentences.
  // -1 when no sentence follows.
  sentenceIndexAt: (offset: number) => number
}

const SKIPPED_TAGS = new Set([
  'svg',
  'img',
  'script',
  'style',
  'button',
  'noscript',
  'template',
  'canvas',
  'video',
  'audio',
  'iframe'
])

// Interface the reader never asked to hear: the precomputed skip-to-TOC links, the touch preview buttons
// beside RFC links, and the rendered ABNF diagrams (whose source is the `pre` that the
// skipPreformatted option governs).
const SKIPPED_CLASSES = ['toc-link-back', 'hide-in-preformatted-text', 'rr-viewer']

const BLOCK_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'caption',
  'dd',
  'details',
  'div',
  'dl',
  'dt',
  'figcaption',
  'figure',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'li',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'summary',
  'table',
  'td',
  'th',
  'tr',
  'ul'
])

const BLOCK_SEPARATOR = '\n\n'

const PARAGRAPH_BREAK = /[ \t\r]*\n[ \t\r]*\n|\f/g

const HAS_SPEAKABLE_CHARACTER = /[\p{L}\p{N}]/u

// A section or list number like "3.2." or "A.1.", which the sentence segmenter ends a sentence at
// because a capital follows, stranding the number from its heading.
const SECTION_NUMBER = /^([A-Z]|\d+)(\.\d+)*\.?$/

const isWhitespace = (character: string | undefined): boolean => character === undefined || /\s/.test(character)

// The word containing an offset. An offset sitting just after a word, as a click on the right half
// of its last letter produces, belongs to that word; one with whitespace on both sides moves on to
// the next word.
export const wordBoundsAt = (text: string, offset: number): TextBounds => {
  let anchor = Math.min(Math.max(offset, 0), text.length)
  if (isWhitespace(text[anchor]) && isWhitespace(text[anchor - 1])) {
    while (anchor < text.length && isWhitespace(text[anchor])) {
      anchor += 1
    }
  }
  let start = anchor
  while (start > 0 && !isWhitespace(text[start - 1])) {
    start -= 1
  }
  let end = anchor
  while (end < text.length && !isWhitespace(text[end])) {
    end += 1
  }
  return { start, end }
}

export const buildTextIndex = (root: HTMLElement, { skipPreformatted }: TextIndexOptions): TextIndex => {
  const segments: TextSegment[] = []
  const segmentByNode = new Map<Text, TextSegment>()
  const blocks: TextBounds[] = []
  let text = ''
  let currentBlock: HTMLElement | undefined
  let currentBlockStart = 0
  let hasPendingBreak = false

  const isSkippedElement = (element: HTMLElement): boolean => {
    const tagName = getTagName(element)
    if (tagName === undefined) {
      return false
    }
    if (SKIPPED_TAGS.has(tagName) || (skipPreformatted && tagName === 'pre')) {
      return true
    }
    if (element.getAttribute('aria-hidden') === 'true' || element.hasAttribute('hidden')) {
      return true
    }
    return SKIPPED_CLASSES.some((className) => element.classList.contains(className))
  }

  const closestBlock = (node: Node): HTMLElement => {
    let element = node.parentElement
    while (element && element !== root) {
      const tagName = getTagName(element)
      if (tagName !== undefined && BLOCK_TAGS.has(tagName)) {
        return element
      }
      element = element.parentElement
    }
    return root
  }

  const closeBlock = () => {
    if (currentBlock !== undefined) {
      blocks.push({ start: currentBlockStart, end: text.length })
      currentBlock = undefined
    }
  }

  const visitText = (node: Text) => {
    const { data } = node
    if (data.length === 0) {
      return
    }
    const block = closestBlock(node)
    const startsNewBlock = currentBlock === undefined || block !== currentBlock || hasPendingBreak
    if (startsNewBlock && data.trim().length === 0) {
      // whitespace between blocks is source formatting, not something to read
      return
    }
    if (startsNewBlock) {
      closeBlock()
      if (text.length > 0) {
        text += BLOCK_SEPARATOR
      }
      currentBlock = block
      currentBlockStart = text.length
      hasPendingBreak = false
    }
    const segment: TextSegment = { node, start: text.length, end: text.length + data.length }
    text += data
    segments.push(segment)
    segmentByNode.set(node, segment)
  }

  const walk = (parent: Node) => {
    for (const child of Array.from(parent.childNodes)) {
      if (isTextNode(child)) {
        visitText(child)
      } else if (isHtmlElement(child)) {
        if (getTagName(child) === 'br') {
          hasPendingBreak = true
        } else if (!isSkippedElement(child)) {
          walk(child)
        }
      }
    }
  }

  walk(root)
  closeBlock()

  const sentenceSegmenter =
    typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
      ? new Intl.Segmenter('en', { granularity: 'sentence' })
      : undefined

  const sentences: TextSentence[] = []

  const addSentence = (start: number, end: number) => {
    const slice = text.slice(start, end)
    const trimmedStart = start + (slice.length - slice.trimStart().length)
    const trimmedEnd = end - (slice.length - slice.trimEnd().length)
    if (trimmedEnd > trimmedStart && HAS_SPEAKABLE_CHARACTER.test(text.slice(trimmedStart, trimmedEnd))) {
      sentences.push({ start: trimmedStart, end: trimmedEnd })
    }
  }

  const addParagraph = (start: number, end: number) => {
    if (!sentenceSegmenter) {
      addSentence(start, end)
      return
    }
    let mergeFrom: number | undefined
    // Line breaks end a sentence to the segmenter, but within a paragraph they are only wrapping.
    // Swapping each for a space keeps every offset where it was.
    const paragraph = text.slice(start, end).replace(/[\r\n\f]/g, ' ')
    for (const { index, segment } of sentenceSegmenter.segment(paragraph)) {
      const segmentStart = mergeFrom ?? start + index
      const segmentEnd = start + index + segment.length
      if (SECTION_NUMBER.test(segment.trim()) && segmentEnd < end) {
        mergeFrom = segmentStart
      } else {
        mergeFrom = undefined
        addSentence(segmentStart, segmentEnd)
      }
    }
  }

  for (const { start, end } of blocks) {
    const blockText = text.slice(start, end)
    let paragraphStart = 0
    for (const match of blockText.matchAll(PARAGRAPH_BREAK)) {
      addParagraph(start + paragraphStart, start + match.index)
      paragraphStart = match.index + match[0].length
    }
    addParagraph(start + paragraphStart, end)
  }

  // Last segment starting at or before the offset
  const segmentIndexAtOrBefore = (offset: number): number => {
    let low = 0
    let high = segments.length - 1
    let found = -1
    while (low <= high) {
      const middle = (low + high) >> 1
      const segment = segments[middle]
      if (segment && segment.start <= offset) {
        found = middle
        low = middle + 1
      } else {
        high = middle - 1
      }
    }
    return found
  }

  const toOffset = (node: Node, nodeOffset: number): number | undefined => {
    if (!isTextNode(node)) {
      return undefined
    }
    const segment = segmentByNode.get(node)
    if (!segment) {
      return undefined
    }
    return segment.start + Math.min(Math.max(nodeOffset, 0), segment.end - segment.start)
  }

  const toDomPosition = (offset: number): DomPosition | undefined => {
    const index = segmentIndexAtOrBefore(offset)
    const segment = segments[index]
    if (segment && offset <= segment.end) {
      return { node: segment.node, offset: offset - segment.start }
    }
    // in the gap after this segment, so the next one is where the text resumes
    const next = segments[index + 1]
    return next ? { node: next.node, offset: 0 } : undefined
  }

  const toRange = (start: number, end: number): Range | undefined => {
    const startPosition = toDomPosition(start)
    // an end on the seam between two nodes belongs to the earlier one
    const endSegment = segments[segmentIndexAtOrBefore(end - 1)]
    if (!startPosition || !endSegment) {
      return undefined
    }
    const range = root.ownerDocument.createRange()
    range.setStart(startPosition.node, startPosition.offset)
    range.setEnd(endSegment.node, Math.min(end, endSegment.end) - endSegment.start)
    return range
  }

  const sentenceIndexAt = (offset: number): number => {
    let low = 0
    let high = sentences.length - 1
    let found = -1
    while (low <= high) {
      const middle = (low + high) >> 1
      const sentence = sentences[middle]
      if (sentence && sentence.end > offset) {
        found = middle
        high = middle - 1
      } else {
        low = middle + 1
      }
    }
    return found
  }

  return { text, segments, sentences, toOffset, toDomPosition, toRange, sentenceIndexAt }
}
