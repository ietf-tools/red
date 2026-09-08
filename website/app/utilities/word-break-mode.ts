import { z } from 'zod'

// How long words and URLs inside an RFC are allowed to break. The default relies on the `<wbr>`
// elements the precomputer inserts; the other modes exist so a reader can compare the browser's
// own strategies against it on the same document.
export const WORD_BREAK_MODES = [
  'wbr',
  'wbr-with-fallback',
  'overflow-wrap-anywhere',
  'overflow-wrap-break-word',
  'word-break-break-all',
  'none'
] as const

export const WordBreakModeSchema = z.enum(WORD_BREAK_MODES)

export type WordBreakMode = z.infer<typeof WordBreakModeSchema>

export const DEFAULT_WORD_BREAK_MODE: WordBreakMode = 'wbr'

export type WordBreakModeOption = {
  value: WordBreakMode
  label: string
  description: string
}

export const WORD_BREAK_MODE_OPTIONS: WordBreakModeOption[] = [
  {
    value: 'wbr',
    label: 'Inserted break points (default)',
    description:
      'Long words and URLs may break at meaningful places such as slashes, dots and underscores, and only where the word would not otherwise fit.'
  },
  {
    value: 'wbr-with-fallback',
    label: 'Inserted break points, with browser fallback',
    description:
      'As above, and the browser may also break any word that still does not fit, wherever it reaches the edge.'
  },
  {
    value: 'overflow-wrap-anywhere',
    label: 'Browser decides (overflow-wrap: anywhere)',
    description:
      'No inserted break points. The browser may break any word that does not fit, wherever it reaches the edge.'
  },
  {
    value: 'overflow-wrap-break-word',
    label: 'Browser decides (overflow-wrap: break-word)',
    description:
      'Like anywhere, but the browser does not count these breaks when sizing tables and other boxes, so some may still overflow.'
  },
  {
    value: 'word-break-break-all',
    label: 'Break between any characters (word-break: break-all)',
    description: 'The browser may break every word between any two characters, not only the words that do not fit.'
  },
  {
    value: 'none',
    label: 'No word breaking',
    description: 'Long words and URLs are left whole. On a narrow screen the page will scroll sideways.'
  }
]

export const wordBreakModeClass = (mode: WordBreakMode): string => `word-break-mode-${mode}`
