// @vitest-environment nuxt
import { beforeEach, describe, expect, test } from 'vitest'
import { clauseChunkEnd, createReadingController, type ReadingState } from './controller'
import { buildTextIndex } from './text-index'

type FakeUtterance = {
  text: string
  rate: number
  lang: string
  voice: SpeechSynthesisVoice | null
  onstart: (() => void) | null
  onboundary: ((event: { name: string; charIndex: number }) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
}

const createFakeSynth = () => {
  const spoken: FakeUtterance[] = []
  const synth = {
    paused: false,
    speaking: false,
    pending: false,
    // Chrome-like: a pause that sticks. Tests of an engine that ignores pause() set this false.
    pauseSticks: true,
    cancelCount: 0,
    speak: (utterance: FakeUtterance) => {
      synth.speaking = true
      spoken.push(utterance)
    },
    cancel: () => {
      synth.speaking = false
      synth.cancelCount += 1
    },
    pause: () => {
      synth.paused = synth.pauseSticks
    },
    resume: () => {
      synth.paused = false
    }
  }
  return { synth, spoken }
}

const createFakeUtterance = (text: string): FakeUtterance => ({
  text,
  rate: 1,
  lang: '',
  voice: null,
  onstart: null,
  onboundary: null,
  onend: null,
  onerror: null
})

const setup = (canPauseNatively = true) => {
  const root = document.createElement('div')
  root.innerHTML = '<p>The first sentence is here. The second sentence follows it.</p><p>A third one.</p>'
  const index = buildTextIndex(root, { skipPreformatted: false })
  const { synth, spoken } = createFakeSynth()
  const states: ReadingState[] = []
  // The controller only touches the fakes through the members it names, so they are passed past
  // the full DOM types, which a test double can't satisfy.
  const controller = createReadingController({
    synth: synth as never,
    createUtterance: createFakeUtterance as never,
    canPauseNatively,
    onChange: (state) => states.push(state)
  })
  controller.setIndex(index)
  const latest = (): ReadingState => {
    const state = states.at(-1)
    if (!state) {
      throw Error('no state emitted')
    }
    return state
  }
  const last = (): FakeUtterance => {
    const utterance = spoken.at(-1)
    if (!utterance) {
      throw Error('nothing spoken')
    }
    return utterance
  }
  return { controller, index, synth, spoken, latest, last }
}

describe('createReadingController', () => {
  let context: ReturnType<typeof setup>

  beforeEach(() => {
    context = setup()
  })

  test('play speaks the first sentence and highlights it', () => {
    const { controller, spoken, latest } = context
    controller.play()
    expect(spoken.map(({ text }) => text)).toEqual(['The first sentence is here.'])
    expect(latest()).toMatchObject({ status: 'playing', cursor: 0, sentenceIndex: 0 })
  })

  test('moves on to the next sentence when one ends, then finishes', () => {
    const { controller, spoken, last, latest } = context
    controller.play()
    spoken[0]?.onend?.()
    expect(last().text).toBe('The second sentence follows it.')
    last().onend?.()
    expect(last().text).toBe('A third one.')
    last().onend?.()
    expect(latest()).toMatchObject({ status: 'idle', cursor: undefined })
  })

  test('follows word boundaries with the cursor', () => {
    const { controller, index, last, latest } = context
    controller.play()
    last().onboundary?.({ name: 'word', charIndex: 4 })
    expect(latest().cursor).toBe(4)
    expect(latest().wordEnd).toBe(index.text.indexOf('first') + 'first'.length)
  })

  test('ignores late events from an utterance that was cancelled', () => {
    const { controller, spoken, latest } = context
    controller.play()
    const [stale] = spoken
    controller.seekTo(context.index.text.indexOf('third'))
    stale?.onboundary?.({ name: 'word', charIndex: 4 })
    stale?.onend?.()
    expect(latest().cursor).toBe(context.index.text.indexOf('third'))
    expect(spoken).toHaveLength(2)
  })

  describe('seeking', () => {
    test('while idle moves the cursor to the clicked word without speaking', () => {
      const { controller, index, spoken, latest } = context
      controller.seekTo(index.text.indexOf('second') + 2)
      expect(spoken).toHaveLength(0)
      expect(latest()).toMatchObject({ status: 'idle', cursor: index.text.indexOf('second'), sentenceIndex: 1 })
    })

    test('then play starts from that word, mid-sentence', () => {
      const { controller, index, last } = context
      controller.seekTo(index.text.indexOf('second'))
      controller.play()
      expect(last().text).toBe('second sentence follows it.')
    })

    test('while playing carries on speaking from the new position', () => {
      const { controller, index, spoken, last, latest } = context
      controller.play()
      controller.seekTo(index.text.indexOf('third'))
      expect(spoken).toHaveLength(2)
      expect(last().text).toBe('third one.')
      expect(latest().status).toBe('playing')
    })

    test('ignores an offset after the last sentence', () => {
      const { controller, index, latest } = context
      controller.seekTo(index.text.length + 5)
      expect(latest().cursor).toBeUndefined()
    })
  })

  describe('pausing with native pause', () => {
    test('leaves the cursor and the utterance alone, and resume carries on', () => {
      const { controller, synth, spoken, last, latest } = context
      controller.play()
      last().onboundary?.({ name: 'word', charIndex: 4 })
      const cancelsBefore = synth.cancelCount
      controller.pause()
      expect(synth.paused).toBe(true)
      expect(synth.cancelCount).toBe(cancelsBefore)
      expect(latest()).toMatchObject({ status: 'paused', cursor: 4 })
      controller.play()
      expect(synth.paused).toBe(false)
      expect(spoken).toHaveLength(1)
      expect(latest().status).toBe('playing')
    })

    test('settling a pause drops the held utterance but keeps the cursor, and only a click resumes', () => {
      const { controller, synth, spoken, last, latest } = context
      controller.play()
      last().onboundary?.({ name: 'word', charIndex: 4 })
      controller.pause()
      const cancelsBefore = synth.cancelCount
      controller.settlePause()
      expect(synth.cancelCount).toBeGreaterThan(cancelsBefore)
      expect(synth.paused).toBe(false)
      expect(latest()).toMatchObject({ status: 'paused', cursor: 4 })
      expect(spoken).toHaveLength(1)
      controller.play()
      expect(spoken).toHaveLength(2)
      expect(last().text).toBe('first sentence is here.')
    })

    test('settling a pause leaves reading that is playing alone', () => {
      const { controller, synth, spoken, latest } = context
      controller.play()
      const cancelsBefore = synth.cancelCount
      controller.settlePause()
      expect(synth.cancelCount).toBe(cancelsBefore)
      expect(spoken).toHaveLength(1)
      expect(latest().status).toBe('playing')
    })

    test('stop ends reading and clears the cursor', () => {
      const { controller, latest } = context
      controller.play()
      controller.stop()
      expect(latest()).toMatchObject({ status: 'idle', cursor: undefined })
    })

    test('seeking while paused discards the paused utterance and play speaks anew', () => {
      const { controller, index, synth, spoken, last } = context
      controller.play()
      controller.pause()
      controller.seekTo(index.text.indexOf('third'))
      expect(synth.paused).toBe(false)
      controller.play()
      expect(spoken).toHaveLength(2)
      expect(last().text).toBe('third one.')
    })
  })

  describe('pausing when native pause is unavailable', () => {
    test('cancels and resumes from the last word that was reported, not the sentence start', () => {
      const { controller, synth, last, latest } = setup(false)
      controller.play()
      last().onboundary?.({ name: 'word', charIndex: 10 })
      controller.pause()
      expect(synth.paused).toBe(false)
      expect(latest()).toMatchObject({ status: 'paused', cursor: 10 })
      controller.play()
      expect(last().text).toBe('sentence is here.')
    })

    test('does the same when pause() is available but does not take effect', () => {
      const { controller, synth, last } = setup(true)
      synth.pauseSticks = false
      controller.play()
      last().onboundary?.({ name: 'word', charIndex: 10 })
      controller.pause()
      controller.play()
      expect(last().text).toBe('sentence is here.')
    })
  })

  describe('voices without word boundary events', () => {
    test('chunks the next sentence into clauses and hides the word highlight', () => {
      const text = '<p>One two three four five six, seven eight nine ten.</p>'
      const root = document.createElement('div')
      root.innerHTML = text
      const { synth, spoken } = createFakeSynth()
      const states: ReadingState[] = []
      const controller = createReadingController({
        synth: synth as never,
        createUtterance: createFakeUtterance as never,
        canPauseNatively: false,
        onChange: (state) => states.push(state)
      })
      controller.setIndex(buildTextIndex(root, { skipPreformatted: false }))
      controller.play()
      expect(states.at(-1)?.wordEnd).toBeUndefined()
      expect(spoken[0]?.text).toBe('One two three four five six,')
      spoken[0]?.onend?.()
      expect(spoken.at(-1)?.text).toBe('seven eight nine ten.')
    })

    test('a pause partway through the first utterance resumes from its clause, not the clicked word', () => {
      const root = document.createElement('div')
      root.innerHTML = '<p>Zero one two three four five six, seven eight nine ten.</p>'
      const { synth, spoken } = createFakeSynth()
      const controller = createReadingController({
        synth: synth as never,
        createUtterance: createFakeUtterance as never,
        canPauseNatively: false,
        onChange: () => {}
      })
      controller.setIndex(buildTextIndex(root, { skipPreformatted: false }))
      controller.seekTo(5)
      controller.play()
      spoken[0]?.onend?.()
      controller.pause()
      controller.play()
      expect(spoken.at(-1)?.text).toBe('seven eight nine ten.')
    })
  })

  test('marks no word while reading until the voice has reported one', () => {
    const { controller, last, latest } = context
    controller.play()
    expect(latest().wordEnd).toBeUndefined()
    last().onboundary?.({ name: 'word', charIndex: 4 })
    expect(latest().wordEnd).toBeDefined()
  })

  test('marks the word at the cursor while not reading, whatever the voice reports', () => {
    const { controller, index, latest } = context
    controller.seekTo(index.text.indexOf('second'))
    expect(latest().wordEnd).toBe(index.text.indexOf('second') + 'second'.length)
  })

  test('changing the rate while playing respeaks from the cursor', () => {
    const { controller, spoken, last } = context
    controller.play()
    last().onboundary?.({ name: 'word', charIndex: 10 })
    controller.setSettings({ rate: 1.5 })
    expect(spoken).toHaveLength(2)
    expect(last().text).toBe('sentence is here.')
    expect(last().rate).toBe(1.5)
  })

  test('destroy stops speech and clears the cursor', () => {
    const { controller, latest, synth } = context
    controller.play()
    const cancelsBefore = synth.cancelCount
    controller.destroy()
    expect(synth.cancelCount).toBeGreaterThan(cancelsBefore)
    expect(latest()).toMatchObject({ status: 'idle', cursor: undefined })
  })

  test('a real error stops playback but a cancellation does not', () => {
    const { controller, last, latest } = context
    controller.play()
    last().onerror?.({ error: 'interrupted' })
    expect(latest().status).toBe('playing')
    last().onerror?.({ error: 'synthesis-failed' })
    expect(latest()).toMatchObject({
      status: 'idle',
      error: 'synthesis-failed',
      cursor: undefined,
      sentenceIndex: undefined,
      wordEnd: undefined
    })
    controller.play()
    expect(latest().error).toBeUndefined()
  })
})

describe('clauseChunkEnd', () => {
  const text = 'Short, but then a much longer clause appears here, and finally the end.'

  test('skips a delimiter that comes too early to be worth splitting at', () => {
    expect(text.slice(0, clauseChunkEnd(text, 0, text.length))).toBe(
      'Short, but then a much longer clause appears here,'
    )
  })

  test('keeps the rest of the sentence when no delimiter follows', () => {
    expect(clauseChunkEnd('no delimiters in this one at all today', 0, 38)).toBe(38)
  })
})
