import { test, expect } from 'vitest'
import { parseAbnf, buildRuleMap } from '../parser/parser'
import { generateExample } from './generate'
import { validate } from './validate'

// buildRuleMap keys rules by their upper-cased name, so generateExample must
// look them up the same way. Regression guard: a lower-cased lookup makes
// generateExample miss every rule and return ''.
function ruleMapFor(src: string) {
  return buildRuleMap(parseAbnf(src).rules)
}

test('generateExample resolves the top-level rule regardless of name case', () => {
  const map = ruleMapFor('Greeting = "hello"')
  expect(generateExample('Greeting', map)).toBe('hello')
})

test('generateExample resolves core rules referenced from a user rule', () => {
  const map = ruleMapFor('word = 1*ALPHA')
  const example = generateExample('word', map)
  expect(example.length).toBeGreaterThan(0)
  // The generated example must actually validate against the rule.
  expect(validate(example, 'word', map).ok).toBe(true)
})

test('generateExample picks a branch from an alternation', () => {
  const map = ruleMapFor('choice = "a" / "b"')
  expect(generateExample('choice', map)).toBe('a')
})

test('generateExample returns "" for an unknown rule', () => {
  const map = ruleMapFor('foo = "x"')
  expect(generateExample('does-not-exist', map)).toBe('')
})
