/**
 * Recursive-descent validator for RFC 5234 ABNF.
 *
 * Walks the AbnfNode AST against an input string, returning how far it
 * matched and what was expected at the failure point.  Uses PEG semantics:
 * Choice tries alternatives left-to-right and returns the first success;
 * Repetition is greedy but backtracks safely because each sub-attempt gets
 * its own call frame with a local position.
 *
 * Core rules (ALPHA, DIGIT …) are resolved from the rule map, which is built
 * with buildRuleMap() so they are always present as fallbacks.
 */

import { normalizeKey, type AbnfNode, type AbnfRule } from '../parser/types'

export type MatchOk = { ok: true; end: number }
export type MatchErr = { ok: false; pos: number; expected: string[] }
export type MatchResult = MatchOk | MatchErr

export function validate(input: string, ruleName: string, ruleMap: Map<string, AbnfRule>): MatchResult {
  const rule = ruleMap.get(normalizeKey(ruleName))
  if (!rule) return { ok: false, pos: 0, expected: [`unknown rule: ${ruleName}`] }
  return matchNode(rule.def, input, 0, ruleMap, new Set())
}

// ── core ──────────────────────────────────────────────────────────────────

function matchNode(
  node: AbnfNode,
  input: string,
  pos: number,
  rules: Map<string, AbnfRule>,
  visited: Set<string> // cycle guard
): MatchResult {
  switch (node.kind) {
    case 'str': {
      const { value, caseSensitive } = node
      const slice = input.slice(pos, pos + value.length)
      const matches = caseSensitive ? slice === value : slice.toLowerCase() === value.toLowerCase()
      if (matches) return { ok: true, end: pos + value.length }
      return { ok: false, pos, expected: [JSON.stringify(value)] }
    }

    case 'num': {
      const cp = input.codePointAt(pos)
      if (cp === node.value) return { ok: true, end: pos + String.fromCodePoint(node.value).length }
      return { ok: false, pos, expected: [`%x${node.value.toString(16).toUpperCase()}`] }
    }

    case 'range': {
      const cp = input.codePointAt(pos)
      if (cp !== undefined && cp >= node.from && cp <= node.to) {
        return { ok: true, end: pos + String.fromCodePoint(cp).length }
      }
      const { base, from, to } = node
      const r = base === 'x' ? 16 : base === 'b' ? 2 : 10
      return {
        ok: false,
        pos,
        expected: [`%${base}${from.toString(r).toUpperCase()}-${to.toString(r).toUpperCase()}`]
      }
    }

    case 'prose':
      // Prose values are informative and cannot be validated — treat as Skip.
      return { ok: true, end: pos }

    case 'ref': {
      const key = normalizeKey(node.name)
      if (visited.has(key)) {
        // Recursive reference: stop descent to avoid infinite loop.
        return { ok: true, end: pos }
      }
      const rule = rules.get(key)
      if (!rule) return { ok: false, pos, expected: [`<${node.name}>`] }
      return matchNode(rule.def, input, pos, rules, new Set([...visited, key]))
    }

    case 'seq': {
      let cur = pos
      let furthestErr: MatchErr = { ok: false, pos, expected: [] }
      for (const item of node.items) {
        const r = matchNode(item, input, cur, rules, visited)
        if (!r.ok) {
          // Propagate the furthest error seen.
          if (r.pos >= furthestErr.pos) furthestErr = r
          return furthestErr
        }
        cur = r.end
      }
      return { ok: true, end: cur }
    }

    case 'alt': {
      let furthestErr: MatchErr = { ok: false, pos, expected: [] }
      for (const item of node.items) {
        const r = matchNode(item, input, pos, rules, visited)
        if (r.ok) return r
        if (!r.ok && r.pos >= furthestErr.pos) {
          // Merge expected lists when errors are at the same position.
          furthestErr =
            r.pos === furthestErr.pos
              ? { ok: false, pos: r.pos, expected: [...furthestErr.expected, ...r.expected] }
              : r
        }
      }
      return furthestErr
    }

    case 'opt': {
      const r = matchNode(node.item, input, pos, rules, visited)
      return r.ok ? r : { ok: true, end: pos }
    }

    case 'rep': {
      const { min, max, isList, item } = node
      let cur = pos
      let count = 0
      let furthestErr: MatchErr = { ok: false, pos, expected: [] }

      while (max === null || count < max) {
        // For list operator: after the first element, expect a comma then optional WSP.
        if (isList && count > 0) {
          const commaR = matchLiteral(input, cur, ',')
          if (!commaR.ok) break
          cur = commaR.end
          // Optional surrounding whitespace (OWS = *( SP / HTAB ))
          while (cur < input.length && (input[cur] === ' ' || input[cur] === '\t')) cur++
        }

        const r = matchNode(item, input, cur, rules, visited)
        if (!r.ok) {
          if (r.pos >= furthestErr.pos) furthestErr = r
          // Undo the comma advance for list operators on failure.
          if (isList && count > 0) cur = furthestErr.pos
          break
        }
        cur = r.end
        count++
        if (r.end === cur && count > 0) break // zero-width match guard
      }

      if (count < min) {
        return furthestErr.pos > pos ? furthestErr : { ok: false, pos, expected: [`at least ${min} repetition(s)`] }
      }
      return { ok: true, end: cur }
    }
  }
}

function matchLiteral(input: string, pos: number, s: string): MatchResult {
  if (input.startsWith(s, pos)) return { ok: true, end: pos + s.length }
  return { ok: false, pos, expected: [JSON.stringify(s)] }
}
