import { DateTime } from 'luxon'
import { formatAuthor, formatIdentifiers } from './rfc-converters-utils'
import { FIXME_getRFCWithMissingData } from './rfc.mocks'
import { infoRfcPathBuilder, PUBLIC_SITE } from './url'
import type { Rfc } from '~/generated/red-client'

/**
 * Renders RFC summary txt. Eg.
 *
 * Crocker, S., "Host Software", RFC 1, DOI 10.17487/RFC0001, April 1969, <https://www.rfc-editor.org/info/rfc1>.
 *
 * As used on https://www.rfc-editor.org/refs/ref0001.txt
 */
export const refsRefRfcIdTxt = (rfc: Rfc): string => {
  const rfcWithMissingData = FIXME_getRFCWithMissingData(rfc)
  return `${rfcWithMissingData.authors.map((author) => formatAuthor(author, 'brief'))}, "${rfcWithMissingData.title}", RFC ${rfcWithMissingData.number}, ${formatIdentifiers(rfcWithMissingData.identifiers, ' ').join('')}, ${DateTime.fromISO(rfcWithMissingData.published).toFormat('LLLL yyyy')}, <${PUBLIC_SITE}${infoRfcPathBuilder(`rfc${rfcWithMissingData.number}`)}>.\n`
}
