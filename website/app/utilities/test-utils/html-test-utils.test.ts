// @vitest-environment nuxt
import { test, expect } from 'vitest'
import { parseHtml, getInnerText } from './html-test-utils'

test('getInnerText(): simple', async () => {
  const doc = parseHtml('<h1>some text</h1>')
  expect(await getInnerText(doc)).toBe('some text')
})

test('getInnerText(): nested', async () => {
  const doc = parseHtml('<h1>some <b>text</b></h1>')
  expect(await getInnerText(doc)).toBe('some text')
})
