import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import SearchRoot from '../core/SearchRoot.vue'
import SearchBox from '../components/SearchBox.vue'
import Stats from '../components/Stats.vue'
import RefinementList from '../components/RefinementList.vue'
import Pagination from '../components/Pagination.vue'
import type { SearchClient, SearchResponse } from '../types'

const client = (over: Partial<SearchResponse> = {}): SearchClient => ({
  search: async () => ({ hits: [], nbHits: 0, page: 0, nbPages: 0, hitsPerPage: 10, processingTimeMS: 1, ...over })
})

const mountWith = (searchClient: SearchClient, widget: ReturnType<typeof h>) =>
  mount(SearchRoot, { props: { searchClient }, slots: { default: () => widget } })

describe('accessible defaults', () => {
  // Defect 2: submit button named without relying on `title`.
  it('SearchBox submit button has an aria-label and no title', async () => {
    const wrapper = mountWith(client(), h(SearchBox))
    const submit = wrapper.get('button[type="submit"]')
    expect(submit.attributes('aria-label')).toBe('Search')
    expect(submit.attributes('title')).toBeUndefined()
  })

  // Defect 1: result count lives in a polite live region.
  it('Stats renders a polite live region with the count', async () => {
    const wrapper = mountWith(client({ nbHits: 42 }), h(Stats))
    await flushPromises()
    const region = wrapper.get('[role="status"]')
    expect(region.attributes('aria-live')).toBe('polite')
    expect(region.text()).toContain('42')
  })

  // Defect 3: searchable facet is a labelled group with its own labelled search field.
  it('searchable RefinementList is a fieldset/legend with a labelled facet search', async () => {
    const searchClient: SearchClient = {
      search: async () => ({
        hits: [],
        nbHits: 5,
        page: 0,
        nbPages: 1,
        hitsPerPage: 10,
        processingTimeMS: 1,
        facets: { 'group.full': { httpbis: 3, tls: 2 } }
      })
    }
    const wrapper = mountWith(
      searchClient,
      h(RefinementList, { attribute: 'group.full', label: 'Working group', searchable: true })
    )
    await flushPromises()

    expect(wrapper.find('fieldset').exists()).toBe(true)
    expect(wrapper.get('legend').text()).toBe('Working group')

    const input = wrapper.get('input[type="search"]')
    const id = input.attributes('id')
    expect(wrapper.get(`label[for="${id}"]`).text()).toBe('Search working group')

    expect(wrapper.findAll('input[type="checkbox"]').length).toBe(2)
  })

  it('RefinementList links its description to each option via aria-describedby', async () => {
    const searchClient: SearchClient = {
      search: async () => ({
        hits: [],
        nbHits: 5,
        page: 0,
        nbPages: 1,
        hitsPerPage: 10,
        processingTimeMS: 1,
        facets: { 'group.full': { httpbis: 3, tls: 2 } }
      })
    }
    const wrapper = mountWith(
      searchClient,
      h(RefinementList, { attribute: 'group.full', label: 'Working group', description: 'Filter by working group.' })
    )
    await flushPromises()

    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes.length).toBe(2)
    const describedBy = checkboxes[0]!.attributes('aria-describedby')
    expect(describedBy).toBeTruthy()
    const description = wrapper.get(`#${describedBy}`)
    expect(description.text()).toBe('Filter by working group.')
    // Every option points at the same shared description element.
    for (const checkbox of checkboxes) expect(checkbox.attributes('aria-describedby')).toBe(describedBy)
  })

  it('RefinementList omits aria-describedby when no description is given', async () => {
    const searchClient: SearchClient = {
      search: async () => ({
        hits: [],
        nbHits: 5,
        page: 0,
        nbPages: 1,
        hitsPerPage: 10,
        processingTimeMS: 1,
        facets: { 'group.full': { httpbis: 3 } }
      })
    }
    const wrapper = mountWith(searchClient, h(RefinementList, { attribute: 'group.full', label: 'Working group' }))
    await flushPromises()

    expect(wrapper.get('input[type="checkbox"]').attributes('aria-describedby')).toBeUndefined()
  })

  // Defect 4: show-more accessible name includes the group.
  it('RefinementList show-more has a group-specific accessible name', async () => {
    const facets = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`group-${index}`, 12 - index]))
    const searchClient: SearchClient = {
      search: async () => ({
        hits: [],
        nbHits: 30,
        page: 0,
        nbPages: 1,
        hitsPerPage: 10,
        processingTimeMS: 1,
        facets: { 'group.full': facets }
      })
    }
    const wrapper = mountWith(
      searchClient,
      h(RefinementList, { attribute: 'group.full', label: 'Working group', showMore: true, limit: 5 })
    )
    await flushPromises()
    const showMore = wrapper.get('button')
    expect(showMore.attributes('aria-label')).toBe('Show more working group')
  })

  // Defect 6: current pagination page carries aria-current="page".
  it('Pagination marks the current page with aria-current', async () => {
    const searchClient: SearchClient = {
      search: async () => ({ hits: [], nbHits: 50, page: 0, nbPages: 5, hitsPerPage: 10, processingTimeMS: 1 })
    }
    const wrapper = mountWith(searchClient, h(Pagination))
    await flushPromises()
    const current = wrapper.get('[aria-current="page"]')
    expect(current.text()).toBe('1')
  })

  // Defect 5: expanding moves focus to the first newly revealed option.
  it('RefinementList moves focus to the first new option on show more', async () => {
    const facets = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`g${index}`, 12 - index]))
    const searchClient: SearchClient = {
      search: async () => ({
        hits: [],
        nbHits: 30,
        page: 0,
        nbPages: 1,
        hitsPerPage: 10,
        processingTimeMS: 1,
        facets: { 'group.full': facets }
      })
    }
    const wrapper = mount(SearchRoot, {
      attachTo: document.body,
      props: { searchClient },
      slots: {
        default: () =>
          h(RefinementList, {
            attribute: 'group.full',
            label: 'Working group',
            showMore: true,
            limit: 5,
            showMoreLimit: 12
          })
      }
    })
    await flushPromises()
    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(5)

    await wrapper.get('button').trigger('click')
    await flushPromises()

    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes.length).toBeGreaterThan(5)
    expect(document.activeElement).toBe(checkboxes[5]?.element)
    wrapper.unmount()
  })

  // Empty facet: a named group with no options must explain why, not be silently empty.
  it('RefinementList shows an empty message when the facet has no options', async () => {
    const searchClient: SearchClient = {
      search: async () => ({
        hits: [],
        nbHits: 0,
        page: 0,
        nbPages: 0,
        hitsPerPage: 10,
        processingTimeMS: 1,
        facets: {}
      })
    }
    const wrapper = mountWith(searchClient, h(RefinementList, { attribute: 'group.full', label: 'Working group' }))
    await flushPromises()
    expect(wrapper.get('fieldset').text()).toContain('No options available.')
  })
})
