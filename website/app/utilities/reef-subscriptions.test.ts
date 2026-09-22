// @vitest-environment nuxt
import { defineComponent } from 'vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'

import type { Subscription } from './reef'
import { subscriptionParamsSummary, useUserNewRfcSubscription } from './reef-subscriptions'
import { useAuthStore } from '~/stores/auth'
import { useNotificationsStore } from '~/stores/notifications'

const reef = vi.hoisted(() => ({
  getSubscriptions: vi.fn(),
  createSubscription: vi.fn(),
  deleteSubscription: vi.fn()
}))

vi.mock('~/utilities/reef', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/utilities/reef')>()),
  ...reef
}))

// A harness rather than mounting ReefSubscribeToAllRFCs itself: what's under test is the model —
// loaded on mount, written back on change — not the dialog chrome around it.
const Harness = defineComponent({
  setup: () => ({ isSubscribed: useUserNewRfcSubscription() })
})

// `params` is the only field these two read; the rest is what Reef assigns and this fixture only
// has to satisfy the type.
const subscription = (kind: Subscription['kind'], params: unknown): Subscription => ({
  id: 1,
  kind,
  params,
  created_at: '2026-08-18T00:00:00Z'
})

describe('subscriptionParamsSummary', () => {
  test('lists the params a person can read', () => {
    expect(subscriptionParamsSummary(subscription('by_status', { status: 'Proposed Standard' }))).toBe(
      'status: Proposed Standard'
    )
    expect(subscriptionParamsSummary(subscription('rfc', { rfc: 'rfc9110' }))).toBe('rfc: rfc9110')
  })

  test('is undefined when there is nothing worth showing', () => {
    // The new_rfc kind's usual case: nothing to add to the label.
    expect(subscriptionParamsSummary(subscription('new_rfc', {}))).toBeUndefined()
    expect(subscriptionParamsSummary(subscription('new_rfc', undefined))).toBeUndefined()
    expect(subscriptionParamsSummary(subscription('new_rfc', null))).toBeUndefined()
    // Params that aren't a record of values at all, which no summary can be made of.
    expect(subscriptionParamsSummary(subscription('new_rfc', ['dns']))).toBeUndefined()
    expect(subscriptionParamsSummary(subscription('new_rfc', 'dns'))).toBeUndefined()
    // Present but empty of anything to report.
    expect(subscriptionParamsSummary(subscription('by_status', { status: '', set: null }))).toBeUndefined()
  })
})

describe('useUserNewRfcSubscription', () => {
  enableAutoUnmount(afterEach)

  beforeEach(() => {
    Object.values(reef).forEach((fn) => fn.mockReset())
    vi.spyOn(console, 'error').mockImplementation(() => {})
    useAuthStore().clearUser()
    useNotificationsStore().queue = []
  })

  test('stays unticked, and asks Reef nothing, while signed out', async () => {
    const harness = await mountSuspended(Harness)

    expect(harness.vm.isSubscribed).toBe(false)
    expect(reef.getSubscriptions).not.toHaveBeenCalled()
  })

  test('reflects an existing new_rfc subscription once signed in', async () => {
    useAuthStore().setUser({ sub: 'reader-1' })
    reef.getSubscriptions.mockResolvedValue([
      { id: 42, kind: 'new_rfc', params: {}, created_at: '2026-08-18T00:00:00Z' }
    ])

    const harness = await mountSuspended(Harness)
    await vi.waitFor(() => expect(harness.vm.isSubscribed).toBe(true))
  })

  test('defaults to unticked when signed in with no new_rfc subscription', async () => {
    useAuthStore().setUser({ sub: 'reader-1' })
    reef.getSubscriptions.mockResolvedValue([
      { id: 1, kind: 'rfc', params: { rfc: 'rfc9110' }, created_at: '2026-08-18T00:00:00Z' }
    ])

    const harness = await mountSuspended(Harness)
    await vi.waitFor(() => expect(reef.getSubscriptions).toHaveBeenCalled())
    expect(harness.vm.isSubscribed).toBe(false)
  })

  test('ticks before Reef has assigned an id, and keeps the id it assigns', async () => {
    useAuthStore().setUser({ sub: 'reader-1' })
    reef.getSubscriptions.mockResolvedValue([])
    let confirm: (value: { id: number }) => void = () => {}
    reef.createSubscription.mockReturnValue(new Promise((resolve) => (confirm = resolve)))

    const harness = await mountSuspended(Harness)
    await vi.waitFor(() => expect(harness.vm.isSubscribed).toBe(false))

    harness.vm.isSubscribed = true
    expect(harness.vm.isSubscribed).toBe(true)
    confirm({ id: 812 })
    await vi.waitFor(() => expect(reef.createSubscription).toHaveBeenCalledWith({ kind: 'new_rfc' }))

    harness.vm.isSubscribed = false
    await vi.waitFor(() => expect(reef.deleteSubscription).toHaveBeenCalledWith(812))
  })

  test('unticks and says so when Reef refuses', async () => {
    useAuthStore().setUser({ sub: 'reader-1' })
    reef.getSubscriptions.mockResolvedValue([])
    reef.createSubscription.mockRejectedValue(new Error('nope'))

    const harness = await mountSuspended(Harness)
    await vi.waitFor(() => expect(harness.vm.isSubscribed).toBe(false))

    harness.vm.isSubscribed = true
    await vi.waitFor(() => expect(harness.vm.isSubscribed).toBe(false))
    expect(useNotificationsStore().queue.map(({ title }) => title)).toContain('Unable to subscribe')
  })
})
