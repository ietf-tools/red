import { wordBoundsAt, type TextIndex } from './text-index'

export type ReadingStatus = 'idle' | 'playing' | 'paused'

export type ReadingState = {
  status: ReadingStatus
  // Global text offset of the word being, or about to be, read. Kept while paused or idle so that
  // playing again continues from it.
  cursor: number | undefined
  sentenceIndex: number | undefined
  // Undefined when the voice reports no word boundaries, where a word highlight would only guess.
  wordEnd: number | undefined
  // The SpeechSynthesisErrorEvent code that stopped playback, for the reader to be told.
  error: string | undefined
}

export type ReadingSettings = {
  rate: number
  voice: SpeechSynthesisVoice | undefined
  lang: string
}

type SpeechSynthesisLike = Pick<
  SpeechSynthesis,
  'speak' | 'cancel' | 'pause' | 'resume' | 'paused' | 'speaking' | 'pending'
>

export type ReadingControllerOptions = {
  synth: SpeechSynthesisLike
  createUtterance: (text: string) => SpeechSynthesisUtterance
  // False where the engine's pause() can't be relied on (Android), which pauses by cancelling.
  canPauseNatively: boolean
  onChange: (state: ReadingState) => void
}

const VOICE_ERROR_CODES = new Set([
  'synthesis-failed',
  'synthesis-unavailable',
  'language-unavailable',
  'voice-unavailable'
])

// Errors that mean the engine has nothing it can speak with, as opposed to one that went wrong midway.
export const isVoiceError = (error: string): boolean => VOICE_ERROR_CODES.has(error)

const CLAUSE_MIN_WORDS = 6

const CLAUSE_DELIMITER = /[,;:](?=\s)/g

const DEFAULT_SETTINGS: ReadingSettings = { rate: 1, voice: undefined, lang: 'en' }

// Where a voice without word boundary events should end an utterance: the first clause break after
// a few words, so that a pause that has to restart the utterance loses a clause rather than a sentence.
export const clauseChunkEnd = (text: string, from: number, sentenceEnd: number): number => {
  const sentence = text.slice(from, sentenceEnd)
  for (const match of sentence.matchAll(CLAUSE_DELIMITER)) {
    const wordCount = sentence.slice(0, match.index).split(/\s+/).filter(Boolean).length
    if (wordCount >= CLAUSE_MIN_WORDS) {
      return from + match.index + 1
    }
  }
  return sentenceEnd
}

export const createReadingController = ({
  synth,
  createUtterance,
  canPauseNatively,
  onChange
}: ReadingControllerOptions) => {
  let index: TextIndex | undefined
  let settings: ReadingSettings = DEFAULT_SETTINGS
  let status: ReadingStatus = 'idle'
  let cursor: number | undefined
  let isNativelyPaused = false
  let error: string | undefined
  // Whether the voice reports each word as it is spoken. Firefox through speech-dispatcher, for one,
  // reports only start and end. Unknown until a boundary arrives or an utterance ends without one.
  let boundaryEvents: 'unknown' | 'present' | 'absent' = 'unknown'
  // Each utterance holds the generation it was spoken in, so the events a cancelled utterance fires
  // late can be told from the current one's.
  let generation = 0

  const getState = (): ReadingState => {
    const sentenceIndex = cursor === undefined || !index ? undefined : index.sentenceIndexAt(cursor)
    // While reading, a word is only marked once the voice has shown it reports them, so a marker
    // is never left on the first word of a sentence the voice then reads on past.
    const isWordKnown = status !== 'playing' || boundaryEvents === 'present'
    const wordEnd = cursor !== undefined && index && isWordKnown ? wordBoundsAt(index.text, cursor).end : undefined
    return {
      status,
      cursor,
      sentenceIndex: sentenceIndex === undefined || sentenceIndex < 0 ? undefined : sentenceIndex,
      wordEnd,
      error
    }
  }

  const emit = () => {
    onChange(getState())
  }

  const cancelSpeech = () => {
    generation += 1
    // Chromium can drop an utterance spoken straight after a cancel, so only cancel what exists
    if (synth.speaking || synth.pending || synth.paused) {
      synth.cancel()
    }
    // a cancelled synth that was paused stays paused, and would swallow the next utterance
    if (synth.paused) {
      synth.resume()
    }
    isNativelyPaused = false
  }

  const finish = () => {
    cancelSpeech()
    status = 'idle'
    cursor = undefined
    emit()
  }

  const speak = () => {
    const sentence = index && cursor !== undefined ? index.sentences[index.sentenceIndexAt(cursor)] : undefined
    if (!index || cursor === undefined || !sentence) {
      finish()
      return
    }
    const { text } = index
    let from = Math.max(cursor, sentence.start)
    while (from < sentence.end && /\s/.test(text[from] ?? '')) {
      from += 1
    }
    const to = boundaryEvents === 'absent' ? clauseChunkEnd(text, from, sentence.end) : sentence.end
    cursor = from

    cancelSpeech()
    const myGeneration = generation
    const utterance = createUtterance(text.slice(from, to))
    utterance.rate = settings.rate
    utterance.lang = settings.lang
    if (settings.voice) {
      utterance.voice = settings.voice
    }
    let sawBoundary = false

    utterance.onboundary = (event) => {
      if (myGeneration !== generation || (event.name && event.name !== 'word')) {
        return
      }
      sawBoundary = true
      boundaryEvents = 'present'
      cursor = wordBoundsAt(text, from + event.charIndex).start
      emit()
    }

    utterance.onend = () => {
      if (myGeneration !== generation) {
        return
      }
      if (!sawBoundary && boundaryEvents !== 'present' && /\s/.test(text.slice(from, to).trim())) {
        boundaryEvents = 'absent'
      }
      cursor = to
      if (index && index.sentenceIndexAt(to) < 0) {
        finish()
        return
      }
      speak()
    }

    utterance.onerror = (event) => {
      if (myGeneration !== generation || event.error === 'interrupted' || event.error === 'canceled') {
        return
      }
      console.error('[reading-mode] speech error', event.error, event, {
        text: utterance.text,
        lang: utterance.lang,
        voice: utterance.voice?.name,
        rate: utterance.rate
      })
      // Nothing was read, so no position is left marked in the document.
      cursor = undefined
      status = 'idle'
      error = event.error
      emit()
    }

    synth.speak(utterance)
    emit()
  }

  const play = () => {
    if (!index || status === 'playing') {
      return
    }
    error = undefined
    if (status === 'paused' && isNativelyPaused) {
      isNativelyPaused = false
      status = 'playing'
      synth.resume()
      emit()
      return
    }
    if (cursor === undefined || index.sentenceIndexAt(cursor) < 0) {
      cursor = index.sentences[0]?.start
    }
    status = 'playing'
    speak()
  }

  const pause = () => {
    if (status !== 'playing') {
      return
    }
    status = 'paused'
    if (canPauseNatively) {
      synth.pause()
      // pause() that left the synth unpaused did nothing, so it falls through to cancelling
      if (synth.paused) {
        isNativelyPaused = true
        emit()
        return
      }
    }
    cancelSpeech()
    emit()
  }

  const toggle = () => {
    if (status === 'playing') {
      pause()
    } else {
      play()
    }
  }

  const seekTo = (offset: number) => {
    const sentence = index?.sentences[index.sentenceIndexAt(offset)]
    if (!index || !sentence) {
      return
    }
    cursor = Math.max(wordBoundsAt(index.text, offset).start, sentence.start)
    if (status === 'playing') {
      speak()
      return
    }
    cancelSpeech()
    emit()
  }

  const setSettings = (nextSettings: Partial<ReadingSettings>) => {
    settings = { ...settings, ...nextSettings }
    boundaryEvents = 'unknown'
    if (status === 'playing') {
      speak()
    }
  }

  const setIndex = (nextIndex: TextIndex | undefined) => {
    const position = index && cursor !== undefined ? index.toDomPosition(cursor) : undefined
    index = nextIndex
    const remapped = position && nextIndex ? nextIndex.toOffset(position.node, position.offset) : undefined
    if (remapped === undefined) {
      finish()
      return
    }
    cursor = remapped
    if (status === 'playing') {
      speak()
    } else {
      emit()
    }
  }

  // A native pause leaves an utterance held in the browser, which can resume without the reader
  // asking if the page is left alone long enough. Dropping it keeps the cursor, so resuming is a
  // click on the button and starts again from the last word. Reading that is still playing is left
  // to carry on in the background.
  const settlePause = () => {
    if (status === 'paused' && isNativelyPaused) {
      cancelSpeech()
      emit()
    }
  }

  const stop = () => {
    finish()
  }

  const destroy = () => {
    index = undefined
    finish()
  }

  return { getState, play, pause, toggle, seekTo, setSettings, setIndex, settlePause, stop, destroy }
}
