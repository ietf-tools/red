import { watch, onUnmounted } from 'vue'
import { throttle, clamp } from 'es-toolkit'
import { watchDebounced } from '@vueuse/core'
import { prefersReducedMotion } from './accessibility'
import { isProd } from './url'

/**
 * RFCs for testing:
 *  - RFC8881: a very long RFC
 */

const SCROLL_FPS = 60
const ANIMATE_INDEX_FPS = 60 // because we want transitions between ids
const MINIMUM_VELOCITY = 2.6 // magic number derived from scrolling up and down in RFC8881
const FRICTION = 0.5
const ENDS_THRESHOLD_PX = 10

type Timer = ReturnType<typeof setTimeout>

export const useTocActiveId = (ids: Ref<string[]>) => {
  const activeIdRef = ref(ids.value[0])
  const targetIdRef = ref(ids.value[0])
  let activeIdIndex = -1 // should be kept in sync with activeIdRef.value's index within ids.value
  let targetIdIndex = -1

  let velocity = 0
  let elements: HTMLElement[] = []
  let elementTops: number[] = []

  const timers: Timer[] = []

  const clearTimeouts = () => {
    timers.forEach((timer) => clearTimeout(timer))
  }

  const setActive = (id: string) => {
    activeIdIndex = ids.value.indexOf(id)
    if (activeIdIndex === -1) {
      throw Error(`setActiveId(${JSON.stringify(id)}) wasn't found in ids (${JSON.stringify(ids.value)})`)
    }
    activeIdRef.value = id
  }

  const setActiveIdByIndex = (index: number) => {
    if (index === 0 && ids.value.length === 0) {
      // there's no TOC. ignore
      console.info('Empty TOC length=0. ignoring request to set activeId', index)
      return
    }

    if (index < 0 || index >= ids.value.length) {
      throw Error(`setActiveIdByIndex(${index}) was out of bounds. ids.length = ${ids.value.length})`)
    }

    activeIdIndex = index
    activeIdRef.value = ids.value[index]
  }

  const updateElements = () => {
    // to speed up DOM access we'll build a comma-separated DOM selector for querySelectorAll()
    // rather than lots of getElementById() requests.

    // ids might not be unique. ie, multiple TOC links to the same thing.
    // so we have to uniquely select elements, and map them back onto the array of
    // elements with duplicates so that array indexes line up between `ids` and
    // `elementTops`
    const uniqueIds = Array.from(new Set(ids.value))
    const selector = uniqueIds.map((id) => `#${CSS.escape(id)}`).join(',')
    elements = selector.length > 0 ? Array.from(document.querySelectorAll<HTMLElement>(selector)) : []

    if (elements.length !== uniqueIds.length) {
      const idsNotFound = uniqueIds.filter((id) => elements.some((htmlElement) => htmlElement.id === id))
      const errorText = `Some ids weren't found (${elements.length} !== ${uniqueIds.length}) missing ones: `
      console.error(errorText, elements, uniqueIds, idsNotFound)
      if (!isProd()) {
        throw Error(`${errorText} ${JSON.stringify(idsNotFound)}`)
      }
    }

    const elementsById = elements.reduce(
      (acc, element, index) => {
        const id = uniqueIds[index]
        if (id !== undefined) {
          acc[id] = element
        }
        return acc
      },
      {} as Record<string, HTMLElement>
    )

    elementTops = ids.value.reduce((acc, id) => {
      const elementById = id ? elementsById[id] : undefined
      const previousElementTop = acc && acc.length > 0 ? acc[acc.length - 1] : 0
      if (elementById) {
        acc.push(elementById.getBoundingClientRect().top + window.scrollY)
      } else if (previousElementTop) {
        // if they can't find the id then use the previous item's position instead
        // assuming that the ids are sequentially found in the page
        acc.push(previousElementTop)
      } else {
        acc.push(0)
      }

      return acc
    }, [] as number[])
  }

  const getIdsIndexOfClosestTop = (scrollY: number): number => {
    if (scrollY < ENDS_THRESHOLD_PX) {
      // console.log('at top so use index 0')
      return 0
    } else if (scrollY > document.body.scrollHeight - window.innerHeight - ENDS_THRESHOLD_PX) {
      // console.log('at bottom so use index ', elementTops.length - 1)
      return elementTops.length - 1
    }
    // console.log(scrollY, ' < ', document.body.scrollHeight - ENDS_THRESHOLD_PX)
    let closestIndex = 0
    // console.log('elementTops.length', elementTops.length)
    for (let i = 0; i < elementTops.length; i++) {
      const elementTop = elementTops[i]
      const closestTop = elementTops[closestIndex]
      if (typeof elementTop !== 'number' || typeof closestTop !== 'number') {
        throw Error(`Unexpected type typeof elementTop=${typeof elementTop}, typeof closestTop=${typeof closestTop}`)
      }
      if (Math.abs(scrollY - elementTop) < Math.abs(scrollY - closestTop)) {
        closestIndex = i
      }
    }
    // console.log({ closestIndex })
    return closestIndex
  }

  const throttledUpdateElements = throttle(updateElements, 100)
  watch(ids, throttledUpdateElements)

  const animateActiveIndex = (shouldScrollImmediately: boolean) => {
    if (shouldScrollImmediately) {
      console.log('scroll.ts animateActiveIndex ', targetIdIndex)
      setActiveIdByIndex(targetIdIndex)
      return
    }

    const direction = targetIdIndex > activeIdIndex ? 1 : -1

    let newActiveIdIndex = activeIdIndex + Math.round(velocity)

    // clamp (1) within array bounds, and (2) without overshooting/undershooting
    newActiveIdIndex = clamp(
      activeIdIndex + Math.round(velocity),
      // if undershooting
      direction === -1 && newActiveIdIndex < targetIdIndex ? targetIdIndex : 0,
      // if overshooting
      direction === 1 && newActiveIdIndex > targetIdIndex ? targetIdIndex : ids.value.length
    )

    // slow it down
    velocity = Math.max(velocity + (direction === 1 ? -FRICTION : FRICTION), MINIMUM_VELOCITY) * direction

    setActiveIdByIndex(newActiveIdIndex)

    if (newActiveIdIndex === targetIdIndex) {
      clearTimeouts()
      velocity = 0
    } else {
      animateSoon()
    }
  }

  const animateSoon = () => {
    clearTimeouts()
    timers.push(setTimeout(() => animateActiveIndex(false), 1000 / ANIMATE_INDEX_FPS))
  }

  const handleScroll = (shouldScrollImmediately: boolean) => {
    const { scrollY } = window
    targetIdIndex = getIdsIndexOfClosestTop(scrollY)
    const targetElement = elements[targetIdIndex]
    if (targetElement) {
      targetIdRef.value = targetElement.id
    }
    if (targetIdIndex === activeIdIndex) {
      // nothing to do, exit early
      // console.log('No activeId change needed')
      return
    }
    if (shouldScrollImmediately) {
      animateActiveIndex(shouldScrollImmediately)
      return
    }
    // console.log(
    //   `New scroll target from `,
    //   activeIdIndex,
    //   JSON.stringify(ids.value[activeIdIndex]),
    //   ' to ',
    //   targetIdIndex,
    //   JSON.stringify(ids.value[targetIdIndex])
    // )
    const direction = targetIdIndex > activeIdIndex ? 1 : -1
    const distanceToIndex = Math.abs(targetIdIndex - activeIdIndex)
    velocity = Math.max(distanceToIndex / 5, MINIMUM_VELOCITY) * direction
    animateSoon()
  }

  const throttledHandleScroll = throttle(() => handleScroll(false), 1000 / SCROLL_FPS, {
    // leading because we want this to fire as early as possible but not again for FPS
    edges: ['leading']
  })

  const throttledHandleResize = throttle(
    () => {
      updateElements()
      handleScroll(false)
    },
    100,
    { edges: ['leading'] }
  )

  onMounted(() => {
    updateElements()
    nextTick(updateElements)
    document.addEventListener('scroll', throttledHandleScroll, {
      passive: true
    })
    document.addEventListener('scrollsnapchanging', throttledHandleScroll, {
      passive: true
    })

    document.addEventListener('touchmove', throttledHandleScroll, {
      passive: true
    })
    document.addEventListener('resize', throttledHandleResize, {
      passive: true
    })
    handleScroll(true)
    console.log('scroll.ts:useTocActiveId() on mounted', activeIdRef.value)
  })

  onUnmounted(() => {
    document.removeEventListener('scroll', throttledHandleScroll)
    document.removeEventListener('scrollsnapchanging', throttledHandleScroll)
    document.removeEventListener('touchmove', throttledHandleScroll)
    document.removeEventListener('resize', throttledHandleResize)
    clearTimeouts()
  })

  return {
    activeId: activeIdRef,
    setActive,
    targetId: targetIdRef
  }
}

const SCROLL_DIRECTIONAL_BIAS_VH_RATIO = 0.2

const SCROLL_BUFFER_PX = 100
type UseScrollTocContainerProps = {
  toTargetIdRef: Ref<string | undefined>
  wrapperRef: Ref<HTMLElement | null | undefined>
  makeTocId: (id: string) => string
}
export const useScrollTocContainer = ({ toTargetIdRef, wrapperRef, makeTocId }: UseScrollTocContainerProps) => {
  let previousTargetId = toTargetIdRef.value

  const scrollToTargetId = (shouldScrollImmediately: boolean) => {
    /**
     * Scrolls the TOC in an attempt to make the active item always visible to the user
     */
    const { value: wrapper } = wrapperRef

    if (!toTargetIdRef.value) {
      console.info('No activeIdRef', toTargetIdRef.value)
      return
    }

    if (!previousTargetId) {
      console.info('No previousActiveId', previousTargetId)
      return
    }
    const previousTocLink = document.getElementById(makeTocId(previousTargetId))
    const tocLink = document.getElementById(makeTocId(toTargetIdRef.value))

    if (!tocLink || !wrapper || !previousTocLink) {
      // because this function is in a debounced callback it can execute
      // after the Vue component was removed from the DOM.
      // So this state isn't necessarily an error, even though it could
      // mask errors.
      console.info('useScrollTocContainer() element(s) not found. This can happen if component was quickly unmounted', {
        tocLink,
        wrapper,
        previousTocLink
      })
      return
    }

    const tocLinkRect = tocLink.getBoundingClientRect()

    const wrapperRect = wrapper.getBoundingClientRect()

    const isMoreThanTop = tocLinkRect.top >= wrapperRect.top + SCROLL_BUFFER_PX
    const isLessThanBottom = tocLinkRect.bottom <= wrapperRect.bottom - SCROLL_BUFFER_PX
    const isVisible = isMoreThanTop && isLessThanBottom // is visible within viewport

    if (!shouldScrollImmediately && isVisible) {
      // no scrolling is required. There's nothing to do in this loop
      //
      // console.log(
      //   "Checked whether TOC needed scrolling but it didn't (active option was already visible)",
      //   {
      //     isVisible,
      //     isMoreThanTop,
      //     isLessThanBottom,
      //     SCROLL_BUFFER_PX,
      //     tocLinkRect,
      //     wrapperRect
      //   }
      // )
    } else {
      const middleOfScrollableAreaPx = wrapper.offsetHeight / 2

      const previousTocLinkRect = previousTocLink.getBoundingClientRect()
      const direction =
        previousTocLinkRect.top === tocLinkRect.top ? 0 : previousTocLinkRect.top > tocLinkRect.top ? 1 : -1
      /**
       * The simplest way to bring a TOC item into view is to scroll it into the middle.
       *
       * A more sophisticated approach is to consider a directional bias. Use knowledge of the
       * scroll direction (based on previous activeId scroll) to offset the middle by %, either
       * above or below the middle depending on the direction.
       */
      const scrollDirectionalBiasPx = wrapperRect.height * SCROLL_DIRECTIONAL_BIAS_VH_RATIO
      const directionalBiasPx = scrollDirectionalBiasPx * -direction

      const targetTopPx = wrapper.scrollTop + tocLinkRect.top - middleOfScrollableAreaPx + directionalBiasPx

      wrapper.scrollTo({
        top: targetTopPx,
        behavior: shouldScrollImmediately || prefersReducedMotion() ? 'instant' : 'smooth'
      })
    }

    previousTargetId = toTargetIdRef.value
  }

  watchDebounced([toTargetIdRef, wrapperRef], () => scrollToTargetId(false), { debounce: 200, maxWait: 400 })

  onMounted(() => {
    console.log('scroll.ts:useScrollTocContainer() on mounted')
    scrollToTargetId(true)
  })
}

/**
 *  There have been subtle bugs in rendering HTML that affect DOM ids,
 *  so --in the browser-- we check whether the ids given to useActiveScroll()
 *  actually exist in the DOM and, if not, log some feedback.
 *
 *  The possible reasons for an id missing are many, but so far
 *
 *    * Vue template bugs (ie, not rendering an DOM id attribute)
 *    * Generating ids based on content by using $slots.default during a Vue
 *      render which confuses Vue (this might be incorrect usage of Vue) and
 *      Vue doesn't update attributes correctly.
 *    * Generating DOM ids with different algorithm:
 *      *  For markdown pages, heading ids are derived from heading text by the
 *         precomputer and embedded in the htmlObj. We're trying to maintain the
 *         existing page anchor links from a previous implementation.
 *
 *  Verifying them as a way of surfacing bugs is what this function does.
 */
export const useValidateIds = (ids: Ref<string[]>) => {
  watch(ids, () => {
    const problemIds = ids.value.filter((id) => {
      // returns problematic ids, ie those that appear more than once

      // DON'T REFACTOR THIS TO getElementById() because we're using querySelectorAll()
      // intentionally to query multiple identical ids (ie coding mistakes), whereas
      // getElementById would only return 1 max.
      const targets = document.querySelectorAll(`#${id}`)

      if (targets.length === 0) {
        // PROBLEM FOUND: that id should exist in the DOM but it doesn't
        return true
      } else if (targets.length >= 2) {
        // PROBLEM FOUND: that id shouldn't exist 2+ times in the DOM
        return true
      }

      // else, it's ok
      return false
    })

    if (problemIds.length > 0) {
      const title = 'useValidateIds() ids problem. Bad ids: '
      console.error(title, problemIds)
      // FIXME: crash reporter for prod?
      if (
        // don't crash in prod. just stumble on
        import.meta.dev
      ) {
        throw Error(`${title} ${problemIds.join(', ')}`)
      }
    } else {
      console.log('useValidateIds() valid.')
    }
  })
}
