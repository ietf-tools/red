/**
 * Layout pass: AbnfNode → LayoutNode.
 *
 * Each node is sized independently, then composed bottom-up so parent nodes
 * know the exact bounding-box of their children before positioning them.
 *
 * All constants are in SVG user-units (px at 1× zoom).
 */

import type { AbnfNode, AbnfRule } from '../parser/types'
import type { Box, LayoutNode } from './types'

// ── constants ──────────────────────────────────────────────────────────────

export const C = {
  ARC_R: 10, // quarter-circle radius for all bends
  VERT_SEP: 8, // vertical gap between Choice alternatives
  GAP: 10, // horizontal gap between Sequence elements
  STUB: 10, // straight-line stub before/after arcs on wide elements
  PADDING_H: 12, // horizontal text padding inside boxes
  PADDING_V: 6, // vertical text padding inside boxes
  LINE_HEIGHT: 14, // matches the 14px font the SVG CSS uses
  CHAR_WIDTH: 8, // approximate monospace char width at 14px
  COMMENT_PADDING_H: 10,
  MIN_BOX_WIDTH: 30
}

// ── public API ──────────────────────────────────────────────────────────────

export function layoutRule(rule: AbnfRule, ruleMap: Map<string, AbnfRule>): LayoutNode {
  return layout(rule.def, ruleMap, new Set())
}

// ── internal ─────────────────────────────────────────────────────────────

function layout(
  node: AbnfNode,
  ruleMap: Map<string, AbnfRule>,
  visiting: Set<string> // cycle guard for recursive refs
): LayoutNode {
  switch (node.kind) {
    case 'str': {
      const label = node.value ? `"${node.value}"` : '""'
      return terminal(label)
    }

    case 'num': {
      // Show as character if printable ASCII, otherwise keep numeric.
      const cp = node.value
      const label =
        cp >= 0x20 && cp < 0x7f && cp !== 0x22
          ? `"${String.fromCodePoint(cp)}"`
          : `%${node.base}${cp.toString(node.base === 'x' ? 16 : node.base === 'b' ? 2 : 10).toUpperCase()}`
      return terminal(label)
    }

    case 'range': {
      const { base, from, to } = node
      const r = base === 'x' ? 16 : base === 'b' ? 2 : 10
      const lo = from.toString(r).toUpperCase()
      const hi = to.toString(r).toUpperCase()
      return terminal(`%${base}${lo}-${hi}`)
    }

    case 'prose':
      return prose(node.text)

    case 'ref': {
      const key = node.name.toUpperCase()
      return {
        kind: 'nonterminal',
        box: boxForText(node.name),
        text: node.name,
        href: `#rule-${node.name}`
      }
    }

    case 'seq': {
      if (node.items.length === 1) return layout(node.items[0]!, ruleMap, visiting)
      const children = node.items.map((i) => layout(i, ruleMap, visiting))
      return sequence(children)
    }

    case 'alt': {
      if (node.items.length === 1) return layout(node.items[0]!, ruleMap, visiting)
      const children = node.items.map((i) => layout(i, ruleMap, visiting))
      return choice(children)
    }

    case 'opt': {
      const child = layout(node.item, ruleMap, visiting)
      return optional(child)
    }

    case 'rep': {
      const child = layout(node.item, ruleMap, visiting)
      const { min, max, isList } = node

      // 0*1 = optional (already normalised by parser, but handle here too)
      if (!isList && min === 0 && max === 1) return optional(child)

      // Rep label for bounded cases.
      const repLabel = (() => {
        if (isList) {
          if (min === 0 && max === null) return '#'
          if (min === 1 && max === null) return '1#'
          return `${min}#${max ?? ''}`
        }
        if (min === 0 && max === null) return null // plain ZeroOrMore, no label
        if (min === 1 && max === null) return null // plain OneOrMore, no label
        if (max === null) return `≥${min}×`
        return `${min}–${max}×`
      })()

      const repNode: LayoutNode | undefined = repLabel ? comment(repLabel) : undefined

      if (min === 0) return zeroOrMore(child, repNode)
      return oneOrMore(child, repNode)
    }
  }
}

// ── element constructors ──────────────────────────────────────────────────

function boxForText(text: string): Box {
  const w = Math.max(C.MIN_BOX_WIDTH, text.length * C.CHAR_WIDTH + C.PADDING_H * 2)
  const h = C.LINE_HEIGHT + C.PADDING_V * 2
  return { width: w, up: h / 2, down: h / 2 }
}

function terminal(text: string): LayoutNode {
  return { kind: 'terminal', box: boxForText(text), text }
}

function prose(text: string): LayoutNode {
  const trunc = text.length > 30 ? text.slice(0, 28) + '…' : text
  return { kind: 'prose', box: boxForText(`<${trunc}>`), text }
}

function comment(text: string): LayoutNode {
  const w = Math.max(C.MIN_BOX_WIDTH, text.length * (C.CHAR_WIDTH - 1) + C.COMMENT_PADDING_H * 2)
  const h = C.LINE_HEIGHT + C.PADDING_V * 2
  return { kind: 'comment', box: { width: w, up: h / 2, down: h / 2 }, text }
}

function sequence(items: LayoutNode[]): LayoutNode {
  const width = items.reduce((s, i) => s + i.box.width, 0) + C.GAP * (items.length - 1)
  const up = Math.max(...items.map((i) => i.box.up))
  const down = Math.max(...items.map((i) => i.box.down))
  return { kind: 'sequence', box: { width, up, down }, items }
}

function choice(items: LayoutNode[]): LayoutNode {
  const innerW = Math.max(...items.map((i) => i.box.width))
  const width = innerW + 2 * (C.ARC_R + C.STUB)

  const up = items[0]!.box.up

  // Stack items[1..] below the first item.
  let down = items[0]!.box.down
  for (let i = 1; i < items.length; i++) {
    down += C.ARC_R + C.VERT_SEP + items[i]!.box.up + items[i]!.box.down
  }
  down += C.ARC_R // closing arc at bottom

  return { kind: 'choice', box: { width, up, down }, items }
}

function optional(item: LayoutNode): LayoutNode {
  const width = item.box.width + 2 * (C.ARC_R + C.STUB)
  const up = item.box.up + C.ARC_R // bypass arc sits above the rail
  const down = item.box.down
  return { kind: 'optional', box: { width, up, down }, item }
}

function oneOrMore(item: LayoutNode, rep?: LayoutNode): LayoutNode {
  const innerW = Math.max(item.box.width, rep?.box.width ?? 0)
  const width = innerW + 2 * (C.ARC_R + C.STUB)
  const up = item.box.up
  const repH = rep ? C.VERT_SEP + rep.box.up + rep.box.down : 0
  const down = item.box.down + C.ARC_R + C.VERT_SEP + repH + C.ARC_R
  return { kind: 'one-or-more', box: { width, up, down }, item, rep }
}

function zeroOrMore(item: LayoutNode, rep?: LayoutNode): LayoutNode {
  // ZeroOrMore = Optional + OneOrMore stacked: bypass arc above, repeat arc below.
  const innerW = Math.max(item.box.width, rep?.box.width ?? 0)
  const width = innerW + 2 * (C.ARC_R + C.STUB)
  const up = item.box.up + C.ARC_R // bypass arc above
  const repH = rep ? C.VERT_SEP + rep.box.up + rep.box.down : 0
  const down = item.box.down + C.ARC_R + C.VERT_SEP + repH + C.ARC_R
  return { kind: 'zero-or-more', box: { width, up, down }, item, rep }
}
