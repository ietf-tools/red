import { DateTime } from 'luxon'
import { useHead } from 'nuxt/app'
import { linkPreviewImageUrlBuilder, faviconPathBuilder, useRfcPdfPathBuilder, metaThumbnailPathBuilder, RSS_PATH, ATOM_PATH, usePublicSiteUrlOrigin } from './url'
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
  canonicalPath: string
  /**
   * Markdown pages and RFCs are considered 'articles'
   */
  contentType: 'website' | 'article'
  authors?: string[]
  customThumbnail?: string
  customThumbnailAltText?: string
  modifiedDateTime?: DateTime
  publishedDateTime?: DateTime
  keywords?: string[]
  resourceTimestamps?: ResourceTimestamp[]
  googleScholarMetadata?: GoogleScholarMetadata
}

export const useRfcEditorHead = (props: UseRfcEditorProps) => {
  const formattedTitle = formatTitle(props.title)
  const newProps: UseRfcEditorProps = { ...props, title: formattedTitle }

  const publicSiteOrigin = usePublicSiteUrlOrigin()

  useHead({
    title: formattedTitle,
    meta: [
      ...buildGenericMetaTags(newProps),
      ...buildOpenGraphMetaTags(newProps, publicSiteOrigin),
      ...buildResourceTimestamps(newProps),
      ...buildGoogleScholarMetaTags(newProps),
    ].map(allowDuplicateNames),
    link: [
      buildCanonical(newProps, publicSiteOrigin),
      ...buildFaviconLinks(),
      ...buildFeedAutodiscovery(publicSiteOrigin)
    ],
    noscript: [
      {
        /**
         * We never want <noscript> content to appear in search results, so we'll use the
         * `data-nosnippet` as a hint to Googlebot etc to exclude it from search results
         * See related DataTracker issue https://github.com/ietf-tools/datatracker/issues/9667
         **/
        'data-nosnippet': "true",
        innerHTML: 'Your browser JavaScript is disabled. Most of this site works without it, but some features —like search— require it. Please enable JavaScript and reload the page.',
      }
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

const linkPreviewImageBuilder = (mode: 'opengraph' | 'twitter', publicSiteOrigin: string, customThumbnail?: string) => {
  const dimensions: Record<typeof mode, WidthHeight> = {
    opengraph: OPENGRAPH_DIMENSIONS,
    twitter: TWITTER_DIMENSIONS
  }
  const widthHeight = dimensions[mode]
  if (!widthHeight || !widthHeight[0] || !widthHeight[1]) {
    throw Error(`Cannot find dimensions from mode ${mode}, ${widthHeight}`)
  }
  const path = customThumbnail ? metaThumbnailPathBuilder(customThumbnail) : linkPreviewImageUrlBuilder(widthHeight[0], widthHeight[1])

  const url = new URL(path, publicSiteOrigin).toString()

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
  name?: string
  property?: string
  content: string
  key?: string
}

const buildOpenGraphMetaTags = (props: UseRfcEditorProps, publicSiteOrigin: string): MetaTag[] => {
  const { authors, publishedDateTime, customThumbnail, modifiedDateTime, customThumbnailAltText, description, contentType, canonicalPath } = props
  const linkPreviewImage = linkPreviewImageBuilder('opengraph', publicSiteOrigin, customThumbnail)
  const canonicalUrl = new URL(canonicalPath, publicSiteOrigin).toString()

  const metaTags: MetaTag[] = [
    {
      property: 'og:title',
      content: props.title
    },
    {
      property: 'og:url',
      content: canonicalUrl
    },
    {
      property: 'og:image',
      content: linkPreviewImage.url
    },
    {
      property: 'og:image:alt',
      content: customThumbnailAltText ?? description ?? IMAGE_PREVIEW_ALT_TEXT
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

  if (description) {
    metaTags.push({
      property: 'og:description',
      content: description
    })
  }

  if (contentType === 'article') {
    metaTags.push({
      property: 'og:type',
      content: contentType
    })

    if (authors) {
      metaTags.push(
        // OpenGraph uses a meta tag for each author
        ...authors.map((author) => ({
          property: 'article:author',
          content: author
        }))
      )
    }

    if (publishedDateTime) {
      const isoDate = publishedDateTime.toISODate()
      if (isoDate) {
        metaTags.push({
          property: 'article:published_time',
          content: isoDate
        })
      }
    }

    if (modifiedDateTime) {
      const isoDate = modifiedDateTime.toISODate()
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

const buildGenericMetaTags = (props: UseRfcEditorProps): MetaTag[] => {
  const metaTags: MetaTag[] = [
    {
      name: 'generator',
      content: 'Nuxt'
    }
  ]

  if (props.authors) {
    props.authors.forEach(author => {
      metaTags.push({
        name: 'author',
        content: author
      })
    })
  }

  if (props.description) {
    metaTags.push({
      name: 'description',
      content: props.description
    })
  }

  // RFCs can have keywords. It's unclear who the consumers of this meta tag would be as keywords is mostly ignored these days, but the previous site had it so we will too
  if (props.keywords) {
    props.keywords.forEach(keyword => {
      metaTags.push({
        name: 'keyword',
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
        name: `resource-timestamp:${resourceTimestamp.name}`,
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
  rel: 'canonical' | 'icon' | 'alternate'
  type?: 'image/png'
  | 'text/xml'
  | 'application/xml'
  | 'application/rss+xml' // not IANA registered but W3C recommended https://validator.w3.org/feed/docs/warning/UnexpectedContentType.html
  | 'application/atom+xml' // IANA registered
  sizes?: `${number}x${number}`
  title?: string
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
      name: 'citation_author',
      content: author
    })
  })

  if (googleScholarMetadata.citation_doi) {
    metaTags.push({
      name: 'citation_doi',
      content: googleScholarMetadata.citation_doi
    })
  }

  if (googleScholarMetadata.citation_issn) {
    metaTags.push({
      name: 'citation_issn',
      content: googleScholarMetadata.citation_issn
    })
  }

  if (googleScholarMetadata.citation_pdf_url) {
    metaTags.push({
      name: 'citation_pdf_url',
      content: googleScholarMetadata.citation_pdf_url
    })
  }

  if (googleScholarMetadata.citation_publication_date) {
    metaTags.push({
      name: 'citation_publication_date',
      content: googleScholarMetadata.citation_publication_date
    })
  }

  metaTags.push({
    name: 'citation_technical_report_number',
    content: googleScholarMetadata.citation_technical_report_number
  })

  metaTags.push({
    name: 'citation_title',
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

export const rfcCommonToGoogleScholar = (rfc: RfcCommon, publicSiteOrigin: string): GoogleScholarMetadata => {
  const citation_author = rfc.authors.map(author => author.titlepage_name).filter((name) => {
    return typeof name === 'string'
  })

  const citation_publication_date = rfc.published ? DateTime.fromISO(rfc.published).toFormat('yyyy/MM/dd') : undefined

  const citation_title = rfc.title

  const identifierDoi = rfc.identifiers?.find(identifier => identifier.type === 'doi')

  const identifierIssn = rfc.identifiers?.find(identifier => identifier.type === 'issn')

  const pdfFormat = rfc.formats.find(format => format.format === 'pdf')
  const citation_pdf_path = pdfFormat ? useRfcPdfPathBuilder(rfc.number) : undefined
  const citation_pdf_url = citation_pdf_path ? new URL(citation_pdf_path, publicSiteOrigin).toString() : undefined

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

const buildCanonical = ({ canonicalPath }: UseRfcEditorProps, publicSiteOrigin: string): LinkTag => {
  const canonicalUrl = new URL(canonicalPath, publicSiteOrigin).toString()
  return { rel: 'canonical', href: canonicalUrl }
}

const buildFeedAutodiscovery = (publicSiteOrigin: string): LinkTag[] => {
  return [
    {
      rel: 'alternate',
      type: 'application/rss+xml', // not IANA registered but W3C recommended https://validator.w3.org/feed/docs/warning/UnexpectedContentType.html
      title: 'RFC RSS Feed',
      href: new URL(RSS_PATH, publicSiteOrigin).toString()
    },
    {
      rel: 'alternate',
      type: 'application/atom+xml',
      title: 'RFC ATOM Feed',
      href: new URL(ATOM_PATH, publicSiteOrigin).toString()
    }
  ]
}

/**
 * useHead requires a `key` per meta tag or it will deduplicate
 * based on name/property.
 * See https://github.com/nuxt/nuxt/discussions/32212
 */
const allowDuplicateNames = (metaTag: MetaTag): MetaTag => {
  return {
    ...metaTag,
    key: `${metaTag.name ?? ''}${metaTag.property ?? ''}${metaTag.content}`
  }
}
