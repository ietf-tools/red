// @vitest-environment node
import { test, expect } from 'vitest'
import { htmlTemplate, safe } from './helpers'

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
