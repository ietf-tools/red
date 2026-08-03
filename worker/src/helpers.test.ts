// @vitest-environment node
import { test, expect } from 'vitest'
import type { IRequest } from 'itty-router'
import { createBlobResponse, etagMatches, htmlTemplate, safe } from './helpers'

test('htmlTemplate: no interpolations', () => {
  expect(htmlTemplate`plain text`.toString()).toBe('plain text')
})

test('htmlTemplate: distinguishes between template and values', () => {
  expect(htmlTemplate`<script>${'<script>'}</script>`.toString()).toBe('<script>&lt;script&gt;</script>')
})

test('htmlTemplate: interpolates a value', () => {
  const name = 'world'
  expect(htmlTemplate`Hello ${name}!`.toString()).toBe('Hello world!')
})

test('htmlTemplate: escapes & in interpolated values', () => {
  expect(htmlTemplate`${'a & b'}`.toString()).toBe('a &amp; b')
})

test('htmlTemplate: escapes < and > in interpolated values', () => {
  expect(htmlTemplate`${'<script>'}`.toString()).toBe('&lt;script&gt;')
})

test('htmlTemplate: escapes " in interpolated values', () => {
  expect(htmlTemplate`${'say "hi"'}`.toString()).toBe('say &quot;hi&quot;')
})

test("htmlTemplate: escapes ' in interpolated values", () => {
  expect(htmlTemplate`${"it's"}`.toString()).toBe('it&#39;s')
})

test('htmlTemplate: does not escape static template strings', () => {
  expect(htmlTemplate`<div>${'safe'}</div>`.toString()).toBe('<div>safe</div>')
})

test('htmlTemplate: multiple interpolations are all escaped', () => {
  const a = '<b>'
  const b = '"quoted"'
  expect(htmlTemplate`${a} and ${b}`.toString()).toBe('&lt;b&gt; and &quot;quoted&quot;')
})

test('htmlTemplate: safe() values are not escaped', () => {
  expect(htmlTemplate`<ul>${safe('<li>item</li>')}</ul>`.toString()).toBe('<ul><li>item</li></ul>')
})

test('htmlTemplate: nested htmlTemplate is not escaped', () => {
  const inner = htmlTemplate`<li>${'<b>'}</li>`
  expect(htmlTemplate`<ul>${inner}</ul>`.toString()).toBe('<ul><li>&lt;b&gt;</li></ul>')
})

test('htmlTemplate: array of htmlTemplate results joined via safe()', () => {
  const items = ['cats', 'dogs']
  const inner = items.map((item) => htmlTemplate`<li>${item}</li>`)
  const html = htmlTemplate`<ul>${safe(inner.join(''))}</ul>`
  expect(html.toString()).toBe('<ul><li>cats</li><li>dogs</li></ul>')
})

test('htmlTemplate: array map with safe() still escapes inner user data', () => {
  const items = ['<script>alert(1)</script>']
  const inner = items.map((item) => htmlTemplate`<li>${item}</li>`)
  const html = htmlTemplate`<ul>${safe(inner.join(''))}</ul>`
  expect(html.toString()).toBe('<ul><li>&lt;script&gt;alert(1)&lt;/script&gt;</li></ul>')
})

test('htmlTemplate: joining without safe() escapes the html tags', () => {
  const items = ['cats']
  const inner = items.map((item) => htmlTemplate`<li>${item}</li>`)
  const html = htmlTemplate`<ul>${inner.join('')}</ul>`
  expect(html.toString()).toBe('<ul>&lt;li&gt;cats&lt;/li&gt;</ul>')
})

const STORED_ETAG = '"bafda97d4d349433cc0bd57a34de4e5d"'
// The same ETag as Cloudflare's edge rewrites it for a client that can't take
// gzip. Real clients hold this form, so it has to match the stored strong one.
const WEAKENED_ETAG = 'W/"bafda97d4d349433cc0bd57a34de4e5d"'

test('etagMatches: no If-None-Match header', () => {
  expect(etagMatches(null, STORED_ETAG)).toBe(false)
})

test('etagMatches: empty If-None-Match header', () => {
  expect(etagMatches('', STORED_ETAG)).toBe(false)
})

test('etagMatches: identical strong etag', () => {
  expect(etagMatches(STORED_ETAG, STORED_ETAG)).toBe(true)
})

test('etagMatches: weakened client etag against strong stored etag', () => {
  expect(etagMatches(WEAKENED_ETAG, STORED_ETAG)).toBe(true)
})

test('etagMatches: strong client etag against weak stored etag', () => {
  expect(etagMatches(STORED_ETAG, WEAKENED_ETAG)).toBe(true)
})

test('etagMatches: different etag', () => {
  expect(etagMatches('"0000000000000000000000000000000d"', STORED_ETAG)).toBe(false)
})

test('etagMatches: quoting is significant', () => {
  expect(etagMatches('bafda97d4d349433cc0bd57a34de4e5d', STORED_ETAG)).toBe(false)
})

test('etagMatches: wildcard matches any etag', () => {
  expect(etagMatches('*', STORED_ETAG)).toBe(true)
})

test('etagMatches: list containing the etag', () => {
  expect(etagMatches(`"aaa", ${WEAKENED_ETAG} ,"bbb"`, STORED_ETAG)).toBe(true)
})

test('etagMatches: list containing no match', () => {
  expect(etagMatches('"aaa", W/"bbb"', STORED_ETAG)).toBe(false)
})

/**
 * Minimal stand-ins for the runtime objects. The casts are contained here so the
 * tests themselves stay untyped-free: neither R2ObjectBody nor IRequest can be
 * constructed outside the Workers runtime.
 */
const fakeBlob = (httpEtag: string, storedMetadata: Record<string, string> = {}) =>
  ({
    httpEtag,
    body: 'stored body',
    writeHttpMetadata: (headers: Headers) => {
      for (const [name, value] of Object.entries(storedMetadata)) {
        headers.set(name, value)
      }
    }
  }) as unknown as R2ObjectBody

const fakeRequest = (ifNoneMatch?: string) =>
  ({
    headers: new Headers(ifNoneMatch === undefined ? {} : { 'if-none-match': ifNoneMatch })
  }) as unknown as IRequest

test('createBlobResponse: unconditional request gets the body', async () => {
  const response = createBlobResponse(fakeRequest(), fakeBlob(STORED_ETAG), 'text/plain;charset=utf-8')
  expect(response.status).toBe(200)
  expect(response.headers.get('etag')).toBe(STORED_ETAG)
  expect(response.headers.get('Content-Type')).toBe('text/plain;charset=utf-8')
  expect(response.headers.get('Content-Encoding')).toBe('gzip')
  await expect(response.text()).resolves.toBe('stored body')
})

test('createBlobResponse: matching conditional request gets 304 with no body', async () => {
  const response = createBlobResponse(fakeRequest(STORED_ETAG), fakeBlob(STORED_ETAG), 'text/plain;charset=utf-8')
  expect(response.status).toBe(304)
  await expect(response.text()).resolves.toBe('')
})

test('createBlobResponse: weakened client etag still gets 304', async () => {
  const response = createBlobResponse(fakeRequest(WEAKENED_ETAG), fakeBlob(STORED_ETAG), 'text/plain;charset=utf-8')
  expect(response.status).toBe(304)
  await expect(response.text()).resolves.toBe('')
})

test('createBlobResponse: stale conditional request gets the body', () => {
  const response = createBlobResponse(fakeRequest('W/"stale"'), fakeBlob(STORED_ETAG), 'text/plain;charset=utf-8')
  expect(response.status).toBe(200)
})

test('createBlobResponse: 304 keeps the cache-updating headers', () => {
  const response = createBlobResponse(
    fakeRequest(STORED_ETAG),
    fakeBlob(STORED_ETAG),
    'text/plain;charset=utf-8',
    'https://www.rfc-editor.org/info/rfc9999/',
    'public, max-age=3600'
  )
  expect(response.headers.get('etag')).toBe(STORED_ETAG)
  expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600')
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  expect(response.headers.get('Link')).toBe('<https://www.rfc-editor.org/info/rfc9999/>; rel="canonical"')
  expect(response.headers.get('Cf-R2-Served')).toBe('1')
})

test('createBlobResponse: 304 drops representation metadata', () => {
  const response = createBlobResponse(
    fakeRequest(STORED_ETAG),
    fakeBlob(STORED_ETAG, { 'Content-Language': 'en', 'Content-Disposition': 'inline' }),
    'text/plain;charset=utf-8'
  )
  expect(response.headers.get('Content-Type')).toBe(null)
  expect(response.headers.get('Content-Encoding')).toBe(null)
  expect(response.headers.get('Content-Language')).toBe(null)
  expect(response.headers.get('Content-Disposition')).toBe(null)
})

test('createBlobResponse: cacheControl is sent verbatim', () => {
  const response = createBlobResponse(
    fakeRequest(),
    fakeBlob(STORED_ETAG),
    'text/plain;charset=utf-8',
    undefined,
    'public, max-age=123, immutable'
  )
  expect(response.headers.get('Cache-Control')).toBe('public, max-age=123, immutable')
})

test('createBlobResponse: no cacheControl means no Cache-Control header', () => {
  const response = createBlobResponse(fakeRequest(), fakeBlob(STORED_ETAG), 'text/plain;charset=utf-8')
  expect(response.headers.get('Cache-Control')).toBe(null)
})
