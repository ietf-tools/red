import { Readable, PassThrough } from 'node:stream'
import path from 'node:path'
import fsPromises from 'node:fs/promises'
import { WriteStream } from 'node:fs'
import {
  SitemapAndIndexStream,
  SitemapStream,
  streamToPromise,
  type SitemapItemLoose,
  EnumChangefreq
} from 'sitemap'
import { type RfcCommon, type SubseriesCommon } from '../../../website/app/utilities/rfc-validators.ts'
import { ROBOTS_TXT_PATH, saveToS3, siteMapXmlPathPrefixBuilder } from './s3.ts'
import { infoRfcPathBuilder, rfcFormatPathBuilder, siteMapXmlPathBuilder, subseriesPathBuilder } from './url.ts'

export const uploadRobotsTxtEtc = async (websiteOrigin: string, allRfcs: Readonly<RfcCommon[]>, allSubseries: Readonly<SubseriesCommon[]>): Promise<boolean> => {
  const robotsTxt = await getRobotsTxt(websiteOrigin)
  await saveToS3(ROBOTS_TXT_PATH, robotsTxt)
  const siteMapXmls = await getSiteMapXmls(websiteOrigin, allRfcs, allSubseries)
  await Promise.all(siteMapXmls.map(([filename, xmlString]) => {
    const s3Key = siteMapXmlPathPrefixBuilder(filename)
    console.log('Uploading ', s3Key)
    saveToS3(s3Key, xmlString)
  }))
  return true
}

const ORIGIN_PLACEHOLDER = '__ORIGIN__'

const ROBOTS_TXT = `
User-agent: *
Disallow: /rfc/authors/
Disallow: /rfc/rerendered/
Disallow: /rfc/v3test/
Sitemap: ${ORIGIN_PLACEHOLDER}${siteMapXmlPathBuilder(0)}
`.trim()

const originPlaceholderRegex = new RegExp(ORIGIN_PLACEHOLDER, 'g')

export const getRobotsTxt = async (websiteOrigin: string) => {
  return ROBOTS_TXT.replace(originPlaceholderRegex, websiteOrigin)
}

const precomputerRoot = path.resolve(import.meta.dirname, '..', '..')
const markdownPathsJsonPath = path.join(precomputerRoot, 'src', 'assets', 'markdown-paths.json')
const markdownPathsJsonPromise = fsPromises.readFile(markdownPathsJsonPath, 'utf-8')

export const getSiteMapXmls = async (websiteOrigin: string, allRfcs: Readonly<RfcCommon[]>, allSubseries: Readonly<SubseriesCommon[]>) => {
  const markdownPathsJson = await markdownPathsJsonPromise
  const markdownPaths = JSON.parse(markdownPathsJson)
  if (!Array.isArray(markdownPaths) || !markdownPaths.every(markdownPath => typeof markdownPath === 'string')) {
    throw Error(`Expected ${markdownPathsJsonPath} to be array of strings`)
  }

  const rfcSitemapItems: SitemapItemLoose[] = [
    {
      url: `${websiteOrigin}/`,
      changefreq: EnumChangefreq.DAILY,
      priority: 0.3
    },
    {
      url: `${websiteOrigin}/search/`,
      changefreq: EnumChangefreq.DAILY,
      priority: 0.3
    },
    ...markdownPaths.map((markdownPath): SitemapItemLoose => {
      return {
        url: `${websiteOrigin}${markdownPath}`,
        changefreq: EnumChangefreq.WEEKLY,
        priority: 0.4
      }
    }),
    ...allRfcs.flatMap((rfc): SitemapItemLoose[] => {
      return [
        {
          url: `${websiteOrigin}${infoRfcPathBuilder(rfc)}`,
          changefreq: EnumChangefreq.WEEKLY,
          priority: 0.3 // note higher priority than /rfc/* route
        },
        ...rfc.formats
          .filter(format => format.format === 'html' || format.format === 'pdf')
          .map((format): SitemapItemLoose => {
            return {
              url: rfcFormatPathBuilder(rfc, format.format),
              changefreq: EnumChangefreq.MONTHLY, // assume that these change less frequently
              priority: 0.2 // note lower priority than /info/ route RFCs
            }
          })
      ]
    }),
    ...allSubseries.flatMap((subseries): SitemapItemLoose[] => {
      return [
        {
          url: `${websiteOrigin}${subseriesPathBuilder(subseries)}`,
          changefreq: EnumChangefreq.MONTHLY,
          
          priority: 0.3
        },
      ]

    })]

  const sitemapFiles: [string, string][] = []
  const pendingPromises: Promise<void>[] = []

  const siteMapStream = new SitemapAndIndexStream({
    limit: 6000, // Googlebot imposes a limit: "Any Sitemap file is limited to 50MB (uncompressed) with a maximum of 50,000 URLs." so we'll just split our index over 2 files. This also helps test sitemap-*.xml routes which otherwise might break and not be noticed
    getSitemapStream: (i) => {
      const sitemapStream = new SitemapStream({ hostname: websiteOrigin })
      const destination = new PassThrough()
      const filename = siteMapXmlPathBuilder(i + 1)
      sitemapStream.pipe(destination)
      const capturePromise = streamToPromise(destination).then(data => {
        sitemapFiles.push([filename, data.toString()])
      })
      pendingPromises.push(capturePromise)

      return [`${websiteOrigin}${filename}`, sitemapStream, destination as unknown as WriteStream]
    }
  })

  const indexPromise = streamToPromise(siteMapStream).then(data => {
    sitemapFiles.push([siteMapXmlPathBuilder(0), data.toString()])
  })

  // 3. Pipe data through the index stream
  Readable.from(rfcSitemapItems).pipe(siteMapStream)

  await Promise.all([indexPromise, ...pendingPromises])

  return sitemapFiles
}