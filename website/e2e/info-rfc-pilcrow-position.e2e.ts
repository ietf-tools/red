/**
 * Where the pilcrow of a code or diagram block sits, on /info/rfc9110/.
 *
 * The original rendering puts it on a line of its own directly under the block it belongs to. It had been
 * floated into the block's bottom-right corner, which made a target a few pixels wide that the pointer
 * could lose on its way there, and the block's own bottom margin left a gap between the block and a
 * pilcrow that wasn't floated. Both kinds of block are covered: a `pre` in a plain `div` (3.9-3, 3.9-5)
 * and one in an `artwork` `div` (4.2.3-6), which previously differed. https://github.com/ietf-tools/red/issues/373
 */
import { describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openHydratedPage, setupNuxtServer } from './utilities/setup'

const VIEWPORT = { width: 1280, height: 900 }

const BLOCK_IDS = ['section-3.9-3', 'section-3.9-5', 'section-4.2.3-6']

// The pilcrow may sit a couple of pixels under its block; anything more is a gap the pointer can fall into.
const MAX_GAP_PX = 4

const ALIGNMENT_TOLERANCE_PX = 2

const HOVER_STEPS = 30

// Where in the block the pointer starts, measured up from its bottom edge.
const START_ABOVE_BLOCK_BOTTOM_PX = 20

type Geometry = {
  gap: number
  leftOffset: number
  overlapsNext: boolean
}

const measure = (page: Page, id: string): Promise<Geometry> =>
  page.evaluate((blockId) => {
    const container = document.getElementById(blockId)
    const block = container?.querySelector('.horizontal-scrollable')
    const pilcrow = container?.querySelector('a.pilcrow')
    if (!container || !block || !pilcrow) {
      throw Error(`Expected a block and a pilcrow in #${blockId}`)
    }
    const { bottom: blockBottom, left: blockLeft } = block.getBoundingClientRect()
    const { top, left, bottom } = pilcrow.getBoundingClientRect()
    const next = container.nextElementSibling
    return {
      gap: top - blockBottom,
      leftOffset: left - blockLeft,
      overlapsNext: next ? next.getBoundingClientRect().top < bottom : false
    }
  }, id)

// Moves the pointer from inside the block to the pilcrow a step at a time, and reports where it vanished.
const opacitiesOnTheWayToPilcrow = async (page: Page, id: string): Promise<number[]> => {
  const container = page.locator(`[id="${id}"]`)
  const pilcrow = container.locator('a.pilcrow')
  const block = container.locator('pre')
  // A tall block's middle can be off screen once its pilcrow is on it, and a pointer off screen hovers nothing.
  await pilcrow.scrollIntoViewIfNeeded()
  const [from, to] = await Promise.all([block.boundingBox(), pilcrow.boundingBox()])
  if (!from || !to) {
    throw Error(`Expected a block and a pilcrow with a box in #${id}`)
  }
  const start = { x: from.x + 40, y: from.y + from.height - START_ABOVE_BLOCK_BOTTOM_PX }
  const end = { x: to.x + to.width / 2, y: to.y + to.height / 2 }
  await page.mouse.move(start.x, start.y)
  // The pilcrow shows on hovering the block, so the journey starts once it has.
  await expect
    .poll(() => pilcrow.evaluate((element) => Number(getComputedStyle(element).opacity)), {
      message: 'hovering the block should show the pilcrow'
    })
    .toBe(1)
  const opacities: number[] = []
  for (let step = 1; step <= HOVER_STEPS; step++) {
    await page.mouse.move(
      start.x + ((end.x - start.x) * step) / HOVER_STEPS,
      start.y + ((end.y - start.y) * step) / HOVER_STEPS
    )
    // The pilcrow's opacity is not transitioned, but a frame must pass for the hover state to apply.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))))
    opacities.push(await pilcrow.evaluate((element) => Number(getComputedStyle(element).opacity)))
  }
  return opacities
}

describe('info/rfc9110 pilcrow position', async () => {
  await setupNuxtServer()

  test('sits directly under its block, aligned with it, without overlapping what follows', async () => {
    const page = await openHydratedPage('/info/rfc9110/', {
      beforeLoad: (page) => page.setViewportSize(VIEWPORT)
    })

    for (const id of BLOCK_IDS) {
      await page.locator(`[id="${id}"]`).scrollIntoViewIfNeeded()
      const { gap, leftOffset, overlapsNext } = await measure(page, id)
      expect(gap, `#${id}: the pilcrow should start under its block`).toBeGreaterThanOrEqual(0)
      expect(gap, `#${id}: the pilcrow should be next to its block`).toBeLessThanOrEqual(MAX_GAP_PX)
      expect(Math.abs(leftOffset), `#${id}: the pilcrow should line up with the block's left edge`).toBeLessThanOrEqual(
        ALIGNMENT_TOLERANCE_PX
      )
      expect(overlapsNext, `#${id}: the pilcrow should not overlap what follows`).toBe(false)
    }
    await page.close()
  }, 120_000)

  test('stays visible while the pointer travels from the block to it', async () => {
    const page = await openHydratedPage('/info/rfc9110/', {
      beforeLoad: (page) => page.setViewportSize(VIEWPORT)
    })

    for (const id of BLOCK_IDS) {
      const opacities = await opacitiesOnTheWayToPilcrow(page, id)
      expect(
        opacities.filter((opacity) => opacity < 1),
        `#${id}: the pilcrow should not vanish on the way`
      ).toEqual([])
    }
    await page.close()
  }, 120_000)
})
