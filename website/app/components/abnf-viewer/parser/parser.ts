/**
 * RFC 5234 ABNF parser + RFC 7230/9110 list-operator (#) extension.
 *
 * Produces a ParseResult containing the rule list and any parse errors
 * encountered. Failed rules are skipped rather than aborting the whole parse
 * so that partial ABNF blocks still produce useful diagrams.
 */

import type { AbnfNode, AbnfRule, ParseError, ParseResult } from './types'
import { CORE_RULE_MAP } from './core-rules'

export function parseAbnf(src: string): ParseResult {
  return new AbnfParser(src).parseAll()
}

// Build a Map from a ParseResult, merging user rules on top of core rules.
export function buildRuleMap(rules: AbnfRule[]): Map<string, AbnfRule> {
  const map = new Map<string, AbnfRule>(CORE_RULE_MAP)
  for (const r of rules) map.set(r.name.toUpperCase(), r)
  return map
}

class AbnfParser {
  private pos = 0
  private readonly errors: ParseError[] = []

  constructor(private readonly src: string) {}

  // ── public ───────────────────────────────────────────────────────────────

  parseAll(): ParseResult {
    const rules: AbnfRule[] = []
    const index = new Map<string, AbnfRule>()

    while (this.pos < this.src.length) {
      // Skip blank lines.
      if (this.ch() === '\r' || this.ch() === '\n') {
        this.advanceNewline()
        continue
      }
      // Skip comment-only lines.
      if (this.ch() === ';') {
        this.skipToEOL()
        continue
      }

      // xml2rfc indents ABNF blocks — strip leading whitespace before each
      // top-level attempt. True continuation lines are consumed inside
      // parseAlternation via skipCwsp and never reach here.
      while (this.ch() === ' ' || this.ch() === '\t') this.pos++

      // After whitespace-stripping we may be at EOL/comment/EOF again.
      if (this.ch() === '\r' || this.ch() === '\n') continue
      if (this.ch() === ';') {
        this.skipToEOL()
        continue
      }
      if (this.pos >= this.src.length) break

      const lineStart = this.pos
      const lineNum = this.lineAt(lineStart)
      const colNum = this.colAt(lineStart)

      try {
        const name = this.parseRulename()
        if (!name) {
          this.skipToEOL()
          continue
        }

        // Inline whitespace before = / =/
        while (this.ch() === ' ' || this.ch() === '\t') this.pos++

        let incremental = false
        if (this.match('=/')) {
          incremental = true
        } else if (this.match('=')) {
          incremental = false
        } else {
          this.pos = lineStart
          this.skipToEOL()
          continue
        }

        this.skipCwsp()
        const def = this.parseAlternation()
        const key = name.toUpperCase()

        if (incremental && index.has(key)) {
          const existing = index.get(key)!
          const newItems = def.kind === 'alt' ? def.items : [def]
          if (existing.def.kind === 'alt') {
            existing.def.items.push(...newItems)
          } else {
            existing.def = { kind: 'alt', items: [existing.def, ...newItems] }
          }
          existing.incremental = true
        } else if (!index.has(key)) {
          const rule: AbnfRule = { name, def }
          rules.push(rule)
          index.set(key, rule)
        }
      } catch (e) {
        this.errors.push({
          line: lineNum,
          col: colNum,
          message: e instanceof Error ? e.message : String(e)
        })
        this.pos = lineStart
        this.skipToEOL()
      }
    }

    return { rules, errors: this.errors }
  }

  // ── character utilities ──────────────────────────────────────────────────

  private ch(offset = 0): string {
    return this.src[this.pos + offset] ?? ''
  }

  private match(s: string): boolean {
    if (this.src.startsWith(s, this.pos)) {
      this.pos += s.length
      return true
    }
    return false
  }

  private advanceNewline(): void {
    if (this.ch() === '\r') this.pos++
    if (this.ch() === '\n') this.pos++
  }

  private skipToEOL(): void {
    while (this.ch() !== '\n' && this.ch() !== '\r' && this.ch() !== '') this.pos++
    this.advanceNewline()
  }

  private lineAt(pos: number): number {
    return this.src.slice(0, pos).split('\n').length
  }
  private colAt(pos: number): number {
    const last = this.src.lastIndexOf('\n', pos - 1)
    return pos - (last + 1) + 1
  }

  // c-wsp: SP/HTAB, comments, and CRLF/LF followed by SP/HTAB (line folding).
  private skipCwsp(): void {
    for (;;) {
      if (this.ch() === ' ' || this.ch() === '\t') {
        this.pos++
        continue
      }
      if (this.ch() === ';') {
        while (this.ch() !== '\n' && this.ch() !== '\r' && this.ch() !== '') this.pos++
        continue
      }
      if (this.ch() === '\r' && this.ch(1) === '\n' && (this.ch(2) === ' ' || this.ch(2) === '\t')) {
        this.pos += 2
        continue
      }
      if (this.ch() === '\n' && (this.ch(1) === ' ' || this.ch(1) === '\t')) {
        this.pos++
        continue
      }
      break
    }
  }

  // ── rule name ────────────────────────────────────────────────────────────

  private parseRulename(): string | null {
    if (!/[a-zA-Z]/.test(this.ch())) return null
    const start = this.pos
    while (/[a-zA-Z0-9\-]/.test(this.ch())) this.pos++
    return this.src.slice(start, this.pos)
  }

  // ── grammar ──────────────────────────────────────────────────────────────

  private parseAlternation(): AbnfNode {
    const items: AbnfNode[] = [this.parseConcatenation()]
    for (;;) {
      const saved = this.pos
      this.skipCwsp()
      if (this.match('/')) {
        this.skipCwsp()
        items.push(this.parseConcatenation())
      } else {
        this.pos = saved
        break
      }
    }
    return items.length === 1 ? items[0]! : { kind: 'alt', items }
  }

  private parseConcatenation(): AbnfNode {
    const items: AbnfNode[] = [this.parseRepetition()]
    for (;;) {
      const saved = this.pos
      const before = this.pos
      this.skipCwsp()
      if (this.pos === before) {
        this.pos = saved
        break
      }
      const next = this.ch()
      if (next === '' || next === ')' || next === ']' || next === '/') {
        this.pos = saved
        break
      }
      const saved2 = this.pos
      try {
        items.push(this.parseRepetition())
      } catch {
        this.pos = saved2
        this.pos = saved
        break
      }
    }
    return items.length === 1 ? items[0]! : { kind: 'seq', items }
  }

  private parseRepetition(): AbnfNode {
    const rep = this.tryRepeat()
    const el = this.parseElement()
    if (!rep) return el
    const { min, max, isList } = rep
    if (min === 0 && max === 1 && !isList) return { kind: 'opt', item: el }
    if (min === 1 && max === 1 && !isList) return el
    return { kind: 'rep', item: el, min, max, isList }
  }

  private tryRepeat(): { min: number; max: number | null; isList: boolean } | null {
    const start = this.pos
    let numStr = ''
    while (/\d/.test(this.ch())) {
      numStr += this.ch()
      this.pos++
    }

    if (this.ch() === '*' || this.ch() === '#') {
      // RFC 5234 repetition (*) and RFC 7230/9110 list operator (#).
      const isList = this.ch() === '#'
      this.pos++
      const min = numStr ? parseInt(numStr, 10) : 0
      let maxStr = ''
      while (/\d/.test(this.ch())) {
        maxStr += this.ch()
        this.pos++
      }
      return { min, max: maxStr ? parseInt(maxStr, 10) : null, isList }
    }

    if (numStr) {
      const next = this.ch()
      if (next === '"' || next === '%' || next === '<' || next === '(' || next === '[' || /[a-zA-Z]/.test(next)) {
        const n = parseInt(numStr, 10)
        return { min: n, max: n, isList: false }
      }
    }

    this.pos = start
    return null
  }

  private parseElement(): AbnfNode {
    const ch = this.ch()

    if (ch === '(') {
      this.pos++
      this.skipCwsp()
      const alt = this.parseAlternation()
      this.skipCwsp()
      this.match(')')
      return alt
    }

    if (ch === '[') {
      this.pos++
      this.skipCwsp()
      const alt = this.parseAlternation()
      this.skipCwsp()
      this.match(']')
      return { kind: 'opt', item: alt }
    }

    if (ch === '%') {
      const n1 = this.ch(1).toLowerCase()
      if ((n1 === 's' || n1 === 'i') && this.ch(2) === '"') return this.parseCharVal()
      return this.parseNumVal()
    }

    if (ch === '"') return this.parseCharVal()
    if (ch === '<') return this.parseProseVal()
    if (/[a-zA-Z]/.test(ch)) return { kind: 'ref', name: this.parseRulename()! }

    throw new Error(`Unexpected character: ${JSON.stringify(ch)}`)
  }

  private parseCharVal(): AbnfNode {
    let caseSensitive = false
    if (this.ch() === '%') {
      caseSensitive = this.ch(1).toLowerCase() === 's'
      this.pos += 2 // skip %s / %i
    }
    this.pos++ // opening "
    const start = this.pos
    while (this.ch() !== '"' && this.ch() !== '' && this.ch() !== '\n') this.pos++
    const value = this.src.slice(start, this.pos)
    if (this.ch() === '"') this.pos++
    return { kind: 'str', value, caseSensitive }
  }

  private parseNumVal(): AbnfNode {
    const start = this.pos
    this.pos++ // skip %
    const base = this.ch().toLowerCase() as 'x' | 'd' | 'b'
    if (base !== 'x' && base !== 'd' && base !== 'b') {
      this.pos = start
      throw new Error('Expected num-val base (x/d/b)')
    }
    this.pos++

    const digitRe = base === 'x' ? /[0-9a-fA-F]/ : base === 'd' ? /\d/ : /[01]/
    const valStart = this.pos
    while (digitRe.test(this.ch()) || this.ch() === '.' || this.ch() === '-') this.pos++
    const raw = this.src.slice(valStart, this.pos)
    const radix = base === 'x' ? 16 : base === 'd' ? 10 : 2

    // Concatenation: %x41.42.43 → "ABC"
    if (raw.includes('.')) {
      try {
        const chars = raw.split('.').map((p) => String.fromCodePoint(parseInt(p, radix)))
        return { kind: 'str', value: chars.join(''), caseSensitive: true }
      } catch {
        /* fall through to range */
      }
    }

    // Range: %x41-5A
    if (raw.includes('-')) {
      const [lo, hi] = raw.split('-')
      return { kind: 'range', base, from: parseInt(lo!, radix), to: parseInt(hi!, radix) }
    }

    // Single codepoint
    const cp = parseInt(raw, radix)
    return { kind: 'num', base, value: cp }
  }

  private parseProseVal(): AbnfNode {
    this.pos++ // skip <
    const start = this.pos
    while (this.ch() !== '>' && this.ch() !== '' && this.ch() !== '\n') this.pos++
    const text = this.src.slice(start, this.pos)
    if (this.ch() === '>') this.pos++
    return { kind: 'prose', text }
  }
}
