// @vitest-environment nuxt
//
// What happens when this reader changes something: the control moves first, Reef is told, and the
// control goes back if Reef refuses. One file for both features because they share that
// shape, and because what's worth checking is the shape rather than the endpoint.
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { createUserSet, writeUserSetMembership } from './reef-sets'
import { writeUserSubscription } from './reef-subscriptions'
import { useAuthStore } from '~/stores/auth'
import { useNotificationsStore } from '~/stores/notifications'
import { useReefStore } from '~/stores/reef'

const reef = vi.hoisted(() => ({
  getSubscriptions: vi.fn(),
  getSets: vi.fn(),
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

type Held = {
  subscriptionId?: number
  setIds?: string[]
}

// Sign in and load what this reader holds of rfc9110 into the store, so a write has a known
// starting point.
const readerHolding = async ({ subscriptionId, setIds = [] }: Held = {}, sets = [] as ReturnType<typeof set>[]) => {
  useAuthStore().setUser({ sub: 'reader-1' })
  reef.getSubscriptions.mockResolvedValue(
    subscriptionId === undefined
      ? []
      : [{ id: subscriptionId, kind: 'rfc', params: { rfc: 'rfc9110' }, created_at: '2026-08-18T00:00:00Z' }]
  )
  reef.getSets.mockResolvedValue(
    sets.map((loaded) => ({
      ...loaded,
      documents: setIds.includes(loaded.id) ? [{ doc: 'rfc9110', rank: 0, added_at: '' }] : []
    }))
  )
  const reefStore = useReefStore()
  await vi.waitFor(() => {
    expect(Object.values(reefStore.status).map(({ type }) => type)).toEqual(['success', 'success'])
  })
  return reefStore
}

const rfc9110 = { kind: 'rfc', doc: 'rfc9110' } as const
const rfc9110Subscription = (id: number) => ({
  id,
  kind: 'rfc',
  params: { rfc: 'rfc9110' },
  created_at: '2026-08-18T00:00:00Z'
})

const notificationTitles = (): string[] => useNotificationsStore().queue.map(({ title }) => title)

describe('writeUserSubscription', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    Object.values(reef).forEach((fn) => fn.mockReset())
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  test('ticks before Reef has assigned an id, and keeps the id it assigns', async () => {
    const reefStore = await readerHolding()
    let confirm: (value: unknown) => void = () => {}
    reef.createSubscription.mockReturnValue(new Promise((resolve) => (confirm = resolve)))

    const writing = writeUserSubscription(rfc9110, 'RFC 9110', true)
    // Subscribed as far as the page is concerned, with no id to show for it yet.
    expect(reefStore.isSubscribedTo('rfc:rfc9110')).toBe(true)
    expect(reefStore.subscriptionByKey.get('rfc:rfc9110')).toBeUndefined()

    confirm(rfc9110Subscription(812))
    await writing

    expect(reefStore.subscriptionByKey.get('rfc:rfc9110')?.id).toBe(812)
    expect(reefStore.isSubscribedTo('rfc:rfc9110')).toBe(true)
  })

  test('unsubscribes by the id it was given', async () => {
    const reefStore = await readerHolding({ subscriptionId: 812 })
    reef.deleteSubscription.mockResolvedValue(undefined)

    await writeUserSubscription(rfc9110, 'RFC 9110', false)

    expect(reef.deleteSubscription).toHaveBeenCalledWith(812)
    expect(reefStore.isSubscribedTo('rfc:rfc9110')).toBe(false)
  })

  test('unticks and says so when Reef refuses', async () => {
    const reefStore = await readerHolding()
    reef.createSubscription.mockRejectedValue(new Error('nope'))

    await writeUserSubscription(rfc9110, 'RFC 9110', true)

    expect(reefStore.isSubscribedTo('rfc:rfc9110')).toBe(false)
    expect(notificationTitles()).toContain('Unable to subscribe')
  })

  test('a subscribe and an immediate unsubscribe both run, in that order', async () => {
    // The point of queueing rather than cancelling: an unsubscribe that superseded the subscribe
    // would leave Reef holding a subscription nothing afterwards has the id to remove.
    const reefStore = await readerHolding()
    const order: string[] = []
    reef.createSubscription.mockImplementation(async () => {
      order.push('create')
      return rfc9110Subscription(812)
    })
    reef.deleteSubscription.mockImplementation(async () => {
      order.push('delete')
    })

    const subscribing = writeUserSubscription(rfc9110, 'RFC 9110', true)
    await subscribing
    await writeUserSubscription(rfc9110, 'RFC 9110', false)

    expect(order).toEqual(['create', 'delete'])
    expect(reef.deleteSubscription).toHaveBeenCalledWith(812)
    expect(reefStore.isSubscribedTo('rfc:rfc9110')).toBe(false)
  })
})

describe('writeUserSetMembership', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    Object.values(reef).forEach((fn) => fn.mockReset())
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  test('adds this document to a set', async () => {
    const reefStore = await readerHolding({}, [set('set-a', 'Reading list')])
    reef.putSetDocument.mockResolvedValue({})

    writeUserSetMembership(9110, ['set-a'])
    expect(reefStore.setIdsByDoc.rfc9110).toEqual(['set-a'])

    await vi.waitFor(() => expect(reef.putSetDocument).toHaveBeenCalledWith('set-a', 'rfc9110'))
  })

  test('removes it from a set it was in', async () => {
    const reefStore = await readerHolding({ setIds: ['set-a'] }, [set('set-a', 'Reading list')])
    reef.deleteSetDocument.mockResolvedValue(undefined)

    writeUserSetMembership(9110, [])
    await vi.waitFor(() => expect(reef.deleteSetDocument).toHaveBeenCalledWith('set-a', 'rfc9110'))

    expect(reefStore.setIdsByDoc.rfc9110).toEqual([])
  })

  test('unticks only the set that failed, leaving the one that worked', async () => {
    const reefStore = await readerHolding({}, [set('set-a', 'Works'), set('set-b', 'Fails')])
    reef.putSetDocument.mockImplementation(async (setId: string) => {
      if (setId === 'set-b') {
        throw new Error('nope')
      }
      return {}
    })

    writeUserSetMembership(9110, ['set-a', 'set-b'])
    await vi.waitFor(() => expect(reefStore.setIdsByDoc.rfc9110).toEqual(['set-a']))

    expect(notificationTitles()).toContain('Unable to add to Set')
  })

  test('writes nothing when the ticks have not changed', async () => {
    await readerHolding({ setIds: ['set-a'] }, [set('set-a', 'Reading list')])
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
    const reefStore = await readerHolding()
    reef.createSet.mockResolvedValue(set('set-new', 'Reading list'))
    reef.putSetDocument.mockResolvedValue({})

    const outcome = await createUserSet(9110, { title: '  Reading list  ', description: '' })

    expect(outcome).toEqual({ ok: true, set: set('set-new', 'Reading list') })
    // Trimmed, and with no description rather than an empty one.
    expect(reef.createSet).toHaveBeenCalledWith({ title: 'Reading list' })
    expect(reefStore.sets).toEqual([set('set-new', 'Reading list')])
    expect(reefStore.setIdsByDoc.rfc9110).toEqual(['set-new'])
  })

  test('fills in a description Reef left out of the create response', async () => {
    // The create response omits the field when it holds nothing, but every read of a set has one,
    // so the store's copy is the read shape.
    const reefStore = await readerHolding()
    const { description, ...withoutDescription } = set('set-new', 'Reading list')
    expect(description).toBe('')
    reef.createSet.mockResolvedValue(withoutDescription)
    reef.putSetDocument.mockResolvedValue({})

    await createUserSet(9110, { title: 'Reading list', description: '' })

    expect(reefStore.sets[0]?.description).toBe('')
  })

  test('hands back wording for the form when Reef refuses the title', async () => {
    await readerHolding()
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
