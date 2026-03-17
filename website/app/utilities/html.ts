/**
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#target
 */
export const TARGET_NEW_WINDOW = '_blank'

/**
 * The `noopener` prevents linked sites (theirs) having control over originating sites (ours)
 * via JavaScript https://mathiasbynens.github.io/rel-noopener/
 *
 * there's another commonly used property `noreferrer` which we've intentionally excluded from this string.
 * referrers are ok.
 **/
export const EXTERNAL_LINK_REL = 'noopener'

export type HeadingLevel = '1' | '2' | '3' | '4' | '5' | '6'

export const parseHeadingLevel = (headingLevel: string): HeadingLevel => {
  switch (headingLevel) {
    case '1':
      return '1'
    case '2':
      return '2'
    case '3':
      return '3'
    case '4':
      return '4'
    case '5':
      return '5'
    case '6':
      return '6'
  }
  throw Error(`Unable to parse heading level "${headingLevel}"`)
}

export const preformattedTextToHtml = (
  preText: string
): ReturnType<typeof h> => {
  return h(
    'span',
    { class: 'font-mono' },
    preText.split('\n').flatMap((line) => {
      return [line, h('br')]
    })
  )
}
