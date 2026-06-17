/**
 * Layout types for the railroad diagram SVG generator.
 *
 * The layout pass converts an AbnfNode tree into a LayoutNode tree annotated
 * with exact pixel geometry. The render pass then walks the LayoutNode tree
 * to emit SVG elements without any further size computation.
 *
 * Coordinate convention:
 *   - Origin (0, 0) is the top-left of the element's bounding box.
 *   - The "rail" is the horizontal track at y = box.up.
 *   - Entry point: (0,          box.up)
 *   - Exit  point: (box.width,  box.up)
 */

export interface Box {
  width: number
  up: number // distance from top of bounding box to rail line
  down: number // distance from rail line to bottom of bounding box
}

// Every LayoutNode has a Box plus kind-specific data the renderer needs.
export type LayoutNode =
  | { kind: 'terminal'; box: Box; text: string; href?: never }
  | { kind: 'nonterminal'; box: Box; text: string; href: string }
  | { kind: 'comment'; box: Box; text: string }
  | { kind: 'prose'; box: Box; text: string }
  | { kind: 'sequence'; box: Box; items: LayoutNode[] }
  | { kind: 'choice'; box: Box; items: LayoutNode[] }
  | { kind: 'optional'; box: Box; item: LayoutNode }
  | { kind: 'one-or-more'; box: Box; item: LayoutNode; rep?: LayoutNode }
  | { kind: 'zero-or-more'; box: Box; item: LayoutNode; rep?: LayoutNode }
  | { kind: 'skip'; box: Box }
