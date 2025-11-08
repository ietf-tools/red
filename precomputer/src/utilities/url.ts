import type { RfcCommon } from '../../../website/app/utilities/rfc-validators.ts'

// Origin per https://developer.mozilla.org/en-US/docs/Glossary/Origin
export const PUBLIC_SITE_URL_ORIGIN = 'https://www.rfc-editor.org'

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

export const safeURLParse = (url: string): URL | null => {
  try {
    return new URL(url)
  } catch (e) {
    console.error("Can't parse URL", e)
    return null
  }
}
