import { Fragment, h, type VNode } from 'vue'

// Document titles are rendered outside the precomputed RFC body, so they receive none of its
// inserted breaks, and browsers treat few characters besides the hyphen as line-break
// opportunities. RFC 10042's title, "Post-Quantum/Traditional Hybrid Key Exchange ...", wrapped as
// "Post-Quantum/Trad" under the CSS fallback. Titles are short prose, so this stays far simpler than
// the precomputer's rules: a break opportunity after each separator that joins two non-empty parts.
// A <wbr> is only taken when the title would otherwise not fit, so a generous set costs nothing.
const TITLE_BREAK_SEPARATORS = /([/\\_:.+=&])/

export const titleWithWordBreaks = (title: string): VNode => {
  // A capturing group keeps the separators in the split, at every odd index.
  const pieces = title.split(TITLE_BREAK_SEPARATORS)
  const children = pieces.flatMap((piece, index): (string | VNode)[] => {
    const isSeparator = index % 2 === 1
    if (!isSeparator) {
      return [piece]
    }
    const previous = pieces[index - 1] ?? ''
    const next = pieces[index + 1] ?? ''
    const canBreak = previous.length > 0 && next.length > 0
    return canBreak ? [piece, h('wbr')] : [piece]
  })
  return h(Fragment, children)
}
