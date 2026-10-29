import type { ReadingState } from './controller'
import type { TextIndex } from './text-index'

export const SENTENCE_HIGHLIGHT_NAME = 'rfc-reading-sentence'
export const WORD_HIGHLIGHT_NAME = 'rfc-reading-word'

export const isReadingModeSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'speechSynthesis' in window &&
  typeof SpeechSynthesisUtterance === 'function' &&
  typeof CSS !== 'undefined' &&
  'highlights' in CSS &&
  typeof Highlight === 'function'

const setHighlight = (name: string, range: Range | undefined) => {
  if (range) {
    CSS.highlights.set(name, new Highlight(range))
  } else {
    CSS.highlights.delete(name)
  }
}

export const clearReadingHighlights = () => {
  setHighlight(SENTENCE_HIGHLIGHT_NAME, undefined)
  setHighlight(WORD_HIGHLIGHT_NAME, undefined)
}

export const showReadingHighlights = (
  index: TextIndex | undefined,
  { cursor, sentenceIndex, wordEnd }: ReadingState
) => {
  const sentence = index && sentenceIndex !== undefined ? index.sentences[sentenceIndex] : undefined
  setHighlight(SENTENCE_HIGHLIGHT_NAME, sentence ? index?.toRange(sentence.start, sentence.end) : undefined)
  setHighlight(
    WORD_HIGHLIGHT_NAME,
    index && cursor !== undefined && wordEnd !== undefined ? index.toRange(cursor, wordEnd) : undefined
  )
}

export type CaretPoint = {
  node: Node
  offset: number
}

export const caretPointFromCoordinates = (x: number, y: number): CaretPoint | undefined => {
  if (typeof document.caretPositionFromPoint === 'function') {
    const position = document.caretPositionFromPoint(x, y)
    return position ? { node: position.offsetNode, offset: position.offset } : undefined
  }
  if (typeof document.caretRangeFromPoint === 'function') {
    const range = document.caretRangeFromPoint(x, y)
    return range ? { node: range.startContainer, offset: range.startOffset } : undefined
  }
  return undefined
}
