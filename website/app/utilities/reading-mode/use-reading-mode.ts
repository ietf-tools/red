import { effectScope, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiSettingsStore } from '~/stores/ui-settings'
import { isHtmlElement } from '../dom'
import { useFeatureFlags } from '../feature-flags'
import { PLAINTEXT_CONTENT_CLASS, RFC_CONTENT_DOM_ID } from './content'
import { createReadingController, type ReadingStatus } from './controller'
import { createScrollFollower } from './follow-scroll'
import {
  caretPointFromCoordinates,
  clearReadingHighlights,
  isReadingModeSupported,
  showReadingHighlights
} from './highlight'
import { classifySpeechError, type ReadingError } from './reading-error'
import { buildTextIndex, type TextIndex } from './text-index'
import { READING_LANGUAGE, watchSpeechVoices } from './voices'

type ReadingSettingsRefs = {
  readAloudPreformatted: Ref<boolean>
  readingRate: Ref<number>
  readingVoiceUri: Ref<string>
}

type ReadingSession = {
  toggle: () => void
  stop: () => void
}

const INTERACTIVE_SELECTOR = 'a, button, summary, input, select, textarea, [role="button"]'

// There is one speech queue per browser page and one RFC per page, so there is one reading session,
// shared by every part of the page that offers it. These refs are only ever written in the browser,
// after mount, so nothing of one visitor's can reach another's through the server.
const status = ref<ReadingStatus>('idle')

// What the error modal is showing, if anything. Every failure ends up here and none in the page.
const error = ref<ReadingError | undefined>()

let session: ReadingSession | undefined
let consumerCount = 0

const startSession = ({
  readAloudPreformatted,
  readingRate,
  readingVoiceUri
}: ReadingSettingsRefs): ReadingSession | undefined => {
  if (!isReadingModeSupported()) {
    return undefined
  }

  // Detached, so the watchers outlive the component that happened to mount first
  const scope = effectScope(true)
  const voices = ref<SpeechSynthesisVoice[]>([])
  const totalVoiceCount = ref(0)
  const stopWatchingVoices = watchSpeechVoices(voices, totalVoiceCount)
  const scrollFollower = createScrollFollower()

  let index: TextIndex | undefined
  let indexRoot: HTMLElement | undefined
  let indexObserver: MutationObserver | undefined
  let previousError: string | undefined
  // Clicking the text marks a position to read from, which is only offered once speech has really
  // started here, and not again after it fails.
  let hasStarted = false

  const getContentElement = (): HTMLElement | undefined => document.getElementById(RFC_CONTENT_DOM_ID) ?? undefined

  // The text nodes the index points at are replaced when the document is re-rendered or swapped
  const isIndexCurrent = (textIndex: TextIndex): boolean => {
    const { segments } = textIndex
    return segments[0]?.node.isConnected !== false && segments.at(-1)?.node.isConnected !== false
  }

  const dropIndex = () => {
    indexObserver?.disconnect()
    indexObserver = undefined
    indexRoot = undefined
    index = undefined
  }

  const buildIndex = (root: HTMLElement): TextIndex =>
    buildTextIndex(root, {
      skipPreformatted: !root.classList.contains(PLAINTEXT_CONTENT_CLASS) && !readAloudPreformatted.value
    })

  const controller = createReadingController({
    synth: window.speechSynthesis,
    createUtterance: (text) => new SpeechSynthesisUtterance(text),
    canPauseNatively: !/android/i.test(navigator.userAgent),
    onChange: (state) => {
      if (state.status === 'playing' && index && !isIndexCurrent(index)) {
        dropIndex()
        controller.stop()
        return
      }
      status.value = state.status
      hasStarted = state.hasStarted
      // On the failure itself rather than on later updates that still carry it, so closing the
      // modal isn't followed by it reopening.
      if (state.error !== undefined && state.error !== previousError) {
        const classified = classifySpeechError(state.error, totalVoiceCount.value === 0)
        error.value = classified
      }
      previousError = state.error
      showReadingHighlights(index, state)
      const { cursor, wordEnd } = state
      if (state.status === 'playing' && cursor !== undefined) {
        scrollFollower.follow(index?.toRange(cursor, wordEnd ?? cursor + 1))
      }
    }
  })

  const observeContent = (root: HTMLElement) => {
    indexObserver?.disconnect()
    indexObserver = new MutationObserver(() => {
      if (index && !isIndexCurrent(index)) {
        dropIndex()
        controller.setIndex(undefined)
      }
    })
    indexObserver.observe(root, { childList: true, subtree: true })
  }

  // Built on first use rather than on mount: the content is hydrated by then, and may not have
  // rendered at all yet when the page's parts mount, and most readers never press play.
  const ensureIndex = () => {
    if (index && (indexRoot !== getContentElement() || !isIndexCurrent(index))) {
      dropIndex()
    }
    if (index) {
      return
    }
    const root = getContentElement()
    if (root) {
      index = buildIndex(root)
      indexRoot = root
      observeContent(root)
    }
    controller.setIndex(index)
  }

  const applySettings = () => {
    controller.setSettings({
      rate: readingRate.value,
      voice: voices.value.find(({ voiceURI }) => voiceURI === readingVoiceUri.value),
      lang: READING_LANGUAGE
    })
  }

  scope.run(() => {
    watch([readingRate, readingVoiceUri, voices], applySettings)
    watch(readAloudPreformatted, () => {
      if (index && indexRoot) {
        index = buildIndex(indexRoot)
        controller.setIndex(index)
      }
    })
  })
  applySettings()

  // On the document, not on the content element, which may not exist yet and may be replaced.
  const onDocumentClick = (event: MouseEvent) => {
    const { target, clientX, clientY } = event
    if (
      !hasStarted ||
      !isHtmlElement(target) ||
      !target.closest(`#${RFC_CONTENT_DOM_ID}`) ||
      target.closest(INTERACTIVE_SELECTOR)
    ) {
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
      controller.seekTo(offset)
    }
  }

  const onPageBlurred = () => {
    controller.settlePause()
  }

  const onVisibilityChange = () => {
    if (document.hidden) {
      controller.settlePause()
    }
  }

  // The page going away, not just out of focus: speech the browser keeps after it would otherwise
  // carry on over the next page, or over the same page reloaded.
  const onPageHide = () => {
    controller.stop()
  }

  document.addEventListener('click', onDocumentClick)
  window.addEventListener('blur', onPageBlurred)
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', onPageHide)

  return {
    toggle: () => {
      ensureIndex()
      controller.toggle()
    },
    stop: () => {
      document.removeEventListener('click', onDocumentClick)
      window.removeEventListener('blur', onPageBlurred)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', onPageHide)
      dropIndex()
      scope.stop()
      stopWatchingVoices()
      scrollFollower.destroy()
      controller.destroy()
      clearReadingHighlights()
    }
  }
}

const acquire = (settings: ReadingSettingsRefs) => {
  consumerCount += 1
  if (consumerCount === 1) {
    session = startSession(settings)
  }
}

const release = () => {
  consumerCount -= 1
  if (consumerCount === 0) {
    session?.stop()
    session = undefined
    status.value = 'idle'
    error.value = undefined
  }
}

const toggle = () => {
  if (!session) {
    // No session after mount means the browser can't do reading mode
    error.value = { kind: 'unsupported' }
    return
  }
  session.toggle()
}

// For any part of the page that offers reading mode. Every caller gets the same status and
// toggles the same session, and the session lives while at least one of them is mounted.
export const useReadingMode = () => {
  const { readAloudPreformatted, readingRate, readingVoiceUri } = storeToRefs(useUiSettingsStore())

  const featureFlags = useFeatureFlags()

  // Behind the feature flag, which can only be told once mounted, so with it off nothing here
  // listens to the page.
  let isAcquired = false
  const sync = () => {
    if (featureFlags.value.hasReadingMode && !isAcquired) {
      isAcquired = true
      acquire({ readAloudPreformatted, readingRate, readingVoiceUri })
    } else if (!featureFlags.value.hasReadingMode && isAcquired) {
      isAcquired = false
      release()
    }
  }

  onMounted(() => {
    sync()
    watch(() => featureFlags.value.hasReadingMode, sync)
  })

  onBeforeUnmount(() => {
    if (isAcquired) {
      isAcquired = false
      release()
    }
  })

  return { status, toggle }
}

// The error to show, for the one place that renders the error modal. Needs no lifecycle of its own.
export const useReadingModeError = () => error
