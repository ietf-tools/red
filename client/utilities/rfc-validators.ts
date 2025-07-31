/**
 * This file should be copied between these two repos
 * https://github.com/ietf-tools/red/blob/main/client/utilities/rfc-validators.ts
 * https://github.com/ietf-tools/red-rfc-html-extractor/blob/main/src/rfc-validators.ts
 * to ensure there's a shared schema definition between repos for some JSON files.
 *
 * FIXME: make this code a shared dependency (ie, NPM package)
 */
import { z } from 'zod'

const DocumentHtmlTypeSchema = z.union([
  z.literal('xml2rfc'),
  z.literal('plaintext')
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
export const RfcCommonStatusSchema = z.union([
  z.literal('Best Current Practice'),
  z.literal('Experimental'),
  z.literal('Historic'),
  z.literal('Informational'),
  z.literal('Not Issued'),
  z.literal('Internet Standard'),
  z.literal('Unknown'),
  z.literal('Proposed Standard'),
  z.literal('Draft Standard')
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
  email: z.string().optional(),
  affiliation: z.string().optional(),
  country: z.string().optional()
})

const RfcCommonDraftSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string()
})

export const RfcCommonSchema = z.object({
  number: z.number(),
  title: z.string(),
  published: z.string(),
  area: z
    .object({
      acronym: z.string(),
      name: z.string()
    })
    .optional(),
  pages: z.number().nullable().optional(),
  status: RfcCommonStatusSchema,
  subseries: z
    .object({
      type: RfcCommonSubseriesTypeSchema,
      number: z.number().optional(),
      subseriesLength: z.number().optional()
    })
    .optional(),
  authors: z.array(RfcCommonAuthorSchema),
  group: z.object({
    acronym: z.string(),
    name: z.string()
  }),
  stream: z.object({
    slug: z.string(),
    name: z.string(),
    desc: z.string().optional()
  }),
  identifiers: z.array(RfcCommonIdentifierSchema).optional(),
  obsoletes: z.array(RfcCommonObsoleteSchema).optional(),
  obsoleted_by: z.array(RfcCommonObsoletedBySchema).optional(),
  updates: z.array(RfcCommonUpdatesSchema).optional(),
  draft: RfcCommonDraftSchema.optional(),
  updated_by: z.array(RfcCommonUpdatedBySchema).optional(),
  is_also: z.array(z.string()).optional(),
  see_also: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  errata: z.array(z.string()).optional(),
  formats: z.array(RfcCommonFormatSchema),
  abstract: z.string().optional(),
  text: z.string().nullable()
})

export type RfcCommon = z.infer<typeof RfcCommonSchema>

/**
 * Document HTML Schema (html/vue as pojo)
 */
const TextSchema = z.object({
  type: z.literal('Text'),
  textContent: z.string()
})

// this convoluted code for a schema is required in Zod 3 for recursion and TS support.
const _baseNodeElementSchema = z.object({
  type: z.literal('Element'),
  nodeName: z.string(),
  attributes: z.record(z.string(), z.string())
})
type ElementType = z.infer<typeof _baseNodeElementSchema> & {
  children: (ElementType | z.infer<typeof TextSchema>)[]
}
const ElementSchema: z.ZodType<ElementType> = z.object({
  type: z.literal('Element'),
  nodeName: z.string(),
  attributes: z.record(z.string(), z.string()),
  children: z.lazy(() => z.array(NodeSchema))
})

const NodeSchema = z.union([ElementSchema, TextSchema])

// pojo = plain old javascript object, rather than an instanceof Node class
export type NodePojo = z.infer<typeof NodeSchema>

// pojo = plain old javascript object, rather than an instanceof Document class
export type DocumentPojo = NodePojo[]

/**
 * Bucket JSON schema
 */
export const RfcBucketHtmlDocumentSchema = z.object({
  rfc: RfcCommonSchema,
  tableOfContents: TableOfContentsSchema.optional(),
  documentHtmlType: DocumentHtmlTypeSchema,
  documentHtmlObj: z.array(NodeSchema),
  maxPreformattedLineLength: z.number()
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
