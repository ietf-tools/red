import { describe, expect, it } from 'vitest'
import type { UiState } from '~/components/searchv2'
import { parseQuery, serializeQuery } from './searchv2-nuxt-adapter'

// The RFC search baseline: obsoleted/historic searched, full-text ("contents") search on.
const defaults: UiState = {
  toggles: { searchObsoleted: true, searchContents: true }
}

describe('searchv2 nuxt adapter — toggle defaults', () => {
  it('parses absent params back to their configured defaults', () => {
    const state = parseQuery({}, defaults)
    expect(state.toggles).toEqual({ searchObsoleted: true, searchContents: true })
  })

  it('omits toggles that equal their default from the URL', () => {
    const query = serializeQuery({ toggles: { searchObsoleted: true, searchContents: true } }, defaults)
    expect(query.searchObsoleted).toBeUndefined()
    expect(query.searchContents).toBeUndefined()
  })

  it('writes a toggle only when it differs from its default, encoding the real value', () => {
    const query = serializeQuery({ toggles: { searchObsoleted: false, searchContents: false } }, defaults)
    expect(query.searchObsoleted).toBe('0')
    expect(query.searchContents).toBe('0')
  })

  it('parses an explicit param over the default (both directions)', () => {
    expect(parseQuery({ searchObsoleted: '0' }, defaults).toggles?.searchObsoleted).toBe(false)
    expect(parseQuery({ searchContents: '0' }, defaults).toggles?.searchContents).toBe(false)
  })

  it('round-trips a non-default toggle state', () => {
    const original: UiState = { toggles: { searchObsoleted: false, searchContents: false } }
    const reparsed = parseQuery(serializeQuery(original, defaults), defaults)
    expect(reparsed.toggles).toEqual(original.toggles)
  })

  it('produces an empty query for the default state', () => {
    expect(serializeQuery(parseQuery({}, defaults), defaults)).toEqual({})
  })
})
