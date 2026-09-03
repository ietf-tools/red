// @vitest-environment nuxt
import { afterEach, describe, expect, test } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import SubjectFilter from './SubjectFilter.vue'

// Attached to the document because one of these is about where focus ends up, and focus does not
// move to an element the document does not contain.
enableAutoUnmount(afterEach)

const renderFilter = (query = '') =>
  mountSuspended(SubjectFilter, {
    attachTo: document.body,
    props: { modelValue: query, matchCount: 1, totalCount: 3 }
  })

describe('SubjectFilter', () => {
  test('reports what was typed', async () => {
    const filter = await renderFilter()

    await filter.find<HTMLInputElement>('input[type="search"]').setValue('routing')

    expect(filter.emitted('update:modelValue')).toStrictEqual([['routing']])
  })

  test('offers nothing to clear until there is something to clear', async () => {
    const empty = await renderFilter()
    expect(empty.find('button[aria-label="Clear the filter"]').exists()).toBe(false)

    const filled = await renderFilter('routing')
    expect(filled.find('button[aria-label="Clear the filter"]').exists()).toBe(true)
  })

  test('empties the box and puts the cursor back in it when cleared', async () => {
    const filter = await renderFilter('routing')

    await filter.find('button[aria-label="Clear the filter"]').trigger('click')

    expect(filter.emitted('update:modelValue')).toStrictEqual([['']])
    // The button that was clicked is on its way out with the query, so focus has to be put
    // somewhere deliberately or it is lost to the document.
    expect(document.activeElement).toBe(filter.find('input[type="search"]').element)
  })

  test('names the box, and says what it matches on', async () => {
    const filter = await renderFilter()
    const input = filter.find('input[type="search"]')

    expect(filter.find(`label[for="${input.attributes('id')}"]`).text()).toBe('Filter subjects')
    expect(filter.find(`#${input.attributes('aria-describedby')}`).text()).toContain(
      'Matches subject names and descriptions'
    )
  })
})
