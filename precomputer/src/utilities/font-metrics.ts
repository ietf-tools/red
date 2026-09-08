/**
 * Text width measurement without a browser, from the advance-width table in font-metrics.json.
 *
 * Widths are in em, so they can be compared against container widths expressed the same way.
 * Regenerate with the font-metrics script under website/scripts when the font stack changes.
 */
import fs from 'node:fs'
import path from 'node:path'

/** Italic has no table of its own and uses the bold one. */
export type TextStyle = 'body' | 'bold' | 'monospace'

type StyleMetrics = {
  fontFamily: string
  fontWeight: string
  fontStyle: string
  advanceEm: Record<string, number>
  fallbackAdvanceEm: number
}

type FontMetrics = {
  generatedAt: string
  origin: string
  styles: Record<TextStyle, StyleMetrics>
}

const metricsPath = path.resolve(import.meta.dirname, 'font-metrics.json')

export const fontMetrics: FontMetrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'))

/**
 * Width of `text` in em, summed per character.
 *
 * Ignores kerning and ligatures, which only ever narrow text, so the result runs slightly wide —
 * the safe direction when it decides whether something may be left unbroken. An unknown character
 * falls back to the style's mean advance rather than throwing.
 */
export const textWidthEm = (text: string, style: TextStyle = 'body'): number => {
  const { advanceEm, fallbackAdvanceEm } = fontMetrics.styles[style]
  return Array.from(text).reduce((total, character) => total + (advanceEm[character] ?? fallbackAdvanceEm), 0)
}

/** Characters the table has no measurement for, so a stale table is visible rather than silent. */
export const unmeasuredCharacters = (text: string, style: TextStyle = 'body'): string[] => {
  const { advanceEm } = fontMetrics.styles[style]
  return [...new Set(Array.from(text).filter((character) => advanceEm[character] === undefined))]
}
