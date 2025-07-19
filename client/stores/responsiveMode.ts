export type ResponsiveMode = null | 'Desktop' | 'Mobile'

/**
 * Because we want to be able to have CDN-cacheable responses we should
 * never server render responsive variations (ie server rendering desktop html,
 * or server rendering mobile html).
 *
 * Popular module 'Nuxt Device' seems to allow this because it uses HTTP User Agents
 * to detect mobile/desktop which is a feature we don't want.
 *
 * So this store is only clientside.
 */
export const useResponsiveModeStore = defineStore('responsiveMode', () => {
  const responsiveMode = ref<ResponsiveMode>(null)

  const getMatchMedia = () => window.matchMedia('(min-width: 1024px)')

  const updateResponsiveMode = () => {
    const getResponsiveMode = (): ResponsiveMode => {
      if (typeof window === 'undefined') {
        return null
      }
      // 1024px from default 'lg' breakpoint see https://tailwindcss.com/docs/responsive-design
      const tailwindBreakpointLg = getMatchMedia()
      return tailwindBreakpointLg.matches ? 'Desktop' : 'Mobile'
    }
    const newResponsiveMode = getResponsiveMode()
    if (newResponsiveMode !== responsiveMode.value) {
      responsiveMode.value = newResponsiveMode
    }
  }

  if (typeof window !== 'undefined') {
    updateResponsiveMode()
    getMatchMedia().addEventListener('change', updateResponsiveMode)
  }

  return { responsiveMode }
})
