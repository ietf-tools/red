export function formatDateString(year: number, month: number): string {
  return `${year}-${month}`
}

export function parseDateString(date: string): Date {
  const [year, month] = date.split('-').map((val) => parseFloat(val))
  const newDate = new Date(year, month - 1)
  return newDate
}
