import { describe, expect, test } from 'vitest'
import { filterSubjects } from './subject-search'
import type { Subject } from './reef'

// Flat, because matching is flat: filterSubjects looks at a name and a description and knows
// nothing about where a subject sits. Assembling the hierarchy is ~/utilities/subject-tree's, and
// is tested there.
const subject = (id: number, name: string, description: string): Subject => {
  const slug = name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')
  return {
    id,
    slug,
    name,
    description,
    parent: null,
    path: slug,
    document_count: 1,
    document_count_deep: 1
  }
}

// In the order Reef sends them, and the order matches are expected to come back in.
const SUBJECTS: Subject[] = [
  subject(1, 'Authentication', 'Proving who a party is, and what they are allowed to do.'),
  subject(2, 'Internationalisation', 'Text in any script, including naïve round-trips.'),
  subject(3, 'Route leaks', 'Announcements escaping the network they were meant for.'),
  subject(4, 'Routing', 'Choosing the path traffic takes across a network.')
]

const matching = (query: string, subjects: Subject[] = SUBJECTS): string[] =>
  filterSubjects(subjects, query).map(({ name }) => name)

describe('filterSubjects', () => {
  test('offers the whole vocabulary before anything has been typed', () => {
    expect(filterSubjects(SUBJECTS, '')).toStrictEqual(SUBJECTS)
  })

  test('matches a name', () => {
    expect(matching('routing')).toStrictEqual(['Routing'])
  })

  test('matches a description, so a subject is reachable by what it is about', () => {
    expect(matching('traffic')).toStrictEqual(['Routing'])
  })

  test('keeps the order it was given', () => {
    expect(matching('network')).toStrictEqual(['Route leaks', 'Routing'])
  })

  test('matches a half-typed word, which is what an as-you-type filter mostly sees', () => {
    expect(matching('rout')).toStrictEqual(['Route leaks', 'Routing'])
  })

  test('narrows as a second word is typed', () => {
    expect(matching('rout path')).toStrictEqual(['Routing'])
  })

  test('does not mind which order the words were typed in', () => {
    expect(matching('path rout')).toStrictEqual(['Routing'])
  })

  test('folds diacritics, which most keyboards cannot type', () => {
    expect(matching('naive')).toStrictEqual(['Internationalisation'])
  })

  test('reads a query whatever case it is typed in', () => {
    expect(matching('ROUTING')).toStrictEqual(['Routing'])
  })

  test('treats whitespace and punctuation as nothing to search on', () => {
    expect(filterSubjects(SUBJECTS, '  ,  ')).toStrictEqual(SUBJECTS)
  })

  test('matches nothing when nothing matches', () => {
    expect(matching('quantum')).toStrictEqual([])
  })

  test('takes an empty vocabulary', () => {
    expect(matching('routing', [])).toStrictEqual([])
  })
})
