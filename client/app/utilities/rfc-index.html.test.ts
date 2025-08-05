import path from 'node:path'
import fs from 'node:fs'
import { renderToString } from 'vue/server-renderer'
import { vi, describe, beforeEach, afterEach, test, expect } from 'vitest'
import { isVNode } from 'vue'
import { rfcToRfcIndexRow, rfcCommaList } from './rfc-index-html'
import { getRedClient, getRFCs } from './redClientWrappers'
import { infoRfcPathBuilder } from './url'
import {
  blankRfcResponse,
  getTestApiResponses,
  type DocListResponse
} from './rfc.test'
import { parseRFCId } from './rfc'
import {
  filterByElementName,
  parseHtml,
  getXMLBuilder
} from './test-utils/html-test-utils'
import type {
  ApiClient,
  PaginatedRfcMetadataList
} from '~/generated/red-client'

test('rfcCommaList', () => {
  const result = rfcCommaList([{ number: 1 }, { number: 2 }])
  expect(result).toHaveLength(3)
  expect(isVNode(result[0])).toBeTruthy()
  expect(result[1]).toBe(' , ')
  expect(isVNode(result[2])).toBeTruthy()
})

describe('rfcToRfcIndexRow for /rfc-index/', () => {
  beforeEach(() => {
    // tell vitest we use mocked time
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    // restoring date after each test run
    vi.useRealTimers()
  })

  test('rfcToRfcIndexRow', async () => {
    const apiClient = getTestApiClient(getTestApiResponses(13))
    const rfcs = await getRFCs({ apiClient, sort: 'ascending' })
    const rfcSummariesAsVNodes = rfcs.map(
      // This is the thing we're testing
      rfcToRfcIndexRow
    )
    const rfcSummariesWithExtraHTML = await Promise.all(
      rfcSummariesAsVNodes.map((rfcSummaryAsVNode) =>
        // Returns HTML that looks like
        //   <span><!--[-->S. Crocker<!--]--> [ April 1969 ] (TXT, HTML)<!--[--><!--]--> (Status: unknown) (Stream: Legacy)(doi: 10.17487/RFC0001)</span>"
        renderToString(rfcSummaryAsVNode.information, {})
      )
    )
    const rfcSummaries = rfcSummariesWithExtraHTML.map(
      (rfcSummaryWithExtraHTML) =>
        rfcSummaryWithExtraHTML
          .replace(/<!--[\s\S]*?-->/g, '')
          .replace(/^<span>/i, '')
          .replace(/<\/span>$/i, '')
    )

    rfcSummaries.forEach((rfcSummary, index) => {
      const originalRfcSummary = originalRfcSummaries[index][1]
      expect(rfcSummary).toBe(originalRfcSummary)
    })
  })
})

const originalRfcIndexHtml = fs
  .readFileSync(path.join(import.meta.dirname, 'rfc-index.html'), 'utf-8')
  .toString()

const originalRfcIndex = parseHtml(originalRfcIndexHtml)

const extractRfcSummaries = (document: unknown) => {
  if (!Array.isArray(document)) {
    console.log('Bad param document', document)
    throw Error('Bad param document')
  }
  const root = document[0]['html']
  const bodies = filterByElementName(root, 'body')
  if (bodies.length !== 1) {
    throw Error(`Expected to find bodies.length === 1 but was ${bodies.length}`)
  }
  const bodies0 = bodies[0]
  if (!bodies0 || typeof bodies0 !== 'object' || !('body' in bodies0)) {
    throw Error('Unable to find body')
  }
  const body = bodies0.body

  if (!Array.isArray(body)) {
    console.log(JSON.stringify(body).substring(0, 100))
    throw Error(
      `Expected body to be array but was ${typeof body} (Array.isArray(body)===${Array.isArray(body)})`
    )
  }
  const tables = filterByElementName(body, 'table')
  const rfcsTable = tables[2]
  if (
    !rfcsTable ||
    typeof rfcsTable !== 'object' ||
    !('table' in rfcsTable) ||
    !Array.isArray(rfcsTable.table)
  ) {
    throw Error('Unable to find rfcsTable')
  }

  const rows = filterByElementName(rfcsTable.table, 'tr')
  if (!Array.isArray(rows)) {
    console.log('Bad param rows', rows)
    throw Error('Bad param rows')
  }
  const builder = getXMLBuilder({
    preserveOrder: true,
    ignoreAttributes: true, // FIXME preserve attributes and fix the tests that don't expect it
    attributeNamePrefix: '',
    format: true,
    suppressBooleanAttributes: true, // TODO: should I have this config?
    indentBy: '  '
  })
  const htmlRows = rows.map((row) => {
    if (
      !row ||
      typeof row !== 'object' ||
      !('tr' in row) ||
      !Array.isArray(row.tr)
    ) {
      throw Error('invalid row')
    }

    const cells = filterByElementName(row.tr, 'td')

    const cell0 = cells[0]

    if (!cell0 || typeof cell0 !== 'object' || !('td' in cell0)) {
      throw Error('Expected cell0.td')
    }

    const numWithScripts: string = builder.build(cell0.td)

    /** Everyone knows you shouldn't use regex for HTML
     *
     *  ...unless it's a very specific structure which this is
     *  (ie, we're not dealing with arbitrary HTML so this is safe)
     */
    const num = numWithScripts
      .replace(
        /<script[\s\S]*?<\/script>/gi,
        // we don't need any scripts because in our HTML there's always a companion <noscript>
        ''
      )
      .replace(/<noscript>(.*?)<\/noscript>/gi, (_match, rfcNumber) => {
        /**
           The HTML looks like this:

             <script type="text/javascript"> doStandardDocLink(&apos;RFC9280&apos;); </script>
             <noscript>9280</noscript>

           which is converted to:

           <a href="/info/rfc9280/">RFC9280</a>
        */
        return `<a href="${infoRfcPathBuilder(`RFC${parseInt(rfcNumber, 10)}`)}">${parseInt(rfcNumber, 10)}</a>`
      })
      .replace(/[\s]+/g, ' ') // normalise the whitespace
      .trim()

    const informationCell = cells[1]
    if (
      !informationCell ||
      typeof informationCell !== 'object' ||
      !('td' in informationCell)
    ) {
      throw Error('Expected .td')
    }
    const informationWithScripts: string = builder.build(informationCell.td)
    const information = informationWithScripts
      .replace(
        /<script[\s\S]*?<\/script>/gi,
        // we don't need any scripts because in our HTML there's always a companion <noscript>
        ''
      )
      .replace(/<noscript>(.*?)<\/noscript>/gi, (_match, rfcId) => {
        /**
           The HTML looks like this:

             <script type="text/javascript"> doStandardDocLink(&apos;RFC9280&apos;); </script>
             <noscript>RFC9280</noscript>

           which is converted to:

           <a href="/info/rfc9280/">RFC9280</a>
        */
        return `<a href="${infoRfcPathBuilder(rfcId)}">RFC${parseRFCId(rfcId).number}</a>`
      })
      .replace(/[\s]+/g, ' ') // normalise the whitespace
      .trim()

    return [num, information]
  })

  // Remove the first row of the table because it's headings
  htmlRows.shift()

  return htmlRows
}

const originalRfcSummaries = extractRfcSummaries(originalRfcIndex)

type TestHelperResponses = {
  oldestRfcResponse: DocListResponse
  seekingResponses: PaginatedRfcMetadataList[]
}

const getTestApiClient = (responses: TestHelperResponses) => {
  const redApiMock = getRedClient()
  type DocListArg = Parameters<ApiClient['red']['docList']>[0]

  // clone so that we don't mutate original array
  const seekingResponses = [...responses.seekingResponses]

  redApiMock.red.docList = (search: DocListArg) =>
    new Promise((resolve) => {
      if (search.sort?.length === 1 && search.sort[0] === '-number') {
        resolve(responses.oldestRfcResponse)
        return
      }
      const nextSeek = seekingResponses.pop()
      if (!nextSeek) {
        resolve(blankRfcResponse)
        return
      }
      resolve(nextSeek)
    })

  return redApiMock
}
