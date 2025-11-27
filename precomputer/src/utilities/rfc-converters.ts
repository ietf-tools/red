import type {
  RfcCommon,
  RfcMini,
} from '../../../website/app/utilities/rfc-validators.ts'

/**
 * RfcMini is a valid subset of RfcCommon.
 * RfcMini is used on RFC index webpages ie `/rfc-index/` where we list ALL rfcs.
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
    authors: authors.map((author) => ({
      titlepage_name: author.titlepage_name // we don't need other details
    })),
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
