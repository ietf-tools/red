import type { RfcCommon, SubseriesCommon } from '../../../website/app/utilities/rfc-validators.ts'

// Origin per https://developer.mozilla.org/en-US/docs/Glossary/Origin
export const PUBLIC_SITE_URL_ORIGIN = 'https://www.rfc-editor.org'
export const STAGING_SITE_URL_ORIGIN = 'https://www.staging.rfc-editor.org'
export const apiRfcBucketDocumentURLBuilder = (fileName: string) => {
  // Intentionally not a relative url, the PUBLIC_SITE prefix is because this URL is served
  // from a bucket on prod; it's not something that a localhost Nuxt can serve.
  // The CORS headers of the prod URL should allow access from localhost:3000 as well as staging,
  // etc. sites.
  return `${PUBLIC_SITE_URL_ORIGIN}/api/v1/rfc-html/${fileName}` as const
}

export const infoRfcPathBuilder = (rfc: RfcCommon) => {
  return `/info/rfc${rfc.number}/` as const
}

type RfcCommonFormat = RfcCommon["formats"][number]["format"]

export const rfcFormatPathBuilder = (rfc: RfcCommon, format: RfcCommonFormat) => {
  if (format === 'notprepped') {
    return `/rfc/rfc${rfc.number}.${format}.xml` as const
  }
  return `/rfc/rfc${rfc.number}.${format}` as const
}

export const subseriesPathBuilder = (subseries: SubseriesCommon) => {
  return `/info/${subseries.type}${subseries.number}/` as const
}

export const safeURLParse = (url: string): URL | null => {
  try {
    return new URL(url)
  } catch (e) {
    console.error("Can't parse URL", e)
    return null
  }
}

export const siteMapXmlPathBuilder = (index: number) => {
  if (index === 0) {
    return `/sitemap.xml` as const
  }
  return `/sitemap-${index}.xml` as const
}