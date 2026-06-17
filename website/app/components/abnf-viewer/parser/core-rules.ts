// RFC 5234 Appendix B core rules, pre-built as AbnfNodes.
// These are injected into every rule map so that RFCs which reference ALPHA,
// DIGIT etc. without redefining them resolve correctly in diagrams and the
// validator. Rules defined in the parsed ABNF text override these.

import type { AbnfNode, AbnfRule } from './types'

function range(from: number, to: number): AbnfNode {
  return { kind: 'range', base: 'x', from, to }
}
function alt(...items: AbnfNode[]): AbnfNode {
  return { kind: 'alt', items }
}
function seq(...items: AbnfNode[]): AbnfNode {
  return { kind: 'seq', items }
}
function ref(name: string): AbnfNode {
  return { kind: 'ref', name }
}
function str(value: string): AbnfNode {
  return { kind: 'str', value, caseSensitive: false }
}
function rep(item: AbnfNode, min: number, max: number | null): AbnfNode {
  return { kind: 'rep', item, min, max, isList: false }
}

export const CORE_RULES: AbnfRule[] = [
  // ALPHA = %x41-5A / %x61-7A  (A-Z / a-z)
  { name: 'ALPHA', def: alt(range(0x41, 0x5a), range(0x61, 0x7a)) },

  // BIT = "0" / "1"
  { name: 'BIT', def: alt(str('0'), str('1')) },

  // CHAR = %x01-7F
  { name: 'CHAR', def: range(0x01, 0x7f) },

  // CR = %x0D
  { name: 'CR', def: { kind: 'num', base: 'x', value: 0x0d } },

  // CRLF = CR LF
  { name: 'CRLF', def: seq(ref('CR'), ref('LF')) },

  // CTL = %x00-1F / %x7F
  { name: 'CTL', def: alt(range(0x00, 0x1f), { kind: 'num', base: 'x', value: 0x7f }) },

  // DIGIT = %x30-39  (0-9)
  { name: 'DIGIT', def: range(0x30, 0x39) },

  // DQUOTE = %x22  (")
  { name: 'DQUOTE', def: { kind: 'num', base: 'x', value: 0x22 } },

  // HEXDIG = DIGIT / "A" / "B" / "C" / "D" / "E" / "F"
  {
    name: 'HEXDIG',
    def: alt(ref('DIGIT'), str('A'), str('B'), str('C'), str('D'), str('E'), str('F'))
  },

  // HTAB = %x09
  { name: 'HTAB', def: { kind: 'num', base: 'x', value: 0x09 } },

  // LF = %x0A
  { name: 'LF', def: { kind: 'num', base: 'x', value: 0x0a } },

  // LWSP = *(WSP / CRLF WSP)
  { name: 'LWSP', def: rep(alt(ref('WSP'), seq(ref('CRLF'), ref('WSP'))), 0, null) },

  // OCTET = %x00-FF
  { name: 'OCTET', def: range(0x00, 0xff) },

  // SP = %x20
  { name: 'SP', def: { kind: 'num', base: 'x', value: 0x20 } },

  // VCHAR = %x21-7E  (visible / printing chars)
  { name: 'VCHAR', def: range(0x21, 0x7e) },

  // WSP = SP / HTAB
  { name: 'WSP', def: alt(ref('SP'), ref('HTAB')) }
]

// Keyed by upper-case name for O(1) lookup.
export const CORE_RULE_MAP = new Map<string, AbnfRule>(CORE_RULES.map((r) => [r.name.toUpperCase(), r]))
