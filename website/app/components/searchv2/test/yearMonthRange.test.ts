import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import SearchRoot from '../core/SearchRoot.vue'
import YearMonthRangeInput from '../components/YearMonthRangeInput.vue'
import { createInMemoryAdapter } from '../core/inMemoryAdapter'
import type { SearchClient } from '../types'

const client = (): SearchClient => ({
  search: async () => ({ hits: [], nbHits: 0, page: 0, nbPages: 0, hitsPerPage: 10, processingTimeMS: 1 })
})

describe('YearMonthRangeInput', () => {
  it('maps year/month selections to a unix-seconds range', async () => {
    const adapter = createInMemoryAdapter({})
    const wrapper = mount(SearchRoot, {
      props: { searchClient: client(), stateAdapter: adapter },
      slots: {
        default: () =>
          h(YearMonthRangeInput, { attribute: 'publicationDate', label: 'Publication date', minYear: 1969 })
      }
    })
    await flushPromises()

    // [fromYear, fromMonth, toYear, toMonth]
    const selects = wrapper.findAll('select')
    expect(selects).toHaveLength(4)

    // From-year only -> start of that January (unix seconds)
    await selects[0]!.setValue('2000')
    await flushPromises()
    expect(adapter.state.value.numericRefinements?.publicationDate?.min).toBe(Math.floor(Date.UTC(2000, 0, 1) / 1000))

    // Adding from-month March -> start of March
    await selects[1]!.setValue('3')
    await flushPromises()
    expect(adapter.state.value.numericRefinements?.publicationDate?.min).toBe(Math.floor(Date.UTC(2000, 2, 1) / 1000))

    // To-year only -> end of that December
    await selects[2]!.setValue('2010')
    await flushPromises()
    expect(adapter.state.value.numericRefinements?.publicationDate?.max).toBe(
      Math.floor(Date.UTC(2010, 12, 0, 23, 59, 59) / 1000)
    )

    // Clearing from-year removes the min bound
    await selects[0]!.setValue('')
    await flushPromises()
    expect(adapter.state.value.numericRefinements?.publicationDate?.min).toBeUndefined()
  })
})
