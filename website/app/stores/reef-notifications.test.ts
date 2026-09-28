// @vitest-environment nuxt
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import type { PaginatedWebNotificationList, WebNotification } from '~/utilities/reef'
import { useAuthStore } from '~/stores/auth'
import { useReefNotificationsStore } from '~/stores/reef-notifications'

const { getNotifications } = vi.hoisted(() => ({ getNotifications: vi.fn() }))

vi.mock('~/utilities/reef', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/utilities/reef')>()),
  getNotifications
}))

const notification = (id: number, overrides: Partial<WebNotification> = {}): WebNotification => ({
  id,
  kind: 'rfc',
  event: {},
  read: false,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides
})

const page = (results: WebNotification[], next: string | null = null): PaginatedWebNotificationList => ({
  next,
  previous: null,
  results
})

const answering = (result: PaginatedWebNotificationList) => getNotifications.mockResolvedValue(result)

const signIn = (sub = 'reader-1') => {
  useAuthStore().setUser({ sub })
}

describe('useReefNotificationsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getNotifications.mockReset()
    answering(page([]))
  })

  test('asks Reef for nothing while nobody is signed in', () => {
    useReefNotificationsStore()
    expect(getNotifications).not.toHaveBeenCalled()
  })

  test('loads this reader’s own feed once they are signed in', async () => {
    const store = useReefNotificationsStore()
    answering(page([notification(1), notification(2)]))

    signIn()
    await flushPromises()

    expect(store.status).toBe('success')
    expect(store.notifications).toEqual([notification(1), notification(2)])
  })

  test('asks for no cursor on the first page', async () => {
    useReefNotificationsStore()
    signIn()
    await flushPromises()

    expect(getNotifications).toHaveBeenCalledWith(undefined, expect.anything())
  })

  test('has no more pages when Reef names none', async () => {
    const store = useReefNotificationsStore()
    signIn()
    await flushPromises()

    expect(store.hasMore).toBe(false)
  })

  test('reads the cursor out of the next page Reef names, and follows it on loadMore', async () => {
    const store = useReefNotificationsStore()
    answering(page([notification(1)], 'https://reef.example/api/reef/notifications/?cursor=abc123'))

    signIn()
    await flushPromises()

    expect(store.hasMore).toBe(true)

    answering(page([notification(2)]))
    await store.loadMore()

    expect(getNotifications).toHaveBeenLastCalledWith('abc123', expect.anything())
    expect(store.notifications).toEqual([notification(1), notification(2)])
    expect(store.hasMore).toBe(false)
  })

  test('does nothing when asked to load more with no further page', async () => {
    const store = useReefNotificationsStore()
    signIn()
    await flushPromises()
    getNotifications.mockClear()

    await store.loadMore()

    expect(getNotifications).not.toHaveBeenCalled()
  })

  test('marks the feed errored rather than leaving it pending forever', async () => {
    getNotifications.mockRejectedValue(new Error('reef is down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const store = useReefNotificationsStore()

    signIn()
    await flushPromises()

    expect(store.status).toBe('error')
  })

  test('forgets this reader’s own feed when they sign out', async () => {
    const store = useReefNotificationsStore()
    answering(page([notification(1)]))
    signIn()
    await flushPromises()

    useAuthStore().clearUser()

    expect(store.notifications).toEqual([])
    expect(store.status).toBe('idle')
  })

  test('does not show one reader what the previous one loaded', async () => {
    const store = useReefNotificationsStore()
    answering(page([notification(1)]))
    signIn('reader-1')
    await flushPromises()

    answering(page([notification(2)]))
    signIn('reader-2')
    await flushPromises()

    expect(store.notifications).toEqual([notification(2)])
  })

  test('drops an answer that arrives after the reader has changed', async () => {
    const resolvers: Array<(value: PaginatedWebNotificationList) => void> = []
    getNotifications.mockImplementation(
      () => new Promise<PaginatedWebNotificationList>((resolve) => resolvers.push(resolve))
    )
    const store = useReefNotificationsStore()

    signIn('reader-1')
    signIn('reader-2')

    // reader-1's own request, answered only after reader-2 has already taken over.
    resolvers[0]?.(page([notification(1)]))
    await flushPromises()
    expect(store.notifications).toEqual([])

    // reader-2's own request still lands normally.
    resolvers[1]?.(page([notification(2)]))
    await flushPromises()
    expect(store.notifications).toEqual([notification(2)])
  })
})
