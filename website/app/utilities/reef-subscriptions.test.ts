// @vitest-environment nuxt
import { describe, expect, test } from 'vitest'

import type { Subscription } from './reef'
import { subscriptionParamsSummary } from './reef-subscriptions'

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
