import { DateTime } from 'luxon'
import {
  RfcCommon,
  RFCJSON,
  RfcMini
} from '../../../client/app/utilities/rfc-validators.ts'
import {
  formatAuthor,
  formatDatePublished,
  formatRfcFormatAsRfcJsonFormat,
  formatRfcStatusAsRfcJsonStatus
} from './rfc-converters-utils.ts'

/**
 * Converts between types of RFC data
 */
export const rfcToRfcJson = (rfc: RfcCommon): RFCJSON => {
  const date = rfc.published ? DateTime.fromISO(rfc.published) : undefined

  const status = formatRfcStatusAsRfcJsonStatus(rfc.status)

  return {
    draft: rfc.draft?.slug ?? '',
    doc_id: `RFC${rfc.number}`,
    title: rfc.title,
    authors: rfc.authors.map((author) => formatAuthor(author, 'regular')) ?? [],
    format: rfc.formats.map(formatRfcFormatAsRfcJsonFormat),
    page_count: rfc.pages?.toString() ?? '0',
    pub_status: status,
    status: status,
    source: rfc.stream.name,
    abstract: rfc.abstract ?? '',
    pub_date: date ? formatDatePublished(date, false) : null,
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
    doi:
      rfc.identifiers?.find((identifier) => identifier.type === 'doi')?.value ??
      null,
    errata_url: rfc.errata?.[0] ?? null
  }
}

/**
 * RfcMini is a valid subset of RfcCommon.
 * RfcMini is used on RFC index webpages rendered by Nuxt.
 * It's a minimal subset without extraneous data to optimise download time.
 */
export const rfcToRfcMini = (rfc: RfcCommon): RfcMini => {
  const {
    number,
    title,
    published,
    authors,
    formats,
    obsoletes,
    obsoleted_by,
    updates,
    updated_by,
    status,
    stream,
    identifiers
  } = rfc

  // Ensuring that it's a valid subset of RfcCommon, even though we return it as an RfcMini
  const response: RfcCommon = {
    number,
    title,
    published,
    authors,
    formats,
    obsoletes,
    obsoleted_by,
    updates,
    updated_by,
    status,
    stream,
    identifiers
  }

  return response
}
