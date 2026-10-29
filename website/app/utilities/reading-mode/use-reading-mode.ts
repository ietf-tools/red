import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiSettingsStore } from '~/stores/ui-settings'
import { isHtmlElement } from '../dom'
import { createReadingController, describeSpeechError, isVoiceError, type ReadingStatus } from './controller'
import { createScrollFollower } from './follow-scroll'
import { caretPointFromCoordinates, clearReadingHighlights, showReadingHighlights } from './highlight'
import { buildTextIndex, type TextIndex } from './text-index'
import { useReadingModeSupport } from './support'
import { READING_LANGUAGE, useSpeechVoices } from './voices'

type UseReadingModeOptions = {
  contentElement: Readonly<Ref<HTMLElement | null>>
  isPlainText: () => boolean
  // Changes when the document in the content element is replaced, which strands everything the
  // text index points at.
  documentSource: () => unknown
}

const INTERACTIVE_SELECTOR = 'a, button, summary, input, select, textarea, [role="button"]'

export const useReadingMode = ({ contentElement, isPlainText, documentSource }: UseReadingModeOptions) => {
  const { readAloudPreformatted, readingRate, readingVoiceUri } = storeToRefs(useUiSettingsStore())
  const { voices, totalVoiceCount } = useSpeechVoices()

  const { isSupported, isUnsupported } = useReadingModeSupport()
  const status = ref<ReadingStatus>('idle')
  const errorMessage = ref<string | undefined>()
  const isNoVoicesModalOpen = ref(false)
  let previousError: string | undefined

  let controller: ReturnType<typeof createReadingController> | undefined
  let scrollFollower: ReturnType<typeof createScrollFollower> | undefined
  let index: TextIndex | undefined
  let listenedElement: HTMLElement | undefined

  const buildIndex = (): TextIndex | undefined => {
    const element = contentElement.value
    return element
      ? buildTextIndex(element, { skipPreformatted: !isPlainText() && !readAloudPreformatted.value })
      : undefined
  }

  // Built on first use rather than on mount: the content is hydrated by then, and most readers
  // never press play.
  const ensureIndex = () => {
    if (!index) {
      index = buildIndex()
      controller?.setIndex(index)
    }
  }

  const applySettings = () => {
    controller?.setSettings({
      rate: readingRate.value,
      voice: voices.value.find(({ voiceURI }) => voiceURI === readingVoiceUri.value),
      lang: READING_LANGUAGE
    })
  }

  const toggle = () => {
    ensureIndex()
    controller?.toggle()
  }

  const onClick = (event: MouseEvent) => {
    const { target, clientX, clientY } = event
    if (isHtmlElement(target) && target.closest(INTERACTIVE_SELECTOR)) {
      return
    }
    const selection = window.getSelection()
    if (selection && !selection.isCollapsed) {
      return
    }
    const caret = caretPointFromCoordinates(clientX, clientY)
    const node = caret?.node ?? selection?.anchorNode
    if (!node) {
      return
    }
    ensureIndex()
    const offset = index?.toOffset(node, caret?.offset ?? selection?.anchorOffset ?? 0)
    if (offset !== undefined) {
      controller?.seekTo(offset)
    }
  }

  const onPageBlurred = () => {
    controller?.settlePause()
  }

  const onVisibilityChange = () => {
    if (document.hidden) {
      controller?.settlePause()
    }
  }

  // The page going away, not just out of focus: speech the browser keeps after it would otherwise
  // carry on over the next page, or over the same page reloaded.
  const onPageHide = () => {
    controller?.stop()
  }

  onMounted(() => {
    if (!isSupported.value) {
      return
    }
    const scroller = createScrollFollower()
    scrollFollower = scroller
    controller = createReadingController({
      synth: window.speechSynthesis,
      createUtterance: (text) => new SpeechSynthesisUtterance(text),
      canPauseNatively: !/android/i.test(navigator.userAgent),
      onChange: (state) => {
        status.value = state.status
        const { error } = state
        // The modal explains this failure, so the page doesn't say it a second time.
        const isNoVoicesFailure = error !== undefined && isVoiceError(error) && totalVoiceCount.value === 0
        errorMessage.value = error === undefined || isNoVoicesFailure ? undefined : describeSpeechError(error)
        // On the failure itself rather than on later updates that still carry it, so closing the
        // advice isn't followed by it reopening.
        if (isNoVoicesFailure && error !== previousError) {
          isNoVoicesModalOpen.value = true
        }
        previousError = error
        showReadingHighlights(index, state)
        const { cursor, wordEnd } = state
        if (state.status === 'playing' && cursor !== undefined) {
          scroller.follow(index?.toRange(cursor, wordEnd ?? cursor + 1))
        }
      }
    })
    applySettings()
    listenedElement = contentElement.value ?? undefined
    listenedElement?.addEventListener('click', onClick)
    window.addEventListener('blur', onPageBlurred)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)
  })

  watch([readingRate, readingVoiceUri, voices], applySettings)

  watch(readAloudPreformatted, () => {
    if (index) {
      index = buildIndex()
      controller?.setIndex(index)
    }
  })

  watch(
    documentSource,
    () => {
      index = undefined
      controller?.setIndex(undefined)
    },
    { flush: 'post' }
  )

  onBeforeUnmount(() => {
    listenedElement?.removeEventListener('click', onClick)
    window.removeEventListener('blur', onPageBlurred)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('pagehide', onPageHide)
    scrollFollower?.destroy()
    controller?.destroy()
    clearReadingHighlights()
  })

  return { isSupported, isUnsupported, status, errorMessage, isNoVoicesModalOpen, toggle }
}
