// @vitest-environment nuxt
//
// The /subjects/<slug>/ page with Reef stubbed. See ./index.test.ts for how registerEndpoint stands
// in for Reef, and for what a client-side mount does and does not cover.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mockNuxtImport, mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError } from 'h3'
import SubjectPage from './[subject].vue'
import type { RetiredSubject, SubjectDetail } from '~/utilities/reef'
import {
  emptySubjectDetailFixture,
  retiredSubjectFixture,
  subjectDetailFixture
} from '~/utilities/reef-fixtures/subjects'

const STUB_LAYOUT = {
  NuxtLayout: { template: '<div><slot /></div>' }
}

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))

mockNuxtImport('navigateTo', () => navigateToMock)

const subjectUrl = (slug: string): string => `${useRuntimeConfig().public.reefBase}/api/reef/subjects/${slug}/`

let unregister: (() => void) | undefined

beforeEach(() => {
  navigateToMock.mockReset()
})

afterEach(() => {
  unregister?.()
  unregister = undefined
  clearNuxtData()
})

const reefAnswers = (slug: string, subject: SubjectDetail | RetiredSubject) => {
  unregister = registerEndpoint(subjectUrl(slug), () => subject)
}

const reefFails = (slug: string, statusCode: number) => {
  unregister = registerEndpoint(subjectUrl(slug), () => {
    throw createError({ statusCode })
  })
}

const renderPage = (slug: string) =>
  mountSuspended(SubjectPage, {
    route: `/subjects/${slug}/`,
    global: { stubs: STUB_LAYOUT }
  })

describe('/subjects/<slug>/', () => {
  test('renders the subject and the documents carrying it', async () => {
    const { slug, name, description, documents } = subjectDetailFixture
    reefAnswers(slug, subjectDetailFixture)

    const page = await renderPage(slug)
    const text = page.text()

    expect(text).toContain(name)
    expect(text).toContain(description)
    documents.forEach((doc) => {
      expect(text).toContain(doc)
    })
  })

  test('links each document to its info page', async () => {
    const { slug } = subjectDetailFixture
    reefAnswers(slug, subjectDetailFixture)

    const page = await renderPage(slug)

    expect(page.findAll('a').map((link) => link.attributes('href'))).toEqual([
      '/info/rfc9110/',
      '/info/bcp14/',
      '/info/rfc791/'
    ])
  })

  test('says a subject nothing carries yet is empty rather than missing', async () => {
    const { slug } = emptySubjectDetailFixture
    reefAnswers(slug, emptySubjectDetailFixture)

    const page = await renderPage(slug)

    expect(page.text()).toContain('No RFCs carry this subject yet')
    expect(page.text()).not.toContain('Subject not found')
  })

  test('sends a retired subject to the one it was merged into', async () => {
    const { slug, merged_into: mergedInto } = retiredSubjectFixture
    reefAnswers(slug, retiredSubjectFixture)

    const page = await renderPage(slug)

    expect(navigateToMock).toHaveBeenCalledWith(`/subjects/${mergedInto}/`, {
      redirectCode: 301,
      replace: true
    })
    // Nothing of the retired subject is rendered on the way out: it is not offered any more, and
    // the shape Reef sent carries no name or membership to render even if it were.
    expect(page.text()).not.toContain(slug)
  })

  test('reports a subject Reef does not have as not found', async () => {
    reefFails('nonexistent', 404)

    const page = await renderPage('nonexistent')

    expect(page.text()).toContain('Subject not found')
  })

  test('tells a subject that could not be loaded apart from one that is not there', async () => {
    reefFails('networking', 500)

    const page = await renderPage('networking')

    expect(page.text()).toContain('This subject could not be loaded')
    expect(page.text()).not.toContain('Subject not found')
  })
})
