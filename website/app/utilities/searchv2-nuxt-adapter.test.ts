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

  it('accepts a comma-separated status, as the worker redirect emits', () => {
    const state = parseQuery({ status: 'Internet Standard,Historic' }, defaults)
    expect(state.refinements?.['status.name']).toEqual(['Internet Standard', 'Historic'])
  })

  it('accepts repeated and comma-separated status together', () => {
    const state = parseQuery({ status: ['Historic,Experimental', 'Informational'] }, defaults)
    expect(state.refinements?.['status.name']).toEqual(['Historic', 'Experimental', 'Informational'])
  })

  it('keeps commas inside group and authors values, which are open vocabularies', () => {
    const state = parseQuery({ authors: 'Smith, Jr.', group: 'a,b' }, defaults)
    expect(state.refinements?.['authors.name']).toEqual(['Smith, Jr.'])
    expect(state.refinements?.['group.full']).toEqual(['a,b'])
  })

  it('writes status back as repeated params, not the comma form it accepts', () => {
    const query = serializeQuery({ refinements: { 'status.name': ['Historic', 'Experimental'] } }, defaults)
    expect(query.status).toEqual(['Historic', 'Experimental'])
  })
})

describe('searchv2 nuxt adapter — publication date', () => {
  const startOf1990 = Math.floor(Date.UTC(1990, 0, 1, 0, 0, 0) / 1000)
  const endOfMay1991 = Math.floor(Date.UTC(1991, 5, 0, 23, 59, 59) / 1000)

  it('writes yyyy-M rather than unix seconds', () => {
    const query = serializeQuery({ numericRefinements: { publicationDate: { min: startOf1990 } } }, defaults)
    expect(query.from).toBe('1990-1')
    expect(query.to).toBeUndefined()
    expect(query.pubDate).toBeUndefined()
  })

  it('resolves from to the start of its month and to to the end of its month', () => {
    const state = parseQuery({ from: '1990-1', to: '1991-5' }, defaults)
    expect(state.numericRefinements?.publicationDate).toEqual({ min: startOf1990, max: endOfMay1991 })
  })

  it('treats a bare year as the whole year', () => {
    const state = parseQuery({ from: '1990', to: '1990' }, defaults)
    expect(state.numericRefinements?.publicationDate).toEqual({
      min: startOf1990,
      max: Math.floor(Date.UTC(1990, 12, 0, 23, 59, 59) / 1000)
    })
  })

  it('round-trips a range selected in the UI without drift', () => {
    const original: UiState = { numericRefinements: { publicationDate: { min: startOf1990, max: endOfMay1991 } } }
    const reparsed = parseQuery(serializeQuery(original, defaults), defaults)
    expect(reparsed.numericRefinements).toEqual(original.numericRefinements)
  })

  it('ignores an unparseable or out-of-range bound', () => {
    expect(parseQuery({ from: 'last tuesday' }, defaults).numericRefinements).toBeUndefined()
    expect(parseQuery({ from: '1990-13' }, defaults).numericRefinements).toBeUndefined()
    expect(parseQuery({ from: '631152000' }, defaults).numericRefinements).toBeUndefined()
  })

  it('still reads the legacy unix-seconds pubDate param, but never writes it', () => {
    const state = parseQuery({ pubDate: `${startOf1990}:${endOfMay1991}` }, defaults)
    expect(state.numericRefinements?.publicationDate).toEqual({ min: startOf1990, max: endOfMay1991 })
    expect(serializeQuery(state, defaults).pubDate).toBeUndefined()
  })

  it('prefers from/to over the legacy pubDate param', () => {
    const state = parseQuery({ from: '1990-1', pubDate: '0:0' }, defaults)
    expect(state.numericRefinements?.publicationDate).toEqual({ min: startOf1990, max: undefined })
  })
})
