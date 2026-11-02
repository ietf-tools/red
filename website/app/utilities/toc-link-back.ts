import { nextTick, type Ref } from 'vue'
import { useResponsiveModeStore } from '~/stores/responsiveMode'
import { useUiSettingsStore } from '~/stores/ui-settings'
import { isAnchorElement, isHtmlElement } from './dom'

const TOC_LINK_BACK_CLASS = 'toc-link-back'

const TOC_TAB_INDEX = 0

// The mobile dialog mounts over more than one frame, and the dialog moves focus to itself
// once it has mounted, so the TOC link is only focusable after that.
const MAX_FRAMES_AWAITING_TOC_LINK = 10

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * The id of the TOC link that a plain click on a 'Back to TOC' link is asking for.
 * Modified clicks are left alone so that open-in-new-tab and friends keep working.
 */
export const getTocLinkBackTargetId = (event: MouseEvent): string | undefined => {
  const { target, button, metaKey, ctrlKey, shiftKey, altKey, defaultPrevented } = event
  if (defaultPrevented || button !== 0 || metaKey || ctrlKey || shiftKey || altKey || !isHtmlElement(target)) {
    return undefined
  }
  const anchor = target.closest(`a.${TOC_LINK_BACK_CLASS}`)
  if (!isAnchorElement(anchor)) {
    return undefined
  }
  return anchor.hash.slice('#'.length) || undefined
}

type RevealTocLinkOptions = {
  selectedTab: Ref<number>
  isModalOpen: Ref<boolean>
}

/**
 * Reveals the TOC link with the given id, wherever the TOC currently isn't: collapsed or on another
 * tab in the desktop sidebar, or in the mobile dialog.
 */
export const useRevealTocLink = ({ selectedTab, isModalOpen }: RevealTocLinkOptions) => {
  const responsiveModeStore = useResponsiveModeStore()
  const uiSettings = useUiSettingsStore()

  // There can be a desktop and a mobile copy of the link in the DOM, and only one of them is visible.
  const findVisibleTocLink = (tocId: string) =>
    Array.from(document.querySelectorAll<HTMLElement>(`#${CSS.escape(tocId)}`)).find((element) =>
      element.checkVisibility()
    )

  const awaitVisibleTocLink = async (tocId: string) => {
    await nextTick()
    for (let frame = 0; frame < MAX_FRAMES_AWAITING_TOC_LINK; frame++) {
      await nextFrame()
      const tocLink = findVisibleTocLink(tocId)
      if (tocLink) {
        return tocLink
      }
    }
    return undefined
  }

  return async (tocId: string) => {
    const isMobile = responsiveModeStore.responsiveMode === 'Mobile'
    selectedTab.value = TOC_TAB_INDEX
    if (isMobile) {
      isModalOpen.value = true
    } else {
      uiSettings.setIsRfcSidebarForcedOpen(true)
    }

    const tocLink = await awaitVisibleTocLink(tocId)
    if (!tocLink) {
      return
    }
    if (isMobile) {
      // Not the hash: that would scroll the page behind the dialog.
      tocLink.focus()
      return
    }
    window.location.hash = tocId
    tocLink.focus({ preventScroll: true })
  }
}
