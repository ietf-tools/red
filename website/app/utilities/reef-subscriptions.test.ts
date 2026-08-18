// @vitest-environment nuxt
import { describe, expect, test } from 'vitest'

import type { Subscription } from './reef'
import { isRFCSubscription, subscriptionParamsSummary } from './reef-subscriptions'

// `params` is the only field these two read; the rest is what Reef assigns and this fixture only
// has to satisfy the type.
const subscription = (kind: Subscription['kind'], params: unknown): Subscription => ({
  id: 1,
  kind,
  params,
  verified: true,
  created_at: '2026-08-18T00:00:00Z'
})

describe('isRFCSubscription', () => {
  test('matches the RFC named in its params', () => {
    expect(isRFCSubscription(subscription('rfc', { rfc: 'rfc9110' }), 9110)).toBe(true)
    expect(isRFCSubscription(subscription('rfc', { rfc: 'rfc9110' }), 2119)).toBe(false)
  })

  test('is never true for another kind, even one carrying an rfc param of its own', () => {
    expect(isRFCSubscription(subscription('set', { rfc: 'rfc9110' }), 9110)).toBe(false)
  })

  test('is false rather than throwing for params that are not the shape we write', () => {
    // Each of these reaches the parse as `unknown`, which is all the spec promises about params.
    expect(isRFCSubscription(subscription('rfc', undefined), 9110)).toBe(false)
    expect(isRFCSubscription(subscription('rfc', null), 9110)).toBe(false)
    expect(isRFCSubscription(subscription('rfc', ['rfc9110']), 9110)).toBe(false)
    expect(isRFCSubscription(subscription('rfc', 'rfc9110'), 9110)).toBe(false)
    expect(isRFCSubscription(subscription('rfc', {}), 9110)).toBe(false)
    // The identifier is compared as a string, so a params object holding the number matches nothing.
    expect(isRFCSubscription(subscription('rfc', { rfc: 9110 }), 9110)).toBe(false)
  })
})

describe('subscriptionParamsSummary', () => {
  test('lists the params a person can read', () => {
    expect(subscriptionParamsSummary(subscription('by_status', { status: 'Proposed Standard' }))).toBe(
      'status: Proposed Standard'
    )
    expect(subscriptionParamsSummary(subscription('subject_tag', { tags: ['dns', 'tls'], exact: true }))).toBe(
      'tags: dns, tls, exact: true'
    )
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
