import Fastify from 'fastify'
import { renderHomepageLatest } from '../tasks/homepage-latest.ts'
import { renderRfcMiniIndexJson } from '../tasks/rfc-mini-index-json.ts'

const fastify = Fastify({
  logger: true
})

fastify.get('/api/v1/homepage-latest.json', async (request, reply) => {
  return renderHomepageLatest([])
})

fastify.get('/api/v1/rfc-mini-index.json', async (request, reply) => {
  return renderRfcMiniIndexJson([])
})

fastify.get('/api/v1/rfc-html/**', async (request, reply) => {
  return getRfcBucketHtmlDocument(request.params.somehow)
})

fastify.get('/api/v1/rfc/**', async (request, reply) => {
  return renderHomepageLatest([])
})

fastify.get('/api/v1/info-subseries/**', async (request, reply) => {
  return renderHomepageLatest([])
})

fastify.get('/api/v1/rfc-common/**', async (request, reply) => {
  return renderHomepageLatest([])
})

fastify.listen({ port: 3001 }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  console.log(`Server is now listening on ${address}`)
})