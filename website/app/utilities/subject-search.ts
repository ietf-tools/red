// Client-side filtering of the subject vocabulary. The whole vocabulary arrives in one Reef answer,
// so filtering it needs no request and nothing from the search backend: none of this is shared
// with /search/.
import type { Subject } from './reef'

const COMBINING_MARKS = /\p{M}+/gu

// Anything that is neither a letter nor a digit separates one term from the next.
const TERM_SEPARATORS = /[^\p{L}\p{N}]+/u

// Folds diacritics so that a query typed without them still reaches a subject whose name carries
// them, which is otherwise unreachable from most keyboards.
const normalise = (text: string): string => text.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase()

const termsIn = (text: string): string[] =>
  normalise(text)
    .split(TERM_SEPARATORS)
    .filter((term) => term.length > 0)

/**
 * The subjects matching every term in `query`, in the order they were given. A query with no terms
 * in it — empty, whitespace, punctuation — describes an unfiltered page rather than an empty one.
 */
export const filterSubjects = (subjects: Subject[], query: string): Subject[] => {
  const terms = termsIn(query)
  if (terms.length === 0) {
    return subjects
  }

  return subjects.filter(({ name, description }) => {
    const text = normalise(`${name} ${description}`)
    return terms.every((term) => text.includes(term))
  })
}
