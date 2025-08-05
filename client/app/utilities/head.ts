import type { DateTime } from 'luxon'
import { linkPreviewImageUrlBuilder } from './url'

const OPENGRAPH_DIMENSIONS = [1200, 630]
const TWITTER_DIMENSIONS = [1200, 675]

export const imagePreviewDimensions = [
  OPENGRAPH_DIMENSIONS, // OpenGraph (Facebook)
  TWITTER_DIMENSIONS // Twitter
] as const

const IMAGE_PREVIEW_ALT_TEXT = 'RFC-Editor: Official home of RFCs'

type WidthHeight = (typeof imagePreviewDimensions)[number]

export type ImagePreviewFilename =
  `link-preview-image-${(typeof imagePreviewDimensions)[number][0]}x${(typeof imagePreviewDimensions)[number][1]}.png`

const SITE_NAME = 'RFC Editor'

type UseRfcEditorProps = {
  title: string
  description?: string
  canonicalUrl: string
  /**
   * Markdown pages and RFCs are considered 'articles'
   */
  contentType: 'website' | 'article'
  authors?: string[]
  modifiedDateTime?: DateTime
  publishedDateTime?: DateTime
  keywords?: string[]
}

export const useRfcEditorHead = (props: UseRfcEditorProps) => {
  const formattedTitle = formatTitle(props.title)
  const newProps: UseRfcEditorProps = { ...props, title: formattedTitle }

  useHead({
    title: formattedTitle,
    meta: [
      ...buildGeneric(newProps),
      ...buildOpenGraph(newProps),
      ...buildTwitter(newProps)
    ],
    link: [{ rel: 'canonical', href: props.canonicalUrl }]
  })
}

const formatTitle = (title?: string) => {
  if (!title) {
    return SITE_NAME
  }
  return `${title} | ${SITE_NAME}`
}

const linkPreviewImageBuilder = (mode: 'opengraph' | 'twitter') => {
  const dimensions: Record<typeof mode, WidthHeight> = {
    opengraph: OPENGRAPH_DIMENSIONS,
    twitter: TWITTER_DIMENSIONS
  }
  const widthHeight = dimensions[mode]

  const url = linkPreviewImageUrlBuilder(widthHeight[0], widthHeight[1])

  return {
    url,
    widthHeight,
    mime: getMime(url)
  }
}

const getMime = (url: string) => {
  if (url.endsWith('.png')) {
    return 'image/png' as const
  }
  throw Error(`Unsupported image format from ${url}`)
}

type MetaTag = {
  property: string
  content: string
}

const buildOpenGraph = (props: UseRfcEditorProps) => {
  const linkPreviewImage = linkPreviewImageBuilder('opengraph')
  const metaTags: MetaTag[] = [
    {
      property: 'og:title',
      content: props.title
    },
    {
      property: 'og:url',
      content: props.canonicalUrl
    },
    {
      property: 'og:image',
      content: linkPreviewImage.url
    },
    {
      property: 'og:image:alt',
      content: IMAGE_PREVIEW_ALT_TEXT
    },
    {
      property: 'og:image:type',
      content: linkPreviewImage.mime
    },
    {
      property: 'og:image:width',
      content: linkPreviewImage.widthHeight[0].toString()
    },
    {
      property: 'og:image:height',
      content: linkPreviewImage.widthHeight[1].toString()
    }
  ]

  if (props.description) {
    metaTags.push({
      property: 'og:description',
      content: props.description
    })
  }

  if (props.contentType === 'article') {
    metaTags.push({
      property: 'og:type',
      content: props.contentType
    })

    if (props.authors) {
      metaTags.push(
        // OpenGraph uses a meta tag for each author
        ...props.authors.map((author) => ({
          property: 'article:author',
          content: author
        }))
      )
    }

    if (props.publishedDateTime) {
      const isoDate = props.publishedDateTime.toISODate()
      if (isoDate) {
        metaTags.push({
          property: 'article:published_time',
          content: isoDate
        })
      }
    }

    if (props.modifiedDateTime) {
      const isoDate = props.modifiedDateTime.toISODate()
      if (isoDate) {
        metaTags.push({
          property: 'article:modified_time',
          content: isoDate
        })
      }
    }
  }

  return metaTags
}

const buildTwitter = (props: UseRfcEditorProps) => {
  const linkPreviewImage = linkPreviewImageBuilder('twitter')
  const metaTags: MetaTag[] = [
    {
      property: 'twitter:title',
      content: props.title
    },
    {
      property: 'twitter:image',
      content: linkPreviewImage.url
    },
    {
      property: 'twitter:image:alt',
      content: IMAGE_PREVIEW_ALT_TEXT
    },
    {
      property: 'twitter:image:width',
      content: linkPreviewImage.widthHeight[0].toString()
    },
    {
      property: 'twitter:image:height',
      content: linkPreviewImage.widthHeight[1].toString()
    }
  ]

  if (props.description) {
    metaTags.push({
      property: 'twitter:description',
      content: props.description
    })
  }

  return metaTags
}

const buildGeneric = (props: UseRfcEditorProps) => {
  const metaTags: MetaTag[] = [
    {
      property: 'generator',
      content: 'Nuxt'
    }
  ]

  if (props.authors) {
    metaTags.push({
      property: 'author',
      content: props.authors.join(', ')
    })
  }

  if (props.description) {
    metaTags.push({
      property: 'description',
      content: props.description
    })
  }

  // RFCs can have keywords. It's unclear who the consumers of this meta tag would be as this meta tag is mostly ignored these days
  if (props.keywords) {
    metaTags.push({
      property: 'keywords',
      content: props.keywords.join(', ')
    })
  }

  return metaTags
}
