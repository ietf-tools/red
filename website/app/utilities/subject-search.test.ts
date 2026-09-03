import { describe, expect, test } from 'vitest'
import { filterSubjects } from './subject-search'
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
