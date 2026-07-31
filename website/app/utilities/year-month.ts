/**
 * Year-month values for publication date ranges.
 *
 * The search index stores `publicationDate` as unix seconds and filters on it numerically,
 * so that's what UiState carries. URLs use `yyyy-M` instead: month resolution is all the
 * search UI offers, and `from=1990-1` is legible in a way `pubDate=631152000` is not.
 *
 * Boundary conventions match the YearMonthRangeInput widget exactly, so a range selected in
 * the UI survives a URL round-trip unchanged:
 *  - a `from` bound resolves to the first second of the month (or of January, if no month)
 *  - a `to` bound resolves to the last second of the month (or of December, if no month)
 *
 * DOM-free by design: `url.ts` imports this and is reachable from the Nitro server build.
 */

export type YearMonth = {
  year: number
  /** 1-based, as written in the URL. Absent means the whole year. */
  month?: number
}

const YEAR_MONTH_REGEX = /^(\d{4})(?:-(\d{1,2}))?$/

/** Parses `yyyy-M`, `yyyy-MM` or a bare `yyyy`. Returns undefined for anything else. */
export const parseYearMonth = (value: string | undefined): YearMonth | undefined => {
  const match = value?.match(YEAR_MONTH_REGEX)
  if (!match) return undefined

  const [, yearPart, monthPart] = match
  const year = Number(yearPart)
  if (monthPart === undefined) return { year }

  const month = Number(monthPart)
  if (month < 1 || month > 12) return undefined
  return { year, month }
}

/** The first second of the year-month, as unix seconds. */
export const yearMonthToStart = ({ year, month }: YearMonth): number =>
  Math.floor(Date.UTC(year, (month ?? 1) - 1, 1, 0, 0, 0) / 1000)

/** The last second of the year-month, as unix seconds. Day 0 of the next month is the last of this one. */
export const yearMonthToEnd = ({ year, month }: YearMonth): number =>
  Math.floor(Date.UTC(year, month ?? 12, 0, 23, 59, 59) / 1000)

/**
 * Formats unix seconds back to `yyyy-M`. Always includes the month: a whole-year bound and
 * its equivalent January/December bound are the same instant, so the distinction isn't
 * recoverable — nor does it change the range.
 */
export const formatYearMonth = (unixSeconds: number): string => {
  const date = new Date(unixSeconds * 1000)
  return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`
}

/**
 * Formats a year-month for a URL param. A monthless bound stays a bare `yyyy`, which
 * `parseYearMonth` reads back as the whole year — correct for a `from` or a `to` bound alike.
 */
export const yearMonthToParam = ({ year, month }: YearMonth): string =>
  month === undefined ? `${year}` : `${year}-${month}`
