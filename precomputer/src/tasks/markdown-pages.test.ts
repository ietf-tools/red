// @vitest-environment node
import path from 'path'
import fsPromises from 'fs/promises'
import { test, expect } from 'vitest'
import { replaceComponentReferences, markdownToHtml } from './markdown-pages.ts'

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
