/**
 * SVG render pass: LayoutNode → SvgEl tree.
 *
 * Returns a plain-object tree (SvgEl) that Vue converts to VNodes via h().
 * Keeping it as a plain object (not DOM/VNodes) lets us also serialise the
 * diagram to a standalone SVG string for export without touching the DOM.
 *
 * Arc helpers (all quarter-circles, radius R = C.ARC_R). Only the four
 * downward turns are needed; see the aRD/aDR/aLD/aDL definitions below:
 *   aRD  — traveling Right, curving Down   (clockwise in SVG coords)
 *   aDR  — traveling Down,  curving Right  (counter-clockwise)
 *   aLD  — traveling Left,  curving Down   (counter-clockwise)
 *   aDL  — traveling Down,  curving Left   (clockwise)
 *
 * "Clockwise in SVG coords" means sweep-flag=1 (y-axis points down).
 */

import { C } from '../layout/layout'
import type { LayoutNode } from '../layout/types'

// ── output types ─────────────────────────────────────────────────────────

export interface SvgEl {
  tag: string
  attrs: Record<string, string | number>
  children: SvgEl[]
  text?: string
}

export interface DiagramSvg {
  width: number
  height: number
  // Extra padding so arcs and clipping don't cut off at the edge.
  elements: SvgEl[]
}

// ── public API ────────────────────────────────────────────────────────────

const RAIL_LEAD = 16 // horizontal stub before/after the root node

export function renderDiagram(root: LayoutNode): DiagramSvg {
  const els: SvgEl[] = []
  const W = root.box.width + RAIL_LEAD * 2
  const H = root.box.up + root.box.down + C.ARC_R * 2 // vertical padding for arcs

  // Opening and closing rail stubs.
  const railY = root.box.up + C.ARC_R
  els.push(path(hLine(0, RAIL_LEAD, railY)))
  els.push(path(hLine(RAIL_LEAD + root.box.width, W, railY)))

  renderNode(root, RAIL_LEAD, C.ARC_R, els)

  return { width: W, height: H, elements: els }
}

// ── arc helpers ───────────────────────────────────────────────────────────

const R = C.ARC_R

// arcRD: traveling Right, exits going Down. CW. End: (+R, +R).
const aRD = (x: number, y: number) => `M ${x} ${y} A ${R} ${R} 0 0 1 ${x + R} ${y + R}`

// arcDR: traveling Down, exits going Right. CCW. End: (+R, +R).
// (The junction goes from vertical to horizontal at the bottom of a branch.)
const aDR = (x: number, y: number) => `M ${x} ${y} A ${R} ${R} 0 0 0 ${x + R} ${y + R}`

// arcLD: traveling Left, exits going Down. CCW. End: (-R, +R).
const aLD = (x: number, y: number) => `M ${x} ${y} A ${R} ${R} 0 0 0 ${x - R} ${y + R}`

// arcDL: traveling Down, exits going Left. CW. End: (-R, +R).
const aDL = (x: number, y: number) => `M ${x} ${y} A ${R} ${R} 0 0 1 ${x - R} ${y + R}`

// ── node renderer ────────────────────────────────────────────────────────

function renderNode(node: LayoutNode, x: number, y: number, out: SvgEl[]): void {
  const { box } = node
  const railY = y + box.up

  switch (node.kind) {
    case 'terminal': {
      const boxH = box.up + box.down
      const by = railY - box.up
      out.push(svgRect(x, by, box.width, boxH, 4, 'rr-terminal'))
      out.push(svgText(node.text, x + box.width / 2, railY, 'rr-terminal-text'))
      break
    }

    case 'nonterminal': {
      const boxH = box.up + box.down
      const by = railY - box.up
      out.push(
        svgLink(node.href, [
          svgRect(x, by, box.width, boxH, 2, 'rr-nonterminal'),
          svgText(node.text, x + box.width / 2, railY, 'rr-nonterminal-text')
        ])
      )
      break
    }

    case 'comment': {
      const boxH = box.up + box.down
      const cy = railY
      out.push(svgEllipse(x + box.width / 2, cy, box.width / 2, boxH / 2, 'rr-comment'))
      out.push(svgText(node.text, x + box.width / 2, cy, 'rr-comment-text'))
      break
    }

    case 'prose': {
      const boxH = box.up + box.down
      out.push(svgEllipse(x + box.width / 2, railY, box.width / 2, boxH / 2, 'rr-prose'))
      out.push(svgText(`<${node.text}>`, x + box.width / 2, railY, 'rr-prose-text'))
      break
    }

    case 'skip':
      out.push(path(hLine(x, x + box.width, railY)))
      break

    case 'sequence': {
      let cx = x
      for (let i = 0; i < node.items.length; i++) {
        const item = node.items[i]!
        const itemY = y + box.up - item.box.up // align item rail to sequence rail
        if (i > 0) {
          // Connector gap between items.
          out.push(path(hLine(cx, cx + C.GAP, railY)))
          cx += C.GAP
        }
        renderNode(item, cx, itemY, out)
        cx += item.box.width
      }
      break
    }

    case 'choice': {
      const innerW = Math.max(...node.items.map((i) => i.box.width))
      const itemX = x + R + C.STUB
      const exitX = x + box.width

      // Item 0: straight through on the rail.
      const i0 = node.items[0]!
      const i0x = itemX + (innerW - i0.box.width) / 2
      out.push(path(hLine(x, i0x, railY)))
      renderNode(i0, i0x, y + box.up - i0.box.up, out)
      out.push(path(hLine(i0x + i0.box.width, exitX, railY)))

      // Items 1..n-1: branch below.
      let curY = railY + i0.box.down

      for (let i = 1; i < node.items.length; i++) {
        const item = node.items[i]!
        curY += R + C.VERT_SEP + item.box.up
        const iRailY = curY

        // Left entry arc: right→down then down→right.
        out.push(path(aRD(x, railY) + ` L ${x + R} ${iRailY - R} ` + aDR(x + R, iRailY - R)))

        // Item, centred.
        const ix = itemX + (innerW - item.box.width) / 2
        out.push(path(hLine(x + R * 2, ix, iRailY)))
        renderNode(item, ix, iRailY - item.box.up, out)
        out.push(path(hLine(ix + item.box.width, exitX - R * 2, iRailY)))

        // Right exit arc: left→down then down→left.
        out.push(path(aLD(exitX, railY) + ` L ${exitX - R} ${iRailY - R} ` + aDL(exitX - R, iRailY - R)))

        curY += item.box.down
      }
      break
    }

    case 'optional': {
      const { item } = node
      const itemX = x + R + C.STUB

      out.push(path(hLine(x, itemX, railY)))
      renderNode(item, itemX, railY - item.box.up, out)
      out.push(path(hLine(itemX + item.box.width, x + box.width, railY)))

      renderBypassAbove(x, railY, box.width, item.box.up, out)
      break
    }

    case 'one-or-more':
      renderRepeat(node.item, node.rep, x, y, railY, box.width, false, out)
      break

    case 'zero-or-more':
      renderRepeat(node.item, node.rep, x, y, railY, box.width, true, out)
      break
  }
}

// ── Optional bypass arc ───────────────────────────────────────────────────

function renderBypassAbove(x: number, railY: number, totalW: number, itemUp: number, out: SvgEl[]): void {
  // Bypass arc goes from (x, railY) up and over the item.
  // The bypass track is at bypassY = railY - itemUp - R (above the item top edge).
  // Left side: railY → bypassY via two arcs (right→up, then up→right).
  // Right side: mirror.
  const bypassY = railY - itemUp - R

  out.push(
    path(
      // Left side: exit from rail going right, arc to bypass level, continue right.
      `M ${x} ${railY}` +
        ` A ${R} ${R} 0 0 0 ${x + R} ${railY - R}` + // right→up (CCW)
        ` L ${x + R} ${bypassY + R}` +
        ` A ${R} ${R} 0 0 1 ${x + R + R} ${bypassY}` + // up→right (CW)
        // Bypass horizontal.
        ` L ${x + totalW - R - R} ${bypassY}` +
        // Right side: mirror.
        ` A ${R} ${R} 0 0 1 ${x + totalW - R} ${bypassY + R}` + // right→down (CW)
        ` L ${x + totalW - R} ${railY - R}` +
        ` A ${R} ${R} 0 0 0 ${x + totalW} ${railY}` // down→right (CCW, into rail)
    )
  )
}

// ── OneOrMore / ZeroOrMore ────────────────────────────────────────────────

function renderRepeat(
  item: LayoutNode,
  rep: LayoutNode | undefined,
  x: number,
  y: number,
  railY: number,
  totalW: number,
  zeroOk: boolean, // if true, add bypass arc above (ZeroOrMore)
  out: SvgEl[]
): void {
  const innerW = Math.max(item.box.width, rep?.box.width ?? 0)
  const itemX = x + R + C.STUB

  // Item on the rail.
  out.push(path(hLine(x, itemX, railY)))
  renderNode(item, itemX, railY - item.box.up, out)
  out.push(path(hLine(itemX + item.box.width, x + totalW, railY)))

  // Optional bypass (ZeroOrMore only).
  if (zeroOk) {
    renderBypassAbove(x, railY, totalW, item.box.up, out)
  }

  // Repeat arc below.
  const repTrackY = railY + item.box.down + C.VERT_SEP + (rep ? rep.box.up : R)
  const repX = itemX + (innerW - (rep?.box.width ?? R * 2)) / 2

  // Left arc: from rail going RIGHT, dip DOWN to repeat level going LEFT.
  out.push(
    path(
      `M ${x + R} ${railY}` +
        ` A ${R} ${R} 0 0 1 ${x} ${railY + R}` + // right→down (CW) at left side
        ` L ${x} ${repTrackY - R}` +
        ` A ${R} ${R} 0 0 0 ${x + R} ${repTrackY}` // down→right (CCW)
    )
  )

  // Repeat label (if any) or plain connector.
  if (rep) {
    out.push(path(hLine(x + R, repX, repTrackY)))
    renderNode(rep, repX, repTrackY - rep.box.up, out)
    out.push(path(hLine(repX + rep.box.width, x + totalW - R, repTrackY)))
  } else {
    out.push(path(hLine(x + R, x + totalW - R, repTrackY)))
  }

  // Right arc: from repeat level going LEFT, rise UP back to rail.
  out.push(
    path(
      `M ${x + totalW - R} ${repTrackY}` +
        ` A ${R} ${R} 0 0 0 ${x + totalW} ${repTrackY - R}` + // left→up (CCW)
        ` L ${x + totalW} ${railY + R}` +
        ` A ${R} ${R} 0 0 1 ${x + totalW - R} ${railY}` // up→left (CW)
    )
  )
}

// ── SVG element helpers ───────────────────────────────────────────────────

function path(d: string): SvgEl {
  return { tag: 'path', attrs: { d }, children: [] }
}

function svgRect(x: number, y: number, w: number, h: number, rx: number, cls: string): SvgEl {
  return { tag: 'rect', attrs: { x, y, width: w, height: h, rx, class: cls }, children: [] }
}

function svgEllipse(cx: number, cy: number, rx: number, ry: number, cls: string): SvgEl {
  return { tag: 'ellipse', attrs: { cx, cy, rx, ry, class: cls }, children: [] }
}

function svgText(content: string, x: number, y: number, cls: string): SvgEl {
  return { tag: 'text', attrs: { x, y, class: cls, 'dominant-baseline': 'central' }, children: [], text: content }
}

function svgLink(href: string, children: SvgEl[]): SvgEl {
  return { tag: 'a', attrs: { href, class: 'rr-link' }, children }
}

function hLine(x1: number, x2: number, y: number): string {
  if (x1 >= x2) return ''
  return `M ${x1} ${y} L ${x2} ${y}`
}
