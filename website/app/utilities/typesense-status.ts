import { z } from 'zod'

/**
 * The `status` facet of a search index item.
 *
 * Kept in its own module, separate from the rest of `typesense.ts`, because that module
 * also holds browser-only helpers. Modules reachable from the Nitro server build (such as
 * `url.ts`) need the status vocabulary without pulling `window`/`document` into a
 * tsconfig project that has no DOM lib.
 *
 * If changing this also consider changing the RfcCommon status parsing code, which uses
 * the same slugs with lowercased names.
 */
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

/** The `status.name` values the index can return, ie the vocabulary of that facet. */
export type TypesenseStatusName = z.infer<typeof TypesenseSearchItemStatusSchema>['name']
