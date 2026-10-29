import { describe, expect, test } from 'vitest'
import { detectPlatform, NO_VOICES_ADVICE } from './no-voices-advice'

describe('detectPlatform', () => {
  test.each([
    ['Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36', 'linux'],
    ['Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/155.0.0.0 Mobile Safari/537.36', 'android'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', 'apple'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148', 'apple'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/155.0.0.0 Safari/537.36', 'windows'],
    ['Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 Chrome/155.0.0.0 Safari/537.36', 'linux'],
    ['SomethingElse/1.0', 'other']
  ])('%s is %s', (userAgent, platform) => {
    expect(detectPlatform(userAgent)).toBe(platform)
  })

  test('has a summary for every platform it can return', () => {
    for (const advice of Object.values(NO_VOICES_ADVICE)) {
      expect(advice.summary.length).toBeGreaterThan(0)
    }
  })

  test('only points at https pages, and gives no commands to run', () => {
    for (const { links, summary } of Object.values(NO_VOICES_ADVICE)) {
      expect(links.every(({ href }) => href.startsWith('https://'))).toBe(true)
      expect(summary).not.toMatch(/\bsudo\b|\bapt\b|\bdnf\b/)
    }
  })
})
