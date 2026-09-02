// Client-side filtering of the subject vocabulary. The whole vocabulary arrives in one Reef answer
// and is small enough to index in the browser, so filtering it needs no request and no Typesense
// collection: nothing here talks to the search backend, and none of it is shared with /search/.
//
// The search machinery is fetched on demand rather than imported, so a visit that never filters
// anything — which is most of them, and every server render — downloads none of it.
import { computed, shallowRef, watch, type ComputedRef } from 'vue'
import type { Subject } from './reef'
import type { SubjectIndex } from './subject-search-index'
import { hasSearchableTerms } from './subject-search-terms'

/**
 * One fetch per page, shared by every caller: the promise is the cache, so several filters asking
 * at once wait on the same load rather than starting their own.
 */
let indexModule: Promise<typeof import('./subject-search-index')> | undefined

const loadIndexModule = (): Promise<typeof import('./subject-search-index')> => {
  indexModule ??= import('./subject-search-index')
  return indexModule
}

export type SubjectFilter = {
  /**
   * The subjects the query matches, narrowing as the query and the vocabulary change. Until the
   * search machinery has been fetched — and while it is being fetched — this is the whole
   * vocabulary, which is also what the server renders, so the page starts out complete and narrows
   * rather than starting out empty and filling in.
   */
  filteredSubjects: ComputedRef<Subject[]>
  /**
   * Starts fetching the search machinery before there is a query to run, so that the first
   * keystroke is not the thing waiting on the network. Idempotent; safe to call on every focus.
   */
  prepare: () => Promise<void>
}

/**
 * Filters a vocabulary by a query, both of which are read through getters because this outlives
 * either: the page is filtering before Reef has answered, and goes on filtering across answers.
 *
 * Results settle asynchronously, since the first query has a module to fetch and an index to build
 * before it can answer. Answers that arrive out of order are dropped rather than rendered.
 */
export const useSubjectFilter = (getSubjects: () => Subject[], getQuery: () => string): SubjectFilter => {
  let index: SubjectIndex | undefined
  let indexedSubjects: Subject[] | undefined
  let latestRequest = 0

  const matches = shallowRef<Subject[] | undefined>()

  watch([getQuery, getSubjects], async ([query, subjects]) => {
    // Nothing to search on: `filteredSubjects` answers this from the vocabulary itself, so there is
    // no reason to fetch a search engine, and no stale answer to leave lying around.
    if (!hasSearchableTerms(query)) {
      matches.value = undefined
      return
    }

    const request = ++latestRequest
    const { buildSubjectIndex } = await loadIndexModule()

    if (index === undefined || indexedSubjects !== subjects) {
      index = buildSubjectIndex(subjects)
      indexedSubjects = subjects
    }

    const found = index.search(query)
    // A query the reader has already moved on from must not replace the answer to their current
    // one, which is possible on the first query of all: it waits for a network fetch that the
    // ones behind it do not.
    if (request === latestRequest) {
      matches.value = found
    }
  })

  const filteredSubjects = computed((): Subject[] => {
    const subjects = getSubjects()
    if (!hasSearchableTerms(getQuery())) return subjects
    return matches.value ?? subjects
  })

  return {
    filteredSubjects,
    prepare: async () => {
      await loadIndexModule()
    }
  }
}
