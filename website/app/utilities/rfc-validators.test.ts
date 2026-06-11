// @vitest-environment nuxt
import { test, expect } from 'vitest'
import { buildMarkdownToc, type HeadingInfo } from './rfc-validators'

const h = (level: number, title: string): HeadingInfo => ({
  level,
  title,
  id: title.toLowerCase().replace(/\s+/g, '-')
})

test('buildMarkdownToc: only h2s are top-level siblings', () => {
  const result = buildMarkdownToc([h(2, 'A'), h(2, 'B'), h(2, 'C')])
  expect(result.sections).toHaveLength(3)
  expect(result.sections[0]?.links?.[0]?.title).toBe('A')
  expect(result.sections[1]?.links?.[0]?.title).toBe('B')
  expect(result.sections[2]?.links?.[0]?.title).toBe('C')
  expect(result.sections[0]?.sections).toBeUndefined()
})

test('buildMarkdownToc: only h3s are top-level siblings (not nested under first)', () => {
  const result = buildMarkdownToc([h(3, 'A'), h(3, 'B'), h(3, 'C')])
  expect(result.sections).toHaveLength(3)
  expect(result.sections[0]?.links?.[0]?.title).toBe('A')
  expect(result.sections[1]?.links?.[0]?.title).toBe('B')
  expect(result.sections[2]?.links?.[0]?.title).toBe('C')
  expect(result.sections[0]?.sections).toBeUndefined()
})

test('buildMarkdownToc: h3s nest under their preceding h2', () => {
  const result = buildMarkdownToc([
    h(2, 'Intro'),
    h(3, 'Background'),
    h(3, 'Motivation'),
    h(2, 'Methods'),
    h(3, 'Approach')
  ])
  expect(result.sections).toHaveLength(2)
  expect(result.sections[0]?.links?.[0]?.title).toBe('Intro')
  expect(result.sections[0]?.sections).toHaveLength(2)
  expect(result.sections[0]?.sections?.[0]?.links?.[0]?.title).toBe('Background')
  expect(result.sections[0]?.sections?.[1]?.links?.[0]?.title).toBe('Motivation')
  expect(result.sections[1]?.links?.[0]?.title).toBe('Methods')
  expect(result.sections[1]?.sections).toHaveLength(1)
  expect(result.sections[1]?.sections?.[0]?.links?.[0]?.title).toBe('Approach')
})

test('buildMarkdownToc: h1 and h4+ are ignored', () => {
  const result = buildMarkdownToc([h(1, 'Title'), h(2, 'Section'), h(4, 'Deep'), h(5, 'Deeper')])
  expect(result.sections).toHaveLength(1)
  expect(result.sections[0]?.links?.[0]?.title).toBe('Section')
})

test('buildMarkdownToc: empty headings returns empty sections', () => {
  const result = buildMarkdownToc([])
  expect(result.sections).toHaveLength(0)
  expect(result.title).toBe('Table of Contents')
})

test('buildMarkdownToc: h3s before first h2 are top-level, then h2 starts new section', () => {
  const result = buildMarkdownToc([h(3, 'Preamble'), h(2, 'Body'), h(3, 'Detail')])
  expect(result.sections).toHaveLength(2)
  expect(result.sections[0]?.links?.[0]?.title).toBe('Preamble')
  expect(result.sections[0]?.sections).toBeUndefined()
  expect(result.sections[1]?.links?.[0]?.title).toBe('Body')
  expect(result.sections[1]?.sections?.[0]?.links?.[0]?.title).toBe('Detail')
})
