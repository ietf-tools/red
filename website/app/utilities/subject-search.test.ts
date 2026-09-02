// @vitest-environment nuxt
import { describe, expect, test, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import { useSubjectFilter } from './subject-search'
import type { Subject } from './reef'

const subject = (id: number, name: string, description: string): Subject => ({
  id,
  slug: name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-'),
  name,
  description
})

// In name order, as Reef sends the vocabulary and as matches are expected to come back.
const SUBJECTS: Subject[] = [
  subject(1, 'Authentication', 'Proving who a party is, and what they are allowed to do.'),
  subject(2, 'Route leaks', 'Announcements escaping the network they were meant for.'),
  subject(3, 'Routing', 'Choosing the path traffic takes across a network.')
]

const names = (subjects: Subject[]): string[] => subjects.map(({ name }) => name)

/**
 * Runs the composable in a scope of its own, as a component would, and hands back what a test needs
 * to drive it. Everything the filter does after a query changes — fetching the search machinery,
 * building the index — settles asynchronously, so assertions on results are made through
 * `vi.waitFor` rather than a fixed number of ticks.
 */
const mountFilter = (subjects: Subject[] = SUBJECTS) => {
  const vocabulary = ref(subjects)
  const query = ref('')
  const scope = effectScope()
  const filter = scope.run(() =>
    useSubjectFilter(
      () => vocabulary.value,
      () => query.value
    )
  )

  if (!filter) throw new Error('the filter did not run in its scope')

  return { ...filter, vocabulary, query, scope }
}

const expectMatches = (filteredSubjects: { value: Subject[] }, expected: string[]) =>
  vi.waitFor(() => {
    expect(names(filteredSubjects.value)).toStrictEqual(expected)
  })

describe('useSubjectFilter', () => {
  test('offers the whole vocabulary before anything has been typed', () => {
    const { filteredSubjects } = mountFilter()

    // Synchronously, and without fetching a search engine to tell it so. This is the answer the
    // server renders and the one the browser hydrates, which is why it cannot wait on a promise.
    expect(filteredSubjects.value).toStrictEqual(SUBJECTS)
  })

  test('narrows to what the query matches', async () => {
    const { filteredSubjects, query } = mountFilter()

    query.value = 'routing'

    await expectMatches(filteredSubjects, ['Route leaks', 'Routing'])
  })

  test('goes back to the whole vocabulary when the query is taken away', async () => {
    const { filteredSubjects, query } = mountFilter()

    query.value = 'routing'
    await expectMatches(filteredSubjects, ['Route leaks', 'Routing'])

    query.value = ''

    // Immediately rather than eventually: there is nothing to search for, so nothing to wait for.
    expect(filteredSubjects.value).toStrictEqual(SUBJECTS)
  })

  test('shows the whole vocabulary while the first query is still being answered', async () => {
    const { filteredSubjects, query } = mountFilter()

    query.value = 'routing'

    // The instant after the keystroke, before the machinery has been fetched. A page that emptied
    // itself here would flash a subject list that had nothing in it.
    expect(filteredSubjects.value).toStrictEqual(SUBJECTS)

    await expectMatches(filteredSubjects, ['Route leaks', 'Routing'])
  })

  test('answers the query the reader has now, not the one they typed on the way to it', async () => {
    const { filteredSubjects, query } = mountFilter()

    // Both queries are in flight together, and the first has a module to fetch that the second
    // does not, so the answers can arrive in either order.
    query.value = 'routing'
    query.value = 'authentication'

    await expectMatches(filteredSubjects, ['Authentication'])

    // And it stays that way, rather than being overwritten by the answer to 'routing' landing late.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(names(filteredSubjects.value)).toStrictEqual(['Authentication'])
  })

  test('re-reads the vocabulary when Reef sends a new one', async () => {
    const { filteredSubjects, query, vocabulary } = mountFilter()

    query.value = 'routing'
    await expectMatches(filteredSubjects, ['Route leaks', 'Routing'])

    // What an invalidated page gets. An index held over from the previous answer would answer from
    // a vocabulary that no longer exists.
    vocabulary.value = [subject(4, 'Quantum networking', 'Entanglement between distant hosts.')]

    await expectMatches(filteredSubjects, [])

    query.value = 'quantum'
    await expectMatches(filteredSubjects, ['Quantum networking'])
  })

  test('filters a vocabulary that had not arrived when it was created', async () => {
    const { filteredSubjects, query, vocabulary } = mountFilter([])

    query.value = 'routing'
    await expectMatches(filteredSubjects, [])

    vocabulary.value = SUBJECTS

    await expectMatches(filteredSubjects, ['Route leaks', 'Routing'])
  })

  test('can be asked to fetch the search machinery before there is a query for it', async () => {
    const { prepare, filteredSubjects, query } = mountFilter()

    // What focusing the box does. Nothing is filtered by it, and the query that follows is then
    // waiting on an index build rather than on the network.
    await prepare()

    expect(filteredSubjects.value).toStrictEqual(SUBJECTS)

    query.value = 'routing'
    await expectMatches(filteredSubjects, ['Route leaks', 'Routing'])
  })

  test('stops filtering when its scope is disposed', async () => {
    const { filteredSubjects, query, scope } = mountFilter()

    scope.stop()
    query.value = 'routing'

    await new Promise((resolve) => setTimeout(resolve, 50))

    // The watcher is gone with the scope, so the query is never answered — which is what keeps an
    // unmounted page from filtering in the background.
    expect(filteredSubjects.value).toStrictEqual(SUBJECTS)
  })
})
