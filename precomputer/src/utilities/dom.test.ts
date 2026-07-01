// @vitest-environment node
import { test, expect } from 'vitest'
import { resolveEntitiesToText } from './dom'

test('resolveEntitiesToText resolves named entities', async () => {
  expect(await resolveEntitiesToText('Hello &quot;World&quot;')).toEqual('Hello "World"')
})

test('resolveEntitiesToText resolves ampersand, less-than and greater-than', async () => {
  expect(await resolveEntitiesToText('a &amp; b &lt; c &gt; d')).toEqual('a & b < c > d')
})

test('resolveEntitiesToText resolves numeric entities', async () => {
  expect(await resolveEntitiesToText('&#65;&#66;&#67;')).toEqual('ABC')
})

test('resolveEntitiesToText resolves hex numeric entities', async () => {
  expect(await resolveEntitiesToText('&#x2018;quoted&#x2019;')).toEqual('‘quoted’')
})

test('resolveEntitiesToText resolves non-ascii named entities', async () => {
  expect(await resolveEntitiesToText('caf&eacute; &mdash; &copy;')).toEqual('café — ©')
})

test('resolveEntitiesToText leaves plain text unchanged', async () => {
  expect(await resolveEntitiesToText('just plain text')).toEqual('just plain text')
})

test('resolveEntitiesToText returns empty string for empty input', async () => {
  expect(await resolveEntitiesToText('')).toEqual('')
})

test('resolveEntitiesToText strips HTML tags, keeping text content', async () => {
  expect(await resolveEntitiesToText('<b>bold</b> &amp; <i>italic</i>')).toEqual('bold & italic')
})
