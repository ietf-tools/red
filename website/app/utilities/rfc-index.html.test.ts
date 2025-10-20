import { test, expect } from 'vitest'
import { isVNode } from 'vue'
import { rfcCommaList } from './rfc-index-html'

test('rfcCommaList', () => {
  const result = rfcCommaList([{ number: 1 }, { number: 2 }])
  expect(result).toHaveLength(3)
  expect(isVNode(result[0])).toBeTruthy()
  expect(result[1]).toBe(' , ')
  expect(isVNode(result[2])).toBeTruthy()
})
