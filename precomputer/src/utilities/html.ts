import sanitizeHtml from 'sanitize-html'
import { z } from 'zod'

export const ImageDimensionsSchema = z.object({
  widthPx: z.number(),
  heightPx: z.number()
})

export type ImageDimensions = z.infer<typeof ImageDimensionsSchema>

export type ImageDimensionsOptionalHeight = {
  widthPx: number
  heightPx?: number
}

export const OPENGRAPH_IMAGE_DIMENSIONS: ImageDimensions = {
  widthPx: 1200,
  heightPx: 600
}

type SanitizeHtmlParams = Parameters<typeof sanitizeHtml>
type SanitizeHtmlOptions = NonNullable<SanitizeHtmlParams[1]>

const SVG_STYLE_ATTRIBUTES = [
  'role',

  'fill',
  'fill-rule',

  'clip-rule',

  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',

  'transform',
  'transform-origin',

  'rotate',

  // Text attributes
  'text-anchor',
  'font-family',
  'font-size',
  'text-anchor'
]

type ModeKeys = 'rfc-html' | 'abstract'

const modeOptions: Record<ModeKeys, SanitizeHtmlOptions> = {
  // RFC metadata 'abstract' is plain text with \n, but sometimes we convert this to pseudo HTML with <p> tags only
  abstract: {
    allowedTags: ['p']
  },
  'rfc-html': {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'html',
      'head',
      'body',
      'meta',
      'title',
      'link',
      'img',
      'svg',
      'g',
      'defs',
      'stop',
      'path',
      'rect',
      'circle',
      'ellipse',
      'polygon',
      'polyline',
      'line',
      'text',
      'tspan',
      'tbreak',
      'textPath',
      'image',
      'use',
      'clipPath',
      'mask',
      'pattern',
      'solidColor',
      'linearGradient',
      'radialGradient'
    ]),
    allowedAttributes: {
      '*': ['id', 'class', 'style', 'dir'],
      a: ['href', 'rel'],
      meta: ['name', 'content'],
      time: ['datetime'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
      ol: ['start', 'type', 'reversed'],
      link: ['rel', 'href'],
      svg: ['xmlns', 'version', 'width', 'height', 'viewBox', 'preserveAspectRatio', ...SVG_STYLE_ATTRIBUTES],
      desc: [...SVG_STYLE_ATTRIBUTES],
      use: ['x', 'y', 'width', 'height', 'href', 'xlink:href', ...SVG_STYLE_ATTRIBUTES],
      g: ['label', ...SVG_STYLE_ATTRIBUTES],
      path: ['d', 'pathLength', ...SVG_STYLE_ATTRIBUTES],
      text: ['x', 'y', ...SVG_STYLE_ATTRIBUTES],
      circle: ['cx', 'cy', 'r', ...SVG_STYLE_ATTRIBUTES],
      ellipse: ['cx', 'cy', 'rx', 'ry', ...SVG_STYLE_ATTRIBUTES],
      textPath: ['href', 'startOffset', ...SVG_STYLE_ATTRIBUTES],
      tspan: ['x', 'y', 'startOffset', ...SVG_STYLE_ATTRIBUTES],
      polygon: ['points', ...SVG_STYLE_ATTRIBUTES],
      polyline: ['points', ...SVG_STYLE_ATTRIBUTES],
      linearGradient: ['x1', 'x2', 'y1', 'y2', 'gradientUnits', 'spreadMethod', ...SVG_STYLE_ATTRIBUTES],
      rect: ['x', 'y', 'width', 'height', 'rx', 'ry', ...SVG_STYLE_ATTRIBUTES],
      radialGradient: ['cx', 'cy', 'r', 'fx', 'fy', 'fr', 'gradientUnits', 'spreadMethod', ...SVG_STYLE_ATTRIBUTES]
    },
    allowedSchemes: [
      'data',
      'http',
      'https',
      'tel',
      'ftp',
      'mailto',
      'urn' // eg RFC9000 has <link rel="alternate" href="urn:issn:2070-1721">
    ],
    parser: {
      lowerCaseTags: false,
      lowerCaseAttributeNames: false
    }
  }
}

export const sanitiseHtml = (dirtyHtml: string, mode: ModeKeys) => {
  const modeOption = modeOptions[mode]
  const sanitisedHtml = sanitizeHtml(dirtyHtml, modeOption)
  return sanitisedHtml
}
