// @vitest-environment nuxt
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { nextTick, ref } from 'vue'

import { reefDocumentKey, useReefDocument, useReefDocuments } from './reef-documents'
import type { MyDocument, MyDocuments } from './reef'
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

const requestedDocs = (): string[] => getMyDocuments.mock.calls.flatMap(([docs]) => docs as string[])

describe('reefDocumentKey', () => {
  test('is the compact identifier Reef canonicalizes to', () => {
    expect(reefDocumentKey(9110)).toBe('rfc9110')
  })

  test('reads a bare number as the RFC an RFC page means by one', () => {
    expect(reefDocumentKey(14)).toBe('rfc14')
  })

  test('names the series for anything that is not an RFC', () => {
    expect(reefDocumentKey({ type: 'bcp', number: 14 })).toBe('bcp14')
    expect(reefDocumentKey({ type: 'std', number: 66 })).toBe('std66')
    expect(reefDocumentKey({ type: 'fyi', number: 36 })).toBe('fyi36')
  })

  test('tells a subseries from the RFC sharing its number', () => {
    expect(reefDocumentKey({ type: 'bcp', number: 14 })).not.toBe(reefDocumentKey(14))
  })
})

describe('useReefDocument', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getMyDocuments.mockReset()
    getMyDocuments.mockImplementation(
      (docs: string[]): Promise<MyDocuments> => Promise.resolve({ sets: [], documents: docs.map((doc) => row(doc)) })
    )
  })

  test('asks Reef for nothing of its own', async () => {
    useReefDocument(9110)
    await nextTick()
    expect(getMyDocuments).not.toHaveBeenCalled()
  })

  test('reads what the store holds for this document', async () => {
    useAuthStore().setUser({ sub: 'reader-1' })
    getMyDocuments.mockResolvedValue({
      sets: [],
      documents: [row('rfc9110', { your_rating: 4, your_subscription_id: 7, your_set_ids: ['set-a'] })]
    })
    const reefStore = useReefStore()
    reefStore.seedStats('rfc9110', { subscriberCount: 12 })

    const document = useReefDocument(9110)
    await reefStore.ensureDocuments(['rfc9110'])

    expect(document.stats.value).toEqual({ subscriberCount: 12 })
    expect(document.yourRating.value).toBe(4)
    expect(document.isSubscribed.value).toBe(true)
    expect(document.yourSubscriptionId.value).toBe(7)
    expect(document.yourSetIds.value).toEqual(['set-a'])
    expect(document.status.value).toBe('ready')
  })

  test('is empty rather than absent for a document nobody has asked about', () => {
    const document = useReefDocument(9110)
    expect(document.status.value).toBe('unknown')
    expect(document.yourRating.value).toBeUndefined()
    expect(document.isSubscribed.value).toBe(false)
    expect(document.yourSetIds.value).toEqual([])
  })

  test('follows the document it is given when the page navigates', async () => {
    useAuthStore().setUser({ sub: 'reader-1' })
    const reefStore = useReefStore()
    const rfcNumber = ref(9110)
    const document = useReefDocument(rfcNumber)

    reefStore.seedStats('rfc9110', { subscriberCount: 12 })
    reefStore.seedStats('rfc2119', { subscriberCount: 99 })
    expect(document.stats.value).toEqual({ subscriberCount: 12 })

    rfcNumber.value = 2119
    expect(document.stats.value).toEqual({ subscriberCount: 99 })
  })
})

describe('useReefDocuments', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getMyDocuments.mockReset()
    getMyDocuments.mockImplementation(
      (docs: string[]): Promise<MyDocuments> => Promise.resolve({ sets: [], documents: docs.map((doc) => row(doc)) })
    )
  })

  test('loads a whole list in one request', async () => {
    useAuthStore().setUser({ sub: 'reader-1' })

    useReefDocuments([9110, 2119, { type: 'bcp', number: 14 }])
    await nextTick()

    expect(getMyDocuments).toHaveBeenCalledTimes(1)
    expect(requestedDocs()).toEqual(['rfc9110', 'rfc2119', 'bcp14'])
  })

  test('asks for nothing while nobody is signed in', async () => {
    useReefDocuments([9110])
    await nextTick()
    expect(getMyDocuments).not.toHaveBeenCalled()
  })

  test('loads what is already on screen when a reader signs in', async () => {
    useReefDocuments([9110])
    await nextTick()
    expect(getMyDocuments).not.toHaveBeenCalled()

    useAuthStore().setUser({ sub: 'reader-1' })
    await nextTick()
    await nextTick()

    expect(requestedDocs()).toEqual(['rfc9110'])
  })

  test('asks only for the documents a next page adds', async () => {
    useAuthStore().setUser({ sub: 'reader-1' })
    const documents = ref<number[]>([1, 2, 3])
    useReefDocuments(documents)
    await nextTick()
    getMyDocuments.mockClear()

    documents.value = [2, 3, 4, 5]
    await nextTick()
    await nextTick()

    expect(requestedDocs()).toEqual(['rfc4', 'rfc5'])
  })

  test('does not reload a list that rerendered without changing', async () => {
    useAuthStore().setUser({ sub: 'reader-1' })
    const documents = ref([{ type: 'bcp' as const, number: 14 }])
    useReefDocuments(documents)
    await nextTick()
    getMyDocuments.mockClear()

    // A search result list rebuilds equal-but-new objects on every keystroke.
    documents.value = [{ type: 'bcp' as const, number: 14 }]
    await nextTick()
    await nextTick()

    expect(getMyDocuments).not.toHaveBeenCalled()
  })
})
