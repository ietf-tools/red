import { describe, expect, test } from 'vitest'
import { sortItemsForStatuses } from './searchv2-sort'

const labels = (statuses: string[]) => sortItemsForStatuses(statuses).map(({ label }) => label)

describe('sortItemsForStatuses', () => {
  test.each([[[]], [['Proposed Standard']], [['Informational', 'Historic']]])(
    'offers no subseries sort for %j',
    (statuses) => {
      expect(labels(statuses)).toEqual([
        'Relevance',
        'Newest first',
        'Oldest first',
        'RFC number (ascending)',
        'RFC number (descending)',
        'Most popular'
      ])
    }
  )

  test.each([
    [['Best Current Practice'], 'BCP number'],
    [['Internet Standard'], 'STD number'],
    [['Internet Standard', 'Best Current Practice'], 'BCP / STD number'],
    [['Proposed Standard', 'Best Current Practice'], 'BCP number']
  ])('names the sort after the subseries for %j', (statuses, name) => {
    expect(labels(statuses)).toEqual([
      'Relevance',
      'Newest first',
      'Oldest first',
      'RFC number (ascending)',
      'RFC number (descending)',
      `${name} (ascending)`,
      `${name} (descending)`,
      'Most popular'
    ])
  })

  test('keeps RFCs with the same subseries number in RFC number order', () => {
    const values = sortItemsForStatuses(['Best Current Practice']).map(({ value }) => value)
    expect(values).toContain('subseries.number:asc,rfcNumber:asc')
    expect(values).toContain('subseries.number:desc,rfcNumber:desc')
  })
})
