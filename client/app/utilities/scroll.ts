import { watch } from 'vue'
import { throttle, clamp } from 'lodash-es'
import { watchDebounced } from '@vueuse/core'
import { prefersReducedMotion } from './accessibility'
import { isProd } from './url'

const SCROLL_FPS = 60
const ANIMATE_INDEX_FPS = 30 // because we want transitions between ids
const MINIMUM_VELOCITY = 1
const FRICTION = 0.5
const ENDS_THRESHOLD_PX = 10

export const useTocActiveId = (ids: Ref<string[]>) => {
  const activeIdRef = ref(ids.value[0])
  let activeIdIndex = -1 // should be kept in sync with activeIdRef.value's index within ids.value
  let targetIdIndex = -1

  let velocity = 0
  let elements: HTMLElement[]
  let elementTops: number[]
  let animationCallbackHandle: ReturnType<typeof setTimeout>

  const setActive = (id: string) => {
    activeIdIndex = ids.value.indexOf(id)
    if (activeIdIndex === -1) {
      throw Error(
        `setActiveId(${JSON.stringify(id)}) wasn't found in ids (${JSON.stringify(ids.value)})`
      )
    }
    activeIdRef.value = id
  }

  const setActiveIdByIndex = (index: number) => {
    if (index === 0 && ids.value.length === 0) {
      // there's no TOC. ignore
      console.info(
        'Empty TOC length=0. ignoring request to set activeId',
        index
      )
      return
    }

    if (index < 0 || index >= ids.value.length) {
      throw Error(
        `setActiveIdByIndex(${index}) was out of bounds. ids.length = ${ids.value.length})`
      )
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
    const uniqueIds = Array.from(new Set([...ids.value]))
    const selector = uniqueIds.map((id) => `#${CSS.escape(id)}`).join(',')
    elements =
      selector.length > 0 ? Array.from(document.querySelectorAll(selector)) : []

    if (elements.length !== uniqueIds.length) {
      const idsNotFound = uniqueIds.filter((id) =>
        elements.some((element) => element.id === id)
      )
      const errorText = `Some ids weren't found (${elements.length} !== ${uniqueIds.length}) missing ones: `
      if (!isProd(location.toString())) {
        throw Error(`${errorText} ${JSON.stringify(idsNotFound)}`)
      } else {
        console.error(errorText, idsNotFound)
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
      const previousItem = acc[acc.length - 1]
      if (elementById) {
        acc.push(elementById.getBoundingClientRect().top + window.scrollY)
      } else if (previousItem) {
        // if they can't find the id then use the previous item's position instead
        // assuming that the ids are sequentially found in the page
        acc.push(previousItem)
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
    } else if (
      scrollY >
      document.body.scrollHeight - window.innerHeight - ENDS_THRESHOLD_PX
    ) {
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
        throw Error(
          `Unexpected type typeof elementTop=${typeof elementTop}, typeof closestTop=${typeof closestTop}`
        )
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

  const animateActiveIndex = () => {
    const direction = targetIdIndex > activeIdIndex ? 1 : -1

    let newActiveIdIndex = activeIdIndex + Math.round(velocity)

    // clamp (1) within array bounds, and (2) without overshooting/undershooting
    newActiveIdIndex = clamp(
      activeIdIndex + Math.round(velocity),
      // if undershooting
      direction === -1 && newActiveIdIndex < targetIdIndex ? targetIdIndex : 0,
      // if overshooting
      direction === 1 && newActiveIdIndex > targetIdIndex ?
        targetIdIndex
      : ids.value.length
    )

    // slow it down
    velocity =
      Math.max(
        velocity + (direction === 1 ? -FRICTION : FRICTION),
        MINIMUM_VELOCITY
      ) * direction

    setActiveIdByIndex(newActiveIdIndex)

    if (newActiveIdIndex === targetIdIndex) {
      if (animationCallbackHandle) {
        clearTimeout(animationCallbackHandle)
      }
      velocity = 0
    } else {
      animateSoon()
    }
  }

  const animateSoon = () => {
    if (animationCallbackHandle) {
      clearTimeout(animationCallbackHandle)
    }
    animationCallbackHandle = setTimeout(
      animateActiveIndex,
      1000 / ANIMATE_INDEX_FPS
    )
  }

  const handleScroll = () => {
    const { scrollY } = window
    targetIdIndex = getIdsIndexOfClosestTop(scrollY)

    if (targetIdIndex === activeIdIndex) {
      // nothing to do, exit early
      // console.log('No activeId change needed')
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

  const throttledHandleScroll = throttle(handleScroll, 1000 / SCROLL_FPS, {
    // leading because we want this to fire as early as possible but not again for FPS
    leading: true
  })

  const throttledHandleResize = throttle(
    () => {
      updateElements()
      handleScroll()
    },
    100,
    { leading: true }
  )

  onMounted(() => {
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
    handleScroll()
  })

  onUnmounted(() => {
    document.removeEventListener('scroll', throttledHandleScroll)
    document.removeEventListener('scrollsnapchanging', throttledHandleScroll)
    document.removeEventListener('touchmove', throttledHandleScroll)
    document.removeEventListener('resize', throttledHandleResize)
    if (animationCallbackHandle) {
      clearTimeout(animationCallbackHandle)
    }
  })

  return {
    activeId: activeIdRef,
    setActive
  }
}

const SCROLL_DIRECTIONAL_BIAS_VH_RATIO = 0.2

const SCROLL_BUFFER_PX = 100
type UseScrollTocContainerProps = {
  toActiveIdRef: Ref<string>
  wrapperRef: Ref<HTMLElement | null | undefined>
  makeTocId: (id: string) => string
}
export const useScrollTocContainer = ({
  toActiveIdRef,
  wrapperRef,
  makeTocId
}: UseScrollTocContainerProps) => {
  let previousActiveId = toActiveIdRef.value

  watchDebounced(
    [toActiveIdRef, wrapperRef],
    () => {
      /**
       * Scrolls the TOC in an attempt to make the active item always visible to the user
       */
      const { value: wrapper } = wrapperRef

      if (!toActiveIdRef.value) {
        console.info('No activeIdRef', toActiveIdRef.value)
        return
      }

      const previousTocLink = document.getElementById(
        makeTocId(previousActiveId)
      )
      const tocLink = document.getElementById(makeTocId(toActiveIdRef.value))

      if (!tocLink || !wrapper || !previousTocLink) {
        console.error('Required element(s) not found', {
          tocLink,
          wrapper,
          previousTocLink
        })
        if (import.meta.dev) {
          throw Error(
            `Scroll TOC required element(s) not found toActiveIdRef=${toActiveIdRef.value} tocLink=${tocLink}, wrapper=${wrapper}, previousTocLink=${previousTocLink}`
          )
        }
        return
      }

      const tocLinkRect = tocLink.getBoundingClientRect()

      const wrapperRect = wrapper.getBoundingClientRect()

      const isMoreThanTop =
        tocLinkRect.top >= wrapperRect.top + SCROLL_BUFFER_PX
      const isLessThanBottom =
        tocLinkRect.bottom <= wrapperRect.bottom - SCROLL_BUFFER_PX
      const isVisible = isMoreThanTop && isLessThanBottom // is visible within viewport

      if (isVisible) {
        // no scrolling is required. There's nothing to do in this loop
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
          previousTocLinkRect.top === tocLinkRect.top ? 0
          : previousTocLinkRect.top > tocLinkRect.top ? 1
          : -1
        /**
         * The simplest way to bring a TOC item into view is to scroll it into the middle.
         *
         * A more sophisticated approach is to consider a directional bias. Use knowledge of the
         * scroll direction (based on previous activeId scroll) to offset the middle by %, either
         * above or below the middle depending on the direction.
         */
        const scrollDirectionalBiasPx =
          wrapperRect.height * SCROLL_DIRECTIONAL_BIAS_VH_RATIO
        const directionalBiasPx = scrollDirectionalBiasPx * -direction

        const targetTopPx =
          wrapper.scrollTop +
          tocLinkRect.top -
          middleOfScrollableAreaPx +
          directionalBiasPx

        wrapper.scrollTo({
          top: targetTopPx,
          behavior: prefersReducedMotion() ? 'instant' : 'smooth'
        })
      }

      previousActiveId = toActiveIdRef.value
    },
    { debounce: 200, maxWait: 400 }
  )
}

export const useValidateIds = (ids: Ref<string[]>) => {
  watch(ids, () => {
    /** FIXME: write a Playwright test for this and delete this
     *
     *  There have been subtle bugs in Vue rendering HTML that affect DOM ids,
     *  so --in the browser-- we check whether the ids given to useActiveScroll()
     *  actually exist.
     *
     *  There was a bug first noticed on the FAQ page, whose headings and ids come
     *  from markdown, but strictly speaking the bug could occur more generally
     *  if the ids given to this component don't exist.
     *
     *  For those wanting more detail about the bug...
     *
     *      There was a bug noticed first on the FAQ page where the '#' link
     *      was pointing to a missing heading id. There were two duplicate 'wg' DOM ids,
     *      and `Heading.vue` '#' link to `#errata` wasn't pointing anywhere.
     *
     *      As well as breaking the '#' link, this also broke useActiveScroll() because the
     *      id `errata` was missing.
     *
     *      But to make matters stranger `Heading.vue` renders from the same `id` prop and they
     *      were getting out of sync WITHIN the same component, so something with reactivity
     *      was broken. In both cases Heading.vue's template renders with
     *
     *          props.id ?? getAnchorId($slots.default)
     *
     *      so they should result in the same string, but apparently not!
     *
     *      We're using the `remark-heading-id` plugin to support the Markdown `{#id}` syntax,
     *      for custom ids needed on the FAQ page, so we have to pass that `id` attribute
     *      along.
     *
     *      The markdown renderer supports overriding renderers `components/content/Prose*.vue`
     *      and the anchor <a> override is `ProseA.vue`. We need ProseA.vue to override anchors
     *      to support RFC Link Previews.
     *
     *      When we don't override using ProseA.vue the bug disappears, so let's start there.
     *
     *      This test throws an exception if it finds missing ids, so it's easy to reload the
     *      page after trying a fix to see whether the bug is still present. Doing a manual
     *      bisect (ie deleting half the code until the bug goes away) I traced the bug to
     *      RFCRouterLink.vue and the line:
     *
     *         <div v-show="hasTouchStore.hasTouch === true" class="inline">
     *
     *      `v-show` means it will render the HTML to the DOM but selectively reveal it using CSS.
     *      Changing it to this fixed the bug,
     *
     *         <div v-if="hasTouchStore.hasTouch === true" class="inline">
     *
     *      Although this fixes the bug it doesn't explain why duplicate 'wg' ids would appear
     *      in Headings, or how `id` props got of sync within that component.
     *
     *      Perhaps something in Nuxt Content is caching and reusing VNodes incorrectly.
     *
     *  Anyway, devs using this component should provide valid ids so checking them (as a way
     *  of surfacing this bug) is what this test does.
     *
     */

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
