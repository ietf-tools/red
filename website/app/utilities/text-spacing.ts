// Reader-adjustable text size and spacing for xml2rfc documents.
//
// Spacing is chosen from short ladders of steps rather than a continuous range. Tailwind only emits
// classes it can see written out in full, and the word-break rules in xml2rfc.css need a discrete
// step to scale their thresholds against (a container query cannot read a custom property). The em
// values behind the class names live in the tables below and are written into CSS by
// scripts/generate-text-spacing-css.ts, so the two cannot drift apart.
//
// This file is imported by that Node script, so it must not use Nuxt auto-imports or `~` aliases.

export type TextSpacingSteps = {
  lineSpacing: number
  letterSpacing: number
  wordSpacing: number
  paragraphSpacing: number
}

// Unitless multipliers of the font size, matching Tailwind's own `leading-*` utilities so no custom
// class is needed. Bounded to the 1 to 2 range reading systems publish.
export const LINE_SPACING_VALUES = [1, 1.25, 1.375, 1.5, 1.625, 2]
export const LINE_SPACING_CLASSES = [
  'leading-none',
  'leading-tight',
  'leading-snug',
  'leading-normal',
  'leading-relaxed',
  'leading-loose'
]
export const DEFAULT_LINE_SPACING_STEP = 3

// em, so spacing follows the reader's text size. Step 0 adds nothing.
export const LETTER_SPACING_VALUES = [0, 0.03, 0.06, 0.09, 0.12, 0.2, 0.28]
export const LETTER_SPACING_CLASSES = [
  '',
  'tracking-reader-1',
  'tracking-reader-2',
  'tracking-reader-3',
  'tracking-reader-4',
  'tracking-reader-5',
  'tracking-reader-6'
]
export const DEFAULT_LETTER_SPACING_STEP = 0

// Reading research finds that when letters are spaced out, the gaps between words have to grow with
// them, to at least about this multiple of the letter gap, or reading slows. Word spacing is in the
// same unit as letter spacing so the ratio holds at every size.
export const WORD_SPACING_RATIO = 3.5

// Each word step is the matching letter step times the ratio, so a word step at or above the letter
// step always satisfies it. See effectiveWordSpacingStep.
export const WORD_SPACING_VALUES = LETTER_SPACING_VALUES.map(
  (letterValue) => Math.round(letterValue * WORD_SPACING_RATIO * 1000) / 1000
)
export const WORD_SPACING_CLASSES = [
  '',
  'word-spacing-reader-1',
  'word-spacing-reader-2',
  'word-spacing-reader-3',
  'word-spacing-reader-4',
  'word-spacing-reader-5',
  'word-spacing-reader-6'
]
export const DEFAULT_WORD_SPACING_STEP = 0

// em of the paragraph's own font size. The default is the 1em the document stylesheet already gives
// a paragraph.
export const PARAGRAPH_SPACING_VALUES = [0.5, 1, 1.5, 2]
export const PARAGRAPH_SPACING_CLASSES = [
  'paragraph-spacing-reader-1',
  'paragraph-spacing-reader-2',
  'paragraph-spacing-reader-3',
  'paragraph-spacing-reader-4'
]
export const DEFAULT_PARAGRAPH_SPACING_STEP = 1

export const MAX_LINE_SPACING_STEP = LINE_SPACING_VALUES.length - 1
export const MAX_LETTER_SPACING_STEP = LETTER_SPACING_VALUES.length - 1
export const MAX_WORD_SPACING_STEP = WORD_SPACING_VALUES.length - 1
export const MAX_PARAGRAPH_SPACING_STEP = PARAGRAPH_SPACING_VALUES.length - 1

export const DEFAULT_TEXT_SPACING_STEPS: TextSpacingSteps = {
  lineSpacing: DEFAULT_LINE_SPACING_STEP,
  letterSpacing: DEFAULT_LETTER_SPACING_STEP,
  wordSpacing: DEFAULT_WORD_SPACING_STEP,
  paragraphSpacing: DEFAULT_PARAGRAPH_SPACING_STEP
}

export const clampStep = (step: number, maxStep: number): number => Math.min(Math.max(Math.round(step), 0), maxStep)

// The word step actually applied: never below the letter step, so widening letters cannot leave the
// gaps between words behind.
export const effectiveWordSpacingStep = ({ letterSpacing, wordSpacing }: TextSpacingSteps): number =>
  Math.max(letterSpacing, wordSpacing)

export const isDefaultTextSpacing = (steps: TextSpacingSteps): boolean =>
  steps.lineSpacing === DEFAULT_LINE_SPACING_STEP &&
  steps.letterSpacing === DEFAULT_LETTER_SPACING_STEP &&
  steps.wordSpacing === DEFAULT_WORD_SPACING_STEP &&
  steps.paragraphSpacing === DEFAULT_PARAGRAPH_SPACING_STEP

// Shown to the reader in place of the underlying measurements, which mean little to them.
export const describeStep = (step: number, defaultStep: number): string => {
  const difference = step - defaultStep
  if (difference === 0) {
    return 'Default'
  }
  return difference > 0 ? `+${difference}` : `−${Math.abs(difference)}`
}

export const textSpacingClasses = (steps: TextSpacingSteps): string => {
  const { lineSpacing, letterSpacing, paragraphSpacing } = steps
  const wordSpacing = effectiveWordSpacingStep(steps)
  return [
    LINE_SPACING_CLASSES[clampStep(lineSpacing, MAX_LINE_SPACING_STEP)],
    LETTER_SPACING_CLASSES[clampStep(letterSpacing, MAX_LETTER_SPACING_STEP)],
    WORD_SPACING_CLASSES[clampStep(wordSpacing, MAX_WORD_SPACING_STEP)],
    // The document stylesheet already spaces paragraphs by the default, so only a change needs a class.
    paragraphSpacing === DEFAULT_PARAGRAPH_SPACING_STEP
      ? ''
      : PARAGRAPH_SPACING_CLASSES[clampStep(paragraphSpacing, MAX_PARAGRAPH_SPACING_STEP)]
  ]
    .filter(Boolean)
    .join(' ')
}

// The word-break rules in xml2rfc.css pick their thresholds from these, since container queries
// cannot read the em values directly. Absent at the default, which is the unscaled thresholds.
export const textSpacingAttributes = (steps: TextSpacingSteps): Record<string, number | undefined> => {
  const { letterSpacing } = steps
  const wordSpacing = effectiveWordSpacingStep(steps)
  return {
    'data-letter-step': letterSpacing > 0 ? clampStep(letterSpacing, MAX_LETTER_SPACING_STEP) : undefined,
    'data-word-step': wordSpacing > 0 ? clampStep(wordSpacing, MAX_WORD_SPACING_STEP) : undefined
  }
}

// Text size changes the font size and the heading sizes together. Spacing is separate, and is in em
// so it follows whichever size is chosen here.
export const textSizeClasses = (textScale: number): string => {
  if (textScale <= 1) {
    return 'text-base [--heading-1-font-size:28px] [--heading-2-font-size:22px] [--heading-3-font-size:18px] [--heading-4-font-size:16px] [--heading-5-font-size:14px] [--heading-6-font-size:14px]'
  }
  if (textScale <= 1.1) {
    return 'text-lg [--heading-1-font-size:32px] [--heading-2-font-size:24px] [--heading-3-font-size:18px] [--heading-4-font-size:16px] [--heading-5-font-size:14px] [--heading-6-font-size:14px]'
  }
  if (textScale <= 1.2) {
    return 'text-xl [--heading-1-font-size:36px] [--heading-2-font-size:26px] [--heading-3-font-size:20px] [--heading-4-font-size:18px] [--heading-5-font-size:16px] [--heading-6-font-size:14px]'
  }
  if (textScale <= 1.3) {
    return 'text-2xl [--heading-1-font-size:40px] [--heading-2-font-size:28px] [--heading-3-font-size:22px] [--heading-4-font-size:20px] [--heading-5-font-size:18px] [--heading-6-font-size:16px]'
  }
  if (textScale <= 1.4) {
    return 'text-2xl [--heading-1-font-size:44px] [--heading-2-font-size:30px] [--heading-3-font-size:24px] [--heading-4-font-size:22px] [--heading-5-font-size:20px] [--heading-6-font-size:18px]'
  }
  return 'text-2xl [--heading-1-font-size:48px] [--heading-2-font-size:32px] [--heading-3-font-size:26px] [--heading-4-font-size:24px] [--heading-5-font-size:22px] [--heading-6-font-size:20px]'
}
