// @vitest-environment nuxt
//
// The /subjects/ index with the published file stubbed, so this runs with no store behind it.
//
// The page reads Reef's blob store rather than its API — a server render never calls Reef — so
// what is stubbed here is ~/utilities/reef-precomputed rather than an HTTP endpoint. The tests
// still speak in a list of subjects, which is what the page works in; the helper below keys it by
// slug on the way in, because that is the shape the file has.
//
// This mounts the page in happy-dom, which is a client render. It covers what the page does with
// what Reef answers; it does not show that the server emitted the same markup.
import { afterEach, describe, expect, test, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { createError } from 'h3'
import SubjectsIndexPage from './index.vue'
import type { Subject } from '~/utilities/reef'
import { subjectsFixture } from '~/utilities/reef-fixtures/subjects'
import { isRenderableSubject, MAX_RENDERED_SUBJECT_DEPTH } from '~/utilities/subject-tree'
import { DEFAULT_SUBJECT_DENSITY, useUiSettingsStore } from '~/stores/ui-settings'

// The layout is the header, footer and navigation around the page, none of which these assertions
// are about.
const STUBS = {
  NuxtLayout: { template: '<div><slot /></div>' },
  // The wall gating these routes on the `oidc` personalisation feature flag. It draws its slot only
  // once the flags have been read from localStorage, which nothing here provides; its own
  // behaviour is covered in components/FeatureFlagWall.test.ts.
  FeatureFlagWall: { template: '<div><slot /></div>' }
}

// Hoisted with the mock that uses it, because vi.mock's factory runs before the module body.
const { fetchSubjectIndex } = vi.hoisted(() => ({ fetchSubjectIndex: vi.fn() }))
vi.mock('~/utilities/reef-precomputed', () => ({ fetchSubjectIndex }))

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

// The file keys its subjects by slug and carries the two arrays the list read does not, so the
// list these tests are written in is turned into one on the way through. `documents` is empty
// because a vocabulary sheet carries no assignments, which is what the real file looks like too.
const reefAnswers = (subjects: Subject[]) => {
  fetchSubjectIndex.mockResolvedValue({
    documents: {},
    subjects: Object.fromEntries(
      subjects.map(({ slug, ...entry }) => [slug, { ...entry, children: [], documents: [] }])
    )
  })
}

const reefFails = (statusCode: number) => {
  fetchSubjectIndex.mockRejectedValue(createError({ statusCode }))
}

const renderPage = (route?: string) => mountSuspended(SubjectsIndexPage, { route, global: { stubs: STUBS } })

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

// A vocabulary small enough to assert against in full, shaped like the real one: roots that carry
// nothing themselves, a branch four deep, and one subject deeper than the tree is drawn to. The
// curated vocabulary in ~/utilities/reef-fixtures is five hundred subjects and nests no deeper than
// four, so it can show that the page draws the real thing but not what the page does at the edges.
const subject = (path: string, counts: { own: number; deep?: number }, description?: string): Subject => {
  const slugs = path.split('/')
  const slug = slugs.at(-1) ?? path
  const name = slug[0]?.toUpperCase() + slug.slice(1)
  return {
    id: slugs.length,
    slug,
    name,
    description: description ?? `Placeholder description for ${name}.`,
    parent: slugs.at(-2) ?? null,
    path,
    document_count: counts.own,
    document_count_deep: counts.deep ?? counts.own
  }
}

const VOCABULARY: Subject[] = [
  subject('messaging', { own: 0, deep: 6 }),
  subject('messaging/email', { own: 2, deep: 6 }),
  subject('messaging/email/smtp', { own: 2, deep: 4 }),
  subject('messaging/email/smtp/spf', { own: 1, deep: 2 }),
  // Deeper than MAX_RENDERED_SUBJECT_DEPTH, so the page is expected to leave it out.
  subject('messaging/email/smtp/spf/dkim', { own: 1 }),
  subject('transport', { own: 0, deep: 3 }),
  subject('transport/tcp', { own: 3 }, 'Moves packets between hosts.')
]

// What that vocabulary draws: everything in it but the one nested too deep.
const rendered = VOCABULARY.filter(isRenderableSubject)

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
  test('draws the whole curated vocabulary, each subject inside the subject it belongs to', async () => {
    reefAnswers(subjectsFixture)

    const page = await renderPage()
    const drawn = listedNames(page)

    // Nothing in the curated vocabulary is nested too deep to draw, so all of it is on the page, in
    // the order Reef sent it.
    expect(drawn).toHaveLength(subjectsFixture.length)
    expect(drawn).toEqual(subjectsFixture.map(({ name }) => name))
  })

  test('files only the top of the curated vocabulary by letter', async () => {
    reefAnswers(subjectsFixture)

    const page = await renderPage()
    const roots = subjectsFixture.filter(({ parent }) => parent === null)

    // Fourteen roots over twenty-six letters, so most of the table of contents is dead letters. A
    // subject further down is found inside its parent rather than under its own initial.
    expect(roots).toHaveLength(14)
    expect(page.findAll('dt')).toHaveLength(new Set(roots.map(({ name }) => name[0]?.toLowerCase())).size)
  })

  test('draws each subject inside the subject it belongs to, in the order Reef sent them', async () => {
    reefAnswers(VOCABULARY)

    const page = await renderPage()

    expect(listedNames(page)).toEqual(['Messaging', 'Email', 'Smtp', 'Spf', 'Transport', 'Tcp'])
  })

  test('nests a subject inside its parent rather than beside it', async () => {
    reefAnswers(VOCABULARY)

    const page = await renderPage()
    const messaging = page.findAll('dd li').find((item) => item.find('a').text() === 'Messaging')

    // The nesting is what says Email is a kind of Messaging. An indent would only look like it.
    expect(messaging?.findAll('li').map((item) => item.find('a').text())).toEqual(['Email', 'Smtp', 'Spf'])
  })

  test(`refuses to draw a subject nested deeper than ${MAX_RENDERED_SUBJECT_DEPTH} levels`, async () => {
    reefAnswers(VOCABULARY)

    const page = await renderPage()

    // Its parent is at the deepest level drawn, so it is the level below that is refused rather
    // than the branch it is on.
    expect(listedNames(page)).toContain('Spf')
    expect(listedNames(page)).not.toContain('Dkim')
    expect(page.text()).not.toContain('Dkim')
  })

  test('counts the subtree against a subject that has one, and only itself against a leaf', async () => {
    reefAnswers(VOCABULARY)

    const page = await renderPage()
    const countOf = (name: string) =>
      page
        .findAll('dd li')
        .find((item) => item.find('a').text() === name)
        ?.find('span')
        .text()

    // Messaging carries nothing itself and six across everything beneath it; Tcp has no subtree, so
    // the two counts are the same number and only one of them is worth the space.
    expect(countOf('Messaging')).toBe('6 RFCs')
    expect(countOf('Tcp')).toBe('3 RFCs')
  })

  test('leaves the descriptions out until they are asked for', async () => {
    reefAnswers(VOCABULARY)

    const page = await renderPage()

    expect(page.findAll('dd li p')).toHaveLength(0)
    rendered.forEach(({ description }) => {
      expect(page.text()).not.toContain(description)
    })
  })

  test('offers the density toggle as a radio group naming both of its states', async () => {
    reefAnswers(VOCABULARY)

    const page = await renderPage()
    const radios = page.findAll<HTMLInputElement>('fieldset input[type="radio"]')

    expect(page.find('fieldset legend').text()).toBe('Display subjects as')
    expect(radios.map((radio) => radio.attributes('value'))).toEqual(['full', 'compact'])
    expect(radios.map((radio) => radio.element.checked)).toEqual([false, true])
  })

  test('reveals every description when the toggle is set to the full display', async () => {
    reefAnswers(VOCABULARY)

    const page = await renderPage()
    await page.find<HTMLInputElement>('fieldset input[value="full"]').setValue(true)

    rendered.forEach(({ description }) => {
      expect(page.text()).toContain(description)
    })
    // A saved preference rather than the state of this one mount: the store is what the next page
    // load reads back.
    expect(useUiSettingsStore().subjectDensity).toBe('full')
  })

  test('renders with the descriptions already shown when that is the saved preference', async () => {
    useUiSettingsStore().setSubjectDensity('full')
    reefAnswers(VOCABULARY)

    const page = await renderPage()

    expect(page.findAll('dd li p')).toHaveLength(rendered.length)
    expect(page.find<HTMLInputElement>('fieldset input[value="full"]').element.checked).toBe(true)
  })

  test('links each subject to its own page', async () => {
    reefAnswers(VOCABULARY)

    const page = await renderPage()

    // The list itself, not the `dd`: each group ends with a back-to-top link that is navigation
    // within the page rather than one of the subjects.
    expect(page.findAll('dd ul a').map((link) => link.attributes('href'))).toEqual([
      '/subjects/messaging/',
      '/subjects/email/',
      '/subjects/smtp/',
      '/subjects/spf/',
      '/subjects/transport/',
      '/subjects/tcp/'
    ])
  })

  test('links the table of contents at the group headings it names', async () => {
    reefAnswers(VOCABULARY)

    const page = await renderPage()
    const tocLinks = page.findAll('nav a')

    // A fragment that names no element leaves the letter looking like a working link and going
    // nowhere, so each one is matched against the id actually rendered on the heading. Only the top
    // of the tree is filed by letter: Email and Tcp are found inside their parents.
    expect(tocLinks.map((link) => link.attributes('href'))).toEqual(['#m', '#t'])
    tocLinks.forEach((link) => {
      const id = link.attributes('href')?.slice(1)
      expect(page.find(`dt#${id}`).exists()).toBe(true)
    })
  })

  test('leaves letters with no subjects as plain text rather than links', async () => {
    reefAnswers(VOCABULARY)

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
      reefAnswers(VOCABULARY)

      const page = await renderPage()
      await typeAndSettle(page, 'smtp')

      // 'Smtp' by its name, and Messaging and Email only because it sits inside them: a match drawn
      // without the subjects it belongs to says nothing about where it was found.
      expect(listedNames(page)).toEqual(['Messaging', 'Email', 'Smtp'])
    })

    test('keeps every subject above a match, however deep the match is', async () => {
      reefAnswers(VOCABULARY)

      const page = await renderPage()
      await typeAndSettle(page, 'spf')

      expect(listedNames(page)).toEqual(['Messaging', 'Email', 'Smtp', 'Spf'])
    })

    test('counts the matches rather than the subjects drawn around them', async () => {
      reefAnswers(VOCABULARY)

      const page = await renderPage()
      await typeAndSettle(page, 'spf')

      // Four subjects are on the page and one of them was matched. Counting the other three would
      // tell a reader their query reached subjects it did not.
      expect(page.find('[role="status"][aria-live="polite"]').text()).toBe(
        `Showing 1 of ${rendered.length} subjects, with 3 parent subjects for context`
      )
    })

    test('highlights the words that were typed, and only on the rows that matched', async () => {
      reefAnswers(VOCABULARY)

      const page = await renderPage()
      await typeAndSettle(page, 'spf')

      // The highlight is what says which of the four rows the query actually reached. Messaging,
      // Email and Smtp are the trail down to it and carry no marks.
      expect(page.findAll('dd mark').map((run) => run.text())).toEqual(['Spf'])
    })

    test('highlights part of a word, which is what an as-you-type filter mostly matches', async () => {
      reefAnswers(VOCABULARY)

      const page = await renderPage()
      await typeAndSettle(page, 'sm')

      expect(page.findAll('dd mark').map((run) => run.text())).toEqual(['Sm'])
    })

    test('tells a screen reader which rows matched, since the highlight is not announced', async () => {
      reefAnswers(VOCABULARY)

      const page = await renderPage()
      await typeAndSettle(page, 'spf')

      // One marker for the one match, which is the figure the live region announces: a reader hears
      // one and finds exactly one.
      expect(page.findAll('dd li .sr-only').map((marker) => marker.text())).toEqual(['matches the filter'])
    })

    test('marks nothing at all while the box is empty', async () => {
      reefAnswers(VOCABULARY)

      const page = await renderPage()

      expect(page.findAll('dd mark')).toHaveLength(0)
      expect(page.findAll('dd li .sr-only')).toHaveLength(0)
    })

    test('reveals the description a compact row was matched on, so the row shows its reason', async () => {
      reefAnswers(VOCABULARY)

      // The compact density hides descriptions, and 'packets' appears in Tcp's description and in
      // nothing's name. Left hidden, the row would look exactly like one shown for context.
      expect(useUiSettingsStore().subjectDensity).toBe('compact')

      const page = await renderPage()
      await typeAndSettle(page, 'packets')

      expect(page.findAll('dd mark').map((run) => run.text())).toEqual(['packets'])
      expect(page.text()).toContain('Moves packets between hosts.')
    })

    test('leaves the other compact rows compact while doing it', async () => {
      reefAnswers(VOCABULARY)

      const page = await renderPage()
      await typeAndSettle(page, 'tcp')

      // Tcp matched on its name, so its own highlight is the reason it is there and its description
      // stays put. Transport is context and has nothing to reveal either.
      expect(page.findAll('dd li p')).toHaveLength(0)
      expect(page.findAll('dd mark').map((run) => run.text())).toEqual(['Tcp'])
    })

    test('matches what a subject is about, not only what it is called', async () => {
      reefAnswers(VOCABULARY)

      const page = await renderPage()
      await typeAndSettle(page, 'packets')

      // 'Tcp' is described as moving packets between hosts, and named nothing of the kind.
      expect(listedNames(page)).toEqual(['Transport', 'Tcp'])
    })

    test('keeps the whole vocabulary while the box is empty', async () => {
      reefAnswers(VOCABULARY)

      const page = await renderPage()
      await typeAndSettle(page, 'tcp')
      await typeAndSettle(page, '')

      expect(listedNames(page)).toHaveLength(rendered.length)
    })

    test('drops the group headings the filter emptied, and mutes their letters', async () => {
      reefAnswers(VOCABULARY)

      const page = await renderPage()
      await typeAndSettle(page, 'smtp')

      // M rather than S: the heading is the letter of the root the match was found under, because
      // that is where the reader will be looking for it.
      expect(page.findAll('dt').map((heading) => heading.text())).toEqual(['M'])
      // Every letter is still drawn; only M is still a link to something.
      const toc = page.find('nav')
      expect(toc.findAll('li')).toHaveLength(26)
      expect(toc.findAll('a').map((link) => link.attributes('href'))).toEqual(['#m'])
    })

    test('says which word emptied the page, and keeps the way back from it', async () => {
      reefAnswers(VOCABULARY)

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
      reefAnswers(VOCABULARY)

      const page = await renderPage()
      await typeAndSettle(page, 'quantum')
      await page.find('button[aria-label="Clear the filter"]').trigger('click')

      expect(listedNames(page)).toHaveLength(rendered.length)
      expect(filterInput(page).element.value).toBe('')
    })

    test('narrows to the query in the URL once the browser has the page', async () => {
      reefAnswers(VOCABULARY)

      // What a shared link has to land on. The server render behind it is the whole vocabulary,
      // because the worker does not pass the query string to Nuxt, so this narrowing is the
      // browser's first act rather than something it inherits.
      const page = await renderPage('/subjects/?q=smtp')
      await nextTick()

      expect(listedNames(page)).toEqual(['Messaging', 'Email', 'Smtp'])
      expect(filterInput(page).element.value).toBe('smtp')
      // Reading the URL is not a reason to write it back.
      expect(navigateTo).not.toHaveBeenCalled()
    })

    test('writes the settled query to the URL, replacing rather than stacking history', async () => {
      reefAnswers(VOCABULARY)

      const page = await renderPage()
      await typeAndSettle(page, 'sm', 'smtp')

      // One entry for the word, not one per letter.
      expect(navigateTo).toHaveBeenCalledTimes(1)
      expect(navigateTo).toHaveBeenCalledWith({ path: '/subjects/', query: { q: 'smtp' } }, { replace: true })
    })

    test('takes the query back out of the URL when the filter is cleared', async () => {
      reefAnswers(VOCABULARY)

      const page = await renderPage('/subjects/?q=smtp')
      await nextTick()
      await typeAndSettle(page, '')

      expect(navigateTo).toHaveBeenCalledWith({ path: '/subjects/', query: {} }, { replace: true })
    })

    test('announces how much of the vocabulary is left, for readers who cannot see the list', async () => {
      reefAnswers(VOCABULARY)

      const page = await renderPage()
      const liveRegion = page.find('[role="status"][aria-live="polite"]')

      // Silent until there is something to say, rather than announcing the whole vocabulary at rest.
      expect(liveRegion.text()).toBe('')

      await typeAndSettle(page, 'smtp')

      expect(liveRegion.text()).toBe(`Showing 1 of ${rendered.length} subjects, with 2 parent subjects for context`)
    })

    test('submits nowhere, because there is nowhere for a filter to be submitted to', async () => {
      reefAnswers(VOCABULARY)

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
