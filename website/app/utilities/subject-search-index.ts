// The search machinery itself, and the only module that imports it. Reached exclusively through the
// dynamic import in `subject-search`, which is what keeps MiniSearch and the stemmer — some 20kB
// gzipped between them — out of the page for every visit where nobody filters anything.
import MiniSearch from 'minisearch'
import { stemmer } from 'stemmer'
import type { Subject } from './reef'
import { hasSearchableTerms, isSearchable, normalizeTerm } from './subject-search-terms'

/**
 * The fields the index reads, each with the weight a hit in it carries: a subject whose name
 * matches is what the reader was looking for, one whose description mentions the word may not be.
 *
 * Keyed off `Subject` so that a field Reef renames or withdraws is a type error here rather than a
 * filter that quietly stops matching on it, and so that indexing a newly published text field is
 * one entry rather than a change to anything below.
 */
export const SUBJECT_SEARCH_FIELD_BOOSTS = {
  name: 4,
  description: 1
} satisfies Partial<Record<keyof Subject, number>>

const SUBJECT_SEARCH_FIELDS = Object.keys(SUBJECT_SEARCH_FIELD_BOOSTS)

/**
 * Indexes each term twice, under the word as written and under its stem.
 *
 * Storing both is what lets stemming and as-you-type prefix matching coexist. A query is stemmed
 * before it is looked up (see `queryTerm`), so a fully typed word finds every inflection of itself
 * through the shared stem. A half-typed word, though, stems to something no stem in the index
 * starts with — a stem is shorter than the word it came from — so it has to reach the word itself,
 * and that only works if the word as written is in the index too.
 */
const indexTerm = (term: string): string[] | null => {
  const normalized = normalizeTerm(term)
  if (!isSearchable(normalized)) return null
  const stemmed = stemmer(normalized)
  return stemmed === normalized ? [normalized] : [normalized, stemmed]
}

/**
 * Deliberately one term rather than the pair `indexTerm` stores: MiniSearch flattens several terms
 * out of one query word into independent terms and combines them with `combineWith`, so under AND a
 * pair would demand that both the word and its stem match and no inflection would ever qualify.
 * The stem is the half worth keeping, since the index holds a stem for every word it has seen.
 */
const queryTerm = (term: string): string | null => {
  const normalized = normalizeTerm(term)
  return isSearchable(normalized) ? stemmer(normalized) : null
}

/**
 * Only the term the reader is still typing is prefix-matched. Earlier terms are treated as complete
 * words, so a query narrows as it grows instead of every term in it reaching the whole vocabulary.
 */
const isFinalTerm = (_term: string, index: number, terms: string[]): boolean => index === terms.length - 1

/**
 * Long enough that a term can absorb an edit without reaching something unrelated. Measured on the
 * stem, because that is what the query carries by the time fuzziness is decided: a threshold that
 * looked generous against whole words let `routing` match a description saying `out`, its stem
 * having four letters where the word has seven.
 */
const MINIMUM_FUZZY_STEM_LENGTH = 5

/**
 * One edit, flat, rather than a share of the term's length. A proportional allowance grows a second
 * and third edit on the longest stems, which is where it is least wanted: a long word is already
 * distinctive, and two edits into a vocabulary this size reaches subjects the reader did not type.
 */
const FUZZY_EDIT_DISTANCE = 1

/**
 * Short terms are matched exactly. At that length a single edit reaches a large share of the
 * vocabulary, and an acronym is a word where every letter is load-bearing.
 */
const fuzzinessFor = (term: string): number | false =>
  term.length >= MINIMUM_FUZZY_STEM_LENGTH ? FUZZY_EDIT_DISTANCE : false

export type SubjectIndex = {
  /**
   * The subjects matching `query`, in the order they were given: relevance decides which subjects
   * are members, and the alphabet the index is drawn in decides their order. A query with no
   * searchable terms in it matches everything, so an empty box is an unfiltered page.
   */
  search: (query: string) => Subject[]
}

/**
 * Builds the index over one Reef answer. Costs a pass over the vocabulary — around nine
 * milliseconds at the size the vocabulary is expected to reach — so callers hold the result rather
 * than rebuilding it per keystroke.
 */
export const buildSubjectIndex = (subjects: Subject[]): SubjectIndex => {
  const index = new MiniSearch<Subject>({
    idField: 'slug',
    fields: SUBJECT_SEARCH_FIELDS,
    processTerm: indexTerm,
    searchOptions: {
      boost: SUBJECT_SEARCH_FIELD_BOOSTS,
      // Every term has to match: a second word is how a reader narrows a result set they can see.
      combineWith: 'AND',
      processTerm: queryTerm,
      prefix: isFinalTerm,
      fuzzy: fuzzinessFor
    }
  })
  index.addAll(subjects)

  return {
    search: (query: string): Subject[] => {
      if (!hasSearchableTerms(query)) return subjects
      const matchedSlugs = new Set(index.search(query).map(({ id }) => String(id)))
      return subjects.filter(({ slug }) => matchedSlugs.has(slug))
    }
  }
}
