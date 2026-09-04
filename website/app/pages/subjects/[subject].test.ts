// @vitest-environment nuxt
//
// The /subjects/<slug>/ page with the published file stubbed. The page reads Reef's blob store
// rather than its API — a server render never calls Reef — so ~/utilities/reef-precomputed is what
// is mocked. See ./index.test.ts for what a client-side mount does and does not cover.
//
// `published` below adds the two maps a published file carries and the served response does not:
// the titles of its documents, and the curated names of the subjects around it. Those names are
// the reason the file exists rather than the endpoint, so the tests give each one a name that is
// visibly not its slug.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
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

const { fetchSubjectFile } = vi.hoisted(() => ({ fetchSubjectFile: vi.fn() }))
vi.mock('~/utilities/reef-precomputed', () => ({ fetchSubjectFile }))

// A curated name for every subject a file mentions, made by title-casing the slug and marking it,
// so an assertion that finds the slug where a name belongs fails rather than passing by luck.
const nameOf = (slug: string): string =>
  `The ${slug.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}`

// Titles carry no identifier in them on purpose: a title that read "Title of rfc1952" would
// satisfy an assertion about the identifier and hide the label never being rendered.
const titleOf = (index: number): string => `The Title Of Document Number ${index}`

const published = (subject: SubjectDetail) => ({
  ...subject,
  document_meta: Object.fromEntries(
    subject.documents.map((doc, index) => [doc, { title: titleOf(index), subseries: [] }])
  ),
  subject_meta: Object.fromEntries(
    [...subject.path.split('/').slice(0, -1), ...subject.children].map((slug) => [slug, { name: nameOf(slug) }])
  )
})

beforeEach(() => {
  navigateToMock.mockReset()
})

afterEach(() => {
  fetchSubjectFile.mockReset()
  // Every mount in this file resolves the same useAsyncData key, so without this a test renders
  // the previous test's answer instead of asking for its own.
  clearNuxtData()
})

const reefAnswers = (_slug: string, subject: SubjectDetail | RetiredSubject | SubjectAlias) => {
  // A redirect stub carries neither map, so only a live subject is wrapped.
  fetchSubjectFile.mockResolvedValue('documents' in subject ? published(subject) : subject)
}

const reefFails = (_slug: string, statusCode: number) => {
  fetchSubjectFile.mockRejectedValue(createError({ statusCode }))
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
    documents.forEach((_doc, index) => {
      expect(text).toContain(titleOf(index))
    })
  })

  test('names each document as a reader writes it, with its title beside', async () => {
    // `rfc1952` is how Reef files it and how the URL is built; "RFC 1952" is how it is read. The
    // title comes from document_meta, which the published file carries and the API does not.
    const { slug } = leafSubjectDetailFixture
    reefAnswers(slug, leafSubjectDetailFixture)

    const page = await renderPage(slug)
    const text = page.text()

    expect(text).toContain('RFC 1952')
    expect(text).toContain(titleOf(0))
    expect(text).not.toContain('rfc1952')
  })

  test('a document whose title Reef could not resolve still renders as a link', async () => {
    // Null is a real state rather than an error: Reef resolves titles from Red's published index
    // when it writes the file, and an identifier that index does not carry has none.
    const { slug } = leafSubjectDetailFixture
    fetchSubjectFile.mockResolvedValue({
      ...published(leafSubjectDetailFixture),
      document_meta: { rfc1952: { title: null, subseries: [] }, rfc6713: { title: null, subseries: [] } }
    })

    const page = await renderPage(slug)

    expect(page.text()).toContain('RFC 1952')
    expect(page.findAll('ul a').map((link) => link.attributes('href'))).toEqual(['/info/rfc1952/', '/info/rfc6713/'])
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

  test('links the subjects within this one by their curated name', async () => {
    const { slug } = subjectDetailFixture
    reefAnswers(slug, subjectDetailFixture)

    const page = await renderPage(slug)
    const child = page.findAll('a').find((link) => link.attributes('href') === '/subjects/gzip/')

    // The name out of subject_meta, not the slug. `children` carries slugs and always did; what
    // changed is that the file now says what each of them is called.
    expect(child?.text()).toBe(nameOf('gzip'))
  })

  test('falls back to the slug when a file names no name for a child', async () => {
    // A file written before subject_meta existed, or one whose map has a gap. A breadcrumb of
    // slugs is worse than a breadcrumb of names and far better than a page that will not render.
    const { slug } = subjectDetailFixture
    fetchSubjectFile.mockResolvedValue({ ...published(subjectDetailFixture), subject_meta: {} })

    const page = await renderPage(slug)
    const child = page.findAll('a').find((link) => link.attributes('href') === '/subjects/gzip/')

    expect(child?.text()).toBe('gzip')
  })

  test('shows where the subject sits, without linking back to itself', async () => {
    const { slug } = leafSubjectDetailFixture
    reefAnswers(slug, leafSubjectDetailFixture)

    const page = await renderPage(slug)
    const breadcrumb = page.find('nav[aria-label="Breadcrumb"]')

    // `applications-and-data-formats/compression/gzip` less its own last segment, so the trail leads
    // here and stops, and each step is named rather than slugged.
    expect(breadcrumb.findAll('li').map((item) => item.find('a').text())).toEqual([
      nameOf('applications-and-data-formats'),
      nameOf('compression')
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

  test('reports a subject Reef does not publish as not found', async () => {
    // A key that is not in the store, which the store answers with a 404 and the util turns into
    // `undefined`. That is a plain answer about a subject that does not exist, so it is told apart
    // here from a read that failed — which still reaches the error branch below.
    fetchSubjectFile.mockResolvedValue(undefined)

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
