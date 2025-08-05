// @vitest-environment nuxt
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import { test, expect } from 'vitest'
import { escapeRegExp } from 'lodash-es'
import { micromark } from 'micromark'
import { globby } from 'globby'
import { fileExists } from './test-utils/fs-test-util'
import {
  attemptToGetAttribute,
  parseHtml,
  walkNodes
} from '~/utilities/test-utils/html-test-utils'

const __dirname = import.meta.dirname
const clientPath = path.resolve(__dirname, '..', '..')
const contentPath = path.resolve(clientPath, 'content')
const publicPath = path.resolve(clientPath, 'public')

test('Markdown links validation', async () => {
  // Unfortunately Nuxt Content's queryCollection() utils can't run in tests, only in server routes,
  // so we have to read the markdown files directly from the filesystem
  const markdownPaths = await globby(['**/*.md'], {
    cwd: contentPath
  })

  // quick sanity check on whether globby matched ANY markdowns
  expect(markdownPaths.length).toBeGreaterThan(0)

  const markdownFilesData = await Promise.all(
    markdownPaths.map((markdownPath) =>
      fsPromises.readFile(path.join(contentPath, markdownPath), 'utf-8')
    )
  )

  const htmls = markdownFilesData.map((markdownFileData) =>
    micromark(markdownFileData)
  )
  const docs = htmls.map((html) => parseHtml(html))

  const validateMarkdown = (
    markdownData: string,
    markdownPath: string
  ): void => {
    const badInternalLink = '](<#' // when converting from Google Doc it often makes broken links with this signature
    expect(
      markdownData,
      `Markdown file ${markdownPath} included bad data ${badInternalLink}`
    ).not.toMatch(badInternalLink)
  }

  const validateImage = async (node: unknown, markdownPath: string) => {
    const src = attemptToGetAttribute(node, 'img', 'src')
    if (!src) return

    const expectedPrefix = `/images/${markdownPath.replace(/\.md$/, '')}-`
    const expectedPrefixRegexp = new RegExp(`^${escapeRegExp(expectedPrefix)}`)
    expect(
      src,
      `Markdown file ${markdownPath} references image that doesn't match filename naming convention (prefixed with ${expectedPrefix})`
    ).toMatch(expectedPrefixRegexp)

    const assetFilePath = path.join(publicPath, src)
    const hasImageFile = await fileExists(assetFilePath)
    expect(
      hasImageFile,
      `Markdown file ${markdownPath} references image ${src} that doesn't exist`
    ).toBe(true)
  }

  markdownFilesData.forEach((markdownData, index) => {
    const markdownPath = markdownPaths[index]
    if (!markdownPath) {
      throw Error(`markdownPath should not be falsy`)
    }
    validateMarkdown(markdownData, markdownPath)
  })

  await Promise.all(
    docs.map(async (doc, index) => {
      const markdownPath = markdownPaths[index]
      if (!markdownPath) {
        throw Error(`markdownPath should not be falsy`)
      }
      await walkNodes(doc, (node) => validateImage(node, markdownPath))
    })
  )
})
