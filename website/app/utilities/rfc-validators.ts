import { z } from 'zod'

/**
 * Rule: Never make Zod schemas strict() if they run in the website (nuxt / client side) as this would prevent additional keys which should be harmless.
 */

const DocumentHtmlTypeSchema = z.union([
  z.literal('xml2rfc'),
  z.literal('plaintext'),
  z.literal('pdf-or-ps')
])
export type DocumentHtmlType = z.infer<typeof DocumentHtmlTypeSchema>

/**
 * Table Of Contents
 */
export const TocLinkSchema = z.object({
  id: z.string(),
  title: z.string()
})

// this convoluted code for a schema is required in Zod 3 for recursion and TS support.
const baseTocSectionSchema = z.object({
  links: z.array(TocLinkSchema).optional()
})
type TocSectionType = z.infer<typeof baseTocSectionSchema> & {
  sections?: TocSectionType[]
}
const TocSectionSchema: z.ZodType<TocSectionType> = baseTocSectionSchema.extend(
  {
    sections: z.lazy(() => TocSectionSchema.array().optional())
  }
)

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

export const RfcCommonSubseriesTypeSchema = z.union([
  z.literal('bcp'),
  z.literal('fyi'),
  z.literal('std')
])

export const RfcCommonFormatNameSchema = z.union([
  z.literal('xml'),
  z.literal('txt'),
  z.literal('html'),
  z.literal('pdf'),
  z.literal('ps'),
  z.literal('json'),
  z.literal('notprepped')
])

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
  name: z.string(),
  type: z.string().optional()
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

export const RfcCommonSchema = z.object({
  number: z.number(),
  title: z.string(),
  draft: RfcCommonDraftSchema.optional(),
  published: z.string().optional(),
  area: RfcCommonAreaSchema.optional(),
  pages: z.number().optional(),
  status: RfcCommonStatusSchema,
  subseries: z
    .array(
      z.object({
        type: RfcCommonSubseriesTypeSchema,
        number: z.number().optional(),
        subseriesLength: z.number().optional()
      })
    )
    .optional(),
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
  see_also: z.array(z.string()).optional(), // TODO: remove this. it's no longer available from the Precomputer Datatracker API
  keywords: z.array(z.string()).optional(),
  errata: z.array(z.string()).optional(), // TODO: remove this. it's no longer available from the Precomputer Datatracker API
  formats: z.array(RfcCommonFormatSchema),
  abstract: z.string().optional(),
  text: z.string().optional()
})

export type RfcCommon = z.infer<typeof RfcCommonSchema>

export const HomepageLatestSchema = z.object({
  homepageLatest: z.array(RfcCommonSchema),
  timestampIso: z.string() // not using `z.coerce.date()` because we'll manually parse into a Luxon DateTime rather than a standard JS Date
})

/**
 * TODO:
 * Was used on the Rfc Index nuxt route
 * but afaik isn't used any more and should be deleted
 */
export type RfcMini = Pick<
  RfcCommon,
  | 'number'
  | 'title'
  | 'published'
  | 'authors'
  | 'formats'
  | 'obsoletes'
  | 'obsoleted_by'
  | 'updates'
  | 'updated_by'
  | 'status'
  | 'stream'
  | 'identifiers'
>

export const RfcMiniIndexSchema = z.object({
  createdOn: z.string(),
  miniIndex: z.array(RfcCommonSchema)
})

/** Subseries info page schema */
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
  max: z.number(),
  maxWithAnchorSuffix: z.number()
})
export type MaxPreformattedLineLengthSchemaType = z.infer<
  typeof MaxPreformattedLineLengthSchema
>

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

export const ErrataTypeSchema = z.union([
  z.literal('Editorial'),
  z.literal('Technical')
])

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
  submitter_name: z.string().nullable(), // eg "Rob Siemborski",
  verifier_id: z.string(), // eg "99",
  verifier_name: z.string().nullable(),
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
