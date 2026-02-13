import { z } from 'zod'
import { DateTime } from 'luxon'
import type { RfcCommon } from '../../../website/app/utilities/rfc-validators.ts'
import { assertNever } from './typescript.ts'

/**
 * Note that RFC JSON is a specific legacy format, not a general idea of RFCs in JSON.
 */

export const rfcToRfcJson = (rfc: RfcCommon): RFCJSON => {
  const date = rfc.published ? DateTime.fromISO(rfc.published) : undefined

  const status = formatRfcStatusAsRfcJsonStatus(rfc.status)

  const doi = rfc.identifiers?.find((identifier) => identifier.type === 'doi')

  return {
    draft: rfc.draft?.slug ?? '',
    doc_id: `RFC${rfc.number}`,
    title: rfc.title,
    authors: rfc.authors.map((author) => formatAuthor(author)) ?? [],
    format: rfc.formats.map(formatRfcFormatAsRfcJsonFormat),
    page_count: rfc.pages?.toString() ?? '0',
    pub_status: status,
    status: status,
    source: rfc.stream.name,
    abstract: rfc.abstract ?? '',
    pub_date: date ? date.toFormat('LLLL yyyy') : null,
    keywords: rfc.keywords ?? [],
    obsoletes: rfc.obsoletes?.map((obsolete) => `RFC${obsolete.number}`) ?? [],
    obsoleted_by:
      rfc.obsoleted_by?.map((obsoleted_by) => `RFC${obsoleted_by.number}`) ??
      [],
    updates: rfc.updates?.map((update) => `RFC${update.number}`) ?? [],
    updated_by:
      rfc.updated_by?.map(
        (updated_by_item) => `RFC${updated_by_item.number}`
      ) ?? [],
    see_also: rfc.see_also ?? [],
    doi: doi ? doi?.value : null,
    errata_url: rfc.errata?.[0] ?? null
  }
}

const RfcJsonStatusSchema = z.union([
  z.literal('UNKNOWN'),
  z.literal('INTERNET STANDARD'),
  z.literal('EXPERIMENTAL'),
  z.literal('HISTORIC'),
  z.literal('INFORMATIONAL'),
  z.literal('NOT ISSUED'),
  z.literal('PROPOSED STANDARD'),
  z.literal('BEST CURRENT PRACTICE'),
  z.literal('FOR YOUR INFORMATION')
])

const RfcJsonFormatSchema = z.union([
  z.literal('ASCII'),
  z.literal('TEXT'),
  z.literal('HTML'),
  z.literal('PDF'),
  z.literal('PS'),
  z.literal('XML'),
  z.literal('JSON'),
  z.literal('NOTPREPPED'),
  z.literal('') // FIXME: should this exist?
])

export const RfcJsonSchema = z.object({
  draft: z.string().nullable(),
  doc_id: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  format: RfcJsonFormatSchema.array(),
  page_count: z.string().nullable(),
  pub_status: RfcJsonStatusSchema,
  status: RfcJsonStatusSchema,
  source: z.string(),
  abstract: z.string().nullable(),
  pub_date: z.string().nullable(),
  keywords: z.array(z.string()),
  obsoletes: z.array(z.string()),
  obsoleted_by: z.array(z.string()),
  updates: z.array(z.string()),
  updated_by: z.array(z.string()),
  see_also: z.array(z.string()),
  doi: z.string().nullable(),
  errata_url: z.string().nullable()
})

export type RFCJSON = z.infer<typeof RfcJsonSchema>

const formatRfcStatusAsRfcJsonStatus = (
  status: RfcCommon['status']
): RFCJSON['status'] => {
  switch (status.name) {
    case 'best current practice':
      return 'BEST CURRENT PRACTICE'
    case 'experimental':
      return 'EXPERIMENTAL'
    case 'historic':
      return 'HISTORIC'
    case 'informational':
      return 'INFORMATIONAL'
    case 'not issued':
      return 'NOT ISSUED'
    case 'proposed standard':
      return 'PROPOSED STANDARD'
    case 'unknown':
      return 'UNKNOWN'
    case 'internet standard':
      return 'INTERNET STANDARD'
    case 'draft standard':
      // FIXME: is this an accurate conversion?
      return 'PROPOSED STANDARD'
  }
  assertNever(status)
}

const formatRfcFormatAsRfcJsonFormat = (
  format: RfcCommon['formats'][number]
): RFCJSON['format'][number] => {
  switch (format) {
    case 'txt':
      return 'TEXT'
    case 'xml':
      return 'XML'
    case 'html':
      return 'HTML'
    case 'pdf':
      return 'PDF'
    case 'ps':
      return 'PS'
    case 'json':
      return 'JSON'
    case 'notprepped':
      return 'NOTPREPPED'
  }
  assertNever(format)
}

export const formatAuthor = (author: RfcCommon['authors'][number]): string => {
  const { titlepage_name } = author
  if (!titlepage_name) return ''
  const name = titlepage_name
    .split(/[\s.]/g)
    .filter(Boolean)
    .reduce((acc, item, index, arr) => {
      const newBit =
        index === arr.length - 1
          ? ` ${item}`
          : `${item.substring(0, 1).toUpperCase()}.`
      return `${acc}${newBit}`
    })

  return author.affiliation === 'Editor' ? `${name}, Ed.` : name
}
