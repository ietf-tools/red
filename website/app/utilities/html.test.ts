// @vitest-environment nuxt
import { test, expect, describe } from 'vitest'
import { htmlEscapeToText } from './html'

describe('htmlEscapeToText: basic character escaping', () => {
  test('escapes < to &lt;', () => {
    expect(htmlEscapeToText('<')).toBe('&lt;')
  })

  test('escapes > to &gt;', () => {
    expect(htmlEscapeToText('>')).toBe('&gt;')
  })

  test('escapes & to &amp;', () => {
    expect(htmlEscapeToText('&')).toBe('&amp;')
  })

  test('escapes " to &quot;', () => {
    expect(htmlEscapeToText('"')).toBe('&quot;')
  })

  test("escapes ' to &apos;", () => {
    expect(htmlEscapeToText("'")).toBe('&apos;')
  })

  test('passes through plain text unchanged', () => {
    expect(htmlEscapeToText('hello world')).toBe('hello world')
  })

  test('returns empty string unchanged', () => {
    expect(htmlEscapeToText('')).toBe('')
  })

  test('passes through numbers unchanged', () => {
    expect(htmlEscapeToText('12345')).toBe('12345')
  })

  test('passes through unicode unchanged', () => {
    expect(htmlEscapeToText('Ünïcödé résümé')).toBe('Ünïcödé résümé')
  })

  test('passes through emoji unchanged', () => {
    expect(htmlEscapeToText('hello 🌍')).toBe('hello 🌍')
  })
})

describe('htmlEscapeToText: XSS script injection', () => {
  test('escapes basic script tag', () => {
    expect(htmlEscapeToText('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  test('escapes script tag with src', () => {
    expect(htmlEscapeToText('<script src="evil.js"></script>')).toBe(
      '&lt;script src=&quot;evil.js&quot;&gt;&lt;/script&gt;'
    )
  })

  test('escapes script with single-quoted src', () => {
    expect(htmlEscapeToText("<script src='evil.js'></script>")).toBe(
      '&lt;script src=&apos;evil.js&apos;&gt;&lt;/script&gt;'
    )
  })

  test('escapes uppercase SCRIPT tag', () => {
    expect(htmlEscapeToText('<SCRIPT>alert(1)</SCRIPT>')).toBe('&lt;SCRIPT&gt;alert(1)&lt;/SCRIPT&gt;')
  })

  test('escapes mixed-case Script tag', () => {
    expect(htmlEscapeToText('<Script>alert(1)</Script>')).toBe('&lt;Script&gt;alert(1)&lt;/Script&gt;')
  })
})

describe('htmlEscapeToText: entity double-escaping', () => {
  test('escapes & in existing entities to prevent double-decoding', () => {
    expect(htmlEscapeToText('&lt;')).toBe('&amp;lt;')
  })

  test('escapes & in &amp;', () => {
    expect(htmlEscapeToText('&amp;')).toBe('&amp;amp;')
  })

  test('escapes & in &#x3C; numeric entity', () => {
    expect(htmlEscapeToText('&#x3C;')).toBe('&amp;#x3C;')
  })

  test('escapes & in &#60; decimal entity', () => {
    expect(htmlEscapeToText('&#60;')).toBe('&amp;#60;')
  })
})
