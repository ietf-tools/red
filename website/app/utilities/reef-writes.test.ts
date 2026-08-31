// @vitest-environment nuxt
//
// What happens when this reader changes something: the control moves first, Reef is told, and the
// control goes back if Reef refuses. One file for all three features because they share that
// shape, and because what's worth checking is the shape rather than the endpoint.
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import type { MyDocuments } from './reef'
import { writeUserRFCRating } from './reef-ratings'
import { createUserSet, writeUserSetMembership } from './reef-sets'
import { writeUserRFCSubscription } from './reef-subscriptions'
import { useAuthStore } from '~/stores/auth'
import { useNotificationsStore } from '~/stores/notifications'
import { useReefStore } from '~/stores/reef'

const reef = vi.hoisted(() => ({
  getMyDocuments: vi.fn(),
  putRating: vi.fn(),
  deleteRating: vi.fn(),
  createSubscription: vi.fn(),
  deleteSubscription: vi.fn(),
  putSetDocument: vi.fn(),
  deleteSetDocument: vi.fn(),
  createSet: vi.fn()
}))

vi.mock('~/utilities/reef', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/utilities/reef')>()),
  ...reef
}))

const set = (id: string, title: string) => ({
  id,
  title,
  description: '',
  created_at: '2026-08-18T00:00:00Z',
  updated_at: '2026-08-18T00:00:00Z'
})

// Sign in and load rfc9110 into the store, so a write has a known starting point.
const readerHolding = async (documents: MyDocuments['documents'], sets: MyDocuments['sets'] = []) => {
  useAuthStore().setUser({ sub: 'reader-1' })
  reef.getMyDocuments.mockResolvedValue({ sets, documents })
  const reefStore = useReefStore()
  await reefStore.ensureDocuments(['rfc9110'])
  return reefStore
}

const doc = (overrides = {}) => ({
  doc: 'rfc9110',
  your_rating: null,
  your_subscription_id: null,
  your_set_ids: [],
  ...overrides
})

const notificationTitles = (): string[] => useNotificationsStore().queue.map(({ title }) => title)

describe('writeUserRFCRating', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    Object.values(reef).forEach((fn) => fn.mockReset())
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  test('shows the rating before Reef has confirmed it', async () => {
    const reefStore = await readerHolding([doc()])
    let confirm: (value: unknown) => void = () => {}
    reef.putRating.mockReturnValue(new Promise((resolve) => (confirm = resolve)))

    const writing = writeUserRFCRating(9110, 4)
    expect(reefStore.userDocuments.rfc9110?.yourRating).toBe(4)

    confirm({ rfc: 'rfc9110', average: 4, count: 1, your_rating: 4 })
    await writing
  })

  test('puts the rating back when Reef refuses it', async () => {
    const reefStore = await readerHolding([doc({ your_rating: 2 })])
    reef.putRating.mockRejectedValue(new Error('nope'))

    await writeUserRFCRating(9110, 5)

    expect(reefStore.userDocuments.rfc9110?.yourRating).toBe(2)
  })

  test('withdrawing a rating deletes it, and says so', async () => {
    const reefStore = await readerHolding([doc({ your_rating: 2 })])
    reef.deleteRating.mockResolvedValue({ rfc: 'rfc9110', average: null, count: 0, your_rating: null })

    await writeUserRFCRating(9110, undefined)

    expect(reef.deleteRating).toHaveBeenCalledWith('rfc9110')
    expect(reefStore.userDocuments.rfc9110?.yourRating).toBeUndefined()
    expect(notificationTitles()).toContain('Rating removed')
  })

  test('says so when a withdrawal fails, because the stars come back on their own', async () => {
    const reefStore = await readerHolding([doc({ your_rating: 2 })])
    reef.deleteRating.mockRejectedValue(new Error('nope'))

    await writeUserRFCRating(9110, undefined)

    expect(reefStore.userDocuments.rfc9110?.yourRating).toBe(2)
    expect(notificationTitles()).toContain('Unable to remove your rating')
  })

  test('writes nothing when the rating has not changed', async () => {
    await readerHolding([doc({ your_rating: 4 })])
    await writeUserRFCRating(9110, 4)
    expect(reef.putRating).not.toHaveBeenCalled()
  })
})

describe('writeUserRFCSubscription', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    Object.values(reef).forEach((fn) => fn.mockReset())
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  test('ticks before Reef has assigned an id, and keeps the id it assigns', async () => {
    const reefStore = await readerHolding([doc()])
    let confirm: (value: unknown) => void = () => {}
    reef.createSubscription.mockReturnValue(new Promise((resolve) => (confirm = resolve)))

    const writing = writeUserRFCSubscription(9110, true)
    // Subscribed as far as the page is concerned, with no id to show for it yet.
    expect(reefStore.userDocuments.rfc9110?.isSubscribed).toBe(true)
    expect(reefStore.userDocuments.rfc9110?.yourSubscriptionId).toBeUndefined()

    confirm({ id: 812, kind: 'rfc', params: { rfc: 'rfc9110' }, created_at: '' })
    await writing

    expect(reefStore.userDocuments.rfc9110?.yourSubscriptionId).toBe(812)
  })

  test('unsubscribes by the id it was given', async () => {
    const reefStore = await readerHolding([doc({ your_subscription_id: 812 })])
    reef.deleteSubscription.mockResolvedValue(undefined)

    await writeUserRFCSubscription(9110, false)

    expect(reef.deleteSubscription).toHaveBeenCalledWith(812)
    expect(reefStore.userDocuments.rfc9110?.isSubscribed).toBe(false)
  })

  test('unticks and says so when Reef refuses', async () => {
    const reefStore = await readerHolding([doc()])
    reef.createSubscription.mockRejectedValue(new Error('nope'))

    await writeUserRFCSubscription(9110, true)

    expect(reefStore.userDocuments.rfc9110?.isSubscribed).toBe(false)
    expect(notificationTitles()).toContain('Unable to subscribe')
  })

  test('a subscribe and an immediate unsubscribe both run, in that order', async () => {
    // The point of queueing rather than cancelling: an unsubscribe that superseded the subscribe
    // would leave Reef holding a subscription nothing afterwards has the id to remove.
    const reefStore = await readerHolding([doc()])
    const order: string[] = []
    reef.createSubscription.mockImplementation(async () => {
      order.push('create')
      return { id: 812 }
    })
    reef.deleteSubscription.mockImplementation(async () => {
      order.push('delete')
    })

    const subscribing = writeUserRFCSubscription(9110, true)
    await subscribing
    await writeUserRFCSubscription(9110, false)

    expect(order).toEqual(['create', 'delete'])
    expect(reef.deleteSubscription).toHaveBeenCalledWith(812)
    expect(reefStore.userDocuments.rfc9110?.isSubscribed).toBe(false)
  })
})

describe('writeUserSetMembership', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    Object.values(reef).forEach((fn) => fn.mockReset())
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  test('adds this document to a set', async () => {
    const reefStore = await readerHolding([doc()], [set('set-a', 'Reading list')])
    reef.putSetDocument.mockResolvedValue({})

    writeUserSetMembership(9110, ['set-a'])
    expect(reefStore.userDocuments.rfc9110?.yourSetIds).toEqual(['set-a'])

    await vi.waitFor(() => expect(reef.putSetDocument).toHaveBeenCalledWith('set-a', 'rfc9110'))
  })

  test('removes it from a set it was in', async () => {
    const reefStore = await readerHolding([doc({ your_set_ids: ['set-a'] })], [set('set-a', 'Reading list')])
    reef.deleteSetDocument.mockResolvedValue(undefined)

    writeUserSetMembership(9110, [])
    await vi.waitFor(() => expect(reef.deleteSetDocument).toHaveBeenCalledWith('set-a', 'rfc9110'))

    expect(reefStore.userDocuments.rfc9110?.yourSetIds).toEqual([])
  })

  test('unticks only the set that failed, leaving the one that worked', async () => {
    const reefStore = await readerHolding([doc()], [set('set-a', 'Works'), set('set-b', 'Fails')])
    reef.putSetDocument.mockImplementation(async (setId: string) => {
      if (setId === 'set-b') {
        throw new Error('nope')
      }
      return {}
    })

    writeUserSetMembership(9110, ['set-a', 'set-b'])
    await vi.waitFor(() => expect(reefStore.userDocuments.rfc9110?.yourSetIds).toEqual(['set-a']))

    expect(notificationTitles()).toContain('Unable to add to set')
  })

  test('writes nothing when the ticks have not changed', async () => {
    await readerHolding([doc({ your_set_ids: ['set-a'] })], [set('set-a', 'Reading list')])
    writeUserSetMembership(9110, ['set-a'])
    expect(reef.putSetDocument).not.toHaveBeenCalled()
    expect(reef.deleteSetDocument).not.toHaveBeenCalled()
  })
})

describe('createUserSet', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    Object.values(reef).forEach((fn) => fn.mockReset())
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  test('offers the new set and puts this document in it', async () => {
    const reefStore = await readerHolding([doc()])
    reef.createSet.mockResolvedValue(set('set-new', 'Reading list'))
    reef.putSetDocument.mockResolvedValue({})

    const outcome = await createUserSet(9110, { title: '  Reading list  ', description: '' })

    expect(outcome).toEqual({ ok: true, set: set('set-new', 'Reading list') })
    // Trimmed, and with no description rather than an empty one.
    expect(reef.createSet).toHaveBeenCalledWith({ title: 'Reading list' })
    expect(reefStore.sets).toEqual([set('set-new', 'Reading list')])
    expect(reefStore.userDocuments.rfc9110?.yourSetIds).toEqual(['set-new'])
  })

  test('fills in a description Reef left out of the create response', async () => {
    // The create response omits the field when it holds nothing, but every read of a set has one,
    // so the store's copy is the read shape.
    const reefStore = await readerHolding([doc()])
    const { description, ...withoutDescription } = set('set-new', 'Reading list')
    expect(description).toBe('')
    reef.createSet.mockResolvedValue(withoutDescription)
    reef.putSetDocument.mockResolvedValue({})

    await createUserSet(9110, { title: 'Reading list', description: '' })

    expect(reefStore.sets[0]?.description).toBe('')
  })

  test('hands back wording for the form when Reef refuses the title', async () => {
    await readerHolding([doc()])
    const { ReefError } = await import('./reef')
    reef.createSet.mockRejectedValue(
      new ReefError({
        status: 400,
        statusText: 'Bad Request',
        body: { title: ['This field may not be blank.'] },
        method: 'POST',
        path: '/api/reef/sets/'
      })
    )

    const outcome = await createUserSet(9110, { title: '', description: '' })

    expect(outcome).toEqual({ ok: false, message: 'This field may not be blank.' })
  })
})
