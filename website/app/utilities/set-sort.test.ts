import { describe, expect, test } from 'vitest'
import { sortSetRows, type SetSort } from './set-sort'

const ROWS = [
  { doc: 'rfc20', number: 20, published: '2001-05-01' },
  { doc: 'rfc9', number: 9, published: '2020-01-15' },
  { doc: 'bcp14', number: undefined, published: undefined },
  { doc: 'rfc300', number: 300, published: undefined },
  { doc: 'rfc1000', number: 1000, published: '1995-03-10' }
]

const order = (sort: SetSort): string[] => sortSetRows(ROWS, sort).map(({ doc }) => doc)

describe('sortSetRows', () => {
  test('newest first puts the dated rows by date, then the undated in set order', () => {
    expect(order('published-desc')).toEqual(['rfc9', 'rfc20', 'rfc1000', 'bcp14', 'rfc300'])
  })

  test('oldest first reverses the dated rows but still ends with the undated', () => {
    expect(order('published-asc')).toEqual(['rfc1000', 'rfc20', 'rfc9', 'bcp14', 'rfc300'])
  })

  test('RFC number ascending puts rows that are not RFCs last', () => {
    expect(order('number-asc')).toEqual(['rfc9', 'rfc20', 'rfc300', 'rfc1000', 'bcp14'])
  })

  test('RFC number descending puts rows that are not RFCs last', () => {
    expect(order('number-desc')).toEqual(['rfc1000', 'rfc300', 'rfc20', 'rfc9', 'bcp14'])
  })

  test('a date that cannot be read counts as no date', () => {
    const rows = [
      { doc: 'a', published: 'not a date' },
      { doc: 'b', published: '2000-01-01' }
    ]
    expect(sortSetRows(rows, 'published-desc').map(({ doc }) => doc)).toEqual(['b', 'a'])
  })

  test('leaves the rows it was given as they were', () => {
    const before = ROWS.map(({ doc }) => doc)
    sortSetRows(ROWS, 'number-desc')
    expect(ROWS.map(({ doc }) => doc)).toEqual(before)
  })
})
