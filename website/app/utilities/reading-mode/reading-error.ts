import { isVoiceError } from './controller'
import type { AdviceLink } from './no-voices-advice'

export type ReadingError =
  | { kind: 'no-voices' }
  | { kind: 'unsupported' }
  | { kind: 'blocked' }
  | { kind: 'voice-failed' }
  | { kind: 'unexpected'; code: string }

export type ReadingErrorDescription = {
  title: string
  description: string
  link: AdviceLink | undefined
}

// `hasNoVoices` only picks the explanation: the failure itself is what says reading did not work.
export const classifySpeechError = (code: string, hasNoVoices: boolean): ReadingError => {
  if (isVoiceError(code)) {
    return hasNoVoices ? { kind: 'no-voices' } : { kind: 'voice-failed' }
  }
  if (code === 'not-allowed') {
    return { kind: 'blocked' }
  }
  return { kind: 'unexpected', code }
}

export const describeReadingError = (error: ReadingError): ReadingErrorDescription => {
  switch (error.kind) {
    case 'no-voices':
      return {
        title: 'Reading aloud needs a speech voice',
        description:
          'Your browser tried to read this RFC aloud and could not. It reports no speech voices, which come from your operating system rather than from this website.',
        link: undefined
      }
    case 'unsupported':
      return {
        title: "Reading aloud isn't available in this browser",
        description:
          'It needs features that newer browsers have, and a current version of Chrome, Edge, Firefox or Safari should support them.',
        link: {
          label: 'Check browser support on MDN',
          href: 'https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API#browser_compatibility'
        }
      }
    case 'blocked':
      return {
        title: 'Your browser blocked speech',
        description:
          'Browsers can block speech until you have interacted with the page. Try pressing the button again.',
        link: undefined
      }
    case 'voice-failed':
      return {
        title: 'Your browser could not speak this text',
        description:
          'Your browser has speech voices but could not use them to read this. It may have no English voice installed.',
        link: undefined
      }
    case 'unexpected':
      return {
        title: 'Reading stopped unexpectedly',
        description: `Your browser reported an error (${error.code}).`,
        link: undefined
      }
  }
}
