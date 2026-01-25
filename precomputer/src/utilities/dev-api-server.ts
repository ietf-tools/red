import Fastify from 'fastify'
import { NUMBER_OF_LATEST_RFCS_ON_HOMEPAGE, renderHomepageLatest } from '../tasks/homepage-latest.ts'
import { renderRfcMiniIndexJson } from '../tasks/rfc-mini-index-json.ts'
import { getRfcBucketHtmlDocument } from '../tasks/rfc.ts'
import { getAllRFCs, getApiClient } from './api.ts'

const fastify = Fastify({
  logger: true
})

fastify.get('/api/v1/homepage-latest.json', async (request, reply) => {
  const api = getApiClient()
  const rfcs = await getAllRFCs({ api, limit: NUMBER_OF_LATEST_RFCS_ON_HOMEPAGE })
  return renderHomepageLatest(rfcs)
})

fastify.get('/api/v1/rfc-mini-index.json', async (request, reply) => {
  return renderRfcMiniIndexJson([])
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

fastify.get('/api/v1/rfc/*', async (request, reply) => {
  return renderHomepageLatest([])
})

fastify.get('/api/v1/info-subseries/*', async (request, reply) => {
  return renderHomepageLatest([])
})

fastify.get('/api/v1/rfc-common/*', async (request, reply) => {
  return renderHomepageLatest([])
})

fastify.listen({ port: 3001 }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  console.log(`Server is now listening on ${address}`)
})