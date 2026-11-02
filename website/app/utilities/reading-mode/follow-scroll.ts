import { prefersReducedMotion } from '../accessibility'

// How long after the reader last scrolled by hand that reading leaves the scroll position alone.
const MANUAL_SCROLL_GRACE_MS = 4000

const VIEWPORT_MARGIN_RATIO = 0.15

const MANUAL_SCROLL_EVENTS = ['wheel', 'touchmove', 'keydown'] as const

export const createScrollFollower = () => {
  let lastManualScrollAt = Number.NEGATIVE_INFINITY

  const onManualScroll = () => {
    lastManualScrollAt = Date.now()
  }

  MANUAL_SCROLL_EVENTS.forEach((eventName) => window.addEventListener(eventName, onManualScroll, { passive: true }))

  // Keeps the word being read on screen, but only once it has left it: a reader who has scrolled
  // elsewhere to look something up is not pulled back mid-sentence.
  const follow = (range: Range | undefined, { ignoreManualScroll = false } = {}) => {
    if (!range || (!ignoreManualScroll && Date.now() - lastManualScrollAt < MANUAL_SCROLL_GRACE_MS)) {
      return
    }
    const { top, bottom } = range.getBoundingClientRect()
    const margin = window.innerHeight * VIEWPORT_MARGIN_RATIO
    if (top >= margin && bottom <= window.innerHeight - margin) {
      return
    }
    range.startContainer.parentElement?.scrollIntoView({
      block: 'center',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth'
    })
  }

  // For when the reader has just moved the reading position themselves, so it is wherever they
  // asked for, however recently they scrolled. Reading that carries on from there follows again.
  const reveal = (range: Range | undefined) => {
    lastManualScrollAt = Number.NEGATIVE_INFINITY
    follow(range, { ignoreManualScroll: true })
  }

  const destroy = () => {
    MANUAL_SCROLL_EVENTS.forEach((eventName) => window.removeEventListener(eventName, onManualScroll))
  }

  return { follow, reveal, destroy }
}
