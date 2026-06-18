// AST node types for RFC 5234 ABNF + RFC 7230/9110 list-operator extension.

export type AbnfNode =
  | { kind: 'ref'; name: string }
  | { kind: 'str'; value: string; caseSensitive: boolean }
  | { kind: 'range'; base: 'x' | 'd' | 'b'; from: number; to: number }
  | { kind: 'num'; base: 'x' | 'd' | 'b'; value: number }
  | { kind: 'prose'; text: string }
  | { kind: 'seq'; items: AbnfNode[] }
  | { kind: 'alt'; items: AbnfNode[] }
  | { kind: 'opt'; item: AbnfNode }
  | { kind: 'rep'; item: AbnfNode; min: number; max: number | null; isList: boolean }

export interface AbnfRule {
  name: string
  def: AbnfNode
  // True when this rule was merged from multiple =/ definitions.
  incremental?: boolean
}

export interface ParseError {
  line: number
  col: number
  message: string
  ruleName?: string
}

export interface ParseResult {
  rules: AbnfRule[]
  errors: ParseError[]
}

// ABNF rule names are case-insensitive (RFC 5234 §2.1). All rule maps are keyed
// through this single function so builders and lookups can never drift apart.
export function normalizeKey(name: string): string {
  return name.toUpperCase()
}
