import { ROBOTS_TXT_PATH, saveToS3 } from './s3.ts'
import { siteMapXmlPathBuilder } from './url.ts'

export const uploadRobotsTxt = async (websiteOrigin: string): Promise<boolean> => {
  const robotsTxt = await getRobotsTxt(websiteOrigin)
  await saveToS3(ROBOTS_TXT_PATH, robotsTxt)
  return true
}

// placeholder string that shouldn't collide with actual data
const ORIGIN_PLACEHOLDER = '__ORIGIN__'

const ROBOTS_TXT_TEMPLATE = [
  'User-agent: *',
  'Disallow: /rfc/authors/',
  'Disallow: /rfc/rerendered/',
  'Disallow: /rfc/v3test/',
  `Sitemap: ${ORIGIN_PLACEHOLDER}${siteMapXmlPathBuilder(0)}`]
  .join('\n')

const originPlaceholderRegex = new RegExp(ORIGIN_PLACEHOLDER, 'g')

export const getRobotsTxt = async (websiteOrigin: string) => {
  return ROBOTS_TXT_TEMPLATE.replace(originPlaceholderRegex, websiteOrigin)
}