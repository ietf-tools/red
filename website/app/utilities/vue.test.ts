// @vitest-environment nuxt
import { test, expect } from 'vitest'
import { h } from 'vue'
import { getVNodeText } from './vue'

test('getVNodeText: basic', () => {
  const aesop = h('span', 'aesop')
  const rock = h('span', 'rock')
  const aesopRock = h('span', [aesop, ' ', rock])

  expect(getVNodeText(aesop)).toEqual('aesop')
  expect(getVNodeText(rock)).toEqual('rock')
  expect(getVNodeText(aesopRock)).toEqual('aesop rock')
})

test('getVNodeText: functions', () => {
  const aesopRock = h('span', () => ['aesop', 'rock'])
  expect(getVNodeText(aesopRock)).toEqual('aesoprock')
})
