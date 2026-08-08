import { prefersReducedMotion } from '~/utilities/accessibility'
import { z } from 'zod'
import { FOCUSABLE_QUERY_SELECTOR } from './html'
// The status facet lives in a DOM-free module so server-reachable code can derive from it.
import { TypesenseSearchItemStatusSchema, type TypesenseStatusName } from './typesense-status'

// Re-exported so existing importers of this module are unaffected by the move.
export { TypesenseSearchItemStatusSchema, type TypesenseStatusName }

export const TypesenseSearchItemAreaSchema = z.object({
  acronym: z.string(),
  name: z.string(),
  full: z.string()
})

export const TypesenseSearchItemGroupSchema = z.object({
  acronym: z.string(),
  name: z.string(),
  full: z.string()
})

const TypesenseSubseriesSchema = z.object({
  acronym: z.enum(['std', 'fyi', 'bcp']).optional(),
  number: z.number().optional(),
  total: z.number().optional()
})

export type TypesenseSubseries = z.infer<typeof TypesenseSubseriesSchema>

const TypesenseSubseriesSchemaWithValues = TypesenseSubseriesSchema.required()

export type TypesenseSubseriesWithValues = z.infer<typeof TypesenseSubseriesSchemaWithValues>

// Schema definition https://github.com/ietf-tools/search/blob/main/schemas/docs.md
export const TypeSenseSearchItemSchema = z.object({
  id: z.string(),

  rfcNumber: z.number(),
  date: z.number(),
  publicationDate: z.number(),

  title: z.string(),

  status: TypesenseSearchItemStatusSchema,
  /** Abstract is plain text with `\n` line breaks; convert to paragraphs at render time */
  abstract: z.string(),

  adName: z.string().optional(),
  authors: z
    .array(
      z.object({
        name: z.string(),
        affiliation: z.string()
      })
    )
    .optional(),

  subseries: TypesenseSubseriesSchema.optional(),
  rfc: z.string(),

  area: TypesenseSearchItemAreaSchema.optional(),
  group: TypesenseSearchItemGroupSchema,

  stream: z
    .object({
      slug: z.string(),
      name: z.string()
    })
    .optional(),
  ranking: z.number(),
  state: z.array(z.string()),

  type: z.string(),

  filename: z.string(),
  pages: z.number(),
  keywords: z.array(z.string()),

  obsoletedBy: z.array(z.string()).optional(),

  flags: z
    .object({
      obsoleted: z.boolean(),
      updated: z.boolean()
    })
    .optional()
})

export const isTypesenseSubseriesWithValues = (
  maybeSubseries: TypeSenseSearchItem['subseries']
): maybeSubseries is TypesenseSubseriesWithValues => {
  const { error } = TypesenseSubseriesSchemaWithValues.safeParse(maybeSubseries)
  if (error) {
    return false
  }
  return true
}

export type TypeSenseSearchItem = z.infer<typeof TypeSenseSearchItemSchema>

export type Density = 'full' | 'dense' | 'compact'

export const SEARCHV2_HITS_CONTAINER_DOM_ID = 'searchv2-hits-container'

// DOM ID of the position:sticky container
export const SEARCHV2_STICKY_CONTAINER_DOM_ID = 'searchv2-sticky-container'

const CSS_POSITION_STICKY = /sticky/i
const SCROLL_BUFFER_PX = 16 // just a bit further than the container

/**
 * Moves focus to first search result.
 *
 * This has a bug currently that new results often appear after focus is moved, so we need
 * to sync this.
 */
export const moveFocusToFirstResult = () => {
  const target = document.getElementById(SEARCHV2_HITS_CONTAINER_DOM_ID)
  if (!target) {
    console.warn("moveFocusToFirstResult: Can't find ", {
      SEARCHV2_HITS_CONTAINER_DOM_ID,
      target
    })
    return
  }
  const targetFocusable = target.querySelector<HTMLElement>(FOCUSABLE_QUERY_SELECTOR)
  if (!targetFocusable) {
    // if we can't find anything focusable just go to main
    document.querySelector<HTMLElement>('#main')?.focus() // for keyboard users
    return
  }
  targetFocusable.focus() // for keyboard users
  console.log('moved focus to', targetFocusable)
}

/**
 * When clicking pagination, or typing into the search box, we should scroll to the top of the new results
 * this should not move focus
 */
export const scrollUpToNewSearchResults = () => {
  const target = document.getElementById(SEARCHV2_HITS_CONTAINER_DOM_ID)
  const sticky = document.getElementById(SEARCHV2_STICKY_CONTAINER_DOM_ID)
  if (!target || !sticky) {
    console.warn("scrollUpToNewSearchResults: Can't find ", {
      SEARCHV2_HITS_CONTAINER_DOM_ID,
      target,
      SEARCHV2_STICKY_CONTAINER_DOM_ID,
      sticky
    })
    window.scrollTo(0, 0)
    return
  }

  const currentTopPx = window.scrollY
  const targetBoundingClientRect = target.getBoundingClientRect()
  const stickyBoundingClientRect = sticky.getBoundingClientRect()
  let targetTopPx = window.scrollY + targetBoundingClientRect.top
  const currentStickyStyles = window.getComputedStyle(sticky)
  if (
    // the sticky element is only sticky in certain responsive modes
    // so we detect whether it's currently `position:sticky`
    // and the reason we need that is because a sticky element will
    // obscure the scroll target, meaning we need to scroll further
    // to reveal the scroll target
    currentStickyStyles.position.toString().match(CSS_POSITION_STICKY)
  ) {
    targetTopPx -= stickyBoundingClientRect.height
  }

  targetTopPx -= SCROLL_BUFFER_PX

  if (currentTopPx < targetTopPx) {
    console.info('Not scrolling to ', targetTopPx, " because it's not > ", currentTopPx)
  } else if (Math.round(currentTopPx) === Math.round(targetTopPx)) {
    // pass
  } else {
    console.log('scroll up', targetTopPx, currentTopPx)
    const behavior: ScrollBehavior = prefersReducedMotion() ? 'instant' : 'smooth'

    window.scrollTo({
      left: 0,
      top: targetTopPx,
      behavior
    })
  }
}
