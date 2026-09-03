import { describe, expect, test } from 'vitest'
import { filterSubjects, matchSubjects, rangesOf, segmentsOf } from './subject-search'
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

describe('rangesOf', () => {
  const marked = (text: string, ...terms: string[]) =>
    segmentsOf(text, rangesOf(text, terms))
      .filter(({ isMatch }) => isMatch)
      .map(({ text: run }) => run)

  test('finds a term where it falls', () => {
    expect(marked('Routing', 'rout')).toStrictEqual(['Rout'])
  })

  test('reports the slice of the original text, not of the folded one', () => {
    // The trap this exists for: folding `naïve` drops a combining mark, so a range found in the
    // folded text is one character short of where it belongs in the original.
    expect(marked('A naïve round-trip', 'naive')).toStrictEqual(['naïve'])
  })

  test('finds a term whose own accents were typed', () => {
    expect(marked('A naïve round-trip', 'naïve')).toStrictEqual(['naïve'])
  })

  test('marks every occurrence, not only the first', () => {
    expect(marked('Route leaks and route origin', 'route')).toStrictEqual(['Route', 'route'])
  })

  test('merges terms that overlap, so one word is one highlight', () => {
    // Drawn separately these would nest one highlight inside another.
    expect(marked('Routing', 'rout', 'outing')).toStrictEqual(['Routing'])
  })

  test('merges terms that meet, so a word has no seam through it', () => {
    expect(marked('Routing', 'rout', 'ing')).toStrictEqual(['Routing'])
  })

  test('keeps separate terms separate', () => {
    expect(marked('Route leaks', 'route', 'leaks')).toStrictEqual(['Route', 'leaks'])
  })

  test('finds nothing when the term is not there', () => {
    expect(marked('Routing', 'quantum')).toStrictEqual([])
  })
})

describe('segmentsOf', () => {
  test('keeps the text whole, in order, with the matches marked', () => {
    expect(segmentsOf('Routing', [{ start: 0, end: 4 }])).toStrictEqual([
      { text: 'Rout', isMatch: true },
      { text: 'ing', isMatch: false }
    ])
  })

  test('gives back the plain text when nothing matched', () => {
    expect(segmentsOf('Routing', [])).toStrictEqual([{ text: 'Routing', isMatch: false }])
  })

  test('marks a match that runs to the end without inventing an empty run after it', () => {
    expect(segmentsOf('Routing', [{ start: 4, end: 7 }])).toStrictEqual([
      { text: 'Rout', isMatch: false },
      { text: 'ing', isMatch: true }
    ])
  })
})

describe('matchSubjects', () => {
  const SUBJECT = subject(1, 'Routing', 'Choosing the path traffic takes across a network.')

  test('says where in the name the terms were found', () => {
    const [match] = matchSubjects([SUBJECT], 'rout')

    expect(match?.nameRanges).toStrictEqual([{ start: 0, end: 4 }])
    expect(match?.descriptionRanges).toStrictEqual([])
  })

  test('says where in the description the terms were found', () => {
    const [match] = matchSubjects([SUBJECT], 'traffic')

    expect(match?.nameRanges).toStrictEqual([])
    expect(match?.descriptionRanges).toHaveLength(1)
  })

  // The name and description are joined only to ask whether the subject matched at all. A term
  // lying across the join matched neither field, and there is nowhere on the row to draw it.
  test('marks nothing for a term that only spans the gap between the two fields', () => {
    const [match] = matchSubjects([SUBJECT], 'routing choosing')

    expect(match?.subject).toBe(SUBJECT)
    expect(match?.nameRanges).toStrictEqual([{ start: 0, end: 7 }])
    expect(match?.descriptionRanges).toHaveLength(1)
  })

  test('marks nothing at all before anything has been typed', () => {
    expect(matchSubjects([SUBJECT], '')).toStrictEqual([{ subject: SUBJECT, nameRanges: [], descriptionRanges: [] }])
  })
})
