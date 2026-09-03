// @vitest-environment nuxt
//
// The /subjects/ index with Reef stubbed, so this runs with no Reef behind it.
//
// registerEndpoint is what stands in for Reef. The `nuxt` environment replaces global fetch with
// one that diverts any URL in its registry into a local h3 app, and it matches the whole URL rather
// than just the path — so the absolute address ~/utilities/reef builds can be registered directly
// and there is no proxy or server route in the way. A key that does not match that address exactly
// is not an error: the request falls through to the real network and fails as a refused connection
// to whatever reefBase names, so check the key first when a test fails that way.
//
// This mounts the page in happy-dom, which is a client render. It covers what the page does with
// what Reef answers; it does not show that the server emitted the same markup.
import { afterEach, describe, expect, test, vi } from 'vitest'
import { mockNuxtImport, mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { createError } from 'h3'
import SubjectsIndexPage from './index.vue'
import type { Subject } from '~/utilities/reef'
import { subjectsFixture } from '~/utilities/reef-fixtures/subjects'
import { isRenderableSubject, MAX_RENDERED_SUBJECT_DEPTH } from '~/utilities/subject-tree'
import { DEFAULT_SUBJECT_DENSITY, useUiSettingsStore } from '~/stores/ui-settings'

// The layout is the header, footer and navigation around the page, none of which these assertions
// are about.
const STUB_LAYOUT = {
  NuxtLayout: { template: '<div><slot /></div>' }
}

const subjectsUrl = (): string => `${useRuntimeConfig().public.reefBase}/api/reef/subjects/`

// A page left mounted goes on watching its filter, and the delay before it writes the URL outlives
// the test that typed: unmounted here so that one test's keystroke cannot be another's navigation.
enableAutoUnmount(afterEach)

// Registrations stack per URL, so each one is undone before the next test registers its own answer.
let unregister: (() => void) | undefined

afterEach(() => {
  unregister?.()
  unregister = undefined
  // Every mount in this file resolves the same useAsyncData key, so without this the second test
  // renders the first test's answer instead of asking Reef again.
  clearNuxtData()
  // The density preference outlives a mount, so a test that changes it puts it back rather than
  // deciding how the next page renders.
  useUiSettingsStore().setSubjectDensity(DEFAULT_SUBJECT_DENSITY)
  navigateTo.mockClear()
})

const reefAnswers = (subjects: Subject[]) => {
  unregister = registerEndpoint(subjectsUrl(), () => subjects)
}

const reefFails = (statusCode: number) => {
  unregister = registerEndpoint(subjectsUrl(), () => {
    throw createError({ statusCode })
  })
}

const renderPage = (route?: string) => mountSuspended(SubjectsIndexPage, { route, global: { stubs: STUB_LAYOUT } })

// Stubbed rather than driven, because what the page owes the URL is one replace per settled query
// and that is what these assert. It stands for every test in the file; none of the others navigate.
// The mock itself is hoisted because mockNuxtImport is: the factory runs when the mocked import is
// resolved, before a plain `const` at this point in the file would have been initialised.
const { navigateTo } = vi.hoisted(() => ({ navigateTo: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateTo)

const filterInput = (page: Awaited<ReturnType<typeof renderPage>>) =>
  page.find<HTMLInputElement>('input[type="search"]')

// One name per subject drawn, in document order, so a parent comes before the subjects nested
// inside it. Read off each item's own link rather than its text, because an item's text is its
// whole subtree's: the count beside it, its description, and every subject beneath it.
const listedNames = (page: Awaited<ReturnType<typeof renderPage>>) =>
  page.findAll('dd li').map((item) => item.find('a').text())

// What the index actually draws, which is the vocabulary minus anything nested deeper than the tree
// is rendered to.
const renderedSubjects = subjectsFixture.filter(isRenderableSubject)

// Longer than both the delay before the URL is written and the one before the count is announced.
const SETTLE_MS = 500

/**
 * Types each query in turn and then lets the page's delays expire.
 *
 * Fake timers are switched on before the typing rather than after it, because switching them on
 * afterwards leaves the timer the keystroke already scheduled running on real time, where nothing
 * advances it. Several queries in one call are several keystrokes inside one delay, which is what
 * a word being typed is.
 */
const typeAndSettle = async (page: Awaited<ReturnType<typeof renderPage>>, ...queries: string[]) => {
  vi.useFakeTimers()
  try {
    for (const query of queries) {
      await filterInput(page).setValue(query)
    }
    await vi.advanceTimersByTimeAsync(SETTLE_MS)
  } finally {
    vi.useRealTimers()
  }
}

describe('/subjects/', () => {
  test('draws each subject inside the subject it belongs to, in the order Reef sent them', async () => {
    reefAnswers(subjectsFixture)

    const page = await renderPage()

    expect(listedNames(page)).toEqual([
      'Networking',
      'Routing',
      'Security',
      'Authentication',
      'Tokens',
      'JSON Web Tokens'
    ])
  })

  test('nests a subject inside its parent rather than beside it', async () => {
    reefAnswers(subjectsFixture)

    const page = await renderPage()
    const networking = page.findAll('dd li').find((item) => item.find('a').text() === 'Networking')

    // The nesting is what says Routing is a kind of Networking. An indent would only look like it.
    expect(networking?.findAll('li').map((item) => item.find('a').text())).toEqual(['Routing'])
  })

  test(`refuses to draw a subject nested deeper than ${MAX_RENDERED_SUBJECT_DEPTH} levels`, async () => {
    reefAnswers(subjectsFixture)

    const page = await renderPage()

    // Its parent is at the deepest level drawn, so it is the level below that is refused rather
    // than the branch it is on.
    expect(listedNames(page)).toContain('JSON Web Tokens')
    expect(listedNames(page)).not.toContain('JWT claims')
    expect(page.text()).not.toContain('JWT claims')
  })

  test('counts the subtree against a subject that has one, and only itself against a leaf', async () => {
    reefAnswers(subjectsFixture)

    const page = await renderPage()
    const textOf = (name: string) =>
      page
        .findAll('dd li')
        .find((item) => item.find('a').text() === name)
        ?.find('span')
        .text()

    // Networking holds three documents itself and five counting Routing's.
    expect(textOf('Networking')).toBe('5 RFCs')
    expect(textOf('Routing')).toBe('2 RFCs')
  })

  test('leaves the descriptions out until they are asked for', async () => {
    reefAnswers(subjectsFixture)

    const page = await renderPage()

    expect(page.findAll('dd li p')).toHaveLength(0)
    renderedSubjects.forEach(({ description }) => {
      expect(page.text()).not.toContain(description)
    })
  })

  test('offers the density toggle as a radio group naming both of its states', async () => {
    reefAnswers(subjectsFixture)

    const page = await renderPage()
    const radios = page.findAll<HTMLInputElement>('fieldset input[type="radio"]')

    expect(page.find('fieldset legend').text()).toBe('Display subjects as')
    expect(radios.map((radio) => radio.attributes('value'))).toEqual(['full', 'compact'])
    expect(radios.map((radio) => radio.element.checked)).toEqual([false, true])
  })

  test('reveals every description when the toggle is set to the full display', async () => {
    reefAnswers(subjectsFixture)

    const page = await renderPage()
    await page.find<HTMLInputElement>('fieldset input[value="full"]').setValue(true)

    renderedSubjects.forEach(({ description }) => {
      expect(page.text()).toContain(description)
    })
    // A saved preference rather than the state of this one mount: the store is what the next page
    // load reads back.
    expect(useUiSettingsStore().subjectDensity).toBe('full')
  })

  test('renders with the descriptions already shown when that is the saved preference', async () => {
    useUiSettingsStore().setSubjectDensity('full')
    reefAnswers(subjectsFixture)

    const page = await renderPage()

    expect(page.findAll('dd li p')).toHaveLength(renderedSubjects.length)
    expect(page.find<HTMLInputElement>('fieldset input[value="full"]').element.checked).toBe(true)
  })

  test('links each subject to its own page', async () => {
    reefAnswers(subjectsFixture)

    const page = await renderPage()

    // The list itself, not the `dd`: each group ends with a back-to-top link that is navigation
    // within the page rather than one of the subjects.
    expect(page.findAll('dd ul a').map((link) => link.attributes('href'))).toEqual([
      '/subjects/networking/',
      '/subjects/routing/',
      '/subjects/security/',
      '/subjects/authentication/',
      '/subjects/tokens/',
      '/subjects/json-web-tokens/'
    ])
  })

  test('links the table of contents at the group headings it names', async () => {
    reefAnswers(subjectsFixture)

    const page = await renderPage()
    const tocLinks = page.findAll('nav a')

    // A fragment that names no element leaves the letter looking like a working link and going
    // nowhere, so each one is matched against the id actually rendered on the heading. Only the top
    // of the tree is filed by letter: Authentication and Routing are found inside their parents.
    expect(tocLinks.map((link) => link.attributes('href'))).toEqual(['#n', '#s'])
    tocLinks.forEach((link) => {
      const id = link.attributes('href')?.slice(1)
      expect(page.find(`dt#${id}`).exists()).toBe(true)
    })
  })

  test('leaves letters with no subjects as plain text rather than links', async () => {
    reefAnswers(subjectsFixture)

    const page = await renderPage()
    const toc = page.find('nav')

    expect(toc.findAll('li')).toHaveLength(26)
    expect(toc.findAll('a')).toHaveLength(2)
    expect(toc.text()).toContain('B')
  })

  test('says the vocabulary is empty rather than reporting an error', async () => {
    reefAnswers([])

    const page = await renderPage()

    expect(page.text()).toContain('No subjects have been published yet')
    expect(page.text()).not.toContain('Error')
  })

  test('reports an error when Reef refuses', async () => {
    reefFails(500)

    const page = await renderPage()

    expect(page.text()).toContain('The list of subjects could not be loaded')
  })
  describe('the filter', () => {
    test('narrows the list to the subjects matching what was typed', async () => {
      reefAnswers(subjectsFixture)

      const page = await renderPage()
      await typeAndSettle(page, 'routing')

      // 'Routing' by its name, and 'Networking' only because Routing sits inside it: a match drawn
      // without the subjects it belongs to says nothing about where it was found.
      expect(listedNames(page)).toEqual(['Networking', 'Routing'])
    })

    test('keeps every subject above a match, however deep the match is', async () => {
      reefAnswers(subjectsFixture)

      const page = await renderPage()
      await typeAndSettle(page, 'json web')

      expect(listedNames(page)).toEqual(['Security', 'Authentication', 'Tokens', 'JSON Web Tokens'])
    })

    test('counts the matches rather than the subjects drawn around them', async () => {
      reefAnswers(subjectsFixture)

      const page = await renderPage()
      await typeAndSettle(page, 'json web')

      // Four subjects are on the page and one of them was matched. Counting the other three would
      // tell a reader their query reached subjects it did not.
      expect(page.find('[role="status"][aria-live="polite"]').text()).toBe(
        `Showing 1 of ${renderedSubjects.length} subjects`
      )
    })

    test('matches what a subject is about, not only what it is called', async () => {
      reefAnswers(subjectsFixture)

      const page = await renderPage()
      await typeAndSettle(page, 'packets')

      // 'Networking' is described as how packets get from one host to another, and named nothing
      // of the kind.
      expect(listedNames(page)).toEqual(['Networking'])
    })

    test('keeps the whole vocabulary while the box is empty', async () => {
      reefAnswers(subjectsFixture)

      const page = await renderPage()
      await typeAndSettle(page, 'routing')
      await typeAndSettle(page, '')

      expect(listedNames(page)).toHaveLength(renderedSubjects.length)
    })

    test('drops the group headings the filter emptied, and mutes their letters', async () => {
      reefAnswers(subjectsFixture)

      const page = await renderPage()
      await typeAndSettle(page, 'routing')

      // N rather than R: the heading is the letter of the root the match was found under, because
      // that is where the reader will be looking for it.
      expect(page.findAll('dt').map((heading) => heading.text())).toEqual(['N'])
      // Every letter is still drawn; only N is still a link to something.
      const toc = page.find('nav')
      expect(toc.findAll('li')).toHaveLength(26)
      expect(toc.findAll('a').map((link) => link.attributes('href'))).toEqual(['#n'])
    })

    test('says which word emptied the page, and keeps the way back from it', async () => {
      reefAnswers(subjectsFixture)

      const page = await renderPage()
      await typeAndSettle(page, 'quantum')

      expect(page.text()).toContain('No subjects match “quantum”')
      // Not the message for a vocabulary that has nothing in it: that would send the reader looking
      // for a fault rather than at their own query.
      expect(page.text()).not.toContain('No subjects have been published yet')
      // The box still holds the query, so it can be corrected rather than retyped, and the
      // table of contents has gone with the list it described.
      expect(filterInput(page).element.value).toBe('quantum')
      expect(page.find('nav').exists()).toBe(false)
    })

    test('puts the whole index back when the filter is cleared', async () => {
      reefAnswers(subjectsFixture)

      const page = await renderPage()
      await typeAndSettle(page, 'quantum')
      await page.find('button[aria-label="Clear the filter"]').trigger('click')

      expect(listedNames(page)).toHaveLength(renderedSubjects.length)
      expect(filterInput(page).element.value).toBe('')
    })

    test('narrows to the query in the URL once the browser has the page', async () => {
      reefAnswers(subjectsFixture)

      // What a shared link has to land on. The server render behind it is the whole vocabulary,
      // because the worker does not pass the query string to Nuxt, so this narrowing is the
      // browser's first act rather than something it inherits.
      const page = await renderPage('/subjects/?q=routing')
      await nextTick()

      expect(listedNames(page)).toEqual(['Networking', 'Routing'])
      expect(filterInput(page).element.value).toBe('routing')
      // Reading the URL is not a reason to write it back.
      expect(navigateTo).not.toHaveBeenCalled()
    })

    test('writes the settled query to the URL, replacing rather than stacking history', async () => {
      reefAnswers(subjectsFixture)

      const page = await renderPage()
      await typeAndSettle(page, 'rout', 'routing')

      // One entry for the word, not one per letter.
      expect(navigateTo).toHaveBeenCalledTimes(1)
      expect(navigateTo).toHaveBeenCalledWith({ path: '/subjects/', query: { q: 'routing' } }, { replace: true })
    })

    test('takes the query back out of the URL when the filter is cleared', async () => {
      reefAnswers(subjectsFixture)

      const page = await renderPage('/subjects/?q=routing')
      await nextTick()
      await typeAndSettle(page, '')

      expect(navigateTo).toHaveBeenCalledWith({ path: '/subjects/', query: {} }, { replace: true })
    })

    test('announces how much of the vocabulary is left, for readers who cannot see the list', async () => {
      reefAnswers(subjectsFixture)

      const page = await renderPage()
      const liveRegion = page.find('[role="status"][aria-live="polite"]')

      // Silent until there is something to say, rather than announcing the whole vocabulary at rest.
      expect(liveRegion.text()).toBe('')

      await typeAndSettle(page, 'routing')

      expect(liveRegion.text()).toBe(`Showing 1 of ${renderedSubjects.length} subjects`)
    })

    test('submits nowhere, because there is nowhere for a filter to be submitted to', async () => {
      reefAnswers(subjectsFixture)

      const page = await renderPage()
      const form = page.find('form[role="search"]')

      // The worker strips the query string from anything it fetches from Nuxt, so a form that
      // submitted would come back as the unfiltered index. Filtering is the browser's, and a
      // control that cannot work without scripting should not look as though it can.
      expect(form.attributes('action')).toBeUndefined()
      expect(form.attributes('method')).toBeUndefined()
      expect(filterInput(page).attributes('name')).toBeUndefined()
    })

    test('is not offered when there is no vocabulary to filter', async () => {
      reefAnswers([])

      const page = await renderPage()

      expect(page.find('input[type="search"]').exists()).toBe(false)
      expect(page.text()).toContain('No subjects have been published yet')
    })
  })
})
