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
import { afterEach, describe, expect, test } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError } from 'h3'
import SubjectsIndexPage from './index.vue'
import type { Subject } from '~/utilities/reef'
import { subjectsFixture } from '~/utilities/reef-fixtures/subjects'
import { DEFAULT_SUBJECT_DENSITY, useUiSettingsStore } from '~/stores/ui-settings'

// The layout is the header, footer and navigation around the page, none of which these assertions
// are about.
const STUB_LAYOUT = {
  NuxtLayout: { template: '<div><slot /></div>' }
}

const subjectsUrl = (): string => `${useRuntimeConfig().public.reefBase}/api/reef/subjects/`

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
})

const reefAnswers = (subjects: Subject[]) => {
  unregister = registerEndpoint(subjectsUrl(), () => subjects)
}

const reefFails = (statusCode: number) => {
  unregister = registerEndpoint(subjectsUrl(), () => {
    throw createError({ statusCode })
  })
}

const renderPage = () => mountSuspended(SubjectsIndexPage, { global: { stubs: STUB_LAYOUT } })

describe('/subjects/', () => {
  test('lists every subject Reef sent, in the order it sent them', async () => {
    reefAnswers(subjectsFixture)

    const page = await renderPage()
    const names = page.findAll('dd li').map((item) => item.text())

    expect(names).toHaveLength(subjectsFixture.length)
    subjectsFixture.forEach(({ name }, index) => {
      expect(names[index]).toContain(name)
    })
  })

  test('leaves the descriptions out until they are asked for', async () => {
    reefAnswers(subjectsFixture)

    const page = await renderPage()

    expect(page.findAll('dd li p')).toHaveLength(0)
    subjectsFixture.forEach(({ description }) => {
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

    const names = page.findAll('dd li').map((item) => item.text())
    subjectsFixture.forEach(({ name, description }, index) => {
      expect(names[index]).toContain(name)
      expect(names[index]).toContain(description)
    })
    // A saved preference rather than the state of this one mount: the store is what the next page
    // load reads back.
    expect(useUiSettingsStore().subjectDensity).toBe('full')
  })

  test('renders with the descriptions already shown when that is the saved preference', async () => {
    useUiSettingsStore().setSubjectDensity('full')
    reefAnswers(subjectsFixture)

    const page = await renderPage()

    expect(page.findAll('dd li p')).toHaveLength(subjectsFixture.length)
    expect(page.find<HTMLInputElement>('fieldset input[value="full"]').element.checked).toBe(true)
  })

  test('links each subject to its own page', async () => {
    reefAnswers(subjectsFixture)

    const page = await renderPage()

    expect(page.findAll('dd a').map((link) => link.attributes('href'))).toEqual([
      '/subjects/authentication/',
      '/subjects/networking/',
      '/subjects/routing/'
    ])
  })

  test('links the table of contents at the group headings it names', async () => {
    reefAnswers(subjectsFixture)

    const page = await renderPage()
    const tocLinks = page.findAll('nav a')

    // A fragment that names no element leaves the letter looking like a working link and going
    // nowhere, so each one is matched against the id actually rendered on the heading.
    expect(tocLinks.map((link) => link.attributes('href'))).toEqual(['#a', '#n', '#r'])
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
    expect(toc.findAll('a')).toHaveLength(3)
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
})
