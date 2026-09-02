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
    const names = page.findAll('li').map((item) => item.text())

    expect(names).toHaveLength(subjectsFixture.length)
    subjectsFixture.forEach(({ name, description }, index) => {
      expect(names[index]).toContain(name)
      expect(names[index]).toContain(description)
    })
  })

  test('links each subject to its own page', async () => {
    reefAnswers(subjectsFixture)

    const page = await renderPage()

    expect(page.findAll('a').map((link) => link.attributes('href'))).toEqual([
      '/subjects/authentication/',
      '/subjects/networking/',
      '/subjects/routing/'
    ])
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
