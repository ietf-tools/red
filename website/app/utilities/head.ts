import { DateTime } from 'luxon'
import { useHead } from 'nuxt/app'
import { linkPreviewImageUrlBuilder, faviconPathBuilder, useRfcPdfPathBuilder } from './url'
import type { imagePreviewDimensions } from '#shared/utils/meta-preview-images'
import {
  OPENGRAPH_DIMENSIONS,
  TWITTER_DIMENSIONS
} from '#shared/utils/meta-preview-images'
import type { RfcCommon } from './rfc-validators'

const IMAGE_PREVIEW_ALT_TEXT = 'RFC-Editor: Official home of RFCs'

type WidthHeight = (typeof imagePreviewDimensions)[number]

type ResourceTimestamp = {
  name: string
  timestamp: DateTime
}

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
  resourceTimestamps?: ResourceTimestamp[]
  googleScholarMetadata?: GoogleScholarMetadata
}

export const useRfcEditorHead = (props: UseRfcEditorProps) => {
  const formattedTitle = formatTitle(props.title)
  const newProps: UseRfcEditorProps = { ...props, title: formattedTitle }

  useHead({
    title: formattedTitle,
    meta: [
      ...buildGenericMetaTags(newProps),
      ...buildOpenGraphMetaTags(newProps),
      ...buildTwitterMetaTags(newProps),
      ...buildResourceTimestamps(newProps),
      ...buildGoogleScholarMetaTags(newProps)
    ],
    link: [
      { rel: 'canonical', href: props.canonicalUrl },
      ...buildFaviconLinks()
    ]
  })
}

const formatTitle = (title?: string) => {
  if (!title) {
    return SITE_NAME
  }
  return `${title} | ${SITE_NAME}`.replace(
    // remove linebreaks
    /\s/g,
    ' '
  )
}

const linkPreviewImageBuilder = (mode: 'opengraph' | 'twitter') => {
  const dimensions: Record<typeof mode, WidthHeight> = {
    opengraph: OPENGRAPH_DIMENSIONS,
    twitter: TWITTER_DIMENSIONS
  }
  const widthHeight = dimensions[mode]
  if (!widthHeight || !widthHeight[0] || !widthHeight[1]) {
    throw Error(`Cannot find dimensions from mode ${mode}, ${widthHeight}`)
  }
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

const buildOpenGraphMetaTags = (props: UseRfcEditorProps): MetaTag[] => {
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
      content: linkPreviewImage.widthHeight[0]?.toString() ?? '1024'
    },
    {
      property: 'og:image:height',
      content: linkPreviewImage.widthHeight[1]?.toString() ?? '1024'
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

const buildTwitterMetaTags = (props: UseRfcEditorProps): MetaTag[] => {
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
      content: linkPreviewImage.widthHeight[0]?.toString() ?? '1024'
    },
    {
      property: 'twitter:image:height',
      content: linkPreviewImage.widthHeight[1]?.toString() ?? '1024'
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

const buildGenericMetaTags = (props: UseRfcEditorProps): MetaTag[] => {
  const metaTags: MetaTag[] = [
    {
      property: 'generator',
      content: 'Nuxt'
    }
  ]

  if (props.authors) {
    props.authors.forEach(author => {
      metaTags.push({
        property: 'author',
        content: author
      })
    })
  }

  if (props.description) {
    metaTags.push({
      property: 'description',
      content: props.description
    })
  }

  // RFCs can have keywords. It's unclear who the consumers of this meta tag would be as keywords is mostly ignored these days, but the previous site had it so we will too
  if (props.keywords) {
    props.keywords.forEach(keyword => {
      metaTags.push({
        property: 'keyword',
        content: keyword
      })
    })
  }

  return metaTags
}

const buildResourceTimestamps = (props: UseRfcEditorProps): MetaTag[] => {
  return (
    props.resourceTimestamps?.map((resourceTimestamp): MetaTag => {
      return {
        property: `resource-timestamp:${resourceTimestamp.name}`,
        content: resourceTimestamp.timestamp.toISO() ?? '(null)'
      }
    }) ?? []
  )
}

const FAVICON_DIMENSIONS: [number, number][] = [
  [16, 16],
  [32, 32],
  [48, 48],
  [180, 180],
  [192, 192],
  [512, 512]
]

type LinkTag = {
  // extracting types from unhead is hard so we'll just make some similar types here
  // this typing isn't exhaustive -- change it as needed
  rel: 'icon'
  type: 'image/png'
  sizes: `${number}x${number}`
  href: string
}

const buildFaviconLinks = (): LinkTag[] => {
  return FAVICON_DIMENSIONS.map(
    ([widthPx, heightPx]): LinkTag => ({
      rel: 'icon',
      type: 'image/png',
      sizes: `${widthPx}x${heightPx}`,
      href: faviconPathBuilder(widthPx, heightPx)
    })
  )
}

const buildGoogleScholarMetaTags = (props: UseRfcEditorProps): MetaTag[] => {
  const { googleScholarMetadata } = props

  if (!googleScholarMetadata) {
    return []
  }

  const metaTags: MetaTag[] = []

  googleScholarMetadata.citation_author.forEach(author => {
    metaTags.push({
      property: 'citation_author',
      content: author
    })
  })

  if (googleScholarMetadata.citation_doi) {
    metaTags.push({
      property: 'citation_doi',
      content: googleScholarMetadata.citation_doi
    })
  }

  if (googleScholarMetadata.citation_issn) {
    metaTags.push({
      property: 'citation_issn',
      content: googleScholarMetadata.citation_issn
    })
  }

  if (googleScholarMetadata.citation_pdf_url) {
    metaTags.push({
      property: 'citation_pdf_url',
      content: googleScholarMetadata.citation_pdf_url
    })
  }

  if (googleScholarMetadata.citation_publication_date) {
    metaTags.push({
      property: 'citation_publication_date',
      content: googleScholarMetadata.citation_publication_date
    })
  }

  metaTags.push({
    property: 'citation_technical_report_number',
    content: googleScholarMetadata.citation_technical_report_number
  })

  metaTags.push({
    property: 'citation_title',
    content: googleScholarMetadata.citation_title
  })

  return metaTags
}

/**
 * Google Scholar metadata
 *
 * https://scholar.google.com/intl/en-us/scholar/inclusion.html#indexing
 *
 */
type GoogleScholarMetadata = {
  // See also https://github.com/ietf-tools/xml2rfc/issues/757
  citation_author: string[] // eg M. Kucherawy
  citation_publication_date?: string // eg "September, 2011"
  citation_title: string // eg "DomainKeys Identified Mail (DKIM) Signatures"
  citation_doi?: string // eg "10.17487/RFC6376"
  citation_issn?: string // eg "2070-1721"
  citation_technical_report_number: `rfc${number}` // eg "rfc6376"
  citation_pdf_url?: string // eg "https://www.rfc-editor.org/rfc/pdfrfc/rfc6376.txt.pdf"
}

export const rfcCommonToGoogleScholar = (rfc: RfcCommon): GoogleScholarMetadata => {
  const citation_author = rfc.authors.map(author => author.titlepage_name).filter((name) => {
    return typeof name === 'string'
  })

  const citation_publication_date = rfc.published ? DateTime.fromISO(rfc.published).toFormat('yyyy/MM/dd') : undefined

  const citation_title = rfc.title

  const identifierDoi = rfc.identifiers?.find(identifier => identifier.type === 'doi')

  const identifierIssn = rfc.identifiers?.find(identifier => identifier.type === 'issn')

  const pdfFormat = rfc.formats.find(format => format.format === 'pdf')

  const citation_pdf_url = pdfFormat ? useRfcPdfPathBuilder(rfc.number) : undefined

  return {
    citation_author,
    citation_publication_date,
    citation_title,
    citation_doi: identifierDoi?.value,
    citation_issn: identifierIssn?.value,
    citation_technical_report_number: `rfc${rfc.number}`,
    citation_pdf_url,
  }
}