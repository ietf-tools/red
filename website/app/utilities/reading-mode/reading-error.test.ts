import { describe, expect, test } from 'vitest'
import { classifySpeechError, describeReadingError, type ReadingError } from './reading-error'

describe('classifySpeechError', () => {
  test.each(['synthesis-failed', 'synthesis-unavailable', 'language-unavailable', 'voice-unavailable'])(
    '%s with no voices at all is a no-voices failure',
    (code) => {
      expect(classifySpeechError(code, true)).toEqual({ kind: 'no-voices' })
    }
  )

  test('a voice error with voices present is a voice failure, not a no-voices one', () => {
    expect(classifySpeechError('synthesis-failed', false)).toEqual({ kind: 'voice-failed' })
  })

  test('not-allowed is blocked', () => {
    expect(classifySpeechError('not-allowed', false)).toEqual({ kind: 'blocked' })
  })

  test('anything else keeps its code', () => {
    expect(classifySpeechError('audio-busy', false)).toEqual({ kind: 'unexpected', code: 'audio-busy' })
  })
})

describe('describeReadingError', () => {
  const everyKind: ReadingError[] = [
    { kind: 'no-voices' },
    { kind: 'unsupported' },
    { kind: 'blocked' },
    { kind: 'voice-failed' },
    { kind: 'unexpected', code: 'audio-busy' }
  ]

  test('gives every kind a title and a description', () => {
    for (const error of everyKind) {
      const { title, description } = describeReadingError(error)
      expect(title.length).toBeGreaterThan(0)
      expect(description.length).toBeGreaterThan(0)
    }
  })

  test('puts the browser error code in the unexpected description', () => {
    expect(describeReadingError({ kind: 'unexpected', code: 'audio-busy' }).description).toContain('audio-busy')
  })

  test('only links to https pages', () => {
    for (const error of everyKind) {
      const { link } = describeReadingError(error)
      expect(link === undefined || link.href.startsWith('https://')).toBe(true)
    }
  })
})
