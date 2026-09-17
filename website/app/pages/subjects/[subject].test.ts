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
import { ref } from 'vue'
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
import { DEFAULT_FEATURE_FLAGS, featureFlagsKey } from '~/utilities/feature-flags'
import { NONBREAKING_SPACE } from '~/utilities/strings'

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

// A resolved document_meta entry, complete enough to satisfy FullDocumentMetadata and so to
// convert into an RFCCard: real Reef data never sends a resolved title alongside a null status or
// stream, so the test double doesn't either. The rest is nullable and left null, same as an entry
// this build's index has nothing further to say about.
const documentMetaOf = (index: number) => ({
  title: titleOf(index),
  subseries: [],
  status: 'unkn',
  status_name: 'unknown',
  stream: 'Legacy',
  stream_name: 'Legacy',
  obsoletes: [],
  obsoleted_by: [],
  updates: [],
  updated_by: [],
  authors: [],
  published: null,
  identifiers: [],
  area: null,
  group: null,
  keywords: [],
  pages: null,
  abstract: null
})

// A curated name, description, and both counts for a subject a file mentions — ancestor or
// descendant alike — distinguishable from anything derived from the slug alone or left at zero, so
// a test that finds the slug or an empty count where curated data belongs fails rather than passing
// by luck.
const subjectMetaOf = (slug: string) => ({
  name: nameOf(slug),
  description: `Placeholder description for ${nameOf(slug)}.`,
  document_count: slug.length,
  document_count_deep: slug.length
})

// One leaf of a descendant branch: this subject's own subject_meta and nothing beneath it. Tests
// after real nesting build their own, deeper, branch by hand instead of reaching for this.
const subjectBranchOf = (slug: string) => ({ slug, ...subjectMetaOf(slug), children: [] })

const published = (subject: SubjectDetail) => ({
  ...subject,
  document_meta: Object.fromEntries(subject.documents.map((doc, index) => [doc, documentMetaOf(index)])),
  subject_meta: {
    // Root first, the same order subject_meta itself carries them in.
    ancestors: subject.path
      .split('/')
      .slice(0, -1)
      .map((slug) => ({ slug, ...subjectMetaOf(slug) })),
    descendants: subject.children.map(subjectBranchOf)
  }
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
    global: {
      stubs: STUBS,
      // RFCCard, rendered for every document with a resolved document_meta entry, reads its own
      // feature flags rather than receiving them as a prop — normally provided above app.vue,
      // which isn't in this page's own mount.
      provide: { [featureFlagsKey]: ref(DEFAULT_FEATURE_FLAGS) }
    }
  })

// By href prefix rather than by tag or position, so the breadcrumb's own links — inside a `ul` of
// its own, same as the document list — aren't counted as documents.
const documentLinks = (page: Awaited<ReturnType<typeof renderPage>>): (string | undefined)[] =>
  page
    .findAll('a')
    .map((link) => link.attributes('href'))
    .filter((href) => href?.startsWith('/info/'))

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
    // `rfc1952` is how Reef files it and how the URL is built; "RFC 1952" (an RFCCard, once
    // document_meta resolves it) is how it is read, with a non-breaking space between the two
    // words so the pair never wraps.
    const { slug } = leafSubjectDetailFixture
    reefAnswers(slug, leafSubjectDetailFixture)

    const page = await renderPage(slug)
    const text = page.text()

    expect(text).toContain(`RFC${NONBREAKING_SPACE}1952`)
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
    expect(documentLinks(page)).toEqual(['/info/rfc1952/', '/info/rfc6713/'])
  })

  test('links each document to its info page', async () => {
    // The leaf, because it is the case with nothing else on the page: no subjects within it, so
    // every link drawn is one of its documents.
    const { slug } = leafSubjectDetailFixture
    reefAnswers(slug, leafSubjectDetailFixture)

    const page = await renderPage(slug)

    // By href prefix rather than by tag, so the breadcrumb's own links — also inside a `ul`, now
    // that it draws through the conventional Breadcrumbs component — aren't counted as documents.
    expect(documentLinks(page)).toEqual(['/info/rfc1952/', '/info/rfc6713/'])
  })

  test('draws a subject in the tree from subject_meta', async () => {
    const { slug } = subjectDetailFixture
    reefAnswers(slug, subjectDetailFixture)

    const page = await renderPage(slug)
    const child = page.findAll('a').find((link) => link.attributes('href') === '/subjects/gzip/')

    // subject_meta's own curated name and count, not the slug: this list is built from the
    // published file alone, with no second fetch to carry a real name or count that subject_meta
    // itself did not.
    expect(child?.text()).toBe(nameOf('gzip'))
    expect(page.text()).toContain(`${nameOf('gzip')}${'gzip'.length} RFCs`)
  })

  test('draws a grandchild too, nested inside its own parent branch', async () => {
    // subject_meta.descendants is a real tree: a grandchild sits inside its parent's own
    // `children`, not beside everything else in a flat map with nothing saying whose it is.
    const { slug } = subjectDetailFixture
    const grandchildSlug = 'imaginary-grandchild'
    const withGrandchild = published(subjectDetailFixture)
    fetchSubjectFile.mockResolvedValue({
      ...withGrandchild,
      subject_meta: {
        ...withGrandchild.subject_meta,
        descendants: withGrandchild.subject_meta.descendants.map((branch) =>
          branch.slug === 'gzip' ? { ...branch, children: [subjectBranchOf(grandchildSlug)] } : branch
        )
      }
    })

    const page = await renderPage(slug)
    const grandchild = page.findAll('a').find((link) => link.attributes('href') === `/subjects/${grandchildSlug}/`)

    expect(grandchild?.text()).toBe(nameOf(grandchildSlug))
  })

  test('leaves out this subject and its own ancestors, even though subject_meta names them too', async () => {
    // subject_meta also names this subject's ancestors, for the breadcrumb -- they are not part of
    // its subtree, and drawing them a second time here would say a subject is its own descendant.
    // One link to an ancestor's path (the breadcrumb's) rather than two is what tells them apart.
    const { slug } = subjectDetailFixture
    reefAnswers(slug, subjectDetailFixture)

    const page = await renderPage(slug)

    expect(
      page.findAll('a').filter((link) => link.attributes('href') === '/subjects/applications-and-data-formats/')
    ).toHaveLength(1)
  })

  test('shows where the subject sits, ending with itself unlinked', async () => {
    const { slug } = leafSubjectDetailFixture
    reefAnswers(slug, leafSubjectDetailFixture)

    const page = await renderPage(slug)
    const breadcrumb = page.find('nav[aria-label="Breadcrumbs"]')

    // Home, then the index, then `applications-and-data-formats/compression/gzip` named one step
    // at a time. The leaf itself is last and carries no link, the same convention every other
    // page's breadcrumb uses for the page a reader is already on.
    expect(breadcrumb.findAll('a').map((link) => link.text())).toEqual([
      'Home',
      'RFCs by Subject',
      nameOf('applications-and-data-formats'),
      nameOf('compression')
    ])
    expect(breadcrumb.findAll('a').map((link) => link.attributes('href'))).toEqual([
      '/',
      '/subjects/',
      '/subjects/applications-and-data-formats/',
      '/subjects/compression/'
    ])
    expect(breadcrumb.text()).toContain(leafSubjectDetailFixture.name)
  })

  test('leads with Home and the index for a subject that is not inside anything', async () => {
    const { slug, name } = headingSubjectDetailFixture
    reefAnswers(slug, headingSubjectDetailFixture)

    const page = await renderPage(slug)
    const breadcrumb = page.find('nav[aria-label="Breadcrumbs"]')

    expect(breadcrumb.findAll('a').map((link) => link.text())).toEqual(['Home', 'RFCs by Subject'])
    expect(breadcrumb.text()).toContain(name)
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
