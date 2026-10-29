export type Platform = 'linux' | 'android' | 'apple' | 'windows' | 'other'

export type AdviceLink = {
  label: string
  href: string
}

export type PlatformAdvice = {
  heading: string
  summary: string
  links: AdviceLink[]
}

export const detectPlatform = (userAgent: string): Platform => {
  // Android's user agent also says Linux, so it has to be asked first
  if (/android/i.test(userAgent)) {
    return 'android'
  }
  if (/iphone|ipad|ipod|macintosh|mac os/i.test(userAgent)) {
    return 'apple'
  }
  if (/windows/i.test(userAgent)) {
    return 'windows'
  }
  if (/linux|x11/i.test(userAgent)) {
    return 'linux'
  }
  return 'other'
}

// Deliberately a pointer and not instructions: steps and commands differ by version, distribution
// and how the browser was installed, go stale, and teach readers to paste what a website tells them
// into a terminal. The links are to the platform vendors' and the speech service's own documentation.
export const NO_VOICES_ADVICE: Record<Platform, PlatformAdvice> = {
  linux: {
    heading: 'Linux',
    summary:
      'Voices come from the Speech Dispatcher service and a speech engine installed on your system. A browser installed as a Snap or Flatpak package may be unable to reach them, so check how yours was installed.',
    links: []
  },
  android: {
    heading: 'Android',
    summary: 'Voices come from the text-to-speech engine in your Accessibility settings, where more can be installed.',
    links: [
      {
        label: 'Text-to-speech output (Android Accessibility Help)',
        href: 'https://support.google.com/accessibility/android/answer/6006983?hl=en'
      }
    ]
  },
  apple: {
    heading: 'macOS, iPhone and iPad',
    summary: 'Voices come from your Accessibility settings, where more can be downloaded.',
    links: [
      {
        label: 'Change the voice your Mac uses to speak text (Apple Support)',
        href: 'https://support.apple.com/guide/mac-help/change-the-voice-your-mac-uses-to-speak-text-mchlp2290/mac'
      },
      { label: 'Adjust voices on iPhone and iPad (Apple Support)', href: 'https://support.apple.com/en-us/111798' }
    ]
  },
  windows: {
    heading: 'Windows',
    summary: 'Voices come from the Speech settings, where more can be installed.',
    links: [
      {
        label: 'Customizing Narrator, including installing voices (Microsoft Support)',
        href: 'https://support.microsoft.com/en-us/windows/chapter-7-customizing-narrator-ce950246-c915-0d44-9be6-fb474387a285'
      }
    ]
  },
  other: {
    heading: 'Your system',
    summary:
      'Voices come from your operating system. Look in its accessibility or speech settings for how to install one, or try another browser.',
    links: []
  }
}
