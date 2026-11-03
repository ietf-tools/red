// @vitest-environment nuxt
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import type { DocumentSet, Subscription } from '~/utilities/reef'
import { useAuthStore } from '~/stores/auth'
import { subscriptionKey, subscriptionTargetOf, useReefStore } from '~/stores/reef'

const reef = vi.hoisted(() => ({
  getSubscriptions: vi.fn(),
  getSets: vi.fn()
}))

vi.mock('~/utilities/reef', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/utilities/reef')>()),
  ...reef
}))

const subscription = (overrides: Partial<Subscription> = {}): Subscription =>
  ({ id: 1, kind: 'new_rfc', params: {}, created_at: '2026-08-18T00:00:00Z', ...overrides }) as Subscription

const set = (id: string, docs: string[] = []): DocumentSet => ({
  id,
  title: id,
  description: '',
  documents: docs.map((doc, rank) => ({ doc, rank, added_at: '2026-08-18T00:00:00Z' })),
  created_at: '2026-08-18T00:00:00Z',
  updated_at: '2026-08-18T00:00:00Z'
})

const answering = ({
  subscriptions = [],
  sets = []
}: {
  subscriptions?: Subscription[]
  sets?: DocumentSet[]
} = {}) => {
  reef.getSubscriptions.mockResolvedValue(subscriptions)
  reef.getSets.mockResolvedValue(sets)
}

// Every store made is disposed afterwards, so a window listener from one test can't answer in the next.
const stores: ReturnType<typeof useReefStore>[] = []
const useTrackedReefStore = () => {
  const reefStore = useReefStore()
  stores.push(reefStore)
  return reefStore
}

const signIn = (sub = 'reader-1') => {
  useAuthStore().setUser({ sub })
}

const loaded = (reefStore: ReturnType<typeof useReefStore>) =>
  vi.waitFor(() => {
    expect(Object.values(reefStore.status).map(({ type }) => type)).toEqual(['success', 'success'])
  })

describe('subscriptionKey and subscriptionTargetOf', () => {
  test('give one key per thing subscribed to', () => {
    expect(subscriptionKey({ kind: 'new_rfc' })).toBe('new_rfc')
    expect(subscriptionKey({ kind: 'rfc', doc: 'rfc9110' })).toBe('rfc:rfc9110')
    expect(subscriptionKey({ kind: 'subject', subject: 9 })).toBe('subject:9')
  })

  test('find the target of a subscription Reef holds', () => {
    expect(subscriptionTargetOf(subscription({ kind: 'new_rfc' }))).toEqual({ kind: 'new_rfc' })
    expect(subscriptionTargetOf(subscription({ kind: 'rfc', params: { rfc: 'rfc9110' } }))).toEqual({
      kind: 'rfc',
      doc: 'rfc9110'
    })
    expect(subscriptionTargetOf(subscription({ kind: 'subject', subject: 9 }))).toEqual({ kind: 'subject', subject: 9 })
  })

  test('leave out kinds Red has no control for, and params it cannot read', () => {
    expect(subscriptionTargetOf(subscription({ kind: 'by_status' }))).toBeUndefined()
    expect(subscriptionTargetOf(subscription({ kind: 'rfc', params: {} }))).toBeUndefined()
    expect(subscriptionTargetOf(subscription({ kind: 'rfc', params: { rfc: 9110 } }))).toBeUndefined()
    expect(subscriptionTargetOf(subscription({ kind: 'subject', subject: null }))).toBeUndefined()
  })
})

describe('useReefStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    Object.values(reef).forEach((fn) => fn.mockReset())
    vi.spyOn(console, 'error').mockImplementation(() => {})
    answering()
  })

  afterEach(() => {
    vi.useRealTimers()
    stores.splice(0).forEach((reefStore) => reefStore.$dispose())
  })

  // --- The gate -------------------------------------------------------------

  test('asks Reef for nothing while nobody is signed in', async () => {
    const reefStore = useTrackedReefStore()
    await reefStore.load()

    expect(reef.getSubscriptions).not.toHaveBeenCalled()
    expect(reef.getSets).not.toHaveBeenCalled()
    expect(reefStore.status.subscriptions).toEqual({ type: 'idle' })
  })

  test('loads everything the moment they sign in', async () => {
    const reefStore = useTrackedReefStore()
    answering({
      subscriptions: [subscription({ id: 7, kind: 'rfc', params: { rfc: 'rfc9110' } })],
      sets: [set('set-a', ['rfc9110', 'rfc2119']), set('set-b', ['rfc9110'])]
    })

    signIn()
    expect(reefStore.status.subscriptions).toEqual({ type: 'loading' })
    await loaded(reefStore)

    expect(reefStore.isSubscribedTo('rfc:rfc9110')).toBe(true)
    expect(reefStore.subscriptionByKey.get('rfc:rfc9110')?.id).toBe(7)
    expect(reefStore.setIdsByDoc).toEqual({ rfc9110: ['set-a', 'set-b'], rfc2119: ['set-a'] })
    // Labels only: what a set holds is held per document.
    expect(reefStore.sets.map(({ id }) => id)).toEqual(['set-a', 'set-b'])
    expect(reefStore.sets[0]).not.toHaveProperty('documents')
  })

  test('is not subscribed to something it holds no subscription for', async () => {
    const reefStore = useTrackedReefStore()
    answering({ subscriptions: [subscription({ id: 1, kind: 'subject', subject: 5 })] })
    signIn()
    await loaded(reefStore)

    expect(reefStore.isSubscribedTo('subject:9')).toBe(false)
    expect(reefStore.isSubscribedTo('new_rfc')).toBe(false)
  })

  test('shows a change that has not been answered yet, over what the list says', async () => {
    const reefStore = useTrackedReefStore()
    answering({ subscriptions: [subscription({ id: 1 })] })
    signIn()
    await loaded(reefStore)

    reefStore.beginSubscriptionChange('new_rfc', false)
    expect(reefStore.isSubscribedTo('new_rfc')).toBe(false)

    reefStore.endSubscriptionChange('new_rfc')
    expect(reefStore.isSubscribedTo('new_rfc')).toBe(true)
  })

  test('keeps showing a change until the last of several has been answered', async () => {
    const reefStore = useTrackedReefStore()
    signIn()
    await loaded(reefStore)

    reefStore.beginSubscriptionChange('new_rfc', true)
    reefStore.beginSubscriptionChange('new_rfc', false)
    reefStore.endSubscriptionChange('new_rfc')
    expect(reefStore.pendingSubscriptions.new_rfc).toEqual({ desired: false, inFlight: 1 })

    reefStore.endSubscriptionChange('new_rfc')
    expect(reefStore.pendingSubscriptions.new_rfc).toBeUndefined()
  })

  // --- Failure --------------------------------------------------------------

  test('reports one slice failing without taking the other with it', async () => {
    const reefStore = useTrackedReefStore()
    answering({ subscriptions: [subscription({ id: 3 })] })
    reef.getSets.mockRejectedValue(new Error('reef is down'))
    signIn()

    await vi.waitFor(() => expect(reefStore.status.sets.type).toBe('error'))
    await vi.waitFor(() => expect(reefStore.status.subscriptions.type).toBe('success'))
    expect(reefStore.isSubscribedTo('new_rfc')).toBe(true)
  })

  test('loads again when asked, which is how a failure is retried', async () => {
    const reefStore = useTrackedReefStore()
    reef.getSets.mockRejectedValueOnce(new Error('reef is down'))
    signIn()
    await vi.waitFor(() => expect(reefStore.status.sets.type).toBe('error'))

    await reefStore.load()

    expect(reefStore.status.sets).toEqual({ type: 'success' })
  })

  // --- Refreshing -----------------------------------------------------------

  test('brings what it holds up to date without showing a loading state', async () => {
    const reefStore = useTrackedReefStore()
    signIn()
    await loaded(reefStore)
    answering({ subscriptions: [subscription({ id: 3 })] })

    const refreshing = reefStore.load()
    expect(reefStore.status.subscriptions).toEqual({ type: 'success' })
    await refreshing

    expect(reefStore.isSubscribedTo('new_rfc')).toBe(true)
  })

  test('keeps what it holds when a refresh fails', async () => {
    const reefStore = useTrackedReefStore()
    answering({ subscriptions: [subscription({ id: 3 })] })
    signIn()
    await loaded(reefStore)
    reef.getSubscriptions.mockRejectedValue(new Error('reef is down'))

    await reefStore.load()

    expect(reefStore.status.subscriptions).toEqual({ type: 'success' })
    expect(reefStore.isSubscribedTo('new_rfc')).toBe(true)
  })

  test('does not let a refresh undo a change made while it was in flight', async () => {
    const reefStore = useTrackedReefStore()
    signIn()
    await loaded(reefStore)

    let answer: (value: Subscription[]) => void = () => {}
    reef.getSubscriptions.mockReturnValue(new Promise<Subscription[]>((resolve) => (answer = resolve)))
    const refreshing = reefStore.load()

    reefStore.addSubscription(subscription({ id: 5 }))
    await reefStore.runWrite('new_rfc', () => Promise.resolve())
    answer([])
    await refreshing

    expect(reefStore.isSubscribedTo('new_rfc')).toBe(true)
  })

  test('refreshes when asked to, unless it loaded only a moment ago', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const reefStore = useTrackedReefStore()
    signIn()
    await loaded(reefStore)
    reef.getSubscriptions.mockClear()

    reefStore.refreshIfStale()
    expect(reef.getSubscriptions).not.toHaveBeenCalled()

    vi.advanceTimersByTime(60_000)
    reefStore.refreshIfStale()
    expect(reef.getSubscriptions).toHaveBeenCalledTimes(1)
  })

  test('refreshes when the tab regains focus', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const reefStore = useTrackedReefStore()
    signIn()
    await loaded(reefStore)
    reef.getSubscriptions.mockClear()

    vi.advanceTimersByTime(60_000)
    window.dispatchEvent(new Event('focus'))

    expect(reef.getSubscriptions).toHaveBeenCalledTimes(1)
  })

  // --- Whose data it is ------------------------------------------------------

  test('forgets this reader’s own state when they sign out', async () => {
    const reefStore = useTrackedReefStore()
    answering({
      subscriptions: [subscription()],
      sets: [set('set-a', ['rfc9110'])]
    })
    signIn()
    await loaded(reefStore)

    useAuthStore().clearUser()

    expect(reefStore.subscriptions).toEqual([])
    expect(reefStore.sets).toEqual([])
    expect(reefStore.setIdsByDoc).toEqual({})
    expect(reefStore.status.subscriptions).toEqual({ type: 'idle' })
  })

  test('does not show one reader what the previous one loaded', async () => {
    const reefStore = useTrackedReefStore()
    answering({ subscriptions: [subscription()] })
    signIn('reader-1')
    await loaded(reefStore)

    answering()
    signIn('reader-2')
    await loaded(reefStore)

    expect(reefStore.isSubscribedTo('new_rfc')).toBe(false)
  })

  test('drops an answer that arrives after the reader has changed', async () => {
    const reefStore = useTrackedReefStore()
    let answer: (value: Subscription[]) => void = () => {}
    reef.getSubscriptions.mockReturnValue(new Promise<Subscription[]>((resolve) => (answer = resolve)))
    signIn('reader-1')

    answering()
    signIn('reader-2')
    answer([subscription()])
    await loaded(reefStore)

    expect(reefStore.isSubscribedTo('new_rfc')).toBe(false)
  })
})
