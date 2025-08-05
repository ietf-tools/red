import { DateTime } from 'luxon'
import type { getRFCs } from './redClientWrappers'
import { infoRfcPathBuilder } from './url'
import { COMMA } from './strings'
import { formatAuthor } from './rfc-converters-utils'

type Rfc = Awaited<ReturnType<typeof getRFCs>>[number]

export const rfcToRfcIndexRow = (rfc: Rfc) => {
  const [month, year] = DateTime.fromISO(rfc.published)
    .toFormat('LLLL yyyy')
    .split(' ')

  const information = h('span', [
    h('b', rfc.title),
    ' ',
    ...rfc.authors.map((author) => formatAuthor(author, 'regular')),
    ` [ ${month} ${year} ] `,
    rfc.formats ?
      `(${rfc.formats.map((format) => format.toUpperCase()).join(', ')})`
    : '',
    ...(rfc.obsoletes && rfc.obsoletes.length > 0 ?
      [' (Obsoletes ', ...rfcCommaList(rfc.obsoletes), ' )']
    : []),
    ...(rfc.obsoleted_by && rfc.obsoleted_by.length > 0 ?
      [' (Obsoleted-By ', ...rfcCommaList(rfc.obsoleted_by), ' )']
    : []),
    ...(rfc.updated_by && rfc.updated_by.length > 0 ?
      [' (Updated-By ', ...rfcCommaList(rfc.updated_by), ' )']
    : []),
    ` (Status: ${rfc.status.name.toUpperCase()})`,
    ` (Stream: ${rfc.stream.name})`,
    ' ',
    rfc.identifiers ?
      `(${rfc.identifiers.map((identifier) => `${identifier.type.toUpperCase()}: ${identifier.value}`)})`
    : ''
  ])

  return {
    number: rfc.number,
    information
  }
}

export const rfcCommaList = (rfcs?: { number: number }[]) =>
  rfcs ?
    rfcs
      .map((rfc): VNode | string =>
        h(
          'a',
          { href: infoRfcPathBuilder(`rfc${rfc.number}`) },
          `RFC${rfc.number}`
        )
      )
      .reduce(
        (acc, item, index, arr) => {
          acc.push(item)
          if (index < arr.length - 1) {
            acc.push(` ${COMMA} `)
          }
          return acc
        },
        [] as (VNode | string)[]
      )
  : []
