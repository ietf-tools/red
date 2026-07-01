import path from 'path'
import fsPromises from 'fs/promises'
import sharp from 'sharp'
import satori, { type SatoriOptions } from 'satori'
import { html } from 'satori-html'

type Dimensions = {
  widthPx: number
  heightPx: number
}

const fontsPath = path.resolve(import.meta.dirname, '..', 'fonts')

const dejavuSansPath = path.join(fontsPath, 'DejaVuSans.ttf')
const dejavuSansBinary = fsPromises.readFile(dejavuSansPath)

const dejavuSansBoldPath = path.join(fontsPath, 'DejaVuSans-Bold.ttf')
const dejavuSansBoldBinary = fsPromises.readFile(dejavuSansBoldPath)

const dejavuSansMonoPath = path.join(fontsPath, 'DejaVuSansMono.ttf')
const dejavuSansMonoBinary = fsPromises.readFile(dejavuSansMonoPath)

const dejavuSansItalicPath = path.join(fontsPath, 'DejaVuSans-Oblique.ttf')
const dejavuSansItalicBinary = fsPromises.readFile(dejavuSansItalicPath)

// https://github.com/vercel/satori/issues/590
const cacheOfSatoriOptions: Record<string, SatoriOptions> = {}

// Vue's `renderToString` HTML-escapes text interpolation (eg `"` becomes
// `&quot;`), but satori-html/ultrahtml doesn't decode entities in text
// nodes, so Satori would render the literal `&quot;`. Decode the entities
// in the parsed tree's text nodes (safe: the HTML structure is already
// parsed by this point, so decoding `&lt;` etc. can't reintroduce markup).
// `&amp;` is last so `&amp;quot;` decodes to the literal `&quot;` rather
// than a `"`.
const htmlEntityReplacements: [string, string][] = [
  ['&quot;', '"'],
  ['&#39;', "'"],
  ['&lt;', '<'],
  ['&gt;', '>'],
  ['&amp;', '&']
]

const decodeHtmlEntities = (text: string): string =>
  htmlEntityReplacements.reduce((acc, [entity, char]) => acc.replaceAll(entity, char), text)

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

/**
 * Walks a satori-html VNode tree and decodes HTML entities in every text
 * node, mutating the tree in place.
 */
const decodeEntitiesInTree = (node: unknown): void => {
  if (Array.isArray(node)) {
    node.forEach(decodeEntitiesInTree)
    return
  }
  if (isObject(node) && isObject(node.props)) {
    const { props } = node
    if (typeof props.children === 'string') {
      props.children = decodeHtmlEntities(props.children)
    } else {
      decodeEntitiesInTree(props.children)
    }
  }
}

/**
 * Renders an HTML string to PNG
 */
export const renderHtmlToImage = async (htmlString: string, dimensions: Dimensions): Promise<Buffer | undefined> => {
  const cacheKey = `${dimensions.widthPx}x${dimensions.heightPx}`
  if (!cacheOfSatoriOptions[cacheKey]) {
    cacheOfSatoriOptions[cacheKey] = {
      width: dimensions.widthPx,
      height: dimensions.heightPx,

      fonts: [
        {
          name: 'sans-serif',
          data: await dejavuSansBinary,
          weight: 400,
          style: 'normal'
        },
        {
          name: 'sans-serif',
          data: await dejavuSansBoldBinary,
          weight: 700,
          style: 'normal'
        },
        {
          name: 'sans-serif',
          data: await dejavuSansItalicBinary,
          weight: 400,
          style: 'italic'
        },
        {
          name: 'monospace',
          data: await dejavuSansMonoBinary,
          weight: 400,
          style: 'normal'
        }
      ]
    }
  }

  const tree = html(htmlString)
  decodeEntitiesInTree(tree)
  const svgString = await satori(tree, cacheOfSatoriOptions[cacheKey])

  try {
    const result = await sharp(Buffer.from(svgString))
      .withMetadata({ density: 300 })
      .flatten({
        background: '#eeeeee'
      })
      .png()
      .toBuffer()

    return result
  } catch (error) {
    console.error('Error converting SVG:', error)
  }
}
