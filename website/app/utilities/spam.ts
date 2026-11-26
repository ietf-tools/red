// A scheme (http:, mailto:, magnet:, ...), a www. host, or a bare host with a letters-only TLD,
// each followed by whatever non-space characters trail it.
const URI_PATTERN = /\b[a-z][a-z0-9+.-]*:[^\s]+|\bwww\.[^\s]+|\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/:?#][^\s]*)?/gi

// Cryptocurrency addresses (Bitcoin, Ethereum's 0x form, bech32, Monero, ...) are all single
// unbroken alphanumeric tokens far longer than any word, so word length is the signal. The
// shortest, legacy Bitcoin, is 26 characters.
const CRYPTO_ADDRESS_PATTERN = /\b[a-z0-9]{26,}\b/gi

// Set titles and descriptions are written by anyone, so this strips what spam in them is made of.
export const filterSpamText = (text: string): string => {
  return text
    .replace(URI_PATTERN, '')
    .replace(CRYPTO_ADDRESS_PATTERN, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
