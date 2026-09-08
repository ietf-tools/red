// @vitest-environment nuxt
import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { titleWithWordBreaks } from './word-break-title'

// raw, because the formatted output puts each fragment child on its own line.
const render = (title: string): string =>
  mount(defineComponent(() => () => titleWithWordBreaks(title))).html({ raw: true })

describe('titleWithWordBreaks', () => {
  test('offers a break after a slash joining two words', () => {
    expect(render('Post-Quantum/Traditional Hybrid Key Exchange')).toBe(
      'Post-Quantum/<wbr>Traditional Hybrid Key Exchange'
    )
  })

  test('offers a break after each of the other separators', () => {
    expect(render('a:b_c.d+e=f&g\\h')).toBe('a:<wbr>b_<wbr>c.<wbr>d+<wbr>e=<wbr>f&amp;<wbr>g\\<wbr>h')
  })

  test('leaves hyphens to the browser and plain titles untouched', () => {
    expect(render('Module-Lattice-Based Key-Encapsulation Mechanism')).toBe(
      'Module-Lattice-Based Key-Encapsulation Mechanism'
    )
  })

  test('does not strand a break next to an empty part', () => {
    expect(render('/leading and trailing/')).toBe('/leading and trailing/')
    expect(render('double//slash')).toBe('double//slash')
    expect(render('Ends with a period.')).toBe('Ends with a period.')
  })
})
