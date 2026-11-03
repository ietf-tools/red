// @vitest-environment nuxt
import { defineComponent } from 'vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'

import { useUserRFCSubscription, useUserSubscription } from './reef-subscriptions'
import { useAuthStore } from '~/stores/auth'
import { useNotificationsStore } from '~/stores/notifications'
import { useReefStore } from '~/stores/reef'

const reef = vi.hoisted(() => ({
  getSubscriptions: vi.fn(),
  getSets: vi.fn(),
  createSubscription: vi.fn(),
  deleteSubscription: vi.fn()
}))

vi.mock('~/utilities/reef', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/utilities/reef')>()),
  ...reef
}))

// A harness rather than mounting a dialog itself: what's under test is the model — read from the
// store, written back on change — not the dialog chrome around it.
const NewRfcHarness = defineComponent({
  setup: () => useUserSubscription({ kind: 'new_rfc' }, 'new RFCs')
})

const SubjectHarness = defineComponent({
  setup: () => useUserSubscription({ kind: 'subject', subject: 9 }, 'Applications')
})

const DocumentHarness = defineComponent({
  setup: () => useUserRFCSubscription(9110)
})

const existing = (overrides = {}) => ({
  id: 42,
  kind: 'new_rfc',
  params: {},
  created_at: '2026-08-18T00:00:00Z',
  ...overrides
})

const signedInWith = async (subscriptions: unknown[]) => {
  reef.getSubscriptions.mockResolvedValue(subscriptions)
  useAuthStore().setUser({ sub: 'reader-1' })
  const reefStore = useReefStore()
  await vi.waitFor(() => expect(reefStore.status.subscriptions.type).toBe('success'))
}

describe('useUserSubscription', () => {
  enableAutoUnmount(afterEach)

  beforeEach(() => {
    Object.values(reef).forEach((fn) => fn.mockReset())
    reef.getSets.mockResolvedValue([])
    vi.spyOn(console, 'error').mockImplementation(() => {})
    useAuthStore().clearUser()
    useNotificationsStore().queue = []
  })

  test('stays unticked, and asks Reef nothing, while signed out', async () => {
    const harness = await mountSuspended(NewRfcHarness)

    expect(harness.vm.isSubscribed).toBe(false)
    expect(reef.getSubscriptions).not.toHaveBeenCalled()
  })

  test('fetches nothing of its own once signed in: the store has it', async () => {
    await signedInWith([existing()])
    reef.getSubscriptions.mockClear()

    const harness = await mountSuspended(NewRfcHarness)

    expect(harness.vm.isSubscribed).toBe(true)
    expect(reef.getSubscriptions).not.toHaveBeenCalled()
  })

  test('reflects an existing new_rfc subscription once signed in', async () => {
    await signedInWith([existing()])
    const harness = await mountSuspended(NewRfcHarness)
    expect(harness.vm.isSubscribed).toBe(true)
  })

  test('defaults to unticked when signed in with no new_rfc subscription', async () => {
    await signedInWith([existing({ id: 1, kind: 'rfc', params: { rfc: 'rfc9110' } })])
    const harness = await mountSuspended(NewRfcHarness)
    expect(harness.vm.isSubscribed).toBe(false)
  })

  test('says it is loading until the subscriptions have arrived', async () => {
    let answer: (value: unknown[]) => void = () => {}
    reef.getSubscriptions.mockReturnValue(new Promise((resolve) => (answer = resolve)))
    useAuthStore().setUser({ sub: 'reader-1' })

    const harness = await mountSuspended(NewRfcHarness)
    expect(harness.vm.status).toEqual({ type: 'loading' })

    answer([])
    await vi.waitFor(() => expect(harness.vm.status).toEqual({ type: 'success' }))
  })

  test('ticks before Reef has assigned an id, and keeps the id it assigns', async () => {
    await signedInWith([])
    let confirm: (value: unknown) => void = () => {}
    reef.createSubscription.mockReturnValue(new Promise((resolve) => (confirm = resolve)))
    reef.deleteSubscription.mockResolvedValue(undefined)
    const harness = await mountSuspended(NewRfcHarness)

    harness.vm.isSubscribed = true
    expect(harness.vm.isSubscribed).toBe(true)
    confirm(existing({ id: 812 }))
    await vi.waitFor(() => expect(reef.createSubscription).toHaveBeenCalledWith({ kind: 'new_rfc' }))
    await vi.waitFor(() => expect(useReefStore().subscriptionByKey.get('new_rfc')?.id).toBe(812))
    expect(harness.vm.isSubscribed).toBe(true)

    harness.vm.isSubscribed = false
    await vi.waitFor(() => expect(reef.deleteSubscription).toHaveBeenCalledWith(812))
    await vi.waitFor(() => expect(harness.vm.isSubscribed).toBe(false))
  })

  test('removes the subscription a tick made when it is unticked straight away', async () => {
    // Queued rather than cancelled, and decided when each write runs: the unsubscribe has no id when
    // it is asked for, because the subscribe it follows hasn't been answered.
    await signedInWith([])
    reef.createSubscription.mockResolvedValue(existing({ id: 812 }))
    reef.deleteSubscription.mockResolvedValue(undefined)
    const harness = await mountSuspended(NewRfcHarness)

    harness.vm.isSubscribed = true
    harness.vm.isSubscribed = false

    await vi.waitFor(() => expect(reef.deleteSubscription).toHaveBeenCalledWith(812))
    await vi.waitFor(() => expect(harness.vm.isSubscribed).toBe(false))
    expect(useReefStore().subscriptions).toEqual([])
  })

  test('unticks and says so when Reef refuses', async () => {
    await signedInWith([])
    reef.createSubscription.mockRejectedValue(new Error('nope'))
    const harness = await mountSuspended(NewRfcHarness)

    harness.vm.isSubscribed = true
    await vi.waitFor(() => expect(harness.vm.isSubscribed).toBe(false))
    expect(useNotificationsStore().queue.map(({ title }) => title)).toContain('Unable to subscribe')
  })

  test('stays ticked and says so when Reef refuses an unsubscribe', async () => {
    await signedInWith([existing()])
    reef.deleteSubscription.mockRejectedValue(new Error('nope'))
    const harness = await mountSuspended(NewRfcHarness)

    harness.vm.isSubscribed = false
    await vi.waitFor(() => expect(harness.vm.isSubscribed).toBe(true))
    expect(useNotificationsStore().queue.map(({ title }) => title)).toContain('Unable to unsubscribe')
  })

  test('syncStatus follows a save: loading while it is in flight, then success', async () => {
    await signedInWith([])
    let confirm: (value: unknown) => void = () => {}
    reef.createSubscription.mockReturnValue(new Promise((resolve) => (confirm = resolve)))
    const harness = await mountSuspended(NewRfcHarness)
    expect(harness.vm.syncStatus).toEqual({ type: 'idle' })

    harness.vm.isSubscribed = true
    expect(harness.vm.syncStatus).toEqual({ type: 'loading' })

    confirm(existing({ id: 812 }))
    await vi.waitFor(() => expect(harness.vm.syncStatus).toEqual({ type: 'success' }))
  })

  test('syncStatus reports a refused save with a message, and retry repeats it', async () => {
    await signedInWith([])
    reef.createSubscription.mockRejectedValueOnce(new Error('nope'))
    const harness = await mountSuspended(NewRfcHarness)

    harness.vm.isSubscribed = true
    await vi.waitFor(() => expect(harness.vm.syncStatus.type).toBe('error'))
    expect(harness.vm.syncStatus).toEqual({
      type: 'error',
      message: 'You have not been subscribed to new RFCs. Please try again.'
    })

    reef.createSubscription.mockResolvedValue(existing({ id: 812 }))
    harness.vm.retry()
    await vi.waitFor(() => expect(harness.vm.syncStatus).toEqual({ type: 'success' }))
    expect(harness.vm.isSubscribed).toBe(true)
  })

  test('syncStatus is not left in error by a refusal the reader has already moved on from', async () => {
    await signedInWith([])
    let refuse: (error: Error) => void = () => {}
    reef.createSubscription.mockReturnValue(new Promise((_, reject) => (refuse = reject)))
    const harness = await mountSuspended(NewRfcHarness)

    harness.vm.isSubscribed = true
    harness.vm.isSubscribed = false
    refuse(new Error('nope'))

    await vi.waitFor(() => expect(harness.vm.syncStatus).toEqual({ type: 'success' }))
  })

  test('syncStatus is the load while that has failed, and retry reloads', async () => {
    reef.getSubscriptions.mockRejectedValueOnce(new Error('down'))
    useAuthStore().setUser({ sub: 'reader-1' })
    const harness = await mountSuspended(NewRfcHarness)
    await vi.waitFor(() => expect(harness.vm.syncStatus.type).toBe('error'))

    reef.getSubscriptions.mockResolvedValue([])
    harness.vm.retry()
    await vi.waitFor(() => expect(harness.vm.status).toEqual({ type: 'success' }))
    expect(reef.getSubscriptions).toHaveBeenCalledTimes(2)
  })

  test('does not add a subscription to the list of a reader who has since signed out', async () => {
    await signedInWith([])
    let confirm: (value: unknown) => void = () => {}
    reef.createSubscription.mockReturnValue(new Promise((resolve) => (confirm = resolve)))
    const harness = await mountSuspended(NewRfcHarness)

    harness.vm.isSubscribed = true
    await vi.waitFor(() => expect(reef.createSubscription).toHaveBeenCalled())
    useAuthStore().clearUser()
    confirm(existing({ id: 812 }))
    await vi.waitFor(() => expect(useReefStore().pendingSubscriptions).toEqual({}))

    expect(useReefStore().subscriptions).toEqual([])
  })

  test('reflects an existing subject subscription, and ignores one for a different subject', async () => {
    await signedInWith([existing({ id: 42, kind: 'subject', subject: 9 })])
    expect((await mountSuspended(SubjectHarness)).vm.isSubscribed).toBe(true)

    useAuthStore().clearUser()
    await signedInWith([existing({ id: 42, kind: 'subject', subject: 5 })])
    expect((await mountSuspended(SubjectHarness)).vm.isSubscribed).toBe(false)
  })

  test('subscribes to a subject by its id', async () => {
    await signedInWith([])
    reef.createSubscription.mockResolvedValue(existing({ id: 812, kind: 'subject', subject: 9 }))
    const harness = await mountSuspended(SubjectHarness)

    harness.vm.isSubscribed = true

    await vi.waitFor(() => expect(reef.createSubscription).toHaveBeenCalledWith({ kind: 'subject', subject: 9 }))
  })

  test('subscribes to a document under the rfc kind, named by its canonical id', async () => {
    await signedInWith([])
    reef.createSubscription.mockResolvedValue(existing({ id: 812, kind: 'rfc', params: { rfc: 'rfc9110' } }))
    const harness = await mountSuspended(DocumentHarness)

    harness.vm.isSubscribed = true

    await vi.waitFor(() =>
      expect(reef.createSubscription).toHaveBeenCalledWith({ kind: 'rfc', params: { rfc: 'rfc9110' } })
    )
    await vi.waitFor(() => expect(harness.vm.isSubscribed).toBe(true))
  })

  test('names the target in the toast when Reef refuses', async () => {
    await signedInWith([])
    reef.createSubscription.mockRejectedValue(new Error('nope'))
    const harness = await mountSuspended(DocumentHarness)

    harness.vm.isSubscribed = true

    await vi.waitFor(() =>
      expect(useNotificationsStore().queue.map(({ description }) => description)).toContain(
        'You have not been subscribed to RFC 9110. Please try again.'
      )
    )
  })
})
