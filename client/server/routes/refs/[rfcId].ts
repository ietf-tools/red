import { refsRefTxtPathBuilder } from '~/utilities/url'
import { docRetrieve, getRedClient } from '~/utilities/redClientWrappers'
import { refsRefRfcIdTxt } from '~/utilities/refs'

const refRegex = /^ref([0-9]+)\.txt$/

export default defineEventHandler(async (event) => {
  const { params } = event.context
  if (!params) {
    throw Error('Expected params')
  }
  const { rfcId } = params
  if (!rfcId) {
    throw Error('Expected rfcId param')
  }
  const rfcPatterns = rfcId.match(refRegex)
  if (!rfcPatterns) {
    throw Error(`Expected param to match ${rfcId}`)
  }
  const rfcNumberMatch = rfcPatterns[1] // eg '0001'
  if (!rfcNumberMatch) {
    throw Error(`Expected ${JSON.stringify(rfcId)} to match pattern.`)
  }
  const rfcNumber = parseInt(rfcNumberMatch, 10)
  const withoutLeadingZeroes = rfcNumber.toString()
  // if the rfcNumber has leading zeroes this will fail
  if (withoutLeadingZeroes !== rfcNumberMatch) {
    sendRedirect(event, refsRefTxtPathBuilder(rfcId), 301)
    return
  }

  const redApi = getRedClient()

  const rfc = await docRetrieve(redApi, rfcNumber)

  if (!rfc) {
    throw createError({
      statusCode: 404,
      message: 'not found',
      fatal: true
    })
  }

  setResponseHeaders(event, {
    'Content-Type': 'text/plain; charset=utf-8'
  })

  return refsRefRfcIdTxt(rfc)
})
