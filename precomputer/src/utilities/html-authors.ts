import { isTextNode } from './dom.ts'
import { type RfcCommon } from '../../../website/app/utilities/rfc-validators.ts'

type ScrapedAuthor = {
  name: string
  org: string | null
}

/**
 * The datatracker has no record of an author's affiliation at the time of publishing, so it's
 * read from the xml2rfc HTML header instead.
 *
 * Returns undefined when the header isn't there, which is the case for plaintext RFCs.
 */
export const scrapeAuthors = (dom: Document): ScrapedAuthor[] | undefined => {
  const authors = dom.querySelectorAll('dl#identifiers dd.authors > .author')
  if (authors.length === 0) {
    return undefined
  }

  return Array.from(authors).map((author) => {
    const { textContent: org } = author.querySelector('.org') ?? {}
    const nameNodes = Array.from(author.querySelector('.author-name')?.childNodes ?? [])

    return {
      name: nameNodes
        .filter(isTextNode)
        .map(({ data }) => data)
        .join('')
        .trim(),
      // an author without an org is a real answer, unlike a header that couldn't be read
      org: org?.trim() || null
    }
  })
}

/**
 * Returns the RFC with each author's affiliation replaced by the one scraped from the header.
 * An author scraped as having no org ends up without an affiliation, overriding the datatracker's
 * value, whereas an unreadable header leaves the datatracker values alone.
 *
 * Authors are matched by position. Initials differ between the header and the datatracker
 * (JC. versus J.), so only the surname is compared, as a guard against the two lists
 * being out of step. If anything doesn't line up the datatracker values are kept untouched.
 */
export const applyScrapedAffiliations = (rfc: RfcCommon, dom: Document): RfcCommon => {
  const scraped = scrapeAuthors(dom)
  if (scraped === undefined) {
    return rfc
  }

  const { number, authors } = rfc

  const surname = (name: string): string => {
    const [last = ''] = name
      .normalize('NFC')
      .replace(/,?\s*Ed\.?$/, '')
      .replace(/,\s*$/, '')
      .trim()
      .split(/\s+/)
      .reverse()
    return last.toLocaleLowerCase()
  }

  if (scraped.length !== authors.length) {
    console.warn(
      `RFC ${number}: header has ${scraped.length} authors but the datatracker has ${authors.length}, keeping datatracker affiliations`
    )
    return rfc
  }

  const mismatch = authors.findIndex(({ titlepage_name }, index) => {
    const { name } = scraped[index]!
    return titlepage_name !== undefined && surname(titlepage_name) !== surname(name)
  })
  if (mismatch !== -1) {
    console.warn(
      `RFC ${number}: author ${mismatch + 1} header name ${JSON.stringify(scraped[mismatch]!.name)} doesn't match datatracker name ${JSON.stringify(authors[mismatch]!.titlepage_name)}, keeping datatracker affiliations`
    )
    return rfc
  }

  return {
    ...rfc,
    authors: authors.map((author, index) => ({ ...author, affiliation: scraped[index]!.org ?? undefined }))
  }
}
