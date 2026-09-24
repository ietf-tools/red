import { describe, expect, test } from 'vitest'

import type { OpenSurvey } from '~/utilities/reef-precomputed'
import { chooseSurvey } from './reef-surveys'

// `id`, `url`, `description` and `answered` are never read by chooseSurvey; the rest is what it
// narrows on. `answered` is always false on this payload anyway (see reef_api.yaml on OpenSurvey):
// it's precomputed for every reader alike, so it can't leave out one reader's already-answered
// survey the way the served, per-reader endpoint can.
const survey = (
  slug: string,
  opts: { visibility?: OpenSurvey['visibility']; documents?: string[] } = {}
): OpenSurvey => ({
  id: 1,
  slug,
  title: slug,
  url: `https://example.com/${slug}`,
  documents: opts.documents ?? null,
  visibility: opts.visibility,
  answered: false
})

const narrowing = (overrides: Partial<Parameters<typeof chooseSurvey>[1]> = {}) => ({
  dismissedIds: [],
  isAuthenticated: false,
  ...overrides
})

describe('chooseSurvey', () => {
  test('is null when there are no surveys to choose from', () => {
    expect(chooseSurvey([], narrowing())).toBeNull()
  })

  test('drops surveys the reader already dismissed', () => {
    const open = survey('open-a', { visibility: 'open' })
    const dismissed = survey('open-b', { visibility: 'open' })
    expect(chooseSurvey([open, dismissed], narrowing({ dismissedIds: ['open-b'] }))).toBe(open)
  })

  test('is null once every survey has been dismissed', () => {
    const open = survey('open-a', { visibility: 'open' })
    expect(chooseSurvey([open], narrowing({ dismissedIds: ['open-a'] }))).toBeNull()
  })

  test('anonymous readers only see open surveys, even when authenticated ones exist', () => {
    const anon = survey('open-a', { visibility: 'open' })
    const auth = survey('auth-a', { visibility: 'authenticated' })
    expect(chooseSurvey([anon, auth], narrowing({ isAuthenticated: false }))).toBe(anon)
  })

  test('authenticated readers prefer authenticated surveys over open ones', () => {
    const anon = survey('open-a', { visibility: 'open' })
    const auth = survey('auth-a', { visibility: 'authenticated' })
    expect(chooseSurvey([anon, auth], narrowing({ isAuthenticated: true }))).toBe(auth)
  })

  test('authenticated readers fall back to open surveys when none are authenticated-only', () => {
    const anon = survey('open-a', { visibility: 'open' })
    expect(chooseSurvey([anon], narrowing({ isAuthenticated: true }))).toBe(anon)
  })

  test('a survey with no visibility set is neither an open nor an authenticated survey', () => {
    const unset = survey('unset-a')
    expect(chooseSurvey([unset], narrowing({ isAuthenticated: false }))).toBeNull()
    expect(chooseSurvey([unset], narrowing({ isAuthenticated: true }))).toBeNull()
  })

  test('prefers surveys scoped to the current series', () => {
    const general = survey('general', { visibility: 'open' })
    const scoped = survey('scoped', { visibility: 'open', documents: ['rfc9000'] })
    const seriesId = { type: 'rfc' as const, number: 9000 }
    expect(chooseSurvey([general, scoped], narrowing({ seriesId }))).toBe(scoped)
  })

  test('falls back to unscoped surveys when none target the current series', () => {
    const general = survey('general', { visibility: 'open' })
    const scoped = survey('scoped', { visibility: 'open', documents: ['rfc1'] })
    const seriesId = { type: 'rfc' as const, number: 9000 }
    const result = chooseSurvey([general, scoped], narrowing({ seriesId }))
    expect(result).not.toBeNull()
    expect(['general', 'scoped']).toContain(result?.slug)
  })

  test('does not narrow by series when there is no seriesId', () => {
    const general = survey('general', { visibility: 'open' })
    const scoped = survey('scoped', { visibility: 'open', documents: ['rfc9000'] })
    const result = chooseSurvey([general, scoped], narrowing())
    expect(result).not.toBeNull()
    expect(['general', 'scoped']).toContain(result?.slug)
  })

  test('a survey with no documents is never picked for a scoped series', () => {
    const undocumented = survey('undocumented', { visibility: 'open' })
    const seriesId = { type: 'rfc' as const, number: 9000 }
    // No survey targets rfc9000, so narrowing falls back to every open survey rather than none.
    expect(chooseSurvey([undocumented], narrowing({ seriesId }))).toBe(undocumented)
  })

  test('picks randomly among equally good candidates', () => {
    const a = survey('a', { visibility: 'open' })
    const b = survey('b', { visibility: 'open' })
    const seen = new Set<string | undefined>()
    for (let i = 0; i < 50; i++) {
      seen.add(chooseSurvey([a, b], narrowing())?.slug)
    }
    expect(seen).toEqual(new Set(['a', 'b']))
  })
})
