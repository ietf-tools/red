export function formatDateString(year: number, month: number): string {
  return `${year}-${month}`
}

export function parseDateString(date: string): Date {
  const [year, month] = date.split('-').map((val) => parseFloat(val))
  if (typeof year !== 'string' || typeof month !== 'string') {
    throw Error(`Unable to parse date "${date}"`)
  }
  const newDate = new Date(year, month - 1)
  return newDate
}
