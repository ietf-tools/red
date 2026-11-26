import { describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  DEFAULT_TEXT_SPACING_STEPS,
  LETTER_SPACING_CLASSES,
  LETTER_SPACING_VALUES,
  LINE_SPACING_CLASSES,
  LINE_SPACING_VALUES,
  PARAGRAPH_SPACING_CLASSES,
  PARAGRAPH_SPACING_VALUES,
  WORD_SPACING_CLASSES,
  WORD_SPACING_RATIO,
  WORD_SPACING_VALUES,
  describeStep,
  effectiveWordSpacingStep,
  textSizeClasses,
  textSpacingAttributes,
  textSpacingClasses
} from './text-spacing'
import {
  citationThresholdEm,
  generateTailwindCss,
  generateWordBreakCss,
  wordBreakThresholdEm
} from './text-spacing-css'

describe('step tables', () => {
  test('each table has one class per step', () => {
    expect(LINE_SPACING_CLASSES).toHaveLength(LINE_SPACING_VALUES.length)
    expect(LETTER_SPACING_CLASSES).toHaveLength(LETTER_SPACING_VALUES.length)
    expect(WORD_SPACING_CLASSES).toHaveLength(WORD_SPACING_VALUES.length)
    expect(PARAGRAPH_SPACING_CLASSES).toHaveLength(PARAGRAPH_SPACING_VALUES.length)
  })

  test('ladders ascend, so a higher step is always more spacing', () => {
    for (const values of [LINE_SPACING_VALUES, LETTER_SPACING_VALUES, WORD_SPACING_VALUES, PARAGRAPH_SPACING_VALUES]) {
      expect(values).toEqual([...values].sort((a, b) => a - b))
    }
  })

  test('word spacing at each step keeps the ratio to letter spacing', () => {
    LETTER_SPACING_VALUES.forEach((letterValue, step) => {
      expect(WORD_SPACING_VALUES[step]).toBeGreaterThanOrEqual(letterValue * WORD_SPACING_RATIO - 0.001)
    })
  })
})

describe('textSpacingClasses', () => {
  test('at the defaults only sets the line spacing the document already had', () => {
    expect(textSpacingClasses(DEFAULT_TEXT_SPACING_STEPS)).toBe('leading-normal')
  })

  test('adds a class for each changed property', () => {
    expect(textSpacingClasses({ lineSpacing: 5, letterSpacing: 2, wordSpacing: 2, paragraphSpacing: 3 })).toBe(
      'leading-loose tracking-reader-2 word-spacing-reader-2 paragraph-spacing-reader-4'
    )
  })

  test('raises word spacing to the letter spacing step so words never fall behind', () => {
    expect(effectiveWordSpacingStep({ ...DEFAULT_TEXT_SPACING_STEPS, letterSpacing: 4, wordSpacing: 1 })).toBe(4)
    expect(textSpacingClasses({ ...DEFAULT_TEXT_SPACING_STEPS, letterSpacing: 4, wordSpacing: 1 })).toContain(
      'word-spacing-reader-4'
    )
  })
})

describe('textSpacingAttributes', () => {
  test('are absent at the defaults', () => {
    expect(textSpacingAttributes(DEFAULT_TEXT_SPACING_STEPS)).toEqual({
      'data-letter-step': undefined,
      'data-word-step': undefined
    })
  })

  test('word step follows the effective word spacing', () => {
    expect(textSpacingAttributes({ ...DEFAULT_TEXT_SPACING_STEPS, letterSpacing: 3 })).toEqual({
      'data-letter-step': 3,
      'data-word-step': 3
    })
  })
})

describe('describeStep', () => {
  test.each([
    [3, 3, 'Default'],
    [5, 3, '+2'],
    [1, 3, '−2']
  ])('step %i against default %i reads %s', (step, defaultStep, expected) => {
    expect(describeStep(step, defaultStep)).toBe(expected)
  })
})

describe('textSizeClasses', () => {
  test('sets only the size, never any spacing', () => {
    for (const scale of [1, 1.1, 1.2, 1.3, 1.4, 1.5]) {
      expect(textSizeClasses(scale)).not.toMatch(/leading-|tracking-|word-spacing|paragraph-spacing/)
    }
  })
})

describe('generated stylesheets', () => {
  const cssDirectory = resolve(import.meta.dirname, '..', 'assets', 'css')

  test('match what the generator produces, so a table change cannot be left unregenerated', () => {
    expect(readFileSync(resolve(cssDirectory, 'text-spacing.generated.css'), 'utf8')).toBe(generateTailwindCss())
    expect(readFileSync(resolve(cssDirectory, 'xml2rfc-text-spacing.generated.css'), 'utf8')).toBe(
      generateWordBreakCss()
    )
  })

  test('a spaced threshold is never below the unscaled one, so it can only keep more breaks', () => {
    for (const tier of [4, 6, 8, 10, 12, 16, 24]) {
      LETTER_SPACING_VALUES.forEach((letterValue) => {
        expect(wordBreakThresholdEm(tier, letterValue)).toBeGreaterThanOrEqual(wordBreakThresholdEm(tier, 0))
      })
      WORD_SPACING_VALUES.forEach((wordValue) => {
        expect(citationThresholdEm(tier, wordValue)).toBeGreaterThanOrEqual(citationThresholdEm(tier, 0))
      })
    }
  })

  test('at no spacing the thresholds are the unscaled ones in xml2rfc.css', () => {
    expect(wordBreakThresholdEm(4, 0)).toBeCloseTo(4.8)
    expect(wordBreakThresholdEm(24, 0)).toBeCloseTo(28.8)
  })
})
