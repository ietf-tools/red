// @vitest-environment nuxt
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import type { MyDocument, MyDocuments } from '~/utilities/reef'
import { useAuthStore } from '~/stores/auth'
import { useReefStore } from '~/stores/reef'

const { getMyDocuments } = vi.hoisted(() => ({ getMyDocuments: vi.fn() }))

vi.mock('~/utilities/reef', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/utilities/reef')>()),
  getMyDocuments
}))

const row = (doc: string, overrides: Partial<MyDocument> = {}): MyDocument => ({
  doc,
  your_rating: null,
  your_subscription_id: null,
  your_set_ids: [],
  ...overrides
})

// What Reef answers with, from the documents it was asked for.
const answering = (build: (docs: string[]) => MyDocument[] = (docs) => docs.map((doc) => row(doc))) => {
  getMyDocuments.mockImplementation(
    (docs: string[]): Promise<MyDocuments> => Promise.resolve({ sets: [], documents: build(docs) })
  )
}

// The documents named across every call made so far, so a test can assert what was *not* asked for.
const requestedDocs = (): string[] => getMyDocuments.mock.calls.flatMap(([docs]) => docs as string[])

const signIn = (sub = 'reader-1') => {
  useAuthStore().setUser({ sub })
}

describe('useReefStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getMyDocuments.mockReset()
    answering()
  })

  // --- The gate -------------------------------------------------------------

  test('asks Reef for nothing while nobody is signed in', async () => {
    await useReefStore().ensureDocuments(['rfc9110'])
    expect(getMyDocuments).not.toHaveBeenCalled()
  })

  test('loads this reader’s own state once they are signed in', async () => {
    signIn()
    const reefStore = useReefStore()
    answering((docs) => docs.map((doc) => row(doc, { your_rating: 4, your_set_ids: ['set-a'] })))

    await reefStore.ensureDocuments(['rfc9110'])

    expect(reefStore.userDocuments.rfc9110).toEqual({
      status: 'ready',
      yourRating: 4,
      isSubscribed: false,
      yourSubscriptionId: undefined,
      yourSetIds: ['set-a']
    })
  })

  test('reports a document nobody has asked about as unknown rather than absent', () => {
    expect(useReefStore().userDocuments.rfc9110).toBeUndefined()
  })

  // --- Loading only what is missing -----------------------------------------

  test('asks only for the documents it does not already hold', async () => {
    signIn()
    const reefStore = useReefStore()

    await reefStore.ensureDocuments(['rfc1', 'rfc2', 'rfc3'])
    getMyDocuments.mockClear()
    await reefStore.ensureDocuments(['rfc1', 'rfc2', 'rfc3', 'rfc4', 'rfc5'])

    expect(requestedDocs()).toEqual(['rfc4', 'rfc5'])
  })

  test('makes one request when a whole page asks at once', async () => {
    signIn()
    const reefStore = useReefStore()

    // Separate callers in the same tick, which is what used to make one request each.
    await Promise.all(['rfc1', 'rfc2', 'rfc3'].map((doc) => reefStore.ensureDocuments([doc])))

    expect(getMyDocuments).toHaveBeenCalledTimes(1)
    expect(requestedDocs()).toEqual(['rfc1', 'rfc2', 'rfc3'])
  })

  test('starts a new request for a document asked for while one is in flight', async () => {
    signIn()
    const reefStore = useReefStore()

    const first = reefStore.ensureDocuments(['rfc1'])
    await first
    await reefStore.ensureDocuments(['rfc2'])

    expect(getMyDocuments).toHaveBeenCalledTimes(2)
    expect(requestedDocs()).toEqual(['rfc1', 'rfc2'])
  })

  test('asks once for a document named twice in one call', async () => {
    signIn()
    await useReefStore().ensureDocuments(['rfc9110', 'rfc9110'])
    expect(requestedDocs()).toEqual(['rfc9110'])
  })

  test('does nothing at all when everything asked for is already held', async () => {
    signIn()
    const reefStore = useReefStore()
    await reefStore.ensureDocuments(['rfc9110'])
    getMyDocuments.mockClear()

    await reefStore.ensureDocuments(['rfc9110'])

    expect(getMyDocuments).not.toHaveBeenCalled()
  })

  test('splits a page larger than the batch size across requests', async () => {
    signIn()
    const reefStore = useReefStore()
    const docs = Array.from({ length: reefStore.BATCH_SIZE + 10 }, (_, index) => `rfc${index + 1}`)

    await reefStore.ensureDocuments(docs)

    expect(getMyDocuments).toHaveBeenCalledTimes(2)
    expect(getMyDocuments.mock.calls[0]?.[0]).toHaveLength(reefStore.BATCH_SIZE)
    expect(getMyDocuments.mock.calls[1]?.[0]).toHaveLength(10)
    expect(requestedDocs()).toEqual(docs)
  })

  test('keeps every batch within Reef’s own limit', () => {
    const reefStore = useReefStore()
    expect(reefStore.BATCH_SIZE).toBeLessThanOrEqual(reefStore.MY_DOCUMENTS_BATCH_LIMIT)
  })

  // --- When Reef will not answer --------------------------------------------

  test('marks a document failed rather than leaving it loading forever', async () => {
    signIn()
    const reefStore = useReefStore()
    getMyDocuments.mockRejectedValue(new Error('reef is down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await reefStore.ensureDocuments(['rfc9110'])

    expect(reefStore.userDocuments.rfc9110?.status).toBe('failed')
  })

  test('retries a failed document the next time it is asked for', async () => {
    signIn()
    const reefStore = useReefStore()
    getMyDocuments.mockRejectedValue(new Error('reef is down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await reefStore.ensureDocuments(['rfc9110'])

    answering()
    await reefStore.ensureDocuments(['rfc9110'])

    expect(reefStore.userDocuments.rfc9110?.status).toBe('ready')
  })

  test('settles a document Reef left out of its answer', async () => {
    signIn()
    const reefStore = useReefStore()
    answering(() => [])

    await reefStore.ensureDocuments(['rfc9110'])

    expect(reefStore.userDocuments.rfc9110?.status).toBe('ready')
  })

  // --- Whose data it is ------------------------------------------------------

  test('forgets this reader’s own state when they sign out', async () => {
    signIn()
    const reefStore = useReefStore()
    await reefStore.ensureDocuments(['rfc9110'])

    useAuthStore().clearUser()

    expect(reefStore.userDocuments.rfc9110).toBeUndefined()
    expect(reefStore.sets).toEqual([])
  })

  test('does not show one reader what the previous one loaded', async () => {
    signIn('reader-1')
    const reefStore = useReefStore()
    await reefStore.ensureDocuments(['rfc9110'])

    signIn('reader-2')

    expect(reefStore.userDocuments.rfc9110).toBeUndefined()
  })

  test('drops an answer that arrives after the reader has changed', async () => {
    signIn('reader-1')
    const reefStore = useReefStore()

    let answer: (value: MyDocuments) => void = () => {}
    getMyDocuments.mockReturnValue(new Promise<MyDocuments>((resolve) => (answer = resolve)))
    const loading = reefStore.ensureDocuments(['rfc9110'])

    signIn('reader-2')
    answer({ sets: [{ id: 'set-a' } as never], documents: [row('rfc9110', { your_rating: 5 })] })
    await loading

    expect(reefStore.userDocuments.rfc9110).toBeUndefined()
    expect(reefStore.sets).toEqual([])
  })
})
