import { DateTime } from 'luxon'
import { FIXME_getRFCMetadataWithMissingData } from './rfc.mocks'
import { formatAuthor, formatFormat } from './rfc-converters-utils'
import { getXMLBuilder } from './test-utils/html-test-utils'
import { setTimeoutPromise } from './promises'
import type { ApiClient } from '~/generated/red-client'

type DocListArg = Parameters<ApiClient['red']['docList']>[0]

type Props = {
  push: (data: string) => void
  close: () => void
  abortController: AbortController
  redApi: ApiClient
  delayBetweenRequestsMs: number
}

export async function renderRfcIndexDotXml(props: Props) {
  const { push, close } = props
  push('<?xml version="1.0" encoding="UTF-8"?>\n')
  push(
    '<rfc-index xmlns="https://www.rfc-editor.org/rfc-index" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="https://www.rfc-editor.org/rfc-index https://www.rfc-editor.org/rfc-index.xsd">\n'
  )
  // await renderBCPs(props)
  // await renderFYIs(props)
  await renderRFCs(props)
  // await renderSTDs(props)

  push('</rfc-index>')
  close()
}

// const renderBCPs = async (props: Props): Promise<void> => {
//   console.log(props.delayBetweenRequestsMs) // FIXME: remove this
//   // FIXME: render BCPs
// }

// const renderFYIs = async (props: Props): Promise<void> => {
//   console.log(props.delayBetweenRequestsMs) // FIXME: remove this
//   // FIXME: render FYIs
// }

const renderRFCs = async ({
  push,
  abortController,
  redApi,
  delayBetweenRequestsMs
}: Props): Promise<void> => {
  const docListArg: DocListArg = {}
  docListArg.sort = ['-number'] // sort by oldest RFC to find the end
  docListArg.limit = 1 // we only need one result
  const response = await redApi.red.docList(docListArg)
  const largestRfcNumber = response.results[0].number

  const builder = getXMLBuilder({
    ignoreAttributes: true, // FIXME: don't ignore attributes, and fix the tests that depend on this
    attributeNamePrefix: '',
    format: true,
    suppressBooleanAttributes: true,
    indentBy: '  '
  })

  docListArg.sort = ['number'] // sort by first RFC
  let offset = 0

  while (!abortController.signal.aborted) {
    docListArg.offset = offset
    docListArg.limit = 1000

    const response = await redApi.red.docList(docListArg)

    response.results.forEach((rfcMetadata) => {
      const rfc = FIXME_getRFCMetadataWithMissingData(rfcMetadata)

      const [month, year] = DateTime.fromISO(rfcMetadata.published)
        .toFormat('LLLL yyyy')
        .split(' ')

      // Based on https://github.com/rfc-editor/rpcwebsite/blob/edf4896c1d97fdd79a78ee6145e3a0c5ffb11fb9/rfc-ed/bin/xmlIndex.pl
      const rfcForXml = {
        'rfc-entry': {
          'doc-id': `RFC${rfc.number}`,
          title: rfc.title,
          ...(rfc.authors.length > 0 ?
            {
              author: {
                name: rfc.authors.map((author) =>
                  formatAuthor(author, 'regular')
                )
              }
            }
          : {}),
          date: { month, year },
          ...(rfc.formats ?
            {
              format: {
                'file-format': rfc.formats
                  .sort((a, b) => -a.localeCompare(b))
                  .map((format) =>
                    formatFormat(
                      format,
                      // FIXME: get info on whether it's a pre-V3 rfc.... or ensure API will return ASCII
                      true
                    )
                  )
              }
            }
          : {}),
          'page-count': rfc.pages,
          ...(rfc.keywords && rfc.keywords.length > 0 ?
            {
              keywords: {
                kw: rfc.keywords
              }
            }
          : {}),
          ...(rfc.obsoletes && rfc.obsoletes.length > 0 ?
            {
              obsoletes: {
                'doc-id': rfc.obsoletes.map(
                  (obsoletesItem) => `RFC${obsoletesItem.number}`
                )
              }
            }
          : {}),
          ...(rfc.obsoleted_by && rfc.obsoleted_by.length > 0 ?
            {
              'obsoleted-by': {
                'doc-id': rfc.obsoleted_by.map(
                  (obsoletedByItem) => `RFC${obsoletedByItem.number}`
                )
              }
            }
          : {}),
          ...(rfc.updated_by && rfc.updated_by.length > 0 ?
            {
              'updated-by': {
                'doc-id': rfc.updated_by.map(
                  (updatedByItem) => `RFC${updatedByItem.number}`
                )
              }
            }
          : {}),
          ...(rfc.abstract ?
            {
              abstract:
                // Certain RFCs have multiple paragraphs such as RFC1849, RFC2169, RFC2178, RFC2660, RFC3318, RFC3867, RFC3873, RFC3875, RFC3886, RFC3890, RFC3894, RFC3903, RFC3918, RFC3919, RFC3927, RFC3932, RFC3933, RFC3938, RFC3945, RFC3949, RFC3965, RFC3974, RFC3987, RFC3995, RFC4005, RFC4010, RFC4025, RFC4026, RFC4034, RFC4035, RFC4040, RFC4041, RFC4042, RFC4043, RFC4053, RFC4061, RFC4078, RFC4080, RFC4082, RFC4086, RFC4088, RFC4090 etc...
                rfc.abstract.split('\n').map((abstractParagraph) => ({
                  p: abstractParagraph
                }))
            }
          : {}),
          ...(rfc.draft ? { draft: rfc.draft } : {}),
          'current-status': rfc.status.slug.toUpperCase(),
          'publication-status': rfc.status.slug.toUpperCase(),
          ...(rfc.stream.slug === 'LEGACY' ?
            { stream: 'Legacy' }
          : {
              stream: rfc.stream.name,
              ...(rfc.area?.acronym ? { area: rfc.area?.acronym } : {}),
              ...(rfc.group.acronym ?
                // wg_acronym:
                //   rfc.group.acronym === 'IETF-NWG' ?
                //     'NON WORKING GROUP'
                //   : rfc.group.acronym
                {}
              : {})
            }),
          ...(rfc.errata && rfc.errata.length > 0 ?
            {
              'errata-url': rfc.errata
            }
          : {}),
          doi:
            rfc.identifiers?.find((identifier) => identifier.type === 'doi')
              ?.value ?? undefined
        }
      }

      const xml = builder.build(rfcForXml)

      push(xml)
    })

    offset += response.results.length

    if (
      response.results.some(
        (rfcMetadata) => rfcMetadata.number === largestRfcNumber
      )
    ) {
      return
    }

    if (delayBetweenRequestsMs > 0) {
      await setTimeoutPromise(delayBetweenRequestsMs)
    }
  }
}

// const renderSTDs = async (props: Props): Promise<void> => {
//   console.log(props.delayBetweenRequestsMs) // FIXME: remove this
//   // FIXME: render STDs
// }
