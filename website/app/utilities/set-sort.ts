// How the rows of a Set are ordered on the /set page. The options and their order are those of the
// other lists of RFCs.

export type SetSort = 'published-desc' | 'published-asc' | 'number-asc' | 'number-desc'

export const SET_SORT_OPTIONS: { value: SetSort; label: string }[] = [
  { value: 'published-desc', label: 'Newest first' },
  { value: 'published-asc', label: 'Oldest first' },
  { value: 'number-asc', label: 'RFC number (ascending)' },
  { value: 'number-desc', label: 'RFC number (descending)' }
]

export const DEFAULT_SET_SORT: SetSort = 'published-desc'

export type SetSortRow = {
  // Unset until the document's card has arrived, and for one that has no publication date.
  published?: string
  // Unset for a member that isn't an RFC.
  number?: number
}

type SortKey = { time?: number; number?: number }

// A row with no value to place it by goes after every row that has one, whichever direction is chosen,
// and keeps its set order among its kind (toSorted is stable). So the list doesn't reshuffle as cards
// arrive for members without a date.
const compareBy = (key: keyof SortKey, direction: 1 | -1) => (a: SortKey, b: SortKey) => {
  const { [key]: valueA } = a
  const { [key]: valueB } = b
  if (valueA === undefined || valueB === undefined) {
    return valueA === undefined && valueB === undefined ? 0 : valueA === undefined ? 1 : -1
  }
  return (valueA - valueB) * direction
}

const COMPARATORS: Record<SetSort, (a: SortKey, b: SortKey) => number> = {
  'published-desc': compareBy('time', -1),
  'published-asc': compareBy('time', 1),
  'number-asc': compareBy('number', 1),
  'number-desc': compareBy('number', -1)
}

export const sortSetRows = <T extends SetSortRow>(rows: T[], sort: SetSort): T[] => {
  const keyed = rows.map((row) => {
    const { published, number } = row
    const time = published ? Date.parse(published) : NaN
    return { row, time: Number.isNaN(time) ? undefined : time, number }
  })
  return keyed.toSorted(COMPARATORS[sort]).map(({ row }) => row)
}
