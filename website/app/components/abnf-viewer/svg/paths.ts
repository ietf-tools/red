/**
 * SVG path string helpers for railroad diagram arcs.
 *
 * All arcs are quarter-circles of radius R.  There are four possible turns
 * (named by the direction of travel before and after the curve):
 *
 *   Right→Down  (top-right bracket corner)   sweep=1 (clockwise)
 *   Down→Right  (bottom-left bracket corner)  sweep=0 (counter-clockwise)
 *   Left→Down   (top-left bracket corner)     sweep=0
 *   Down→Left   (bottom-right bracket corner) sweep=1
 *
 * The caller supplies the *start* point of the arc; the function returns the
 * path segment string (without a leading M command).
 */

const R = 10 // must match C.ARC_R in layout.ts

// Right→Down: traveling right, curving down.
// Entry: (x, y) going right → Exit: (x+R, y+R) going down.
export function arcRD(x: number, y: number): string {
  return `A ${R} ${R} 0 0 1 ${x + R} ${y + R}`
}

// Down→Right: traveling down, curving right.
// Entry: (x, y) going down → Exit: (x+R, y+R) going right.
export function arcDR(x: number, y: number): string {
  return `A ${R} ${R} 0 0 0 ${x + R} ${y + R}`
}

// Left→Down: traveling left, curving down.
// Entry: (x, y) going left → Exit: (x-R, y+R) going down.
export function arcLD(x: number, y: number): string {
  return `A ${R} ${R} 0 0 0 ${x - R} ${y + R}`
}

// Down→Left: traveling down, curving left.
// Entry: (x, y) going down → Exit: (x-R, y+R) going left.
export function arcDL(x: number, y: number): string {
  return `A ${R} ${R} 0 0 1 ${x - R} ${y + R}`
}

// Absolute-coordinates line helpers.
export function hLine(x1: number, x2: number, y: number): string {
  return `M ${x1} ${y} L ${x2} ${y}`
}
export function vLine(x: number, y1: number, y2: number): string {
  return `M ${x} ${y1} L ${x} ${y2}`
}

// Move to (x, y) and start an arc.
export function moveTo(x: number, y: number, arc: string): string {
  return `M ${x} ${y} ${arc}`
}
