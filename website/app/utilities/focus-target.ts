// Moving focus to an element that isn't normally focusable, for the skip link and for search results.
//
// The element is given `tabindex="-1"` only while it holds focus. Left on, an element is also
// focused by a click, and keyboard scrolling then starts from it instead of from whatever the reader
// clicked, so arrow keys stop scrolling that content.

export const focusTemporarily = (element: HTMLElement): void => {
  if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '-1')
    element.addEventListener('blur', () => element.removeAttribute('tabindex'), { once: true })
  }
  element.focus()
}

// The page's own heading, which a screen reader announces on arrival and which shows the reader where they
// are. False when there isn't one, so the caller can leave the browser to do what it would have done.
export const focusMainHeading = (): boolean => {
  const heading = document.querySelector<HTMLElement>('main h1')
  if (!heading) {
    return false
  }
  focusTemporarily(heading)
  return true
}
