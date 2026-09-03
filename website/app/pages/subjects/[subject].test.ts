// @vitest-environment nuxt
//
// The /subjects/<slug>/ page with Reef stubbed. See ./index.test.ts for how registerEndpoint stands
// in for Reef, and for what a client-side mount does and does not cover.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mockNuxtImport, mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { createError } from 'h3'
import SubjectPage from './[subject].vue'
import type { RetiredSubject, SubjectAlias, SubjectDetail } from '~/utilities/reef'
import {
  emptySubjectDetailFixture,
  headingSubjectDetailFixture,
  leafSubjectDetailFixture,
  retiredSubjectFixture,
  subjectAliasFixture,
  subjectDetailFixture
} from '~/utilities/reef-fixtures/subjects'

const STUBS = {
  NuxtLayout: { template: '<div><slot /></div>' },
  // The wall gating these routes on the `oidc` personalisation feature flag. It draws its slot only
  // once the flags have been read from localStorage, which nothing here provides; its own
  // behaviour is covered in components/FeatureFlagWall.test.ts.
  FeatureFlagWall: { template: '<div><slot /></div>' }
}

// A page left mounted goes on rendering as the next test clears the data behind it, and a page that
// renders an identifier it cannot link throws when it does — after the test that expected the throw
// has already finished with it, where nothing is waiting to catch it.
enableAutoUnmount(afterEach)

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

const reefAnswers = (slug: string, subject: SubjectDetail | RetiredSubject | SubjectAlias) => {
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
    global: { stubs: STUBS }
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
    // The leaf, because it is the case with nothing else on the page: no subjects within it, so
    // every link drawn is one of its documents.
    const { slug } = leafSubjectDetailFixture
    reefAnswers(slug, leafSubjectDetailFixture)

    const page = await renderPage(slug)

    // The lists, not the whole page: the breadcrumb above is an `ol` of links to the subjects this
    // one sits inside, which are navigation rather than membership.
    expect(page.findAll('ul a').map((link) => link.attributes('href'))).toEqual(['/info/rfc1952/', '/info/rfc6713/'])
  })

  test('links the subjects within this one, which Reef names by slug', async () => {
    const { slug } = subjectDetailFixture
    reefAnswers(slug, subjectDetailFixture)

    const page = await renderPage(slug)
    const child = page.findAll('a').find((link) => link.attributes('href') === '/subjects/gzip/')

    // The slug verbatim: the detail answer carries only slugs for the subjects around this one, and
    // the curated names are on /subjects/ rather than in this response.
    expect(child?.text()).toBe('gzip')
  })

  test('shows where the subject sits, without linking back to itself', async () => {
    const { slug } = leafSubjectDetailFixture
    reefAnswers(slug, leafSubjectDetailFixture)

    const page = await renderPage(slug)
    const breadcrumb = page.find('nav[aria-label="Breadcrumb"]')

    // `applications-and-data-formats/compression/gzip` less its own last segment, so the trail leads
    // here and stops.
    expect(breadcrumb.findAll('li').map((item) => item.find('a').text())).toEqual([
      'applications-and-data-formats',
      'compression'
    ])
    expect(breadcrumb.findAll('a').map((link) => link.attributes('href'))).toEqual([
      '/subjects/applications-and-data-formats/',
      '/subjects/compression/'
    ])
  })

  test('leaves the breadcrumb off a subject that is not inside anything', async () => {
    const { slug } = headingSubjectDetailFixture
    reefAnswers(slug, headingSubjectDetailFixture)

    const page = await renderPage(slug)

    expect(page.find('nav[aria-label="Breadcrumb"]').exists()).toBe(false)
  })

  test('says what the list of documents leaves out, rather than letting the count look wrong', async () => {
    const { slug } = subjectDetailFixture
    reefAnswers(slug, subjectDetailFixture)

    const page = await renderPage(slug)

    // Twenty documents are listed and thirty-nine are counted across the subtree, so nineteen are
    // filed somewhere the reader cannot see from here.
    expect(page.text()).toContain('19 further RFCs are filed under the subjects within this one')
  })

  test('says nothing about a subtree when the subject holds everything counted against it', async () => {
    const { slug } = leafSubjectDetailFixture
    reefAnswers(slug, leafSubjectDetailFixture)

    const page = await renderPage(slug)

    expect(page.text()).not.toContain('further')
  })

  test('says a subject nothing carries yet is empty rather than missing', async () => {
    const { slug } = emptySubjectDetailFixture
    reefAnswers(slug, emptySubjectDetailFixture)

    const page = await renderPage(slug)

    expect(page.text()).toContain('No RFCs carry this subject yet')
    expect(page.text()).not.toContain('Subject not found')
  })

  test('says a subject whose documents are all in its subtree is a heading, not an empty subject', async () => {
    // Not a contrived case: none of the fourteen roots carries a document of its own, so every one
    // of them reaches this branch.
    const { slug, document_count: documentCount } = headingSubjectDetailFixture
    expect(documentCount).toBe(0)
    reefAnswers(slug, headingSubjectDetailFixture)

    const page = await renderPage(slug)

    expect(page.text()).toContain('No RFCs are filed under this subject itself')
    expect(page.text()).not.toContain('No RFCs carry this subject yet')
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

  test('sends an alias to the subject it is another name for', async () => {
    const { slug, alias_of: aliasOf } = subjectAliasFixture
    reefAnswers(slug, subjectAliasFixture)

    const page = await renderPage(slug)

    // Redirected rather than served: an alias answering with its subject's page would publish that
    // subject at two addresses with nothing saying which one to link.
    expect(navigateToMock).toHaveBeenCalledWith(`/subjects/${aliasOf}/`, {
      redirectCode: 301,
      replace: true
    })
    expect(page.text()).not.toContain(slug)
  })

  test('reports a subject Reef does not have as not found', async () => {
    reefFails('nonexistent', 404)

    const page = await renderPage('nonexistent')

    expect(page.text()).toContain('Subject not found')
  })

  // The identifiers Reef curates subjects over are named in the series this build has info pages
  // for, so one it cannot link is Reef sending something outside that vocabulary rather than a row
  // to render without a link.
  test('fails rather than listing an identifier it cannot link', async () => {
    const slug = 'authentication'
    reefAnswers(slug, { ...subjectDetailFixture, slug, documents: ['draft-ietf-oauth-v2-1'] })

    await expect(renderPage(slug)).rejects.toThrow(/draft-ietf-oauth-v2-1/)
  })

  test('tells a subject that could not be loaded apart from one that is not there', async () => {
    reefFails('networking', 500)

    const page = await renderPage('networking')

    expect(page.text()).toContain('This subject could not be loaded')
    expect(page.text()).not.toContain('Subject not found')
  })
})
