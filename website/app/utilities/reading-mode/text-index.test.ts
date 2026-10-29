// @vitest-environment nuxt
import { describe, expect, test } from 'vitest'
import { buildTextIndex, wordBoundsAt, type TextIndex } from './text-index'

const build = (html: string, skipPreformatted = false): { root: HTMLElement; index: TextIndex } => {
  const root = document.createElement('div')
  root.innerHTML = html
  return { root, index: buildTextIndex(root, { skipPreformatted }) }
}

const sentenceTexts = (index: TextIndex): string[] =>
  index.sentences.map(({ start, end }) => index.text.slice(start, end))

describe('buildTextIndex sentences', () => {
  test('splits sentences within a paragraph and never across blocks', () => {
    const { index } = build('<p>First one. Second one.</p><p>Third without a stop</p>')
    expect(sentenceTexts(index)).toEqual(['First one.', 'Second one.', 'Third without a stop'])
  })

  test('reads across inline elements as one sentence', () => {
    const { index } = build('<p>See <a href="#x">RFC 9110</a> for <em>details</em>.</p>')
    expect(sentenceTexts(index)).toEqual(['See RFC 9110 for details.'])
  })

  test('treats a heading and the paragraph after it as separate sentences', () => {
    const { index } = build('<h2>1. Introduction</h2><p>Hello there.</p>')
    expect(sentenceTexts(index)).toEqual(['1. Introduction', 'Hello there.'])
  })

  test('splits preformatted text at blank lines and joins hard-wrapped lines', () => {
    const { index } = build('<pre>First line\nof a sentence.\n\nNext paragraph here.</pre>')
    expect(sentenceTexts(index)).toEqual(['First line\nof a sentence.', 'Next paragraph here.'])
  })

  test('drops runs with nothing to say aloud', () => {
    const { index } = build('<pre>+-----+\n\nSpoken words.</pre>')
    expect(sentenceTexts(index)).toEqual(['Spoken words.'])
  })

  test('ignores whitespace between blocks', () => {
    const { index } = build('<div>\n  <p>One.</p>\n  <p>Two.</p>\n</div>')
    expect(sentenceTexts(index)).toEqual(['One.', 'Two.'])
  })

  test('breaks at <br>', () => {
    const { index } = build('<p>Line one<br>Line two</p>')
    expect(sentenceTexts(index)).toEqual(['Line one', 'Line two'])
  })
})

describe('buildTextIndex skipped content', () => {
  test('skips svg, buttons, aria-hidden and the injected chrome', () => {
    const { index } = build(
      [
        '<p>Kept <a class="toc-link-back" href="#toc">back</a>',
        '<span class="hide-in-preformatted-text">preview</span>',
        '<span aria-hidden="true">hidden</span><button>press</button>',
        '<svg><text>diagram</text></svg> words.</p>',
        '<div class="rr-viewer"><p>Rule diagram</p></div>'
      ].join('')
    )
    expect(sentenceTexts(index)).toEqual(['Kept  words.'])
  })

  test('skips preformatted blocks only when asked to', () => {
    const html = '<p>Prose.</p><pre>art here</pre>'
    expect(sentenceTexts(build(html, false).index)).toEqual(['Prose.', 'art here'])
    expect(sentenceTexts(build(html, true).index)).toEqual(['Prose.'])
  })
})

describe('buildTextIndex mapping', () => {
  test('maps a text node position to an offset and back', () => {
    const { root, index } = build('<p>Alpha <b>beta</b> gamma.</p>')
    const bold = root.querySelector('b')?.firstChild
    expect(bold).toBeDefined()
    const offset = bold ? index.toOffset(bold, 2) : undefined
    expect(offset).toBe(index.text.indexOf('beta') + 2)
    const position = index.toDomPosition(offset ?? 0)
    expect(position?.node).toBe(bold)
    expect(position?.offset).toBe(2)
  })

  test('has no offset for a node that was skipped', () => {
    const { root, index } = build('<p>Prose.</p><pre>art</pre>', true)
    const art = root.querySelector('pre')?.firstChild
    expect(art && index.toOffset(art, 0)).toBeUndefined()
  })

  test('has no offset for a position in an element', () => {
    const { root, index } = build('<p>Prose.</p>')
    expect(index.toOffset(root, 0)).toBeUndefined()
  })

  test('builds a range across text nodes', () => {
    const { root, index } = build('<p>Alpha <b>beta</b> gamma.</p>')
    const start = index.text.indexOf('pha')
    const end = index.text.indexOf('gam')
    const range = index.toRange(start, end)
    expect(range?.startContainer).toBe(root.querySelector('p')?.firstChild)
    expect(range?.startOffset).toBe(2)
    expect(range?.endContainer).toBe(root.querySelector('p')?.lastChild)
    expect(range?.endOffset).toBe(1)
  })

  test('ends a range that stops on the seam between nodes in the earlier node', () => {
    const { root, index } = build('<p>Alpha <b>beta</b> gamma.</p>')
    const betaEnd = index.text.indexOf('beta') + 'beta'.length
    const range = index.toRange(index.text.indexOf('beta'), betaEnd)
    const bold = root.querySelector('b')?.firstChild
    expect(range?.startContainer).toBe(bold)
    expect(range?.endContainer).toBe(bold)
    expect(range?.endOffset).toBe(4)
  })

  test('finds the sentence containing an offset, or the next one from a gap', () => {
    const { index } = build('<p>One.</p><p>Two.</p>')
    const twoStart = index.text.indexOf('Two')
    expect(index.sentenceIndexAt(0)).toBe(0)
    expect(index.sentenceIndexAt(twoStart - 1)).toBe(1)
    expect(index.sentenceIndexAt(twoStart + 1)).toBe(1)
    expect(index.sentenceIndexAt(index.text.length)).toBe(-1)
  })
})

describe('wordBoundsAt', () => {
  const text = 'one two  three'

  test('finds the word around an offset inside it', () => {
    expect(wordBoundsAt(text, 5)).toEqual({ start: 4, end: 7 })
  })

  test('keeps an offset just after a word on that word', () => {
    expect(wordBoundsAt(text, 7)).toEqual({ start: 4, end: 7 })
  })

  test('moves an offset between words on to the next word', () => {
    expect(wordBoundsAt(text, 8)).toEqual({ start: 9, end: 14 })
  })

  test('clamps to the text', () => {
    expect(wordBoundsAt(text, 99)).toEqual({ start: 9, end: 14 })
    expect(wordBoundsAt(text, -3)).toEqual({ start: 0, end: 3 })
  })
})
