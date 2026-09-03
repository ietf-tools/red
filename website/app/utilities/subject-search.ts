// Client-side filtering of the subject vocabulary. The whole vocabulary arrives in one Reef answer,
// so filtering it needs no request and nothing from the search backend: none of this is shared
// with /search/.
//
// Matching records where it matched, not only that it did. A filtered page draws the subjects above
// a match as well as the match itself, so without the positions there is nothing on the page saying
// which row the reader's words actually reached.
import type { Subject } from './reef'

const COMBINING_MARKS = /\p{M}+/gu

// Anything that is neither a letter nor a digit separates one term from the next.
const TERM_SEPARATORS = /[^\p{L}\p{N}]+/u

/** A half-open `[start, end)` slice of a string, in that string's own code units. */
export type TextRange = {
  start: number
  end: number
}

export type SubjectMatch = {
  subject: Subject
  /** Where the query's terms fall in `subject.name`. Empty when the name was not what matched. */
  nameRanges: TextRange[]
  descriptionRanges: TextRange[]
}

/**
 * `text` with its diacritics folded away and its case dropped, alongside the index in `text` that
 * each character of the result came from.
 *
 * Folded one source code point at a time rather than over the whole string, because every step of
 * this changes length — `naïve` loses a combining mark, `ß` gains a letter when it is lowercased —
 * and a range found in the folded text has to be reported against the original. Folding per code
 * point keeps the two in step by construction, and is what lets a match on `naive` mark the right
 * five characters of `naïve` rather than sliding off the end of the word.
 */
const fold = (text: string): { folded: string; sourceIndices: number[] } => {
  let folded = ''
  const sourceIndices: number[] = []

  let sourceIndex = 0
  for (const codePoint of text) {
    const foldedCodePoint = codePoint.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase()
    for (const character of foldedCodePoint) {
      folded += character
      // Every character a code point folds to points back at where that code point started, so a
      // range covering any of them covers the whole of the original character.
      sourceIndices.push(sourceIndex)
    }
    sourceIndex += codePoint.length
  }

  // One past the end, so a range ending at the end of the folded text has somewhere to point.
  sourceIndices.push(text.length)

  return { folded, sourceIndices }
}

/**
 * Folds diacritics so that a query typed without them still reaches a subject whose name carries
 * them, which is otherwise unreachable from most keyboards.
 */
const normalise = (text: string): string => fold(text).folded

const termsIn = (text: string): string[] =>
  normalise(text)
    .split(TERM_SEPARATORS)
    .filter((term) => term.length > 0)

/**
 * Every place a term falls in `text`, merged where they meet.
 *
 * Ranges are merged because terms overlap: `rout` and `outing` both land on `Routing`, and drawn
 * separately they would nest one highlight inside another. Every occurrence is reported rather than
 * only the first, since a reader looking for their word wants all of them shown.
 */
export const rangesOf = (text: string, terms: string[]): TextRange[] => {
  const { folded, sourceIndices } = fold(text)

  const found: TextRange[] = []
  for (const rawTerm of terms) {
    // Folded here rather than assumed to have been: `naïve` typed with its accents has to reach the
    // same folded text everything else is matched against, and folding an already-folded term
    // changes nothing.
    const term = normalise(rawTerm)
    if (term.length === 0) continue

    let from = folded.indexOf(term)
    while (from !== -1) {
      found.push({ start: sourceIndices[from] ?? 0, end: sourceIndices[from + term.length] ?? text.length })
      from = folded.indexOf(term, from + 1)
    }
  }

  return merged(found)
}

const merged = (ranges: TextRange[]): TextRange[] => {
  const inOrder = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end)

  return inOrder.reduce<TextRange[]>((keeping, range) => {
    const previous = keeping.at(-1)
    // Touching counts as overlapping: two highlights that meet are one highlight, and drawing them
    // as two puts a seam through a word.
    if (previous !== undefined && range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end)
      return keeping
    }
    return [...keeping, { ...range }]
  }, [])
}

/**
 * The subjects matching every term in `query`, in the order they were given, each with the places
 * its terms were found. A query with no terms in it — empty, whitespace, punctuation — describes an
 * unfiltered page rather than an empty one, and matches everything with nothing marked.
 */
export const matchSubjects = (subjects: Subject[], query: string): SubjectMatch[] => {
  const terms = termsIn(query)
  if (terms.length === 0) {
    return subjects.map((subject) => ({ subject, nameRanges: [], descriptionRanges: [] }))
  }

  return subjects.reduce<SubjectMatch[]>((matches, subject) => {
    const { name, description } = subject
    const text = normalise(`${name} ${description}`)
    if (!terms.every((term) => text.includes(term))) {
      return matches
    }

    // Marked per field rather than against the joined text, because the join is only a way of
    // asking whether the subject matched at all: a term spanning the gap between the name and the
    // description matches neither of them, and has nowhere to be drawn.
    return [...matches, { subject, nameRanges: rangesOf(name, terms), descriptionRanges: rangesOf(description, terms) }]
  }, [])
}

/**
 * The subjects matching every term in `query`, in the order they were given. The same question
 * matchSubjects answers, for callers that only need to know which subjects are left.
 */
export const filterSubjects = (subjects: Subject[], query: string): Subject[] =>
  matchSubjects(subjects, query).map(({ subject }) => subject)

export type TextSegment = {
  text: string
  isMatch: boolean
}

/**
 * `text` cut into the runs a renderer draws: the matched ones and the plain ones between them.
 *
 * Segments rather than markup, because these ranges come from what the reader typed. Handing a
 * template a list to loop over is what keeps a query out of anything that could be parsed as HTML.
 */
export const segmentsOf = (text: string, ranges: TextRange[]): TextSegment[] => {
  const segments: TextSegment[] = []

  let plainFrom = 0
  for (const { start, end } of ranges) {
    if (start > plainFrom) {
      segments.push({ text: text.slice(plainFrom, start), isMatch: false })
    }
    segments.push({ text: text.slice(start, end), isMatch: true })
    plainFrom = end
  }

  if (plainFrom < text.length) {
    segments.push({ text: text.slice(plainFrom), isMatch: false })
  }

  return segments
}
