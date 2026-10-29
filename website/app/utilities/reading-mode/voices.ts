// RFCs are written in English.
export const READING_LANGUAGE = 'en'

export const isVoiceForLanguage = (voice: SpeechSynthesisVoice, language: string): boolean =>
  voice.lang.toLowerCase().replaceAll('_', '-').split('-')[0] === language

// Browsers fill the voice list in after load and announce it with `voiceschanged`; some never fire
// it because the list is ready on first read.
export const useSpeechVoices = () => {
  const voices = ref<SpeechSynthesisVoice[]>([])
  // Every language, so a browser with no voices at all can be told from one with none in English.
  const totalVoiceCount = ref(0)

  const refresh = () => {
    const allVoices = window.speechSynthesis.getVoices()
    totalVoiceCount.value = allVoices.length
    voices.value = allVoices.filter((voice) => isVoiceForLanguage(voice, READING_LANGUAGE))
  }

  onMounted(() => {
    if (!('speechSynthesis' in window)) {
      return
    }
    refresh()
    window.speechSynthesis.addEventListener('voiceschanged', refresh)
  })

  onBeforeUnmount(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.removeEventListener('voiceschanged', refresh)
    }
  })

  return { voices, totalVoiceCount }
}
