import { z } from 'zod'
import { kebabCase } from 'es-toolkit'

/**
 * Rule: Never make Zod schemas strict() if they run in the website (nuxt / client side) as this would prevent additional keys which should be harmless.
 */

const DocumentHtmlTypeSchema = z.union([z.literal('xml2rfc'), z.literal('plaintext'), z.literal('pdf-or-ps')])
export type DocumentHtmlType = z.infer<typeof DocumentHtmlTypeSchema>

/**
 * Table Of Contents
 */
export const TocLinkSchema = z.object({
  id: z.string(),
  title: z.string()
})

// this convoluted code for a schema is required in Zod for recursion and TS support.
const baseTocSectionSchema = z.object({
  links: z.array(TocLinkSchema).optional()
})
export type TocSectionType = z.infer<typeof baseTocSectionSchema> & {
  sections?: TocSectionType[]
}
const TocSectionSchema: z.ZodType<TocSectionType> = baseTocSectionSchema.extend({
  sections: z.lazy(() => TocSectionSchema.array().optional())
})

export const TableOfContentsSchema = z.object({
  title: z.string(),
  sections: z.array(TocSectionSchema)
})

export type TableOfContents = z.infer<typeof TableOfContentsSchema>

/**
 * RFC Common
 */
export const RfcCommonStreamSlugSchema = z.union([
  z.literal('IETF'),
  z.literal('IAB'),
  z.literal('IRTF'),
  z.literal('INDEPENDENT'),
  z.literal('Editorial'),
  z.literal('Legacy')
])

// If changing this also consider changing the Typesense status parsing code
export const RfcCommonStatusSchema = z.union([
  z.object({
    slug: z.literal('unkn'),
    name: z.literal('unknown')
  }),
  z.object({
    slug: z.literal('bcp'),
    name: z.literal('best current practice')
  }),
  z.object({
    slug: z.literal('exp'),
    name: z.literal('experimental')
  }),
  z.object({
    slug: z.literal('hist'),
    name: z.literal('historic')
  }),
  z.object({
    slug: z.literal('inf'),
    name: z.literal('informational')
  }),
  z.object({
    slug: z.literal('not-issued'),
    name: z.literal('not issued')
  }),
  z.object({
    slug: z.literal('std'),
    name: z.literal('internet standard')
  }),
  z.object({
    slug: z.literal('ps'),
    name: z.literal('proposed standard')
  }),
  z.object({
    slug: z.literal('ds'),
    name: z.literal('draft standard')
  })
])

export const RfcCommonSubseriesTypeSchema = z.union([z.literal('bcp'), z.literal('fyi'), z.literal('std')])

export const RfcCommonFormatNameSchema = z.union([
  z.literal('xml'),
  z.literal('txt'),
  z.literal('html'),
  z.literal('pdf'),
  z.literal('ps'),
  z.literal('json'),
  z.literal('notprepped')
])

export type RfcCommonFormatName = z.infer<typeof RfcCommonFormatNameSchema>

export const RfcCommonFormatSchema = z.object({
  format: RfcCommonFormatNameSchema,
  path: z.string().optional()
})

const RfcCommonIdentifierSchema = z.object({
  type: z.union([z.literal('doi'), z.literal('issn')]),
  value: z.string()
})

const RfcCommonObsoleteSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string()
})

const RfcCommonObsoletedBySchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string()
})

const RfcCommonUpdatesSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string()
})

const RfcCommonUpdatedBySchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string()
})

const RfcCommonAuthorSchema = z.object({
  titlepage_name: z.string().optional(),
  is_editor: z.boolean().optional(),
  person: z.number().optional(),
  email: z.string().optional(),
  affiliation: z.string().optional(),
  country: z.string().optional(),
  datatracker_person_path: z.string().optional()
})

export type RfcCommonAuthor = z.infer<typeof RfcCommonAuthorSchema>

const RfcCommonDraftSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  slug: z.string()
})

export const RfcCommonAreaSchema = z.object({
  acronym: z.string(),
  name: z.string()
})

export const RfcCommonGroupTypeSchema = z.union([
  z.literal('individ'),
  z.literal('wg'),
  z.literal('area'),
  z.literal('rag'),
  z.literal('ietf'),
  z.literal('ag'),
  z.literal('rg'),
  z.literal('edwg'),
  z.literal('rfcedtyp')
])

export const RfcCommonGroupSchema = z.object({
  acronym: z.string(),
  name: z.string(),
  type: RfcCommonGroupTypeSchema
})

/**
 * The public engagement numbers for one RFC. Named here rather than alongside the Reef client
 * because Red never fetches them: they arrive with whatever data the route already loads — the
 * bucket JSON for an RFC page, the search index for a result list — and this is the one shape all
 * of those carry, so the components rendering them don't care which route supplied them.
 */
export const ReefRFCStatsSchema = z.object({
  /** Mimicking Reef API structure */
  ratingAggregate: z
    .object({
      average: z.number().optional(),
      count: z.number().optional()
    })
    .optional(),
  /** Mimicking Reef API structure */
  subscriberCount: z.number().optional(),
  /** The number of document sets holding this RFC, not a setter function. Mimicking Reef API structure */
  setCount: z.number().optional()
})

export type ReefRFCStats = z.infer<typeof ReefRFCStatsSchema>

const RfcCommonSubseriesSchema = z.array(
  z.object({
    type: RfcCommonSubseriesTypeSchema,
    number: z.number().optional(),
    subseriesLength: z.number().optional()
  })
)

/**
 * The full shape of one RFC, published per document as `rfc-common/{number}.json`.
 *
 * Read outside this repository as well as in it: Reef fetches
 * `/api/v1/rfc-common/{number}.json` to put a title beside a bare identifier in its
 * admin and in subscription mail. There is no schema shared with it and no build step
 * that would catch a break, so treat the published fields as additive-only — add
 * freely, but do not remove or retype one without saying so. RfcMiniSchema below
 * carries the same undertaking for the index file, and has a generated JSON Schema
 * to go with it.
 */
export const RfcCommonSchema = z.object({
  number: z.number(),
  title: z.string(),
  draft: RfcCommonDraftSchema.optional(),
  published: z.string().optional(),
  area: RfcCommonAreaSchema.optional(),
  pages: z.number().optional(),
  status: RfcCommonStatusSchema,
  subseries: RfcCommonSubseriesSchema.optional(),
  authors: z.array(RfcCommonAuthorSchema),
  group: RfcCommonGroupSchema.optional(),
  stream: z.object({
    slug: RfcCommonStreamSlugSchema,
    name: z.string(),
    description: z.string().optional()
  }),
  identifiers: z.array(RfcCommonIdentifierSchema).optional(),
  obsoletes: z.array(RfcCommonObsoleteSchema).optional(),
  obsoleted_by: z.array(RfcCommonObsoletedBySchema).optional(),
  updates: z.array(RfcCommonUpdatesSchema).optional(),
  updated_by: z.array(RfcCommonUpdatedBySchema).optional(),
  is_also: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  formats: z.array(RfcCommonFormatSchema),
  /** Abstract is plain text with `\n` line breaks; convert to paragraphs at render time */
  abstract: z.string().optional(),
  text: z.string().optional(),
  reefStats: ReefRFCStatsSchema.optional()
})

export type RfcCommon = z.infer<typeof RfcCommonSchema>

export const HomepageLatestSchema = z.object({
  homepageLatest: z.array(RfcCommonSchema),
  timestampIso: z.string() // not using `z.coerce.date()` because we'll manually parse into a Luxon DateTime rather than a standard JS Date
})

export type HomepageLatest = z.infer<typeof HomepageLatestSchema>

/**
 * The shape `rfcToRfcMini` emits, and so the shape of the published
 * `rfc-mini-index.json`. Its own schema rather than a `Pick` of RfcCommon, because the
 * published file has a consumer outside this repository: Reef reads it to resolve RFC
 * identifiers to titles, and cannot share these Zod definitions from Python. It
 * validates against a JSON Schema generated from this object by `npm run
 * generate:schema` in precomputer/.
 *
 * Required here means always emitted, so removing one is a breaking change for that
 * consumer. Optional means the datatracker may omit it and Red passes the absence
 * through, which also means Reef cannot detect it going away. Add fields freely; do
 * not remove or retype one.
 *
 * The required set is deliberately the same as RfcCommonSchema's, so that
 * `rfcToRfcMini` can keep building an RfcCommon and returning it as an RfcMini, and so
 * that nothing here can fail a precomputer run that RfcCommonSchema would have passed.
 */
export const RfcMiniSchema = z.object({
  number: z.number(),
  title: z.string(),
  status: RfcCommonStatusSchema,
  stream: z.object({
    slug: RfcCommonStreamSlugSchema,
    name: z.string(),
    description: z.string().optional()
  }),
  // rfcToRfcMini keeps only the titlepage name; the rest of RfcCommonAuthorSchema is
  // dropped to keep the index small.
  authors: z.array(z.object({ titlepage_name: z.string().optional() })),
  formats: z.array(RfcCommonFormatSchema),
  published: z.string().optional(),
  identifiers: z.array(RfcCommonIdentifierSchema).optional(),
  obsoletes: z.array(RfcCommonObsoleteSchema).optional(),
  obsoleted_by: z.array(RfcCommonObsoletedBySchema).optional(),
  updates: z.array(RfcCommonUpdatesSchema).optional(),
  updated_by: z.array(RfcCommonUpdatedBySchema).optional(),
  subseries: RfcCommonSubseriesSchema.optional()
})

export type RfcMini = z.infer<typeof RfcMiniSchema>

export const RfcMiniIndexSchema = z.object({
  createdOn: z.string(),
  miniIndex: z.array(RfcMiniSchema)
})

/**
 * Subseries info page schema, published as `info-subseries/{type}{number}.json`.
 *
 * Also read outside this repository: it is how Reef expands a BCP or STD to the RFCs
 * that constitute it, which it needs because a Reef document set or subject can hold
 * a subseries as well as an RFC. Additive-only for the same reason as RfcCommonSchema
 * above: nothing between the two projects would catch a removal.
 */
export const SubseriesCommonSchema = z.object({
  type: RfcCommonSubseriesTypeSchema,
  number: z.number(),
  contents: RfcCommonSchema.array()
})

export type SubseriesCommon = z.infer<typeof SubseriesCommonSchema>

/**
 * Document HTML Schema (html/vue as pojo)
 */
const TextPojoSchema = z.object({
  type: z.literal('Text'),
  textContent: z.string()
})

// this convoluted code for a schema is required in Zod 3 for recursion and TS support.
const _baseNodeElementSchema = z.object({
  type: z.literal('Element'),
  nodeName: z.string(),
  attributes: z.record(z.string(), z.string())
})
export type ElementPojo = z.infer<typeof _baseNodeElementSchema> & {
  children: (ElementPojo | z.infer<typeof TextPojoSchema>)[]
}
const ElementPojoSchema: z.ZodType<ElementPojo> = z.object({
  type: z.literal('Element'),
  nodeName: z.string(),
  attributes: z.record(z.string(), z.string()),
  children: z.lazy(() => z.array(NodePojoSchema))
})

const NodePojoSchema = z.union([ElementPojoSchema, TextPojoSchema])

// pojo = plain old javascript object, rather than an instanceof Node class
export type NodePojo = z.infer<typeof NodePojoSchema>

// pojo = plain old javascript object, rather than an instanceof Document class
export type DocumentPojo = NodePojo[]

const MaxPreformattedLineLengthSchema = z.object({
  max: z.number()
})
export type MaxPreformattedLineLengthSchemaType = z.infer<typeof MaxPreformattedLineLengthSchema>

/**
 * Errata
 */
export const ErrataStatusSchema = z.union([
  z.literal('Verified'),
  z.literal('Reported'),
  z.literal('Held for Document Update'),
  z.literal('Rejected')
])

export type ErrataStatus = z.infer<typeof ErrataStatusSchema>

export const ErrataTypeSchema = z.union([z.literal('Editorial'), z.literal('Technical')])

export type ErrataType = z.infer<typeof ErrataTypeSchema>

export const ErrataItemSchema = z.object({
  errata_id: z.string(), // eg "1",
  'doc-id': z.string(), // eg "RFC4954",
  errata_status_code: ErrataStatusSchema,
  errata_type_code: ErrataTypeSchema,
  section: z.string().nullable(), // eg "4.1",
  orig_text: z.string().nullable(), // eg "   S: 220-smtp.example.com ESMTP Server",
  correct_text: z.string().nullable(), // eg "   S: 220 smtp.example.com ESMTP Server",
  notes: z.string().nullable(), // "There are 3 instances of this (one on p. 7 and two on p. 8). \n",
  submit_date: z.string(), // eg "2007-07-19",
  update_date: z.string().nullable() // eg "2019-09-10 09:09:03"
})

export type ErrataItem = z.infer<typeof ErrataItemSchema>

export const ErrataListSchema = ErrataItemSchema.array()

export type ErrataList = z.infer<typeof ErrataListSchema>

/**
 * Bucket JSON schema
 */
export const RfcBucketHtmlDocumentSchema = z.object({
  rfc: RfcCommonSchema,
  tableOfContents: TableOfContentsSchema.optional(),
  documentHtmlType: DocumentHtmlTypeSchema,
  documentHtmlObj: z.array(NodePojoSchema),
  maxPreformattedLineLength: MaxPreformattedLineLengthSchema,
  errataList: ErrataListSchema.optional(),
  timestampIso: z.string() // ISO 8601 date. Note that the schema isn't using `z.coerce.date()` because we'll manually parse into a Luxon DateTime rather than a standard JS Date
})

export type RfcBucketHtmlDocument = z.infer<typeof RfcBucketHtmlDocumentSchema>

export const isNodePojo = (maybeNode: unknown): maybeNode is NodePojo => {
  return (
    !!maybeNode &&
    typeof maybeNode === 'object' &&
    'type' in maybeNode &&
    typeof maybeNode.type === 'string' &&
    ['Element', 'Text'].includes(maybeNode.type)
  )
}

/**
 * Markdown Page
 */
export const MarkdownPageSchema = z.object({
  slug: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  showToc: z.boolean().optional(),
  toc: TableOfContentsSchema.optional(),
  htmlObj: z.array(NodePojoSchema),
  timestampIso: z.string()
})

export type MarkdownPage = z.infer<typeof MarkdownPageSchema>

/**
 * Converts heading text to a URL-safe anchor id.
 * Shared between precomputer and website to ensure consistent heading ids.
 */
export const textToAnchorId = (text: string): string | undefined => {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/\./g, '-')
    .replace(/[^0-9\-a-zA-Z\s]/g, '')
  if (!normalized) return undefined
  return kebabCase(normalized)
}

export type HeadingInfo = { id: string; title: string; level: number }

/**
 * Builds a two-level TableOfContents from an ordered list of heading infos.
 * h2 headings become top-level sections; h3 headings nest under the preceding h2.
 * h3 headings with no preceding h2 become top-level siblings. h1 and h4+ are ignored.
 */
export const buildMarkdownToc = (headings: HeadingInfo[]): TableOfContents => {
  const sections: TableOfContents['sections'] = []
  let currentH2Section: TableOfContents['sections'][0] | null = null

  for (const heading of headings) {
    const link = { id: heading.id, title: heading.title }

    if (heading.level === 2) {
      const section = { links: [link] }
      sections.push(section)
      currentH2Section = section
    } else if (heading.level === 3) {
      if (currentH2Section) {
        currentH2Section.sections = [...(currentH2Section.sections ?? []), { links: [link] }]
      } else {
        sections.push({ links: [link] })
      }
    }
  }

  return { title: 'Table of Contents', sections }
}
