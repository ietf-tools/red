// The dev-fixture dispatch: which requests it answers, which it leaves to the real Reef, and what
// each scenario changes about the answer. reefFetch's side of it — reaching this ahead of the auth
// guard, turning an `error` outcome back into a ReefError — is covered where reefFetch is tested;
// what's here is the table itself.
import { afterEach, describe, expect, test, vi } from 'vitest'
import { fixtureFor } from './index'
import {
  emptySubjectDetailFixture,
  retiredSubjectFixture,
  subjectAliasFixture,
  subjectDetailFixture,
  subjectsFixture
} from './subjects'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('fixtureFor', () => {
  test('answers the subject vocabulary with the fixture, in the order the index renders it', async () => {
    await expect(fixtureFor('on', 'GET', '/api/reef/subjects/')).resolves.toEqual({
      outcome: 'answer',
      body: subjectsFixture
    })
  })

  test('answers a subject detail path by slug', async () => {
    await expect(fixtureFor('on', 'GET', '/api/reef/subjects/networking/')).resolves.toEqual({
      outcome: 'answer',
      body: subjectDetailFixture
    })
  })

  // The third shape the detail path answers with, and the one a dev server needs in order to reach
  // the redirect an alias is for.
  test('answers an alias with the subject it resolves to', async () => {
    await expect(fixtureFor('on', 'GET', '/api/reef/subjects/authn/')).resolves.toEqual({
      outcome: 'answer',
      body: subjectAliasFixture
    })
  })

  test('answers a percent-encoded slug the same as its plain form', async () => {
    const encoded = await fixtureFor('on', 'GET', '/api/reef/subjects/packet%2Dswitching/')

    expect(encoded).toEqual({ outcome: 'answer', body: retiredSubjectFixture })
  })

  // The /subjects/<slug>/ page has a branch for a subject that isn't there, and it can only be
  // reached if an unknown slug arrives as a 404 rather than falling through to a real Reef.
  test('answers an unknown slug with a 404 rather than leaving it to Reef', async () => {
    const result = await fixtureFor('on', 'GET', '/api/reef/subjects/no-such-subject/')

    expect(result).toMatchObject({ outcome: 'error', status: 404 })
  })

  test('leaves an operation with no fixture to the real Reef', async () => {
    await expect(fixtureFor('on', 'GET', '/api/reef/sets/')).resolves.toBeUndefined()
    await expect(fixtureFor('on', 'POST', '/api/reef/subjects/')).resolves.toBeUndefined()
  })

  describe('the empty scenario', () => {
    test('empties the vocabulary', async () => {
      await expect(fixtureFor('empty', 'GET', '/api/reef/subjects/')).resolves.toEqual({
        outcome: 'answer',
        body: []
      })
    })

    test('empties a subject of its documents without changing anything else about it', async () => {
      await expect(fixtureFor('empty', 'GET', '/api/reef/subjects/networking/')).resolves.toEqual({
        outcome: 'answer',
        body: { ...subjectDetailFixture, documents: [] }
      })
    })

    // Neither redirect carries membership, so there is nothing to empty and both have to arrive
    // intact — the page redirects on them, and a mangled one would redirect nowhere.
    test('leaves a retired subject as it is', async () => {
      await expect(fixtureFor('empty', 'GET', '/api/reef/subjects/packet-switching/')).resolves.toEqual({
        outcome: 'answer',
        body: retiredSubjectFixture
      })
    })

    test('leaves an alias as it is', async () => {
      await expect(fixtureFor('empty', 'GET', '/api/reef/subjects/authn/')).resolves.toEqual({
        outcome: 'answer',
        body: subjectAliasFixture
      })
    })

    // Distinct from the empty scenario: this subject is empty in the fixture itself, which is what
    // makes the "nothing carries this yet" state reachable while the rest of the data is populated.
    test('is not the only way to reach an empty subject', async () => {
      await expect(fixtureFor('on', 'GET', '/api/reef/subjects/aerospace/')).resolves.toEqual({
        outcome: 'answer',
        body: emptySubjectDetailFixture
      })
    })
  })

  test('the error scenario fails every path it has a fixture for, and only those', async () => {
    const failed = await fixtureFor('error', 'GET', '/api/reef/subjects/')
    const unfixtured = await fixtureFor('error', 'GET', '/api/reef/sets/')

    expect(failed).toMatchObject({ outcome: 'error', status: 500 })
    expect(unfixtured).toBeUndefined()
  })

  test('the slow scenario holds its answer back', async () => {
    vi.useFakeTimers()
    const pending = fixtureFor('slow', 'GET', '/api/reef/subjects/')
    let settled = false
    void pending.then(() => {
      settled = true
    })

    await vi.advanceTimersByTimeAsync(0)
    expect(settled).toBe(false)

    await vi.advanceTimersByTimeAsync(5000)
    await expect(pending).resolves.toEqual({ outcome: 'answer', body: subjectsFixture })
  })

  describe('the flag value', () => {
    test('reads the values a flag gets set to by reflex as the populated scenario', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await expect(fixtureFor('1', 'GET', '/api/reef/subjects/')).resolves.toEqual({
        outcome: 'answer',
        body: subjectsFixture
      })
      await expect(fixtureFor('true', 'GET', '/api/reef/subjects/')).resolves.toEqual({
        outcome: 'answer',
        body: subjectsFixture
      })
      expect(warn).not.toHaveBeenCalled()
    })

    // A misspelled scenario reads as `on`, which looks like the scenario silently not working. The
    // warning is the only thing that distinguishes the two, so it is part of the behaviour.
    test('warns when the value was meant to be a scenario and was not spelled like one', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await expect(fixtureFor('slowly', 'GET', '/api/reef/subjects/')).resolves.toEqual({
        outcome: 'answer',
        body: subjectsFixture
      })
      expect(warn).toHaveBeenCalledOnce()
    })
  })
})
