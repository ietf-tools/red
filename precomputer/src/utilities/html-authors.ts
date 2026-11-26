import { isTextNode } from './dom.ts'
import { type RfcCommon } from '../../../website/app/utilities/rfc-validators.ts'

/**
 * The datatracker has no record of an author's affiliation at the time of publishing, so it's
 * read from the xml2rfc HTML header instead.
 *
 * Returns undefined when the header isn't there, which is the case for plaintext RFCs.
 */
export const scrapeAuthors = (dom: Document): (string | null)[] | undefined => {
  const authors = dom.querySelectorAll('dl#identifiers dd.authors > .author')
  if (authors.length === 0) {
    return undefined
  }

  // Names and orgs written in a non-Latin script are followed by a Latin rendering of the same
  // text in an ascii span, which is what the datatracker holds.
  const textOf = (element: Element | null): string => {
    if (element === null) {
      return ''
    }
    const ascii = element.querySelector('.ascii')
    if (ascii) {
      return ascii.textContent?.trim() ?? ''
    }
    return Array.from(element.childNodes)
      .filter(isTextNode)
      .map(({ data }) => data)
      .join('')
      .trim()
  }

  // an author without an org is a real answer, unlike a header that couldn't be read
  return Array.from(authors).map((author) => textOf(author.querySelector('.org')) || null)
}

/**
 * Returns the RFC with each author's affiliation replaced by the one scraped from the header.
 * An author scraped as having no org ends up without an affiliation, overriding the datatracker's
 * value, whereas an unreadable header leaves the datatracker values alone.
 *
 * Authors are matched by position, which holds because both lists follow the title page. Names
 * aren't compared since the header and the datatracker spell them differently too often (initials,
 * diacritics, transliterations). If the author counts differ the datatracker values are kept untouched.
 */
export const applyScrapedAffiliations = (rfc: RfcCommon, dom: Document): RfcCommon => {
  const scraped = scrapeAuthors(dom)
  if (scraped === undefined) {
    return rfc
  }

  const { number, authors } = rfc

  if (scraped.length !== authors.length) {
    console.warn(
      `RFC ${number}: header has ${scraped.length} authors but the datatracker has ${authors.length}, keeping datatracker affiliations`
    )
    return rfc
  }

  return {
    ...rfc,
    authors: authors.map((author, index) => ({ ...author, affiliation: scraped[index] ?? undefined }))
  }
}
