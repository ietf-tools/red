// @vitest-environment nuxt
import { afterEach, describe, expect, test, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import SubjectFilter from './SubjectFilter.vue'

// Attached to the document because one of these is about where focus ends up, and focus does not
// move to an element the document does not contain.
enableAutoUnmount(afterEach)

const renderFilter = (query = '', counts: { matchCount?: number; totalCount?: number; contextCount?: number } = {}) =>
  mountSuspended(SubjectFilter, {
    attachTo: document.body,
    props: { modelValue: query, matchCount: 1, totalCount: 3, contextCount: 0, ...counts }
  })

// Longer than the delay the announcement is held back by.
const ANNOUNCEMENT_SETTLE_MS = 600

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

  describe('the announcement', () => {
    // The live region is what a reader who cannot see the highlighted matches has instead, so the
    // wording is the behaviour rather than a detail of it.
    // Typed rather than mounted with a query already in the box, because the live region is what
    // the announcement *changed* to: a region that already held its text when the page arrived
    // would have been read out before the reader typed anything.
    const announced = async (...queries: [query: string, counts: Parameters<typeof renderFilter>[1]][]) => {
      const [first] = queries
      const filter = await renderFilter('', first?.[1])
      vi.useFakeTimers()
      try {
        for (const [query, counts] of queries) {
          await filter.setProps({ ...counts })
          await filter.find('input[type="search"]').setValue(query)
          await vi.advanceTimersByTimeAsync(ANNOUNCEMENT_SETTLE_MS)
        }
        return filter.find('[role="status"][aria-live="polite"]').text()
      } finally {
        vi.useRealTimers()
      }
    }

    test('says nothing until something has been typed', async () => {
      const filter = await renderFilter('', { matchCount: 3, totalCount: 3 })

      expect(filter.find('[role="status"][aria-live="polite"]').text()).toBe('')
    })

    test('falls silent again when the filter is cleared', async () => {
      expect(
        await announced(
          ['routing', { matchCount: 1, totalCount: 6, contextCount: 1 }],
          ['', { matchCount: 6, totalCount: 6, contextCount: 0 }]
        )
      ).toBe('')
    })

    test('counts the parent subjects the page drew around the matches', async () => {
      // Four rows are on screen and one of them was matched. Announcing the match count alone
      // describes a page the reader is not looking at.
      expect(await announced(['json web', { matchCount: 1, totalCount: 6, contextCount: 3 }])).toBe(
        'Showing 1 of 6 subjects, with 3 parent subjects for context'
      )
    })

    test('says nothing about context when the matches stand on their own', async () => {
      expect(await announced(['networking', { matchCount: 1, totalCount: 6, contextCount: 0 }])).toBe(
        'Showing 1 of 6 subjects'
      )
    })

    test('counts one parent subject as one', async () => {
      expect(await announced(['routing', { matchCount: 1, totalCount: 6, contextCount: 1 }])).toBe(
        'Showing 1 of 6 subjects, with 1 parent subject for context'
      )
    })

    test('says a query matched nothing rather than showing it none of six', async () => {
      expect(await announced(['quantum', { matchCount: 0, totalCount: 6, contextCount: 0 }])).toBe('No subjects match')
    })
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
