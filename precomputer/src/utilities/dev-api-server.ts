import Fastify from 'fastify'
import { NUMBER_OF_LATEST_RFCS_ON_HOMEPAGE, renderHomepageLatest } from '../tasks/homepage-latest.ts'
import { renderRfcMiniIndexJson } from '../tasks/rfc-mini-index-json.ts'
import { getRfcBucketHtmlDocument } from '../tasks/rfc.ts'
import { getAllRFCs, getAllSubseries, getApiClient, getRfcCommonCached, parseSubseriesItemName, parseSubseriesName, safeSubseriesList } from './api.ts'
import { renderAllSubseries } from '../tasks/info-subseries.ts'

const fastify = Fastify({
  logger: true
})

fastify.get('/api/v1/homepage-latest.json', async (request, reply) => {
  const api = getApiClient()
  const rfcs = await getAllRFCs({ api, limit: NUMBER_OF_LATEST_RFCS_ON_HOMEPAGE })
  return renderHomepageLatest(rfcs)
})

fastify.get('/api/v1/rfc-mini-index.json', async (request, reply) => {
  const api = getApiClient()
  const rfcs = await getAllRFCs({ api, limit: NUMBER_OF_LATEST_RFCS_ON_HOMEPAGE })
  return renderRfcMiniIndexJson(rfcs)
})

fastify.get('/api/v1/rfc-html/:rfcNumber.json', async (request, reply) => {
  if (request.params && typeof request.params === 'object' && 'rfcNumber' in request.params) {
    const { rfcNumber } = request.params
    const rfcFloaty = parseFloat(String(rfcNumber))
    return getRfcBucketHtmlDocument(rfcFloaty)
  }
  console.log('bad params?', request.params)
  throw Error(`bad param? ${JSON.stringify(request.params)}`)
})

fastify.get('/api/v1/info-subseries/:subseriesName.json', async (request, reply) => {
  if (request.params && typeof request.params === 'object' && 'subseriesName' in request.params && typeof request.params.subseriesName === 'string') {
    const subseriesQueryName = parseSubseriesName(request.params.subseriesName)
    const api = getApiClient()
    // FIXME: this is inefficient, but we can't query by specific subseries just the 'type'
    const frozenAllSubseries = await getAllSubseries({ api, type: subseriesQueryName.type })
    const subseriesCommonList = await renderAllSubseries(frozenAllSubseries)
    const queriedSubseries = subseriesCommonList.find(subseries => subseries.type === subseriesQueryName.type && subseries.number === subseriesQueryName.number)

    if (!queriedSubseries) {
      // frozen subseries can't be sorted, so we need to spread again
      const allSubseries = [...frozenAllSubseries]

      const allSubseriesNames = allSubseries.sort(
        (subseriesA, subseriesB) => {
          const sortType = subseriesA.type.localeCompare(subseriesB.type)
          if (sortType !== 0) {
            return sortType
          }
          return subseriesA.number - subseriesB.number
        })
        .map(subseries => `${subseries.type}${subseries.number}`)

      reply.code(404).send(`Couldn't find subseries: ${subseriesQueryName.type} ${subseriesQueryName.number} from search ${allSubseriesNames.join(',')}`)
      return
    }
    return queriedSubseries
  }
  console.log('bad params?', request.params)
  throw Error(`bad param? ${JSON.stringify(request.params)}`)
})

fastify.get('/api/v1/rfc-common/:rfcNumber.json', async (request, reply) => {
  if (request.params && typeof request.params === 'object' && 'rfcNumber' in request.params && typeof request.params.rfcNumber === 'string') {
    const rfcNumber = parseFloat(request.params.rfcNumber)
    if (Number.isNaN(rfcNumber)) {
      reply.code(500).send(`Couldn't parse param rfc number ${JSON.stringify(request.params.rfcNumber)}`)
      return
    }
    const rfcCommon = await getRfcCommonCached(rfcNumber)
    if (!rfcCommon) {
      reply.code(404).send(`Couldn't find rfc ${JSON.stringify(request.params.rfcNumber)}`)
      return
    }
    return rfcCommon
  }
  return renderHomepageLatest([])
})

fastify.listen({ port: 3001 }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  console.log(`Server is now listening on ${address}`)
})