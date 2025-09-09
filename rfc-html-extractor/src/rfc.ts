import type { RfcCommon } from '../../client/app/utilities/rfc-validators.ts'

export const blankRfcCommon: RfcCommon = {
  number: 0,
  title: '',
  published: '1950-1-1',
  pages: 0,
  status: 'Unknown',
  authors: [],
  group: {
    acronym: '',
    name: ''
  },
  area: {
    acronym: '',
    name: ''
  },
  stream: {
    slug: '',
    name: '',
    desc: ''
  },
  identifiers: [],
  obsoleted_by: [],
  updated_by: [],
  formats: [],
  abstract: '',
  text: ''
}

const RFC_REGEX = /(rfc[0-9]+)/i

export const extractHrefRfcPart = (href: string): undefined | string => {
  const rfcMatch = href.match(RFC_REGEX)
  if (!rfcMatch) return undefined
  return rfcMatch[1]  
}