import { isAnchorElement, isHtmlElement } from './dom'

/**
 * Stores the reader's scroll position on the current history entry in the same shape
 * vue-router uses (`history.state.scroll`), so that Back hands `scrollBehavior` a
 * `savedPosition`. Once the router has navigated it switches the browser's own scroll
 * restoration off, and it only records a position before its own pushes, never before a
 * native `#hash` jump.
 * https://github.com/ietf-tools/red/issues/441
 */
export const rememberScrollPosition = (): void => {
  const { scrollX, scrollY } = window
  history.replaceState({ ...history.state, scroll: { left: scrollX, top: scrollY } }, '')
}

/**
 * Capture-phase click listener: the position must be saved before the browser follows
 * the link, because the jump itself is what moves it. Modified clicks and links with a
 * `target` don't navigate this entry, so they are left alone.
 */
export const rememberScrollBeforeHashJump = (event: MouseEvent): void => {
  const { target, button, metaKey, ctrlKey, shiftKey, altKey } = event
  if (button !== 0 || metaKey || ctrlKey || shiftKey || altKey || !isHtmlElement(target)) {
    return
  }
  const anchor = target.closest('a[href^="#"]')
  if (!isAnchorElement(anchor) || anchor.hasAttribute('target')) {
    return
  }
  rememberScrollPosition()
}
