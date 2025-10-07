import { DateTime } from "luxon"
import { RfcCommon, RFCJSON } from "../../../client/app/utilities/rfc-validators.ts"
import { formatAuthor, formatDatePublished, formatFormat } from "./rfc-converters-utils.ts"

/**
 * Converts between types of RFC data
 */
export const rfcToRfcJson = (rfc: RfcCommon): RFCJSON => {
  const date = DateTime.fromISO(rfc.published)

  return {
    draft: rfc.draft?.slug ?? '',
    doc_id: `RFC${rfc.number}`,
    title: rfc.title,
    authors: rfc.authors.map((author) => formatAuthor(author, 'regular')) ?? [],
    format: rfc.formats.map((format) =>
      formatFormat(
        format,
        // FIXME: get info on whether it's a pre-V3 rfc.... or ensure API will return ASCII
        true
      )
    ),
    page_count: rfc.pages?.toString() ?? '0',
    pub_status: rfc.status.name.toUpperCase(),
    status: rfc.status.name.toUpperCase(),
    source: rfc.stream.name,
    abstract: rfc.abstract,
    pub_date: formatDatePublished(date, false),
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