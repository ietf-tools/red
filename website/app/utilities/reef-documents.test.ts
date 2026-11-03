// @vitest-environment nuxt
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { ref } from 'vue'

import { reefDocumentKey, useReefDocument } from './reef-documents'
import { useAuthStore } from '~/stores/auth'
import { useReefStore } from '~/stores/reef'

const reef = vi.hoisted(() => ({
  getSubscriptions: vi.fn(),
  getSets: vi.fn()
}))

vi.mock('~/utilities/reef', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/utilities/reef')>()),
  ...reef
}))

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
    Object.values(reef).forEach((fn) => fn.mockReset())
    reef.getSubscriptions.mockResolvedValue([])
    reef.getSets.mockResolvedValue([])
  })

  const loadedStore = async () => {
    useAuthStore().setUser({ sub: 'reader-1' })
    const reefStore = useReefStore()
    await vi.waitFor(() => expect(reefStore.status.sets.type).toBe('success'))
    return reefStore
  }

  test('asks Reef for nothing of its own', () => {
    useReefDocument(9110)
    expect(reef.getSubscriptions).not.toHaveBeenCalled()
    expect(reef.getSets).not.toHaveBeenCalled()
  })

  test('reads what the store holds for this document', async () => {
    reef.getSubscriptions.mockResolvedValue([
      { id: 7, kind: 'rfc', params: { rfc: 'rfc9110' }, created_at: '2026-08-18T00:00:00Z' }
    ])
    reef.getSets.mockResolvedValue([
      { id: 'set-a', title: 'A', description: '', documents: [{ doc: 'rfc9110', rank: 0, added_at: '' }] }
    ])
    const document = useReefDocument(9110)
    await loadedStore()

    expect(document.isSubscribed.value).toBe(true)
    expect(document.yourSetIds.value).toEqual(['set-a'])
  })

  test('is empty rather than absent for a document the reader has done nothing with', async () => {
    const document = useReefDocument(9110)
    await loadedStore()

    expect(document.isSubscribed.value).toBe(false)
    expect(document.yourSetIds.value).toEqual([])
  })

  test('is subscribed to the document itself, not to the RFC sharing its number', async () => {
    reef.getSubscriptions.mockResolvedValue([
      { id: 7, kind: 'rfc', params: { rfc: 'bcp14' }, created_at: '2026-08-18T00:00:00Z' }
    ])
    const subseries = useReefDocument({ type: 'bcp', number: 14 })
    const rfc = useReefDocument(14)
    await loadedStore()

    expect(subseries.isSubscribed.value).toBe(true)
    expect(rfc.isSubscribed.value).toBe(false)
  })

  test('follows the document it is given when the page navigates', async () => {
    reef.getSets.mockResolvedValue([
      { id: 'set-a', title: 'A', description: '', documents: [{ doc: 'rfc9110', rank: 0, added_at: '' }] },
      { id: 'set-b', title: 'B', description: '', documents: [{ doc: 'rfc2119', rank: 0, added_at: '' }] }
    ])
    await loadedStore()

    const rfcNumber = ref(9110)
    const document = useReefDocument(rfcNumber)
    expect(document.yourSetIds.value).toEqual(['set-a'])

    rfcNumber.value = 2119
    expect(document.yourSetIds.value).toEqual(['set-b'])
  })
})
