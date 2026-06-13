/**
 * ABNF Railroad Diagrams
 *
 * This module is intentionally only ever loaded via a dynamic import() inside
 * RFCDocumentAbnfDiagram.vue, so railroad-diagrams and the parser are never
 * bundled into the main chunk.
 */

// railroad-diagrams is a CJS IIFE. Use a default import: Vite/esbuild always
// puts the full module.exports object on the default export for CJS modules.
// A namespace import (import * as …) does NOT reliably expose named exports
// here because the IIFE assigns through an intermediate variable (`root =
// exports; root.Diagram = …`) that esbuild's static analyser cannot trace,
// leaving every named export as undefined at runtime.
import _rr from 'railroad-diagrams'

type RRItem = { toString(): string; width: number; up: number; down: number }
type RRLib = {
  Diagram: (...items: RRItem[]) => { toString(): string }
  Sequence: (...items: RRItem[]) => RRItem
  Choice: (defaultIndex: number, ...items: RRItem[]) => RRItem
  Optional: (item: RRItem) => RRItem
  OneOrMore: (item: RRItem, rep?: RRItem) => RRItem
  ZeroOrMore: (item: RRItem, rep?: RRItem) => RRItem
  Terminal: (text: string) => RRItem
  NonTerminal: (text: string) => RRItem
  Comment: (text: string) => RRItem
  Skip: () => RRItem
}

const rr = _rr as unknown as RRLib

// ---------------------------------------------------------------------------
// ABNF AST types
// ---------------------------------------------------------------------------

type AbnfNode =
  | { kind: 'ref'; name: string }
  | { kind: 'str'; value: string }
  | { kind: 'range'; display: string }
  | { kind: 'num'; display: string }
  | { kind: 'prose'; text: string }
  | { kind: 'seq'; items: AbnfNode[] }
  | { kind: 'alt'; items: AbnfNode[] }
  | { kind: 'opt'; item: AbnfNode }
  | { kind: 'rep'; item: AbnfNode; min: number; max: number | null }

interface AbnfRule {
  name: string
  def: AbnfNode
}

// ---------------------------------------------------------------------------
// Parser
// Implements the RFC 5234 ABNF grammar subset used in published RFCs.
// ---------------------------------------------------------------------------

class AbnfParser {
  private pos = 0

  constructor(private src: string) {}

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

  // Skip c-wsp: SP/HTAB, comments, and (CRLF/LF followed by SP/HTAB) for
  // rule continuation lines.
  private skipCwsp(): void {
    for (;;) {
      if (this.ch() === ' ' || this.ch() === '\t') {
        this.pos++
        continue
      }
      // Comment: ; to end of line
      if (this.ch() === ';') {
        while (this.ch() !== '\n' && this.ch() !== '\r' && this.ch() !== '') this.pos++
        continue
      }
      // Line folding: CRLF/LF followed by SP/HTAB = continuation
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

  private skipToEOL(): void {
    while (this.ch() !== '\n' && this.ch() !== '\r' && this.ch() !== '') this.pos++
    if (this.ch() === '\r') this.pos++
    if (this.ch() === '\n') this.pos++
  }

  private parseRulename(): string | null {
    if (!/[a-zA-Z]/.test(this.ch())) return null
    const start = this.pos
    while (/[a-zA-Z0-9\-]/.test(this.ch())) this.pos++
    return this.src.slice(start, this.pos)
  }

  parseAll(): AbnfRule[] {
    const rules: AbnfRule[] = []
    const ruleMap = new Map<string, AbnfRule>()

    while (this.pos < this.src.length) {
      // Skip blank lines and standalone comment lines
      if (this.ch() === '\r' || this.ch() === '\n') {
        if (this.ch() === '\r') this.pos++
        if (this.ch() === '\n') this.pos++
        continue
      }
      if (this.ch() === ';') {
        this.skipToEOL()
        continue
      }
      // xml2rfc HTML indents ABNF rules with leading spaces. Consume them so
      // that "  rulename = ..." is treated the same as "rulename = ...". True
      // continuation lines (/ alternative) are consumed inside parseAlternation
      // via skipCwsp, so they are never seen here; any line that reaches this
      // point after whitespace-stripping and starts with a non-letter is
      // genuinely unparseable and will be skipped by the name-check below.
      while (this.ch() === ' ' || this.ch() === '\t') this.pos++
      if (this.ch() === '\r' || this.ch() === '\n' || this.ch() === ';') continue
      if (this.pos >= this.src.length) break

      const startPos = this.pos
      try {
        const name = this.parseRulename()
        if (!name) {
          this.skipToEOL()
          continue
        }

        // *c-wsp before "=" (only inline whitespace here, not newlines)
        while (this.ch() === ' ' || this.ch() === '\t') this.pos++

        let incremental = false
        if (this.match('=/')) {
          incremental = true
        } else if (this.match('=')) {
          incremental = false
        } else {
          this.pos = startPos
          this.skipToEOL()
          continue
        }

        this.skipCwsp()
        const def = this.parseAlternation()
        const key = name.toUpperCase()

        if (incremental && ruleMap.has(key)) {
          const existing = ruleMap.get(key)!
          if (existing.def.kind === 'alt') {
            existing.def.items.push(...(def.kind === 'alt' ? def.items : [def]))
          } else {
            existing.def = {
              kind: 'alt',
              items: [existing.def, ...(def.kind === 'alt' ? def.items : [def])]
            }
          }
        } else if (!ruleMap.has(key)) {
          const rule: AbnfRule = { name, def }
          rules.push(rule)
          ruleMap.set(key, rule)
        }
      } catch {
        this.pos = startPos
        this.skipToEOL()
      }
    }

    return rules
  }

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
      // Need at least one whitespace char consumed for concatenation
      if (this.pos === before) {
        this.pos = saved
        break
      }
      // Stop at group/option closers and alternation separators
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
    const { min, max } = rep
    if (min === 0 && max === 1) return { kind: 'opt', item: el }
    if (min === 1 && max === 1) return el
    return { kind: 'rep', item: el, min, max }
  }

  private tryRepeat(): { min: number; max: number | null } | null {
    const start = this.pos
    let numStr = ''
    while (/\d/.test(this.ch())) {
      numStr += this.ch()
      this.pos++
    }

    if (this.ch() === '*' || this.ch() === '#') {
      // RFC 5234 repetition (*) and RFC 7230/9110 list operator (#).
      // Both follow the same N*M / N#M syntax; # just additionally implies
      // comma-separated elements, which we represent the same way visually.
      this.pos++
      const min = numStr ? parseInt(numStr) : 0
      let maxStr = ''
      while (/\d/.test(this.ch())) {
        maxStr += this.ch()
        this.pos++
      }
      return { min, max: maxStr ? parseInt(maxStr) : null }
    }

    if (numStr) {
      // Fixed repetition count only if followed by an element-starting character
      const next = this.ch()
      if (next === '"' || next === '%' || next === '<' || next === '(' || next === '[' || /[a-zA-Z]/.test(next)) {
        const n = parseInt(numStr)
        return { min: n, max: n }
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

    throw new Error(`Unexpected char: ${JSON.stringify(ch)}`)
  }

  private parseCharVal(): AbnfNode {
    // Optional %s / %i prefix
    if (this.ch() === '%') this.pos += 2
    this.pos++ // opening "
    const start = this.pos
    while (this.ch() !== '"' && this.ch() !== '' && this.ch() !== '\n') this.pos++
    const value = this.src.slice(start, this.pos)
    if (this.ch() === '"') this.pos++
    return { kind: 'str', value }
  }

  private parseNumVal(): AbnfNode {
    const start = this.pos
    this.pos++ // skip %
    const base = this.ch().toLowerCase()
    if (base !== 'x' && base !== 'd' && base !== 'b') {
      this.pos = start
      throw new Error('Expected num-val base (x/d/b)')
    }
    this.pos++ // skip base char

    const digitRe = base === 'x' ? /[0-9a-fA-F]/ : base === 'd' ? /\d/ : /[01]/
    const valStart = this.pos
    while (digitRe.test(this.ch()) || this.ch() === '.' || this.ch() === '-') this.pos++
    const raw = this.src.slice(valStart, this.pos)
    const display = `%${base}${raw}`

    // Concatenation: %x41.42.43 → "ABC"
    if (raw.includes('.')) {
      const radix = base === 'x' ? 16 : base === 'd' ? 10 : 2
      try {
        const chars = raw.split('.').map((p) => String.fromCodePoint(parseInt(p, radix)))
        return { kind: 'str', value: chars.join('') }
      } catch {
        /* fall through */
      }
    }

    // Range: %x41-5A
    if (raw.includes('-')) return { kind: 'range', display }

    // Single codepoint — show as character if printable ASCII, otherwise keep numeric
    const radix = base === 'x' ? 16 : base === 'd' ? 10 : 2
    const cp = parseInt(raw, radix)
    if (!isNaN(cp) && cp >= 0x20 && cp < 0x7f && cp !== 0x22) {
      return { kind: 'str', value: String.fromCodePoint(cp) }
    }

    return { kind: 'num', display }
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

// ---------------------------------------------------------------------------
// ABNF AST → railroad-diagrams
// ---------------------------------------------------------------------------

function toRR(node: AbnfNode): RRItem {
  switch (node.kind) {
    case 'ref':
      return rr.NonTerminal(node.name)

    case 'str':
      return rr.Terminal(node.value ? `"${node.value}"` : '""')

    case 'range':
      return rr.Terminal(node.display)

    case 'num':
      return rr.Terminal(node.display)

    case 'prose':
      return rr.Comment(node.text)

    case 'seq':
      return node.items.length === 1 ? toRR(node.items[0]!) : rr.Sequence(...node.items.map(toRR))

    case 'alt':
      return node.items.length === 1 ? toRR(node.items[0]!) : rr.Choice(0, ...node.items.map(toRR))

    case 'opt':
      return rr.Optional(toRR(node.item))

    case 'rep': {
      const inner = toRR(node.item)
      if (node.min === 0 && node.max === null) return rr.ZeroOrMore(inner)
      if (node.min === 1 && node.max === null) return rr.OneOrMore(inner)
      if (node.min === 0 && node.max !== null) {
        return rr.ZeroOrMore(inner, rr.Comment(`≤${node.max}×`))
      }
      const label = node.max === null ? `≥${node.min}×` : `${node.min}–${node.max}×`
      return rr.OneOrMore(inner, rr.Comment(label))
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function renderAbnfDiagrams(text: string, container: HTMLElement): void {
  const rules = new AbnfParser(text).parseAll()

  for (const rule of rules) {
    try {
      const wrapper = document.createElement('div')
      wrapper.className = 'abnf-rule-diagram'

      const label = document.createElement('p')
      label.className = 'abnf-rule-label'
      label.textContent = `${rule.name}  =`
      wrapper.appendChild(label)

      const svgWrap = document.createElement('div')
      svgWrap.className = 'abnf-diagram-svg-wrap'
      // railroad-diagrams toString() serialises pure SVG with no DOM dependency
      svgWrap.innerHTML = rr.Diagram(toRR(rule.def)).toString()
      const svg = svgWrap.querySelector('svg')
      if (svg) {
        // Prevent phantom Tab stops: focusable SVGs inside aria-hidden ancestors
        // can still receive keyboard focus in some browsers.
        svg.setAttribute('focusable', 'false')
        // Store natural dimensions so the component can scale width/height for
        // zoom. The library always sets a viewBox equal to the natural
        // width/height, so changing only width/height re-maps the coordinate
        // space without distortion — no viewBox surgery needed.
        const nw = svg.getAttribute('width') ?? ''
        const nh = svg.getAttribute('height') ?? ''
        if (nw) svg.dataset.naturalWidth = nw
        if (nh) svg.dataset.naturalHeight = nh
      }
      wrapper.appendChild(svgWrap)

      container.appendChild(wrapper)
    } catch (e) {
      console.warn(`[ABNF diagram] Skipped rule "${rule.name}":`, e)
    }
  }
}
