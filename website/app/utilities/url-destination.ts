/**
 * Where a link goes, for deciding how it is presented. https://github.com/ietf-tools/red/issues/369
 *
 * Sites in the IETF community's group open in the same tab and carry no new-window icon. Anything else
 * opens in a new tab and has the icon.
 */

import { EXTERNAL_LINK_REL } from './html'

// Matched as the domain itself or any subdomain of it.
export const GROUP_DOMAINS = ['ietf.org', 'irtf.org', 'iab.org', 'rfc-editor.org'] as const

export type UrlDestination = 'internal' | 'group' | 'outside'

const HTTP_URL_REGEX = /^https?:\/\//i

const isGroupHost = (hostname: string) =>
  GROUP_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))

export const urlDestination = (href: string): UrlDestination => {
  // Paths, hashes, `mailto:` and `tel:` stay on the site or hand over to the browser rather than opening a site
  if (!HTTP_URL_REGEX.test(href)) {
    return 'internal'
  }
  try {
    // The URL parser, not the text, decides the host: `https://ietf.org@example.com/` is a link to example.com
    const { hostname } = new URL(href)
    return isGroupHost(hostname) ? 'group' : 'outside'
  } catch {
    return 'outside'
  }
}

/**
 * The `rel` for a link to `href`. Every link off the site, whether or not it opens a new tab, is kept from
 * controlling this one, which is unrelated to the icon.
 */
export const linkRel = (href: string): typeof EXTERNAL_LINK_REL | undefined =>
  urlDestination(href) === 'internal' ? undefined : EXTERNAL_LINK_REL
