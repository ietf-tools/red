import { test, expect, describe } from 'vitest'
import { filterSpamText } from './spam'

describe('filterSpamText: URIs', () => {
  test('strips a URL with a scheme', () => {
    expect(filterSpamText('Visit https://spam.example/buy?x=1#top now')).toBe('Visit now')
  })

  test('strips schemes that have no //', () => {
    expect(filterSpamText('Contact mailto:someone@example.com today')).toBe('Contact today')
    expect(filterSpamText('magnet:?xt=urn:btih:abc123')).toBe('')
  })

  test('strips a www. host', () => {
    expect(filterSpamText('see www.spam.com today')).toBe('see today')
  })

  test('strips a bare host, with or without a path', () => {
    expect(filterSpamText('cheap spam.xyz now')).toBe('cheap now')
    expect(filterSpamText('spam.xyz/buy cheap')).toBe('cheap')
  })
})

describe('filterSpamText: cryptocurrency addresses', () => {
  test('strips a legacy Bitcoin address', () => {
    expect(filterSpamText('Send 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa please')).toBe('Send please')
  })

  test('strips a bech32 Bitcoin address', () => {
    expect(filterSpamText('Send bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq please')).toBe('Send please')
  })

  test('strips an Ethereum address', () => {
    expect(filterSpamText('Send 0x742d35Cc6634C0532925a3b844Bc454e4438f44e please')).toBe('Send please')
  })

  test('strips a token of exactly 26 characters but not 25', () => {
    expect(filterSpamText(`a ${'x'.repeat(26)} b`)).toBe('a b')
    expect(filterSpamText(`a ${'x'.repeat(25)} b`)).toBe(`a ${'x'.repeat(25)} b`)
  })
})

describe('filterSpamText: everything else', () => {
  test('leaves ordinary text alone', () => {
    const text = 'A community list of RFCs about HTTP, e.g. RFC 9110 and RFC 9111.'
    expect(filterSpamText(text)).toBe(text)
  })

  test('strips a URL and an address from the same text', () => {
    expect(filterSpamText('Send 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa to https://spam.test/x')).toBe('Send to')
  })

  test('collapses the whitespace left behind and trims', () => {
    expect(filterSpamText('  Buy   at https://x.io   now  ')).toBe('Buy at now')
  })

  test('returns an empty string for empty input', () => {
    expect(filterSpamText('')).toBe('')
  })
})
