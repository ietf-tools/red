import type { Ref } from 'vue'

// RFCs are written in English.
export const READING_LANGUAGE = 'en'

export const isVoiceForLanguage = (voice: SpeechSynthesisVoice, language: string): boolean =>
  voice.lang.toLowerCase().replaceAll('_', '-').split('-')[0] === language

// Browsers fill the voice list in after load and announce it with `voiceschanged`; some never fire
// it because the list is ready on first read. Returns what stops the watching.
export const watchSpeechVoices = (
  voices: Ref<SpeechSynthesisVoice[]>,
  // Every language, so a browser with no voices at all can be told from one with none in English.
  totalVoiceCount: Ref<number>
): (() => void) => {
  if (!('speechSynthesis' in window)) {
    return () => {}
  }
  const { speechSynthesis } = window

  const refresh = () => {
    const allVoices = speechSynthesis.getVoices()
    totalVoiceCount.value = allVoices.length
    voices.value = allVoices.filter((voice) => isVoiceForLanguage(voice, READING_LANGUAGE))
  }

  refresh()
  speechSynthesis.addEventListener('voiceschanged', refresh)
  return () => speechSynthesis.removeEventListener('voiceschanged', refresh)
}

export const useSpeechVoices = () => {
  const voices = ref<SpeechSynthesisVoice[]>([])
  const totalVoiceCount = ref(0)
  let stopWatching: (() => void) | undefined

  onMounted(() => {
    stopWatching = watchSpeechVoices(voices, totalVoiceCount)
  })

  onBeforeUnmount(() => {
    stopWatching?.()
  })

  return { voices, totalVoiceCount }
}
