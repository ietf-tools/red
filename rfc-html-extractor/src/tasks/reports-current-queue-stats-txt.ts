import { padStart } from 'lodash-es'
import {
  REPORTS_CURRENT_QUEUE_STATS_DOT_TXT_PATH,
  saveToS3
} from '../utilities/s3.ts'

// FIXME: get from an API
export type CurrentQueueStats = {
  results: {
    state: string
    totalDocs: number
    totalPages: number
    medianWeeksInState: number
    averageWeeksInState: number
  }[]
  stats: {
    totalDocs: number
    totalPages: number
  }
}

// FIXME: use proper shape from ApiClient when it's available
// the results[].state have FIXME added to them to remind users it's placeholder data
const mockedQueueSummary: CurrentQueueStats = {
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

/**
 * Currently uses mock data. Instead use an API
 */
export const FIXME_uploadReportsCurrentQStatsTxt = async (): Promise<boolean> => {
  const txt = await renderReportsCurrentQStatsTxt()
  await saveToS3(REPORTS_CURRENT_QUEUE_STATS_DOT_TXT_PATH, txt)
  console.log('Uploaded', REPORTS_CURRENT_QUEUE_STATS_DOT_TXT_PATH, 'FIXME with mock data')
  return true
}

const MINIMUM_STATE_WIDTH = 15

export const renderReportsCurrentQStatsTxt = async (): Promise<string> => {
  const queueSummary = mockedQueueSummary
  let txt = getHeader()
  const stateWidth = Math.max(
    MINIMUM_STATE_WIDTH,
    ...queueSummary.results.map((result) => result.state.length)
  )

  for (let i = 0; i < queueSummary.results.length; i++) {
    const result = queueSummary.results[i]
    if (result === undefined) {
      throw Error(`Unable to get index ${i}`)
    }
    txt += `${TABLE_OFFSET}${result.state.padEnd(
      stateWidth,
      ' '
    )} ${result.totalDocs.toFixed(0).padStart(9, ' ')}${result.totalPages
      .toFixed(0)
      .padStart(14, ' ')}${result.medianWeeksInState
      .toFixed(1)
      .padStart(16, ' ')}${result.averageWeeksInState
      .toFixed(1)
      .padStart(15, ' ')}\n`
  }

  txt += `\n\nTotals:${queueSummary.stats.totalDocs
    .toFixed(0)
    .padStart(7, ' ')} docs${queueSummary.stats.totalPages
    .toFixed(0)
    .padStart(8, ' ')} pages\n`

  return txt
}

const TABLE_OFFSET = '    '

const getHeader = () => {
  const date = new Date()
  const createdOn = `${date.getFullYear()}-${padStart(
    (date.getMonth() + 1).toString(),
    2,
    '0'
  )}-${padStart(date.getDate().toString(), 2, '0')}`

  return `#### RFC Editor Queue Summary:  ${createdOn} ####

${TABLE_OFFSET}State             total #       total #      Median Wks    Average Wks
${TABLE_OFFSET}                  docs          pages        in state      in state\n`
}
