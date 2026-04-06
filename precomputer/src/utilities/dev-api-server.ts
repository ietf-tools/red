import Fastify from 'fastify'
import path from 'path'
import fsPromises from 'fs/promises'
import { NUMBER_OF_LATEST_RFCS_ON_HOMEPAGE, renderHomepageLatest } from '../tasks/homepage-latest.ts'
import { renderRfcMiniIndexJson } from '../tasks/rfc-mini-index-json.ts'
import { getRfcBucketHtmlDocument, getRfcMetaThumbnail } from '../tasks/rfc.ts'
import { getAllRFCs, getAllSubseries, getApiClient, getRfcCommonCached, parseSubseriesName } from './api.ts'
import { renderAllSubseries } from '../tasks/info-subseries.ts'
import { getFromS3 } from './s3.ts'
import { fetchRfcPDF } from '../tasks/rfc-pdf.ts'
import { getMetaThumbnail, metaThumbnailSlugToDimensions } from './meta-thumbnails.ts'
import { getFavIconImage } from './favicons.ts'

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

fastify.get('/api/v1/meta-thumbnail/:slug.png', async (request, reply) => {
  console.log("meta thubm request")
  if (request.params && typeof request.params === 'object' && 'slug' in request.params && typeof request.params.slug === 'string') {
    const { slug } = request.params
    console.log('get slug', slug)

    if (slug.match(/rfc\d+/)) {
      const RFC_PREFIX = 'rfc'
      const rfcFloaty = parseFloat(String(slug.substring(RFC_PREFIX.length)))
      const maybePngBuffer = await getRfcMetaThumbnail({
        rfcNumber: rfcFloaty,
        getRfcCommon: getRfcCommonCached,
        getRfcHtml: mockLocalGetRfcHtml,
        fetchRfcPDF: mockLocalFetchPDF,
      })
      if (maybePngBuffer) {
        reply.code(200).headers({ 'content-type': 'image/png' }).send(maybePngBuffer)
      }
    } else {
      console.log("found slug")
      const verifiedDimensions = metaThumbnailSlugToDimensions(`${slug}.png`)
      if (verifiedDimensions) {
        console.log('verifiedDimensions', verifiedDimensions)
        const maybePng = await getMetaThumbnail(verifiedDimensions[0], verifiedDimensions[1])
        console.log("maybpng", maybePng)
        if (maybePng) {
          reply.code(200).headers({ 'content-type': 'image/png' }).send(maybePng.pngBuffer)
        }
      }
    }

    reply
      .code(404)
      .type('text/plain')
      .send(`404: ${slug}.png`)
  } else {
    console.log('bad params?', request.params)
    throw Error(`bad param? ${JSON.stringify(request.params)}`)
  }
})

fastify.get('/api/v1/favicon/:slug.png', async (request, reply) => {
  if (request.params && typeof request.params === 'object' && 'slug' in request.params && typeof request.params.slug === 'string') {
    const { slug } = request.params

    const parts = slug.match(/(\d+)x(\d+)/)
    if (parts) {
      const widthPx = parseInt(parts[1], 10)
      const heightPx = parseInt(parts[2], 10)
      const maybePngBuffer = await getFavIconImage(widthPx, heightPx)
      if (maybePngBuffer) {
        reply.code(200).headers({ 'content-type': 'image/png' }).send(maybePngBuffer)
      }
    }

    reply
      .code(404)
      .type('text/plain')
      .send(`404: ${slug}.png`)
  } else {
    console.log('bad params?', request.params)
    throw Error(`bad param? ${JSON.stringify(request.params)}`)
  }
})

fastify.get('/api/v1/info-subseries/:subseriesName.json', async (request, reply) => {
  if (request.params && typeof request.params === 'object' && 'subseriesName' in request.params && typeof request.params.subseriesName === 'string') {
    const subseriesQueryName = parseSubseriesName(request.params.subseriesName)
    const api = getApiClient()
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

const mockLocalBucket: typeof getFromS3 = async (bucket, key, outputType) => {
  const mockLocalBucketDirName = 'mockLocalBucket'
  const localPath = path.join(import.meta.dirname, mockLocalBucketDirName, bucket, key)
  try {
    console.log("Reading mock bucket", bucket, key, outputType)
    const data = fsPromises.readFile(localPath, outputType === 'base64' ? 'base64' : 'utf-8')
    return data
  } catch (e: unknown) {
    // Probably just a missing file, so suppress the error
    console.error('Problem reading ', localPath, e)
  }
  return null
}

const mockLocalGetRfcHtml: typeof getFromS3 = async (bucket, key, outputType) => mockLocalBucket(bucket, key, outputType)

const mockLocalFetchPDF: typeof fetchRfcPDF = async (rfcNumber: number) => {
  const result = await mockLocalBucket('S3_RFC_BUCKET', `pdf/${rfcNumber}.pdf`, 'base64')
  return result === null ? null : result.toString()
}

fastify.listen({
  port: 3010, host: '0.0.0.0' // 0.0.0.0 needed to work in Docker 
}, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  console.log(`Server is now listening on ${address}`)
})