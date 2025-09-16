import fs from 'node:fs'
import path from 'node:path'
import { vi, describe, test, expect } from 'vitest'
import { splitLinesAt, renderRfcIndexTxt } from './rfc-index-txt'
import { RfcCommon } from '../../../client/app/utilities/rfc-validators'

const paragraph =
  'Obsoletes xxxx refers to other RFCs that this one replaces; Obsoleted by xxxx refers to RFCs that have replaced this one. Updates xxxx refers to other RFCs that this one merely updates (but does not replace);'

test('splitLinesAt: 40', () => {
  expect(splitLinesAt(paragraph, 40)).toEqual([
    'Obsoletes xxxx refers to other RFCs that',
    'this one replaces; Obsoleted by xxxx',
    'refers to RFCs that have replaced this',
    'one. Updates xxxx refers to other RFCs',
    'that this one merely updates (but does',
    'not replace);'
  ])
})

test('splitLinesAt: 50', () => {
  expect(splitLinesAt(paragraph, 50)).toEqual([
    'Obsoletes xxxx refers to other RFCs that this one',
    'replaces; Obsoleted by xxxx refers to RFCs that',
    'have replaced this one. Updates xxxx refers to',
    'other RFCs that this one merely updates (but does',
    'not replace);'
  ])
})

const fourDigitIndexRendering = fs
  .readFileSync(path.join(import.meta.dirname, 'rfc-index-4digit.txt'), 'utf-8')
  .toString()

const fourDigitIndexRenderingUntilRfc13 = fourDigitIndexRendering
  .substring(0, fourDigitIndexRendering.indexOf(' 14'))
  .trimEnd()

const fiveDigitIndexRendering = fs
  .readFileSync(path.join(import.meta.dirname, 'rfc-index-5digit.txt'), 'utf-8')
  .toString()

const fiveDigitIndexRenderingUntilRfc13 = fiveDigitIndexRendering
  .substring(0, fiveDigitIndexRendering.indexOf(' 14'))
  .trimEnd()

describe('renderRfcIndexDotTxt', () => {
  test('compare against original 4 digit-wide rendering', async () => {
    const date = new Date(2025, 0, 14)
    vi.setSystemTime(date)

    const str = await renderRfcIndexTxt(someRfcs)

    // ensure that we read enough of a file
    expect(fourDigitIndexRenderingUntilRfc13.length).toBeGreaterThan(1000)

    // test rendering against a wget of the existing rfc-index.txt truncated to RFC0013
    expect(str.substring(0, fourDigitIndexRenderingUntilRfc13.length)).toEqual(
      fourDigitIndexRenderingUntilRfc13
    )
  })

  test('compare against 5 digit-wide rendering (RFC10k)', async () => {
    const date = new Date(2025, 0, 14)
    vi.setSystemTime(date)

    const str = await renderRfcIndexTxt(someRfcs)

    // ensure that we read enough of a file
    expect(fiveDigitIndexRenderingUntilRfc13.length).toBeGreaterThan(100)

    expect(str.substring(0, fiveDigitIndexRenderingUntilRfc13.length)).toEqual(
      fiveDigitIndexRenderingUntilRfc13
    )
  })
})

const someRfcs: RfcCommon[] = [
  {
    number: 9837,
    title: 'The IPv6 VPN Service Destination Option',
    published: '2025-08-22',
    pages: 10,
    status: 'Experimental',
    authors: [
      {
        person: 101568,
        name: 'Ron Bonica',
        email: 'rbonica@juniper.net',
        affiliation: 'Juniper Networks',
        country: 'USA'
      },
      {
        person: 107415,
        name: 'Xing Li',
        email: 'xing@cernet.edu.cn',
        affiliation: 'CERNET Center/Tsinghua University',
        country: 'China'
      },
      {
        person: 104198,
        name: 'Adrian Farrel',
        email: 'adrian@olddog.co.uk',
        affiliation: 'Old Dog Consulting',
        country: 'UK'
      },
      {
        person: 107126,
        name: 'Yuji Kamite',
        email: 'y.kamite@ntt.com',
        affiliation: 'NTT Communications Corporation',
        country: 'Japan'
      },
      {
        person: 126976,
        name: 'Luay Jalil',
        email: 'luay.jalil@one.verizon.com',
        affiliation: 'Verizon',
        country: 'USA'
      }
    ],
    group: { acronym: '6man', name: 'IPv6 Maintenance' },
    area: { acronym: 'int', name: 'Internet Area' },
    stream: {
      slug: 'ietf',
      name: 'IETF',
      desc: 'Internet Engineering Task Force (IETF)'
    },
    identifiers: [{ type: 'doi', value: '10.17487/RFC9837' }],
    obsoleted_by: [],
    updated_by: [],
    formats: [],
    abstract:
      'This document describes an experiment in which VPN service information is encoded in an experimental IPv6 Destination Option. The experimental IPv6 Destination Option is called the VPN Service Option.\n\n One purpose of this experiment is to demonstrate that the VPN Service Option can be deployed in a production network. Another purpose is to demonstrate that the security measures described in this document are sufficient to protect a VPN. Finally, this document encourages replication of the experiment.',
    text: ''
  },
  {
    number: 9839,
    title: 'Unicode Character Repertoire Subsets',
    published: '2025-08-22',
    pages: 10,
    status: 'Internet Standard',
    authors: [
      {
        person: 106769,
        name: 'Tim Bray',
        email: 'tbray@textuality.com',
        affiliation: 'Textuality Services',
        country: ''
      },
      {
        person: 10083,
        name: 'Paul Hoffman',
        email: 'paul.hoffman@icann.org',
        affiliation: 'ICANN',
        country: ''
      }
    ],
    group: { acronym: 'art', name: 'Applications and Real-Time Area' },
    area: { acronym: 'art', name: 'Applications and Real-Time Area' },
    stream: {
      slug: 'ietf',
      name: 'IETF',
      desc: 'Internet Engineering Task Force (IETF)'
    },
    identifiers: [{ type: 'doi', value: '10.17487/RFC9839' }],
    obsoleted_by: [],
    updated_by: [],
    formats: [],
    abstract:
      'This document discusses subsets of the Unicode character repertoire for use in protocols and data formats and specifies three subsets recommended for use in IETF specifications.',
    text: ''
  },
  {
    number: 9844,
    title: 'Entering IPv6 Zone Identifiers in User Interfaces',
    published: '2025-08-22',
    pages: 8,
    status: 'Internet Standard',
    authors: [
      {
        person: 1958,
        name: 'Brian Carpenter',
        email: 'brian.e.carpenter@gmail.com',
        affiliation: '',
        country: ''
      },
      {
        person: 2793,
        name: 'Bob Hinden',
        email: 'bob.hinden@gmail.com',
        affiliation: 'Check Point Software',
        country: ''
      }
    ],
    group: { acronym: '6man', name: 'IPv6 Maintenance' },
    area: { acronym: 'int', name: 'Internet Area' },
    stream: {
      slug: 'ietf',
      name: 'IETF',
      desc: 'Internet Engineering Task Force (IETF)'
    },
    identifiers: [{ type: 'doi', value: '10.17487/RFC9844' }],
    obsoleted_by: [],
    updated_by: [],
    formats: [],
    abstract:
      'This document describes how the zone identifier of an IPv6 scoped address, defined in the IPv6 Scoped Address Architecture specification (RFC 4007), should be entered into a user interface.  This document obsoletes RFC 6874 and updates RFCs 4007, 7622, and 8089.',
    text: ''
  }
]
