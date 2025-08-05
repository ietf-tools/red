import { padStart } from 'lodash-es'
import type { TestHelperResponses } from './CurrQstats.txt.test'
import type { ApiClient } from '~/generated/red-client'

type Props = {
  redApi: ApiClient
}
const TABLE_OFFSET = '    '

const getHeader = () => {
  const date = new Date()
  const createdOn = `${date.getFullYear()}-${padStart((date.getMonth() + 1).toString(), 2, '0')}-${padStart(date.getDate().toString(), 2, '0')}`

  return `#### RFC Editor Queue Summary:  ${createdOn} ####

${TABLE_OFFSET}State             total #       total #      Median Wks    Average Wks
${TABLE_OFFSET}                  docs          pages        in state      in state\n`
}

export const renderCurrQstatsDotTxt = async (
  _props: Props
): Promise<string> => {
  let txt = getHeader()

  // FIXME: use proper shape from ApiClient when it's available
  const queueSummaryResponse: TestHelperResponses['queueSummaryResponse'] = {
    results: [
      {
        state: 'EDIT',
        totalDocs: 68,
        totalPages: 2550,
        medianWeeksInState: 5.6,
        averageWeeksInState: 7.6
      },
      {
        state: 'RFC-EDITOR',
        totalDocs: 5,
        totalPages: 161,
        medianWeeksInState: 0.9,
        averageWeeksInState: 1.2
      },
      {
        state: 'AUTH48',
        totalDocs: 29,
        totalPages: 1004,
        medianWeeksInState: 3.7,
        averageWeeksInState: 7.4
      },
      {
        state: 'AUTH48-DONE',
        totalDocs: 3,
        totalPages: 35,
        medianWeeksInState: 0.7,
        averageWeeksInState: 0.7
      },
      {
        state: 'AUTH',
        totalDocs: 0,
        totalPages: 0,
        medianWeeksInState: 0,
        averageWeeksInState: 0
      },
      {
        state: 'IANA',
        totalDocs: 0,
        totalPages: 0,
        medianWeeksInState: 0,
        averageWeeksInState: 0
      },
      {
        state: 'IESG',
        totalDocs: 0,
        totalPages: 0,
        medianWeeksInState: 0,
        averageWeeksInState: 0
      },
      {
        state: 'REF',
        totalDocs: 1,
        totalPages: 57,
        medianWeeksInState: 0,
        averageWeeksInState: 1
      },
      {
        state: 'MISSREF(1G)',
        totalDocs: 18,
        totalPages: 600,
        medianWeeksInState: 51.5,
        averageWeeksInState: 57.2
      },
      {
        state: 'MISSREF(2G)',
        totalDocs: 6,
        totalPages: 401,
        medianWeeksInState: 87.8,
        averageWeeksInState: 85.29 // changed to test rounding
      },
      {
        state: 'MISSREF(3G)',
        totalDocs: 1,
        totalPages: 29,
        medianWeeksInState: 0,
        averageWeeksInState: 85.69 // changed to test rounding
      },
      {
        state: 'TI',
        totalDocs: 0,
        totalPages: 0,
        medianWeeksInState: 0,
        averageWeeksInState: 0
      }
    ],
    stats: {
      totalDocs: 131,
      totalPages: 4837
    }
  }

  for (let i = 0; i < queueSummaryResponse.results.length; i++) {
    const result = queueSummaryResponse.results[i]
    txt += `${TABLE_OFFSET}${result.state.padEnd(15, ' ')}${result.totalDocs.toFixed(0).padStart(10, ' ')}${result.totalPages.toFixed(0).padStart(15, ' ')}${result.medianWeeksInState.toFixed(1).padStart(15, ' ')}${result.averageWeeksInState.toFixed(1).padStart(15, ' ')}\n`
  }

  txt += `\n\nTotals:${queueSummaryResponse.stats.totalDocs.toFixed(0).padStart(7, ' ')} docs${queueSummaryResponse.stats.totalPages.toFixed(0).padStart(8, ' ')} pages\n`

  return txt
}
