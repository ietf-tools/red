import { z } from 'zod'

// If changing this also consider changing the RfcCommon status parsing code
export const TypesenseSearchItemStatusSchema = z.union([
  z.object({
    slug: z.literal('unkn'),
    name: z.literal('Unknown')
  }),
  z.object({
    slug: z.literal('bcp'),
    name: z.literal('Best Current Practice')
  }),
  z.object({
    slug: z.literal('exp'),
    name: z.literal('Experimental')
  }),
  z.object({
    slug: z.literal('hist'),
    name: z.literal('Historic')
  }),
  z.object({
    slug: z.literal('inf'),
    name: z.literal('Informational')
  }),
  z.object({
    slug: z.literal('not-issued'),
    name: z.literal('Not Issued')
  }),
  z.object({
    slug: z.literal('ps'),
    name: z.literal('Proposed Standard')
  }),
  z.object({
    slug: z.literal('ds'),
    name: z.literal('Draft Standard')
  }),
  z.object({
    slug: z.literal('std'),
    name: z.literal('Internet Standard')
  })
])

export const TypesenseSearchItemAreaSchema = z.object({
  acronym: z.string(),
  name: z.string(),
  full: z.string()
})

export const TypesenseSearchItemGroupSchema = z.object({
  acronym: z.string(),
  name: z.string(),
  full: z.string()
})

const TypesenseSubseriesSchema = z.object({
  acronym: z.enum(['std', 'fyi', 'bcp']).optional(),
  number: z.number().optional(),
  total: z.number().optional()
})

export type TypesenseSubseries = z.infer<typeof TypesenseSubseriesSchema>

const TypesenseSubseriesSchemaWithValues = TypesenseSubseriesSchema.required()

export type TypesenseSubseriesWithValues = z.infer<typeof TypesenseSubseriesSchemaWithValues>

// Schema definition https://github.com/ietf-tools/search/blob/main/schemas/docs.md
export const TypeSenseSearchItemSchema = z.object({
  id: z.string(),

  rfcNumber: z.number(),
  date: z.number(),
  publicationDate: z.number(),

  title: z.string(),

  status: TypesenseSearchItemStatusSchema,
  abstract: z.string(),

  adName: z.string().optional(),
  authors: z
    .array(
      z.object({
        name: z.string(),
        affiliation: z.string()
      })
    )
    .optional(),

  subseries: TypesenseSubseriesSchema.optional(),
  rfc: z.string(),

  area: TypesenseSearchItemAreaSchema.optional(),
  group: TypesenseSearchItemGroupSchema,

  stream: z
    .object({
      slug: z.string(),
      name: z.string()
    })
    .optional(),
  ranking: z.number(),
  state: z.array(z.string()),

  type: z.string(),

  filename: z.string(),
  pages: z.number(),
  keywords: z.array(z.string()),

  flags: z
    .object({
      obsoleted: z.boolean(),
      updated: z.boolean()
    })
    .optional()
})

export const isTypesenseSubseriesWithValues = (
  maybeSubseries: TypeSenseSearchItem['subseries']
): maybeSubseries is TypesenseSubseriesWithValues => {
  const { error } = TypesenseSubseriesSchemaWithValues.safeParse(maybeSubseries)
  if (error) {
    return false
  }
  return true
}

export type TypeSenseClient = {
  clearCache: () => void
  search: (
    searchRequests: Array<TypeSenseSearchRequest>
  ) => Promise<TypeSenseSearchResponse>
  searchForFacetValues: (
    searchRequests: Array<TypeSenseSearchRequest>
  ) => Promise<TypeSenseSearchResponse>
}

export type TypeSenseSearchRequest = {
  indexName: string
  params: {
    query: string
    facets?: string[]
    facetFilters?: string[]
  }
}

export type TypeSenseSearchResponse = {
  results: {
    nbHits: number
  }[]
}

export type TypeSenseSearchItem = z.infer<typeof TypeSenseSearchItemSchema>

export type Density = 'full' | 'dense' | 'compact'

export const INSTANTSEARCH_HITS_CONTAINER_DOM_ID = 'ais-hits-container'
