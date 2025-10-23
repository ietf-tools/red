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
    slug: z.literal('unknown'),
    name: z.literal('unknown')
  }),
  z.object({
    slug: z.literal('bcp'),
    name: z.literal('best current practice')
  }),
  z.object({
    slug: z.literal('experimental'),
    name: z.literal('experimental')
  }),
  z.object({
    slug: z.literal('historic'),
    name: z.literal('historic')
  }),
  z.object({
    slug: z.literal('informational'),
    name: z.literal('informational')
  }),
  z.object({
    slug: z.literal('not-issued'),
    name: z.literal('not issued')
  }),
  z.object({
    slug: z.literal('standard'),
    name: z.literal('standards track')
  }),
  z.object({
    // FIXME: this status isn't available from the current Red API but Typesense returns it
    slug: z.literal('standard'),
    name: z.literal('internet standard')
  }),
  z.object({
    // FIXME: this status isn't available from the current Red API but Typesense returns it
    slug: z.literal('ds'),
    name: z.literal('draft standard')
  })
])

export const RfcCommonSubseriesTypeSchema = z.union([
  z.literal('bcp'),
  z.literal('fyi'),
  z.literal('std')
])

export const RfcCommonFormatSchema = z.union([
  z.literal('xml'),
  z.literal('txt'),
  z.literal('html'),
  z.literal('htmlized'),
  z.literal('pdf'),
  z.literal('ps')
])

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
  person: z.number().optional(),
  name: z.string(),
  titlepage_name: z.string().optional(),
  email: z.string().optional(),
  affiliation: z.string().optional(),
  country: z.string().optional()
})

const RfcCommonDraftSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  slug: z.string()
})

export const RfcCommonSchema = z.object({
  number: z.number(),
  title: z.string(),
  draft: RfcCommonDraftSchema.optional(),
  published: z.string().optional(),
  area: z
    .object({
      acronym: z.string(),
      name: z.string()
    })
    .optional(),
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
  group: z
    .object({
      acronym: z.string(),
      name: z.string()
    })
    .optional(),
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
  see_also: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  errata: z.array(z.string()).optional(),
  formats: z.array(RfcCommonFormatSchema),
  abstract: z.string().optional(),
  text: z.string().optional()
})

export type RfcCommon = z.infer<typeof RfcCommonSchema>

export const HomepageLatestSchema = z.object({
  homepageLatest: z.array(RfcCommonSchema)
})

/**
 * Used on the Rfc Index nuxt route
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
export const InfoSubseriesItemSchema = z.object({
  type: RfcCommonSubseriesTypeSchema,
  number: z.number(),
  contents: RfcCommonSchema.array()
})

export type InfoSubseriesItem = z.infer<typeof InfoSubseriesItemSchema>

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
 * Bucket JSON schema
 */
export const RfcBucketHtmlDocumentSchema = z.object({
  rfc: RfcCommonSchema,
  tableOfContents: TableOfContentsSchema.optional(),
  documentHtmlType: DocumentHtmlTypeSchema,
  documentHtmlObj: z.array(NodePojoSchema),
  maxPreformattedLineLength: MaxPreformattedLineLengthSchema
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
