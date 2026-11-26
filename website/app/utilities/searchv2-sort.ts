import type { SortByItem } from '~/components/searchv2'

const BEFORE_SUBSERIES: SortByItem[] = [
  { label: 'Relevance', value: '' },
  { label: 'Newest first', value: 'publicationDate:desc' },
  { label: 'Oldest first', value: 'publicationDate:asc' },
  { label: 'RFC number (ascending)', value: 'rfcNumber:asc' },
  { label: 'RFC number (descending)', value: 'rfcNumber:desc' }
]

const AFTER_SUBSERIES: SortByItem[] = [{ label: 'Most popular', value: 'popularity:desc,_text_match:desc' }]

// Only the BCP and STD subseries are listed by status, so they are the only statuses that have a subseries number
// to sort by. RFCs that share a subseries number are kept in RFC number order within it.
export const sortItemsForStatuses = (statuses: readonly string[]): SortByItem[] => {
  const acronyms = [
    statuses.includes('Best Current Practice') && 'BCP',
    statuses.includes('Internet Standard') && 'STD'
  ].filter(Boolean)
  if (acronyms.length === 0) {
    return [...BEFORE_SUBSERIES, ...AFTER_SUBSERIES]
  }

  const name = acronyms.join(' / ')
  return [
    ...BEFORE_SUBSERIES,
    { label: `${name} number (ascending)`, value: 'subseries.number:asc,rfcNumber:asc' },
    { label: `${name} number (descending)`, value: 'subseries.number:desc,rfcNumber:desc' },
    ...AFTER_SUBSERIES
  ]
}
