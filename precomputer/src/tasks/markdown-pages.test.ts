// @vitest-environment node
import path from 'path'
import fsPromises from 'fs/promises'
import { test, expect } from 'vitest'
import { replaceComponentReferences, markdownToHtml, renderMarkdownPageData } from './markdown-pages.ts'
import type { NodePojo } from '../../../website/app/utilities/rfc-validators.ts'

const CONTENT_DIR = path.resolve(import.meta.dirname, '../../../website/content')

test('replaceComponentReferences: no-content component becomes self-closing element', () => {
  const html = markdownToHtml('::MyComponent\n::')
  expect(html).toContain('::MyComponent')
  const result = replaceComponentReferences(html)
  expect(result).toContain('<MyComponent></MyComponent>')
  expect(result).not.toContain('::MyComponent')
})

test('replaceComponentReferences: component with props converts attributes', () => {
  const html = markdownToHtml('::Alert{type="warning"}\n::')
  const result = replaceComponentReferences(html)
  expect(result).toContain('<Alert type="warning"></Alert>')
  expect(result).not.toMatch(/::Alert/)
})

test('replaceComponentReferences: component with content preserves inner HTML', () => {
  const html = markdownToHtml('::Alert{type="warning"}\nThe **alert** component.\n::')
  const result = replaceComponentReferences(html)
  expect(result).toContain('<Alert type="warning">')
  expect(result).toContain('<strong>alert</strong>')
  expect(result).toContain('</Alert>')
  expect(result).not.toMatch(/::Alert/)
})

test('replaceComponentReferences: component with content preserves inner HTML', () => {
  const html = markdownToHtml(`## Search for Errata

::ErrataSiteSearchLink
::`)
  const result = replaceComponentReferences(html)
  console.log({ result, html })
  expect(result).toContain('<h2>Search for Errata</h2>')
  expect(result).toContain('<p><ErrataSiteSearchLink></ErrataSiteSearchLink></p>')
  expect(result).not.toMatch(/::ErrataSiteSearchLink/)
})

test('replaceComponentReferences: "::" as text is left unchanged', () => {
  // This example comes from RFC download page, showing rsync syntax which uses '::' in examples. It is not a component reference.
  const html = markdownToHtml(`Type \`rsync -avz --delete rsync.rfc-editor.org::Module-Name Target-Directory\``)
  const result = replaceComponentReferences(html)
  expect(result).toContain('rsync -avz --delete rsync.rfc-editor.org::Module-Name Target-Directory')
})

test('replaceComponentReferences: non-component paragraphs are unchanged', () => {
  const html = markdownToHtml('Hello world\n\nAnother paragraph.')
  const result = replaceComponentReferences(html)
  expect(result).toBe(html)
})

test('replaceComponentReferences: rfc-errata.md ErrataSiteSearchLink is converted', async () => {
  const markdownText = await fsPromises.readFile(path.join(CONTENT_DIR, 'series/rfc-errata.md'), 'utf-8')
  const html = markdownToHtml(markdownText)
  expect(html).toContain('::ErrataSiteSearchLink')

  const result = replaceComponentReferences(html)
  expect(result).toContain('<ErrataSiteSearchLink>')
  expect(result).not.toContain('::ErrataSiteSearchLink')
})

test('replaceComponentReferences: all content markdown files have no unconverted :: syntax after processing', async () => {
  const markdownGlob = fsPromises.glob('**/*.md', { cwd: CONTENT_DIR })
  const relativePaths: string[] = []
  for await (const file of markdownGlob) {
    relativePaths.push(file)
  }
  expect(relativePaths.length).toBeGreaterThan(0)

  for (const relativePath of relativePaths) {
    const fileContent = await fsPromises.readFile(path.join(CONTENT_DIR, relativePath), 'utf-8')
    const html = markdownToHtml(fileContent)
    const result = replaceComponentReferences(html)
    // Intentionally not as complex because it doesn't need to parse into matches, just check if one was missed.
    const simpleComponentReferenceRegex = /[>\s]::([A-Z][A-Za-z0-9-]*)/
    expect(
      result,
      `${relativePath} still contains unconverted :: component syntax after replaceComponentReferences`
    ).not.toMatch(simpleComponentReferenceRegex)
  }
})

const FAQ_MARKDOWN = `---
showToc: true
---

# Frequently Asked Questions

## Can I be notified when a new RFC is published? {#notified}

Yes.

## May I reproduce or translate an RFC? {#copyright}

All RFCs may be freely reproduced and translated (unmodified).
`

const pojoText = (node: NodePojo): string =>
  node.type === 'Text' ? node.textContent : node.children.map(pojoText).join('')

// Collects every heading element (h1–h6) from a rendered page's htmlObj as { tag, id, title }.
const headingsOf = (page: Awaited<ReturnType<typeof renderMarkdownPageData>>) =>
  page.htmlObj
    .filter((node): node is Extract<NodePojo, { type: 'Element' }> => node.type === 'Element')
    .filter((node) => /^h[1-6]$/.test(node.nodeName))
    .map((node) => ({
      tag: node.nodeName,
      id: node.attributes.id,
      title: pojoText(node).trim()
    }))

test('renderMarkdownPageData: extracts the H1 as the page title', async () => {
  const page = await renderMarkdownPageData({
    fileContent: FAQ_MARKDOWN,
    contentMetadata: {},
    filePath: 'series/rfc-faq.md',
    slug: 'series/rfc-faq'
  })

  expect(page.title).toBe('Frequently Asked Questions')
})

test('renderMarkdownPageData: applies explicit {#id} anchors to the right heading', async () => {
  const page = await renderMarkdownPageData({
    fileContent: FAQ_MARKDOWN,
    contentMetadata: {},
    filePath: 'series/rfc-faq.md',
    slug: 'series/rfc-faq'
  })

  // Regression: the id-less H1 must NOT absorb the following heading's {#notified} id, and the
  // {#id} markers must be stripped from the rendered heading text.
  expect(headingsOf(page)).toEqual([
    { tag: 'h1', id: undefined, title: 'Frequently Asked Questions' },
    { tag: 'h2', id: 'notified', title: 'Can I be notified when a new RFC is published?' },
    { tag: 'h2', id: 'copyright', title: 'May I reproduce or translate an RFC?' }
  ])
})

test('renderMarkdownPageData: auto-generates ids for headings without an explicit anchor', async () => {
  const page = await renderMarkdownPageData({
    fileContent: '# Title\n\n## A plain heading?\n\nBody.\n',
    contentMetadata: {},
    filePath: 'series/example.md',
    slug: 'series/example'
  })

  expect(headingsOf(page)).toEqual([
    { tag: 'h1', id: undefined, title: 'Title' },
    { tag: 'h2', id: 'a-plain-heading', title: 'A plain heading?' }
  ])
})

test('renderMarkdownPageData: builds a table of contents from the H2 heading ids', async () => {
  const page = await renderMarkdownPageData({
    fileContent: FAQ_MARKDOWN,
    contentMetadata: {},
    filePath: 'series/rfc-faq.md',
    slug: 'series/rfc-faq'
  })

  const links = (page.toc?.sections ?? []).flatMap((section) => section.links)
  expect(links).toEqual([
    { id: 'notified', title: 'Can I be notified when a new RFC is published?' },
    { id: 'copyright', title: 'May I reproduce or translate an RFC?' }
  ])
})
