// @vitest-environment nuxt
import { describe, expect, test } from 'vitest'
import { buildSubjectIndex } from './subject-search-index'
import type { Subject } from './reef'

// Local subjects rather than the shared fixtures, because what is under test is which words reach
// which subject: these carry the inflections, near-misses and diacritics the cases are about, and
// are written to stay readable next to the expectations. In name order, as Reef sends the
// vocabulary and as the results are expected to come back.
const subject = (id: number, name: string, description: string): Subject => ({
  id,
  slug: name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-'),
  name,
  description
})

const SUBJECTS: Subject[] = [
  subject(1, 'Authentication', 'Proving who a party is, and what they are allowed to do.'),
  subject(2, 'Congestion control', 'Backing off when the network is full.'),
  subject(3, 'Präfix delegation', 'Handing out address space.'),
  subject(4, 'Route leaks', 'Announcements escaping the network they were meant for.'),
  subject(5, 'Routing', 'Choosing the path traffic takes across a network.'),
  subject(6, 'TLS', 'Encrypting a connection between two parties.')
]

const names = (subjects: Subject[]): string[] => subjects.map(({ name }) => name)

const index = buildSubjectIndex(SUBJECTS)
const search = (query: string): string[] => names(index.search(query))

describe('buildSubjectIndex', () => {
  test('matches a name', () => {
    expect(search('congestion')).toStrictEqual(['Congestion control'])
  })

  test('matches a description, so a subject is reachable by what it is about', () => {
    expect(search('encrypting')).toStrictEqual(['TLS'])
    expect(search('address')).toStrictEqual(['Präfix delegation'])
  })

  test('keeps the order it was given rather than ordering by relevance', () => {
    // Three descriptions say 'network'. However the engine scores them, the page draws an A-Z
    // index, so what comes back has to still be in the order Reef sent.
    expect(search('network')).toStrictEqual(['Congestion control', 'Route leaks', 'Routing'])
  })

  test('reaches an inflection through its stem', () => {
    // None of these words appears in either subject: 'Route leaks' has 'Route', 'Routing' has
    // 'Routing', and the query is a third inflection of the same stem.
    expect(search('routed')).toStrictEqual(['Route leaks', 'Routing'])
    expect(search('routing')).toStrictEqual(['Route leaks', 'Routing'])
    expect(search('announcement')).toStrictEqual(['Route leaks'])
  })

  test('reaches a plural from a singular and back again', () => {
    expect(search('party')).toStrictEqual(['Authentication', 'TLS'])
    expect(search('parties')).toStrictEqual(['Authentication', 'TLS'])
  })

  test('matches a half-typed word, which is what an as-you-type filter mostly sees', () => {
    // Each of these stems to something no stem in the index starts with, so they match only
    // because the word as written is indexed alongside its stem.
    expect(search('conges')).toStrictEqual(['Congestion control'])
    expect(search('prov')).toStrictEqual(['Authentication'])
    expect(search('auth')).toStrictEqual(['Authentication'])
  })

  test('narrows as a second word is typed', () => {
    expect(search('network')).toHaveLength(3)
    expect(search('network full')).toStrictEqual(['Congestion control'])
  })

  test('does not mind which order the words were typed in', () => {
    expect(search('route leaks')).toStrictEqual(['Route leaks'])
    expect(search('leaks route')).toStrictEqual(['Route leaks'])
  })

  test('prefix-matches only the word still being typed', () => {
    // 'net' would reach the descriptions saying 'network' if every term were prefix-matched. As a
    // completed earlier term it has to match a word, and no subject here has one starting 'net'
    // other than through that prefix.
    expect(search('net full')).toStrictEqual([])
    // The same word as the final term does reach them.
    expect(search('full net')).toStrictEqual(['Congestion control'])
  })

  test('tolerates a typo in a long word', () => {
    expect(search('authentcation')).toStrictEqual(['Authentication'])
  })

  test('leaves short terms exact, so an acronym is not confused with its neighbours', () => {
    expect(search('tls')).toStrictEqual(['TLS'])
    expect(search('tcp')).toStrictEqual([])
  })

  test('folds diacritics, which most keyboards cannot type', () => {
    expect(search('prafix')).toStrictEqual(['Präfix delegation'])
    expect(search('präfix')).toStrictEqual(['Präfix delegation'])
  })

  test('matches everything when there is nothing to search on', () => {
    expect(search('')).toStrictEqual(names(SUBJECTS))
    expect(search('   ')).toStrictEqual(names(SUBJECTS))
    expect(search('.')).toStrictEqual(names(SUBJECTS))
    // A query of nothing but stopwords leaves no terms to match on, so it is an unfiltered page
    // rather than an empty one.
    expect(search('the')).toStrictEqual(names(SUBJECTS))
  })

  test('ignores a stopword sitting alongside a real term instead of requiring it', () => {
    // Terms are combined with AND, so an indexed stopword would rule out every subject whose
    // description happens not to say it.
    expect(search('the network')).toStrictEqual(['Congestion control', 'Route leaks', 'Routing'])
  })

  test('matches nothing when nothing matches', () => {
    expect(search('quantum')).toStrictEqual([])
  })

  test('reads a query whatever case it is typed in', () => {
    expect(search('ROUTING')).toStrictEqual(['Route leaks', 'Routing'])
  })

  test('takes an empty vocabulary', () => {
    expect(buildSubjectIndex([]).search('routing')).toStrictEqual([])
    expect(buildSubjectIndex([]).search('')).toStrictEqual([])
  })
})
