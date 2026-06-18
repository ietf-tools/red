import { normalizeKey, type AbnfNode, type AbnfRule } from '../parser/types'

// Returns a valid example string, or null if this branch can't terminate
// (e.g. it only contains recursive references that are already being expanded).
// Callers that can absorb a failure (alt, opt, rep with min=0) handle null
// gracefully; the top-level wrapper converts null → ''.
function gen(node: AbnfNode, ruleMap: Map<string, AbnfRule>, visited: Set<string>): string | null {
  switch (node.kind) {
    case 'ref': {
      const key = normalizeKey(node.name)
      if (visited.has(key)) return null // cycle — this branch can't terminate
      const rule = ruleMap.get(key)
      if (!rule) return node.name // unknown rule, return name as best-effort
      visited.add(key)
      const result = gen(rule.def, ruleMap, visited)
      visited.delete(key) // restore: failed branches clean up after themselves
      return result
    }

    case 'str':
      return node.value

    case 'range':
      return String.fromCodePoint(node.from)

    case 'num':
      return String.fromCodePoint(node.value)

    case 'prose':
      return `<${node.text}>`

    case 'seq': {
      const parts: string[] = []
      for (const item of node.items) {
        const part = gen(item, ruleMap, visited)
        if (part === null) return null // whole sequence fails if any part can't terminate
        parts.push(part)
      }
      return parts.join('')
    }

    case 'alt': {
      // Try alternatives in order; return the first that can terminate.
      // Because ref cleans up visited on failure, each attempt starts from the
      // same visited state — no need to clone.
      for (const item of node.items) {
        const result = gen(item, ruleMap, visited)
        if (result !== null) return result
      }
      return null
    }

    case 'opt': {
      // Empty string is always valid for optional; prefer showing the item
      // if it can be generated.
      const result = gen(node.item, ruleMap, visited)
      return result ?? ''
    }

    case 'rep': {
      const count = Math.max(node.min, 1) // show at least 1 repetition in the example
      const parts: string[] = []
      for (let i = 0; i < count; i++) {
        const part = gen(node.item, ruleMap, visited)
        if (part === null) {
          // If min allows zero repetitions, empty is still valid
          return node.min === 0 ? '' : null
        }
        parts.push(part)
      }
      return node.isList ? parts.join(', ') : parts.join('')
    }
  }
}

export function generateExample(ruleName: string, ruleMap: Map<string, AbnfRule>): string {
  const rule = ruleMap.get(normalizeKey(ruleName))
  if (!rule) return ''
  try {
    return gen(rule.def, ruleMap, new Set([normalizeKey(ruleName)])) ?? ''
  } catch {
    return ''
  }
}
