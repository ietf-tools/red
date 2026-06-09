/**
 * Code contributed by Filip Skokan (Panva https://github.com/panva )
 * https://github.com/ietf-tools/red/pull/404
 */

import { describe, expect, test } from 'vitest'
import {
  getRfc8792CopyText,
  hasXml2RfcSourcecodeMarkers,
  stripXml2RfcSourcecodeMarkers
} from './rfc8792'

describe('getRfc8792CopyText', () => {
  test('unfolds the single backslash strategy', () => {
    const text = [
      "========== NOTE: '\\' line wrapping per RFC 8792 ===========",
      '',
      'first folded line \\',
      'continues here',
      'second folded line \\',
      '  also continues',
      ''
    ].join('\n')

    expect(getRfc8792CopyText(text)).toBe(
      ['first folded line continues here', 'second folded line also continues', ''].join('\n')
    )
  })

  test('unfolds the double backslash strategy', () => {
    const text = [
      "[NOTE: '\\\\' line wrapping per RFC 8792]",
      '',
      'first folded line \\',
      '  \\continues here',
      'second folded line \\',
      '  \\also continues',
      ''
    ].join('\n')

    expect(getRfc8792CopyText(text)).toBe(
      ['first folded line continues here', 'second folded line also continues', ''].join('\n')
    )
  })

  test('strips renderer-added sourcecode markers when requested', () => {
    const text = [
      '<CODE BEGINS> file "marked-wrap.txt"',
      "NOTE: '\\' line wrapping per RFC 8792",
      '',
      'marked folded line \\',
      'continues here',
      '',
      '<CODE ENDS>'
    ].join('\n')

    expect(
      getRfc8792CopyText(text, { stripSourcecodeMarkers: true })
    ).toBe('marked folded line continues here\n')
  })

  test('returns null when the header is present but the body is not folded', () => {
    const text = [
      "NOTE: '\\' line wrapping per RFC 8792",
      '',
      'This block mentions the header but does not use RFC 8792 folding.',
      ''
    ].join('\n')

    expect(getRfc8792CopyText(text)).toBeNull()
  })

  test('returns null when no RFC 8792 header is present', () => {
    expect(getRfc8792CopyText('plain source code\nline 2\n')).toBeNull()
  })
})

describe('xml2rfc sourcecode markers', () => {
  test('detects and strips markers', () => {
    const text = [
      '<CODE BEGINS>',
      ' file "example.txt"',
      'content',
      '<CODE ENDS>',
      ''
    ].join('\n')

    expect(hasXml2RfcSourcecodeMarkers(text)).toBe(true)
    expect(stripXml2RfcSourcecodeMarkers(text)).toBe('content\n')
  })
})