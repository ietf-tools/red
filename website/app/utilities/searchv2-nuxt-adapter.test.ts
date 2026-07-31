import { describe, expect, it } from 'vitest'
import type { UiState } from '~/components/searchv2'
import { parseQuery, serializeQuery } from './searchv2-nuxt-adapter'

// The RFC search baseline: obsoleted/historic searched, full-text search on (metadata-only off).
const defaults: UiState = {
  toggles: { searchObsoleted: true, searchMetadataOnly: false }
}

describe('searchv2 nuxt adapter — toggle defaults', () => {
  it('parses absent params back to their configured defaults', () => {
    const state = parseQuery({}, defaults)
    expect(state.toggles).toEqual({ searchObsoleted: true, searchMetadataOnly: false })
  })

  it('omits toggles that equal their default from the URL', () => {
    const query = serializeQuery({ toggles: { searchObsoleted: true, searchMetadataOnly: false } }, defaults)
    expect(query.searchObsoleted).toBeUndefined()
    expect(query.searchMetadataOnly).toBeUndefined()
  })

  it('writes a toggle only when it differs from its default, encoding the real value', () => {
    const query = serializeQuery({ toggles: { searchObsoleted: false, searchMetadataOnly: true } }, defaults)
    expect(query.searchObsoleted).toBe('0')
    expect(query.searchMetadataOnly).toBe('1')
  })

  it('parses an explicit param over the default (both directions)', () => {
    expect(parseQuery({ searchObsoleted: '0' }, defaults).toggles?.searchObsoleted).toBe(false)
    expect(parseQuery({ searchMetadataOnly: '1' }, defaults).toggles?.searchMetadataOnly).toBe(true)
  })

  it('round-trips a non-default toggle state', () => {
    const original: UiState = { toggles: { searchObsoleted: false, searchMetadataOnly: true } }
    const reparsed = parseQuery(serializeQuery(original, defaults), defaults)
    expect(reparsed.toggles).toEqual(original.toggles)
  })

  it('produces an empty query for the default state', () => {
    expect(serializeQuery(parseQuery({}, defaults), defaults)).toEqual({})
  })
})

describe('searchv2 nuxt adapter — multi-value refinements', () => {
  it('writes each value as its own occurrence of the key', () => {
    const query = serializeQuery({ refinements: { 'status.name': ['Internet Standard', 'Historic'] } }, defaults)
    expect(query.status).toEqual(['Internet Standard', 'Historic'])
  })

  it('reads repeated params back into a refinement', () => {
    const state = parseQuery({ authors: ['Alice', 'Bob'] }, defaults)
    expect(state.refinements?.['authors.name']).toEqual(['Alice', 'Bob'])
  })

  it('reads a single occurrence back as a one-value refinement', () => {
    const state = parseQuery({ group: 'quic' }, defaults)
    expect(state.refinements?.['group.full']).toEqual(['quic'])
  })

  it('round-trips values containing a comma', () => {
    // The delimited format split this into two refinements.
    const original: UiState = { refinements: { 'authors.name': ['Smith, Jr.', 'Bob'] } }
    const reparsed = parseQuery(serializeQuery(original, defaults), defaults)
    expect(reparsed.refinements?.['authors.name']).toEqual(['Smith, Jr.', 'Bob'])
  })

  it('round-trips every multi-select facet at once', () => {
    const original: UiState = {
      refinements: {
        'status.name': ['Internet Standard', 'Best Current Practice'],
        'group.full': ['quic'],
        'authors.name': ['Ann, PhD', 'Bo']
      }
    }
    const reparsed = parseQuery(serializeQuery(original, defaults), defaults)
    expect(reparsed.refinements).toEqual(original.refinements)
  })

  it('drops empty and valueless occurrences', () => {
    expect(parseQuery({ authors: ['Alice', '', null] }, defaults).refinements?.['authors.name']).toEqual(['Alice'])
    expect(parseQuery({ authors: [null] }, defaults).refinements).toBeUndefined()
  })

  it('still honours the legacy comma-separated statuses param', () => {
    const state = parseQuery({ statuses: 'Internet Standard,Historic' }, defaults)
    expect(state.refinements?.['status.name']).toEqual(['Internet Standard', 'Historic'])
  })

  it('prefers repeated status params over the legacy statuses param', () => {
    const state = parseQuery({ status: ['Historic'], statuses: 'Internet Standard' }, defaults)
    expect(state.refinements?.['status.name']).toEqual(['Historic'])
  })
})
