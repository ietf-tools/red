const RFC_REGEX = /(rfc[0-9]+)/i

export const extractHrefRfcPart = (href: string): undefined | string => {
  const rfcMatch = href.match(RFC_REGEX)
  if (!rfcMatch) return undefined
  return rfcMatch[1]
}