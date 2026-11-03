// @vitest-environment nuxt
import { defineComponent } from 'vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'

import { useUserSets } from './reef-sets'
import { useAuthStore } from '~/stores/auth'
import { useNotificationsStore } from '~/stores/notifications'
import { useReefStore } from '~/stores/reef'

const reef = vi.hoisted(() => ({
  getSubscriptions: vi.fn(),
  getSets: vi.fn(),
  putSetDocument: vi.fn(),
  deleteSetDocument: vi.fn(),
  createSet: vi.fn()
}))

vi.mock('~/utilities/reef', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/utilities/reef')>()),
  ...reef
}))

const SetsHarness = defineComponent({
  setup: () => useUserSets(9110)
})

const loadedSet = (id: string, title: string, holdsRFC = false) => ({
  id,
  title,
  description: '',
  created_at: '2026-08-18T00:00:00Z',
  updated_at: '2026-08-18T00:00:00Z',
  documents: holdsRFC ? [{ doc: 'rfc9110', rank: 0, added_at: '' }] : []
})

const signedInWith = async (sets: ReturnType<typeof loadedSet>[]) => {
  reef.getSets.mockResolvedValue(sets)
  useAuthStore().setUser({ sub: 'reader-1' })
  await vi.waitFor(() => expect(useReefStore().status.sets.type).toBe('success'))
}

describe('useUserSets syncStatus', () => {
  enableAutoUnmount(afterEach)

  beforeEach(() => {
    Object.values(reef).forEach((fn) => fn.mockReset())
    reef.getSubscriptions.mockResolvedValue([])
    vi.spyOn(console, 'error').mockImplementation(() => {})
    useAuthStore().clearUser()
    useNotificationsStore().queue = []
  })

  test('is loading while any change is in flight, then success', async () => {
    await signedInWith([loadedSet('set-a', 'Reading list'), loadedSet('set-b', 'Work')])
    let confirmA: (value: unknown) => void = () => {}
    reef.putSetDocument.mockImplementation((setId: string) =>
      setId === 'set-a' ? new Promise((resolve) => (confirmA = resolve)) : Promise.resolve({})
    )
    const harness = await mountSuspended(SetsHarness)
    expect(harness.vm.syncStatus).toEqual({ type: 'idle' })

    harness.vm.setIdsWithThisRFC = ['set-a', 'set-b']
    await vi.waitFor(() => expect(reef.putSetDocument).toHaveBeenCalledTimes(2))
    expect(harness.vm.syncStatus).toEqual({ type: 'loading' })

    confirmA({})
    await vi.waitFor(() => expect(harness.vm.syncStatus).toEqual({ type: 'success' }))
  })

  test('names the set that was refused, and retry repeats it', async () => {
    await signedInWith([loadedSet('set-a', 'Works'), loadedSet('set-b', 'Fails')])
    reef.putSetDocument.mockImplementation(async (setId: string) => {
      if (setId === 'set-b') {
        throw new Error('nope')
      }
      return {}
    })
    const harness = await mountSuspended(SetsHarness)

    harness.vm.setIdsWithThisRFC = ['set-a', 'set-b']
    await vi.waitFor(() => expect(harness.vm.syncStatus.type).toBe('error'))
    expect(harness.vm.syncStatus).toEqual({
      type: 'error',
      message: 'RFC 9110 has not been added to “Fails”. Please try again.'
    })
    expect(harness.vm.setIdsWithThisRFC).toEqual(['set-a'])

    reef.putSetDocument.mockResolvedValue({})
    harness.vm.retry()
    await vi.waitFor(() => expect(harness.vm.syncStatus).toEqual({ type: 'success' }))
    expect(harness.vm.setIdsWithThisRFC).toEqual(['set-a', 'set-b'])
  })

  test('names every set that was refused, adds and removals together', async () => {
    await signedInWith([loadedSet('set-a', 'Alpha'), loadedSet('set-b', 'Beta'), loadedSet('set-c', 'Gamma', true)])
    reef.putSetDocument.mockRejectedValue(new Error('nope'))
    reef.deleteSetDocument.mockRejectedValue(new Error('nope'))
    const harness = await mountSuspended(SetsHarness)

    harness.vm.setIdsWithThisRFC = ['set-a', 'set-b']
    await vi.waitFor(() => expect(harness.vm.syncStatus.type).toBe('error'))

    expect(harness.vm.syncStatus).toEqual({
      type: 'error',
      message: 'RFC 9110 has not been added to “Alpha” and “Beta”, and is still in “Gamma”. Please try again.'
    })
  })

  test('is not left in error by a refusal the reader has already moved on from', async () => {
    await signedInWith([loadedSet('set-a', 'Reading list')])
    let refuse: (error: Error) => void = () => {}
    reef.putSetDocument.mockReturnValue(new Promise((_, reject) => (refuse = reject)))
    reef.deleteSetDocument.mockResolvedValue(undefined)
    const harness = await mountSuspended(SetsHarness)

    harness.vm.setIdsWithThisRFC = ['set-a']
    harness.vm.setIdsWithThisRFC = []
    refuse(new Error('nope'))

    await vi.waitFor(() => expect(harness.vm.syncStatus).toEqual({ type: 'success' }))
  })

  test('counts the change that puts a newly created set in', async () => {
    await signedInWith([])
    reef.createSet.mockResolvedValue({
      id: 'set-new',
      title: 'Fresh',
      description: null,
      created_at: '2026-08-18T00:00:00Z',
      updated_at: '2026-08-18T00:00:00Z'
    })
    let confirm: (value: unknown) => void = () => {}
    reef.putSetDocument.mockReturnValue(new Promise((resolve) => (confirm = resolve)))
    const harness = await mountSuspended(SetsHarness)

    await harness.vm.createSet({ title: 'Fresh', description: '' })
    expect(harness.vm.syncStatus).toEqual({ type: 'loading' })

    confirm({})
    await vi.waitFor(() => expect(harness.vm.syncStatus).toEqual({ type: 'success' }))
  })
})
