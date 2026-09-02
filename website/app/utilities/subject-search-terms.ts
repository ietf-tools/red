// How a subject's text and a reader's query are cut into terms, and which of those terms are worth
// matching on. Kept apart from `subject-search-index` because it answers the one question that has
// to be answered before the search machinery is worth fetching at all — whether there is anything
// here to search on — and answering that must not pull MiniSearch into the page.

/**
 * Words too common to narrow anything in a vocabulary this small. They are dropped from both the
 * index and the query, which matters more than usual here because terms are combined with AND: left
 * in, one of these in a query would rule out every subject whose description happens to omit it.
 */
const STOPWORDS = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with'])

const COMBINING_MARKS = /\p{M}+/gu

/** Anything that is neither a letter nor a digit separates one term from the next. */
const TERM_SEPARATORS = /[^\p{L}\p{N}]+/u

/**
 * Decomposes and drops combining marks so that a query typed without diacritics still reaches a
 * subject whose name carries them, which is otherwise unreachable from most keyboards.
 */
export const normalizeTerm = (term: string): string => term.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase()

export const isSearchable = (term: string): boolean => term.length > 0 && !STOPWORDS.has(term)

/**
 * Whether a query asks for anything. False for an empty box, for whitespace and punctuation, and
 * for a query of nothing but stopwords, each of which leaves no term to match on and so describes
 * an unfiltered page rather than an empty one.
 */
export const hasSearchableTerms = (query: string): boolean =>
  query.split(TERM_SEPARATORS).map(normalizeTerm).some(isSearchable)
