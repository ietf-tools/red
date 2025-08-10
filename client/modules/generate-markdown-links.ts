/**
 * This file is responsible for extracting/generating all links from markdown.
 */
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import { parseMarkdown } from '@nuxtjs/mdc/runtime'
import { globby } from 'globby'
import { camelCase } from 'lodash-es'
import { defineNuxtModule, useLogger } from 'nuxt/kit'
import {
  attemptToGetAttribute,
  generateHeadingId,
  parseHtml,
  walkNodes
} from '../app/utilities/test-utils/html-test-utils'

const __dirname = import.meta.dirname
const clientPath = path.resolve(__dirname, '..')
const contentPath = path.resolve(clientPath, 'content')

const generatedMarkdownValidHrefs = path.resolve(
  clientPath,
  'shared',
  'markdown-valid-hrefs.d.ts'
)
const generatedMarkdownAllHrefs = path.resolve(
  clientPath,
  'generated',
  'report-of-all-markdown-hrefs.ts'
)

type MdcParserResult = Awaited<ReturnType<typeof parseMarkdown>>
type MdcRoot = MdcParserResult['body']
type MdcNode = MdcRoot['children'][number]
const mdcParserResultToHtml = (mdcParserResult: MdcParserResult): string => {
  const walk = (node: MdcNode | MdcRoot): string => {
    switch (node.type) {
      case 'root':
        return node.children.map(walk).join('')
      case 'text':
        return node.value
      case 'element':
        if (
          // self-closing element in HTML
          ['img', 'br', 'hr', 'link'].includes(node.tag)
        ) {
          return `<${node.tag}>`
        }
        return `<${node.tag}${
          node.props ?
            Object.entries(node.props)
              .map(([key, value]) => ` ${key}="${value}"`)
              .join('')
          : ''
        }>${node.children.map(walk).join('')}</${node.tag}>`
      case 'comment':
        return ''
    }
  }
  return walk(mdcParserResult.body)
}

/**
 * A TRUSTING markdown to HTML converter using Nuxt libs
 * If you do not trust your markdown don't use this
 */
const processMarkdown = async (markdown: string): Promise<string> => {
  // const appConfig = useAppConfig()

  const mdcParserResult = await parseMarkdown(markdown, {
    remark: {
      plugins: {
        // TODO somehow derive this from nuxt.config.ts's remark plugins
        'remark-heading-id': {
          instance: await import(/* @vite-ignore */ 'remark-heading-id').then(
            (m) => m.default || m
          )
        }
      }
    }
  })

  const html = mdcParserResultToHtml(mdcParserResult)

  return html
}

const generatedFileWarningHeader = `// Generated file by ${path.basename(import.meta.filename)} DO NOT EDIT\n`

const getMarkdownInit = async () => {
  // Unfortunately Nuxt Content's queryCollection() utils can't run in tests or Node scripts, only in server routes,
  // so we have to read the markdown files directly from the filesystem
  const markdownPaths = await globby(['**/*.md'], {
    cwd: contentPath
  })

  const markdownFilesData = await Promise.all(
    markdownPaths.map((markdownPath) =>
      fsPromises.readFile(path.join(contentPath, markdownPath), 'utf-8')
    )
  )

  const htmls = await Promise.all(
    markdownFilesData.map((markdownFileData) =>
      processMarkdown(markdownFileData)
    )
  )

  const docs = htmls.map((html) => parseHtml(html))

  return { markdownPaths, markdownFilesData, htmls, docs }
}

const markdownFileInternalLinksTypeBuilder = (markdownPath: string) =>
  `MarkdownFileValidInternalLinks_${camelCase(markdownPath)}`

type MarkdownsValidHrefs = {
  markdownPath: string
  validHrefs: string[]
  validInternalLinks: string[]
}[]

type Logger = ReturnType<typeof useLogger>

const regenerateValidMarkdownLinks = async (logger?: Logger) => {
  const { markdownPaths, docs } = await getMarkdownInit()

  const markdownPathToPublicPath = (markdownPath: string) =>
    `/${markdownPath.replace(/\.md$/, '/')}`

  const markdownsValidHrefs: MarkdownsValidHrefs = await Promise.all(
    docs.map(async (doc, index) => {
      const validHrefs: string[] = []
      const markdownPath = markdownPaths[index]
      if (typeof markdownPath !== 'string') {
        throw Error(
          `Expected string but markdownPath was ${typeof markdownPath}`
        )
      }
      const publicPath = markdownPathToPublicPath(markdownPath)
      const anchorIds: string[] = []
      await walkNodes(doc, async (node) => {
        if (
          node &&
          typeof node === 'object' &&
          ('h1' in node ||
            'h2' in node ||
            'h3' in node ||
            'h4' in node ||
            'h5' in node ||
            'h6' in node)
        ) {
          const customAnchorId = await attemptToGetAttribute(
            node,
            undefined,
            'id'
          )
          if (customAnchorId) {
            anchorIds.push(customAnchorId)
          } else {
            const computedHeadingId = await generateHeadingId(node)
            if (computedHeadingId) {
              anchorIds.push(computedHeadingId)
            }
          }
        }
      })

      validHrefs.push(
        publicPath,
        ...anchorIds.map((anchorId) => `${publicPath}#${anchorId}`)
      )

      const validInternalLinks = anchorIds.map(
        (headingText) => `#${headingText}`
      )

      return { markdownPath, validHrefs, validInternalLinks }
    })
  )

  // Generates type MarkdownValidHrefs
  await fsPromises.writeFile(
    generatedMarkdownValidHrefs,
    `${generatedFileWarningHeader}declare type MarkdownValidHrefs =\n  | ${markdownsValidHrefs
      .flatMap((markdownValidHrefs) => {
        return markdownValidHrefs.validHrefs.map((validHref) =>
          // ensures TS-compatible string escaping when necessary
          // even though it's probably not necessary
          JSON.stringify(validHref)
        )
      })
      .join('\n  | ')}\n\n${markdownsValidHrefs
      .map((markdownValidHrefs) => {
        return `declare type ${markdownFileInternalLinksTypeBuilder(markdownValidHrefs.markdownPath)} =\n  | ${markdownValidHrefs.validInternalLinks
          .map((validInternalLink) => JSON.stringify(validInternalLink))
          .join('\n  | ')}`
      })
      .join('\n\n')}\n`
  )

  logger?.info(` - regenerated ${path.basename(generatedMarkdownValidHrefs)}`)

  return markdownsValidHrefs
}

const regenerateReportForAllMarkdownLinks = async (logger?: Logger) => {
  const { markdownPaths, docs } = await getMarkdownInit()
  const markdownsAllHrefs = await Promise.all(
    docs.map(async (doc, index) => {
      const hrefs: string[] = []
      const markdownPath = markdownPaths[index]

      await walkNodes(doc, async (node) => {
        const href = attemptToGetAttribute(node, 'a', 'href')
        if (href !== undefined) {
          hrefs.push(href)
        }
      })

      return { markdownPath, hrefs }
    })
  )

  await fsPromises.writeFile(
    generatedMarkdownAllHrefs,
    `${generatedFileWarningHeader}// Compares markdown hrefs against type ValidHrefs\nimport type { ValidHrefs } from '../utilities/url'\n\n${markdownsAllHrefs
      .map((markdownHrefs) =>
        markdownHrefs.hrefs
          .map((href, index) => {
            if (typeof markdownHrefs.markdownPath !== 'string') {
              throw Error(
                `Expected string but markdownHrefs.markdownPath was ${typeof markdownHrefs.markdownPath}`
              )
            }
            return `const _${camelCase(markdownHrefs.markdownPath)}${index + 1}: ValidHrefs | ${markdownFileInternalLinksTypeBuilder(markdownHrefs.markdownPath)} = ${JSON.stringify(href)} // if there is a TS error fix the Markdown link in ${markdownHrefs.markdownPath}`
          })
          .join('\n')
      )
      .join('\n\n')}`
  )

  logger?.info(` - regenerated ${path.basename(generatedMarkdownAllHrefs)}`)
}

export default defineNuxtModule({
  setup(options, nuxt) {
    const logger = useLogger('generate-markdown-links', {
      level: options.quiet ? 0 : 3
    })

    nuxt.hook('builder:watch', async (_event, watcherPath) => {
      if (
        // If watcherPath is about a file just updated by one of our modules
        // then we don't want to do anything
        // otherwise we could be stuck in a loop
        watcherPath.includes('generated/') ||
        watcherPath.includes('shared/')
      ) {
        return
      }

      logger.info(
        `Regenerating markdown links because "${watcherPath}" changed`
      )
      await regenerateValidMarkdownLinks(logger)
      await regenerateReportForAllMarkdownLinks(logger)
    })
  }
})

// Create the file(s) initially on Nuxt load so there aren't import errors on CI
await regenerateValidMarkdownLinks()
await regenerateReportForAllMarkdownLinks()
