/**
 * This file is responsible for extracting/generating all links from markdown.
 */
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import { parseMarkdown } from '@nuxtjs/mdc/runtime'
import { globby } from 'globby'
import { camelCase, kebabCase } from 'es-toolkit'
import { XMLParser } from 'fast-xml-parser'
import type { X2jOptions } from 'fast-xml-parser'
import { defineNuxtModule, useLogger } from 'nuxt/kit'

const __dirname = import.meta.dirname
const websitePath = path.resolve(__dirname, '..')
const contentPath = path.resolve(websitePath, 'content')

const precomputerPath = path.resolve(websitePath, '..', 'precomputer')
const publicPathsForPrecomputer = path.join(precomputerPath, 'src', 'assets', 'markdown-paths.json')

const generatedMarkdownValidHrefs = path.resolve(
  websitePath,
  'shared',
  'utils',
  'markdown-valid-hrefs.ts'
)
const generatedMarkdownAllHrefs = path.resolve(
  websitePath,
  'generated',
  'report-of-all-markdown-hrefs.ts'
)

/**
 * For a node in a document returned by `parseHtml()`
 *
 * expects a data structure that looks a bit like
 * ```json
 * {
 *   "A": { "#text": "zombo" },
 *   ":@href": "http://zombo.com/"
 * }
 * ```
 */
const attemptToGetAttribute = (
  node: unknown,
  elementName: string | undefined,
  attributeName: string
): string | undefined => {
  const NODE_ATTRIBUTES_KEY = ':@'
  if (
    !node ||
    typeof node !== 'object' ||
    (elementName && !(elementName in node)) ||
    !(NODE_ATTRIBUTES_KEY in node)
  ) {
    return
  }

  const attributes = node[NODE_ATTRIBUTES_KEY]

  if (!attributes || typeof attributes !== 'object') {
    return
  }

  const nodeKey = `@_${attributeName}`
  const attribute = (attributes as Record<string, unknown>)[nodeKey]

  if (typeof attribute === 'string') {
    return attribute
  }
}

/**
 * Generate a heading anchor id by normalising the innerText
 */
const generateHeadingId = async (
  headingNode: unknown
): Promise<string | undefined> => {
  if (
    !headingNode ||
    typeof headingNode !== 'object' ||
    !(
      'h1' in headingNode ||
      'h2' in headingNode ||
      'h3' in headingNode ||
      'h4' in headingNode ||
      'h5' in headingNode ||
      'h6' in headingNode
    )
  ) {
    console.error(JSON.stringify(headingNode, null, 2))
    throw Error('Argument is not a heading node (h1, h2, h3, h4, h5, h6)')
  }
  const computedAnchorId = textToAnchorId(await getInnerText([headingNode]))

  return computedAnchorId
}

/**
 * This should only be used in tests.
 * It's useful because it returns a JSON serializable data structure (rather than objects)
 * so vitest can test/diff data structures easily.
 *
 * If you need an HTML parser but not for tests (eg in Vue/Nuxt) then try
 * The Platform[tm] https://developer.mozilla.org/en-US/docs/Web/API/DOMParser
 */
const parseHtml = (html: string) => {
  const parser = getXMLParser({
    // HTML parse mode config
    unpairedTags: ['hr', 'br', 'link', 'meta'],
    stopNodes: ['*.pre', '*.script'],
    htmlEntities: true
  })
  return parser.parse(html)
}

type NodeHandler = (node: unknown) => Promise<void>

const walkNodes = async (nodeList: unknown[], nodeHandler: NodeHandler) => {
  // using a for-loop rather than await Promise.all(nodeList.map(...)) because we want
  // to run async code sequentially rather than concurrently
  // ie each nodeHandler(node) should complete before the next one is called.
  // to avoid race conditions in async nodeHandler code
  for (const node of nodeList) {
    await nodeHandler(node)

    if (node && typeof node === 'object') {
      const keys = Object.keys(node)
      for (const key of keys) {
        const item = (node as Record<string, unknown>)[key]
        if (Array.isArray(item)) {
          // recursion
          await walkNodes(item, nodeHandler)
        }
      }
    } else {
      console.log(node)
      throw Error('Unexpected state')
    }
  }
}

/**
 * XML Parser has some defaults (eg discarding whitespace) that don't suit our needs
 * so here's our default config
 */
const parserDefaultConfig: X2jOptions = {
  preserveOrder: true,
  ignoreAttributes: false,
  trimValues: false, // preserve whitespace
  processEntities: false
}

const getXMLParser = (additionalConfig?: X2jOptions) =>
  new XMLParser({
    ...parserDefaultConfig,
    ...additionalConfig
  })

const getInnerText = async (nodeList: unknown[]): Promise<string> => {
  const innerText: string[] = []

  await walkNodes(nodeList, async (node) => {
    if (!node || typeof node !== 'object' || !('#text' in node)) return

    const textNodeValue = node['#text']
    if (typeof textNodeValue !== 'string') throw Error('unable to extract text')
    innerText.push(textNodeValue)
  })

  return innerText.join('')
}

/**
 * Converts arbitrary text into a custom id that is DOMId compliant (ie no whitespace)
 *
 * WARNING: this does not ensure unique DOM ids. It's not a uuid/useId hook. It just derives
 * an id from the input string.
 */
const textToAnchorId = (text: string): string | undefined => {
  const normalized = text
    .trim()
    .toLowerCase() // lowercase before kebabCase() because otherwise kebabCase() will split 'RFCs' into 'rf-cs'
    .replace(/\./g, '-') // replace periods because otherwise "section 2.2" becomes "section22" rather than "section2-2" which is more readable in the url
    .replace(/[^0-9\-a-zA-Z\s]/g, '') // removes non-alphanumeric eg question marks
  if (
    // if it's an empty string then getVNodeText() probably returned an empty string, so just return `undefined`
    !normalized
  ) {
    return
  }

  return kebabCase(normalized)
}

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
        return `<${node.tag}${node.props ?
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

  const markdownPublicPaths: string[] = []

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
      markdownPublicPaths.push(publicPath)
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

  await fsPromises.writeFile(
    publicPathsForPrecomputer,
    JSON.stringify(markdownPublicPaths.sort(), null, 2)
  )

  // Generates type MarkdownValidHrefs
  await fsPromises.writeFile(
    generatedMarkdownValidHrefs,
    `${generatedFileWarningHeader}export type MarkdownValidHrefs =\n  | ${markdownsValidHrefs
      .flatMap((markdownValidHrefs) => {
        return markdownValidHrefs.validHrefs.map((validHref) =>
          // ensures TS-compatible string escaping when necessary
          // even though it's probably not necessary
          JSON.stringify(validHref)
        )
      })
      .join('\n  | ')}\n\n${markdownsValidHrefs
        .map((markdownValidHrefs) => {
          return `export type ${markdownFileInternalLinksTypeBuilder(markdownValidHrefs.markdownPath)} =\n  | ${markdownValidHrefs.validInternalLinks
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
