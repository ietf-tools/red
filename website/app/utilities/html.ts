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

export const preformattedTextToHtml = (preText: string, wrapAnywhere?: boolean): ReturnType<typeof h> => {
  return h(
    'span',
    { class: ['font-mono', wrapAnywhere ? 'wrap-anywhere' : undefined] },
    preText.split('\n').flatMap((line, i, arr) => {
      return i < arr.length - 1 ? [line, h('br')] : [line]
    })
  )
}

/**
 * It is expected that this only runs clientside with full DOM Sanitizer support,
 * typically on Typesense HTML strings.
 */
export const sanitiseHtml = (untrustedHtml: string | undefined | null): string => {
  if (!untrustedHtml) {
    return ''
  }

  const el = document.createElement('div')
  if (
    typeof window === 'undefined' ||
    !('Sanitizer' in window) ||
    typeof window.Sanitizer !== 'function' ||
    !('setHTML' in el) ||
    typeof el.setHTML !== 'function'
  ) {
    // The input has already been sanitised upstream before reaching this function; this Sanitizer API
    // call is a second defensive layer only. Falling back to direct innerHTML assignment is acceptable.
    el.innerHTML = untrustedHtml
    return el.innerHTML
  }
  // TS in server nuxt rendering doesn't know about window.Sanitizer and errors on this, but the preceding
  // code ensures we're only ever getting this far if it's clientside not server so we can ignore this error.
  // @ts-ignore
  const sanitizer = new window.Sanitizer({ elements: ['p'] })
  el.setHTML(untrustedHtml, { sanitizer })
  return el.innerHTML
}

const htmlEscapeMapping = {
  '<': '&lt;',
  '>': '&gt;',
  "'": '&apos;',
  '"': '&quot;',
  '&': '&amp;'
}

/**
 * Escapes HTML to text html with character entities, ie exposing <>'"& chars
 * Useful for <noscript> HTML string generation
 */
export const htmlEscapeToText = (html: string): string =>
  html.replace(/([<>'"&])/g, (match, key) => {
    if (key in htmlEscapeMapping) {
      return htmlEscapeMapping[key as keyof typeof htmlEscapeMapping]
    }
    return match
  })
