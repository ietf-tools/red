// @vitest-environment nuxt
//
// The dev-fixture branch of reefFetch: what it answers with, what it leaves to the real Reef, and
// that a fixtured failure arrives as the same ReefError a real failure would. What each scenario
// answers with is covered in ./reef-fixtures/index.test.ts.
//
// answerFromFixtures is called directly rather than through getSubjects and friends, because
// reefFetch reaches it behind `import.meta.dev` and that is false in this environment — going
// through the operations would test the guard being off, not the fixtures being right.
import { describe, expect, test } from 'vitest'
import { answerFromFixtures, ReefError, type Subject } from './reef'
import { subjectsFixture } from './reef-fixtures/subjects'

const answer = (configured: string, method: string, path: string) =>
  answerFromFixtures<unknown>({ configured, method, path })

describe('answerFromFixtures', () => {
  test('answers a fixtured operation with its fixture', async () => {
    await expect(answer('on', 'GET', '/api/reef/subjects/')).resolves.toEqual({
      answered: true,
      body: subjectsFixture
    })
  })

  // The types the operations are declared with are the fixtures' too, so what a page destructures
  // off a real answer is there on a fixtured one.
  test('answers in the shape the operation is typed to return', async () => {
    const fixture = await answerFromFixtures<Subject[]>({
      configured: 'on',
      method: 'GET',
      path: '/api/reef/subjects/'
    })

    expect(fixture.answered && fixture.body.every(({ slug, name }) => slug !== '' && name !== '')).toBe(true)
  })

  test('leaves an operation with no fixture to the real Reef', async () => {
    await expect(answer('on', 'GET', '/api/reef/sets/')).resolves.toEqual({ answered: false })
  })

  test('raises a fixtured failure as the ReefError a real failure would raise', async () => {
    const thrown = await answer('error', 'GET', '/api/reef/subjects/').catch((error: unknown) => error)

    expect(thrown).toBeInstanceOf(ReefError)
    expect(thrown).toMatchObject({ status: 500 })
  })

  // The /subjects/<slug>/ page tells a subject that isn't there from a load that failed by the 404,
  // so an unknown slug has to raise one rather than answer with nothing.
  test('raises a 404 for a subject the fixtures do not have', async () => {
    await expect(answer('on', 'GET', '/api/reef/subjects/no-such-subject/')).rejects.toMatchObject({
      name: 'ReefError',
      status: 404
    })
  })

  // The error says which request it was for, the same thing a real ReefError carries — which is what
  // makes a fixture that is failing on purpose legible in the console.
  test('names the request in the error it raises', async () => {
    await expect(answer('error', 'GET', '/api/reef/subjects/')).rejects.toThrow('GET /api/reef/subjects/')
  })
})
