// @vitest-environment nuxt
import { test, expect } from 'vitest'
import { sortSectionIds } from './errata'

test('sortSectionIds: simple', () => {
  expect(sortSectionIds('section-1', 'section-2')).toEqual(-1)
  expect(sortSectionIds('section-2', 'section-1')).toEqual(1)
  expect(sortSectionIds('section-1', 'section-1')).toEqual(0)
})

test('sortSectionIds: bad section ids', () => {
  expect(sortSectionIds('section-', 'section-')).toEqual(0)
  expect(sortSectionIds('section-..', 'section-..')).toEqual(0)

  expect(sortSectionIds('section-1.2.', 'section-..')).toEqual(-1)
  expect(sortSectionIds('section-.....', 'section-1.2.')).toEqual(1)
})

test('sortSectionIds: complex', () => {
  expect(sortSectionIds('section-1', 'section-1.2.3')).toEqual(-1)
  expect(sortSectionIds('section-1.2.3', 'section-1')).toEqual(1)
  expect(sortSectionIds('section-1.1', 'section-1.2')).toEqual(-1)
  expect(sortSectionIds('section-1.2', 'section-1.1')).toEqual(1)
  expect(sortSectionIds('section-1.1', 'section-1.1')).toEqual(0)
})
