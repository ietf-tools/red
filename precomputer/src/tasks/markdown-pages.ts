import path from 'path'
import fsPromises from 'fs/promises'
import { DateTime } from 'luxon'
import { parse as parseYaml } from 'yaml'
import { micromark } from 'micromark'
import { frontmatter, frontmatterHtml } from 'micromark-extension-frontmatter'
import { gfm, gfmHtml } from 'micromark-extension-gfm'
import { getDOMParser, rfcDocumentToPojo } from '../utilities/dom.ts'
import {
  MarkdownPageSchema,
  type MarkdownPage,
  injectMarkdownHeadingIds,
  textToAnchorId,
  buildMarkdownToc,
  type HeadingInfo
} from '../../../website/app/utilities/rfc-validators.ts'
import { validateDocument } from '../utilities/validate-zod.ts'
import { saveToS3, markdownPagePathBuilder } from '../utilities/s3.ts'
import { type AsyncTaskItem } from '../utilities/task.ts'

const CONTENT_DIR = path.resolve(import.meta.dirname, '../../../website/content')
const CONTENT_METADATA_PATH = path.resolve(import.meta.dirname, '../../../website/generated/content-metadata.json')

type ContentMetadata = Record<string, { mtime: string } | undefined>

export const uploadAllMarkdownPages = async (): AsyncTaskItem => {
  const mdPattern = '**/*.md'
  const markdownGlob = fsPromises.glob(mdPattern, { cwd: CONTENT_DIR })
  const relativePaths: string[] = []
  for await (const file of markdownGlob) {
    relativePaths.push(file)
  }
  if (relativePaths.length === 0) {
    throw Error(`[markdown-pages] Expected at least one markdown page but in ${JSON.stringify(CONTENT_DIR)} with ${JSON.stringify(mdPattern)} got zero.`)
  }

  const contentMetadataRaw = await fsPromises.readFile(CONTENT_METADATA_PATH, 'utf-8')
  const contentMetadata: ContentMetadata = JSON.parse(contentMetadataRaw)

  const results = await Promise.all(
    relativePaths.map(async (relativePath): Promise<string | false> => {
      const filePath = path.join(CONTENT_DIR, relativePath)
      const slug = relativePath.replace(/\.md$/, '')
      const s3Key = markdownPagePathBuilder(slug)
      try {
        const page = await renderMarkdownPage(filePath, contentMetadata)
        await saveToS3(s3Key, JSON.stringify(page))
        console.log('Uploaded', s3Key)
        return s3Key
      } catch (err) {
        console.error(`[markdown-pages] Failed to process ${slug}:`, err)
        return false
      }
    })
  )

  return results
}

const extractFrontmatterYaml = (fileContent: string): Record<string, unknown> => {
  const match = fileContent.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const frontmatterYamlString = match[1]
  return parseYaml(frontmatterYamlString) ?? {}
}

const extractMarkdownTitle = (html: string): string | undefined =>
  html.match(/<h1>([\s\S]*?)<\/h1>/)?.[1]?.trim()

export const markdownToHtml = (markdown: string): string =>
  micromark(markdown, {
    extensions: [frontmatter(), gfm()],
    htmlExtensions: [frontmatterHtml(), gfmHtml()]
  })

export const renderMarkdownPage = async (filePath: string, contentMetadata: ContentMetadata): Promise<MarkdownPage> => {
  const slug = path.relative(CONTENT_DIR, filePath).replace(/\.md$/, '')

  const fileContent = await fsPromises.readFile(filePath, 'utf-8')

  const frontmatterRaw = extractFrontmatterYaml(fileContent)

  const { description, showToc } = MarkdownPageSchema
    .pick({ description: true, showToc: true })
    .parse(frontmatterRaw)

  let html = markdownToHtml(fileContent)
  html = replaceComponentReferences(html)
  html = injectMarkdownHeadingIds(html)

  const title = extractMarkdownTitle(html)

  const parser = await getDOMParser()
  const dom = parser.parseFromString(html, 'text/html')

  const headingInfos: HeadingInfo[] = []
  for (const el of Array.from(dom.body.querySelectorAll('h2, h3'))) {
    let id = el.getAttribute('id') ?? ''
    if (!id) {
      const generated = textToAnchorId(el.textContent ?? '')
      if (generated) {
        id = generated
        el.setAttribute('id', id)
      }
    }
    if (id) {
      headingInfos.push({ id, title: el.textContent?.trim() ?? '', level: parseInt(el.tagName[1], 10) })
    }
  }

  const toc = headingInfos.length > 0 ? buildMarkdownToc(headingInfos) : undefined

  const htmlObj = rfcDocumentToPojo(Array.from(dom.body.childNodes))

  const contentMetadataKey = `/${slug}/`

  const page: MarkdownPage = {
    slug,
    title,
    description,
    showToc,
    toc,
    htmlObj,
    timestampIso: contentMetadata[contentMetadataKey]?.mtime ?? DateTime.now().toUTC().toISO()
  }

  validateDocument(page, MarkdownPageSchema)

  return page
}

/**
 * Replaces Nuxt Content MDC block-component syntax that micromark leaves as literal
 * text with real HTML elements, so downstream renderers can treat them as components.
 * 
 * Syntax that looks like
 * 
 * ```
 * <p>::ComponentName{prop="value"}
 * child
 * ::
 * </p>
 * ```
 * 
 * replaced with
 * 
 * ```
 * <p><ComponentName prop="value">child</ComponentName></p>
 * ```
 * 
 * So that subsequent HTML -> HtmlPojo will have an easier format to use.
 */
export const replaceComponentReferences = (html: string): string => {
  return html.replace(
    componentReferencesRegex,
    (_match, leading: string, componentName: string, propsStr: string | undefined, content: string) => {
      const decodedProps = propsStr?.replace(/&quot;/g, '"').replace(/&amp;/g, '&')
      const attrs = decodedProps ? ` ${decodedProps}` : ''
      const inner = content.trim()
      return `${leading}<${componentName}${attrs}>${inner}</${componentName}>`
    }
  )
}

const componentReferencesRegex = /([\s>])::([A-Za-z][A-Za-z0-9-]*)(?:\{([^}]*)\})?[ \n]?([\s\S]*?)[ \n]?::/g