import { Readable, PassThrough } from 'node:stream'
import { WriteStream } from 'node:fs'
import {
  SitemapAndIndexStream,
  SitemapStream,
  streamToPromise,
  SitemapItemLoose,
  EnumChangefreq
} from 'sitemap'
import { RfcCommon } from '../../../website/app/utilities/rfc-validators.ts'
import { ROBOTS_TXT_PATH, saveToS3, siteMapXmlPathBuilder } from './s3.ts'
import { infoRfcPathBuilder, rfcFormatPathBuilder } from './url.ts'


export const uploadRobotsTxtEtc = async (websiteOrigin: string, allRfcs: Readonly<RfcCommon[]>): Promise<boolean> => {
  const robotsTxt = await getRobotsTxt(websiteOrigin)
  await saveToS3(ROBOTS_TXT_PATH, robotsTxt)
  const siteMapXmls = await getSiteMapXmls(websiteOrigin, allRfcs)
  await Promise.all(siteMapXmls.map(([filename, xmlString]) => 
    saveToS3(filename, xmlString)
  ))
  return true
}

const ORIGIN_PLACEHOLDER = '__ORIGIN__'

const ROBOTS_TXT = `
User-agent: *
Disallow: /rfc/authors/
Disallow: /rfc/rerendered/
Disallow: /rfc/v3test/
Sitemap: ${ORIGIN_PLACEHOLDER}/siteindex.xml
`.trim()

const originPlaceholderRegex = new RegExp(ORIGIN_PLACEHOLDER, 'g')

export const getRobotsTxt = async (websiteOrigin: string) => {
  return ROBOTS_TXT.replace(originPlaceholderRegex, websiteOrigin)
}

export const getSiteMapXmls = async (websiteOrigin: string, allRfcs: Readonly<RfcCommon[]>) => {

  const rfcSitemapItems: SitemapItemLoose[] = allRfcs.flatMap((rfc): SitemapItemLoose[] => {
    return [
      {
        url: infoRfcPathBuilder(rfc),
        changefreq: EnumChangefreq.WEEKLY,
        priority: 0.3 // note higher priority than rfc/* route
      },
      ...rfc.formats
        .filter(format => format.format === 'html' || format.format === 'pdf')
        .map((format): SitemapItemLoose => {
          return {
            url: rfcFormatPathBuilder(rfc, format.format),
            changefreq: EnumChangefreq.MONTHLY, // assume that these change less frequently
            priority: 0.1 // note lower priority than info route
          }
        })
    ]
  })

  const sitemapFiles: [string, string][] = []
  const pendingPromises: Promise<void>[] = []
  
  const sms = new SitemapAndIndexStream({
    limit: 50000, // Google's limit per sitemap file
    getSitemapStream: (i) => {
      const sitemapStream = new SitemapStream({ hostname: websiteOrigin })
      const destination = new PassThrough() // In-memory "write" stream
      const filename = siteMapXmlPathBuilder(i)

      // Pipe the sitemap content into our pass-through
      sitemapStream.pipe(destination)

      const capturePromise = streamToPromise(destination).then(data => {
        sitemapFiles.push([filename, data.toString()])
      })
      pendingPromises.push(capturePromise)

      return [`${websiteOrigin}/${filename}`, sitemapStream, destination as unknown as WriteStream]
    }
  })

  // 2. Process the index stream content into memory
  const indexPromise = streamToPromise(sms).then(data => {
    sitemapFiles.push([siteMapXmlPathBuilder(0), data.toString()])
  })

  // 3. Pipe data through the index stream
  Readable.from(rfcSitemapItems).pipe(sms)

  // Wait for the index and all sub-sitemaps to finish
  await Promise.all([indexPromise, ...pendingPromises])

  return sitemapFiles



}