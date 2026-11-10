// Writes the stylesheets derived from the text spacing step tables. Run with
// `npm run generate:text-spacing-css` after changing app/utilities/text-spacing.ts.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateTailwindCss, generateWordBreakCss } from '../app/utilities/text-spacing-css.ts'

const cssDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'assets', 'css')

export const TEXT_SPACING_TAILWIND_CSS_FILE = 'text-spacing.generated.css'
export const TEXT_SPACING_WORD_BREAK_CSS_FILE = 'xml2rfc-text-spacing.generated.css'

fs.writeFileSync(path.join(cssDirectory, TEXT_SPACING_TAILWIND_CSS_FILE), generateTailwindCss())
fs.writeFileSync(path.join(cssDirectory, TEXT_SPACING_WORD_BREAK_CSS_FILE), generateWordBreakCss())
