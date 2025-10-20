/**
 * Note that our server output should never vary because of device type
 * because we want a generic response that is cacheable, where device styling
 * is done in CSS, device detection in client-side JavaScript.
 *
 * Therefore for our use-case we don't really want a library like @nuxt/device
 * that uses HTTP user-agents to infer device capabilities, we just want client
 * side detection of capabilities
 */

export type HasTouchValue = null | boolean

export const useHasTouchStore = defineStore('hasTouch', () => {
  const hasTouch = ref<HasTouchValue>(null)

  const getMatchMedia = () => window.matchMedia('(pointer: coarse)')

  const updateTouchMode = () => {
    const getTouchMode = (): HasTouchValue => {
      if (typeof window === 'undefined') {
        return null
      }
      const hasTouchMatchMedia = getMatchMedia()
      return Boolean(hasTouchMatchMedia.matches)
    }
    const newTouchMode = getTouchMode()
    if (newTouchMode !== hasTouch.value) {
      hasTouch.value = newTouchMode
    }
  }

  if (typeof window !== 'undefined') {
    updateTouchMode()
    getMatchMedia().addEventListener('change', updateTouchMode)
  }

  return { hasTouch }
})
