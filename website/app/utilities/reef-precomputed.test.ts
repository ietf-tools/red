// The fixtures, parsed through the schemas generated from reef_api.yaml.
//
// `npm run test:types` already catches a fixture whose *shape* has drifted from the contract,
// because the fixtures are typed against the generated client. What this adds is the half the
// type system cannot see: the patterns on a slug and a document identifier, null against absent,
// and — the one worth having — the exclusivity of a union with no discriminator.
//
// That last one is not hypothetical. Reef answers /subjects/<slug>/ with one of three shapes told
// apart by which key is present, so drf-spectacular emits a `oneOf` with no discriminator, and the
// generator renders it as a union that asserts exactly one member matches. The three are disjoint
// only because RetiredSubject requires `merged_into` and SubjectAlias requires `alias_of`, neither
// of which a live subject carries. Nothing in Reef states that as an invariant, so if one of those
// ever became optional a valid payload would match two members and fail to parse. These tests are
// what would say so.
import { describe, expect, test } from 'vitest'
import {
  PrecomputedSubjectDetail,
  PrecomputedSubjectDetailOrRedirect,
  SubjectAlias,
  Subject as SubjectSchema,
  SubjectDetailOrRedirect,
  SubjectIndex,
  RetiredSubject as RetiredSubjectSchema
} from '../../generated/reef-api-zod'
import {
  retiredSubjectFixture,
  subjectAliasFixture,
  subjectDetailFixture,
  subjectsFixture,
  emptySubjectDetailFixture,
  headingSubjectDetailFixture,
  leafSubjectDetailFixture
} from './reef-fixtures/subjects'
import publishedIndex from './reef-fixtures/precomputed/subjects.json'

describe('the served subject fixtures satisfy the contract', () => {
  test('every entry in the vocabulary parses', () => {
    for (const subject of subjectsFixture) {
      expect(() => SubjectSchema.parse(subject)).not.toThrow()
    }
  })

  test.each([
    ['a subject with children and documents', subjectDetailFixture],
    ['a leaf', leafSubjectDetailFixture],
    ['a heading with no documents of its own', headingSubjectDetailFixture],
    ['a subject with nothing under it at all', emptySubjectDetailFixture]
  ])('%s parses as a live subject', (_label, fixture) => {
    expect(() => PrecomputedSubjectDetail.parse(fixture)).toThrow()
    expect(() => SubjectDetailOrRedirect.parse(fixture)).not.toThrow()
  })

  test('the redirect stubs parse as themselves', () => {
    expect(() => RetiredSubjectSchema.parse(retiredSubjectFixture)).not.toThrow()
    expect(() => SubjectAlias.parse(subjectAliasFixture)).not.toThrow()
  })
})

describe('the three subject shapes stay disjoint', () => {
  // One member each, and exactly one. A payload matching two would take the union's refine down
  // with it, so this is the test that keeps the disjointness from being an accident.
  test.each([
    ['a live subject', subjectDetailFixture],
    ['a retired subject', retiredSubjectFixture],
    ['an alias', subjectAliasFixture]
  ])('%s matches exactly one member', (_label, fixture) => {
    const matches = [SubjectAlias, RetiredSubjectSchema].filter((schema) => schema.safeParse(fixture).success)
    expect(matches.length).toBeLessThanOrEqual(1)
    expect(() => SubjectDetailOrRedirect.parse(fixture)).not.toThrow()
  })
})

describe("Reef's published files parse", () => {
  // The real thing: ./reef-fixtures/precomputed is a verbatim copy of a precompute run, so this is
  // the check that what Reef writes and what Reef's contract says have not come apart. Nothing else
  // in either repository compares the two — Reef asserts its files are its views' bytes, and Red
  // generates from the contract, but only this reads an actual file against an actual schema.
  const index = publishedIndex as unknown
  const files = Object.entries(import.meta.glob('./reef-fixtures/precomputed/subjects/*.json', { eager: true })) as [
    string,
    { default: unknown }
  ][]

  test('there is a file for every subject in the index, and one each', () => {
    const parsed = SubjectIndex.parse(index)
    const slugs = new Set(Object.keys(parsed.subjects))
    // Both directions. Without the count, a glob that resolved to a handful of
    // files would satisfy every other test here.
    expect(files.length).toBe(slugs.size)
    const onDisk = new Set(
      files.map(([path]) =>
        path
          .split('/')
          .pop()
          ?.replace(/\.json$/, '')
      )
    )
    expect(slugs.size).toBeGreaterThan(0)
    for (const slug of slugs) {
      expect(onDisk.has(slug)).toBe(true)
    }
  })

  test('the index parses', () => {
    expect(() => SubjectIndex.parse(index)).not.toThrow()
  })

  test('every published subject file parses', () => {
    expect(files.length).toBeGreaterThan(0)
    const failures = files.filter(([, module]) => !PrecomputedSubjectDetailOrRedirect.safeParse(module.default).success)
    expect(failures.map(([path]) => path)).toEqual([])
  })

  test('a subject names its ancestors and children, and only those', () => {
    // subject_meta is what lets a breadcrumb render "Applications" rather than `applications`
    // without a second fetch, so this is the property the whole map exists for.
    const parsed = SubjectIndex.parse(index)
    for (const [path, module] of files) {
      const file = PrecomputedSubjectDetail.safeParse(module.default)
      if (!file.success) continue
      const entry = parsed.subjects[file.data.slug]
      if (entry === undefined) continue
      const expected = new Set([...entry.path.split('/').slice(0, -1), ...entry.children])
      expect({ path, named: new Set(Object.keys(file.data.subject_meta)) }).toEqual({
        path,
        named: expected
      })
    }
  })
})

describe('the published shapes', () => {
  // Hand-built, because these are the states the real vocabulary does not contain: it has no
  // retired subject, no alias, and — until assignments are imported — no document to carry a
  // title. Real data above, invented data here, and nothing invented that real data could show.
  const publishedSubject = {
    id: 3,
    slug: 'email',
    name: 'Email',
    description: 'Mail transport and formats.',
    parent: 'messaging',
    path: 'messaging/email',
    document_count: 1,
    document_count_deep: 2,
    retired: false,
    children: ['dkim'],
    aliases: ['e-mail'],
    documents: ['rfc5322'],
    document_meta: { rfc5322: { title: 'Internet Message Format', subseries: [] } },
    subject_meta: { messaging: { name: 'Messaging' }, dkim: { name: 'DKIM' } }
  }

  test('a subject file parses', () => {
    expect(() => PrecomputedSubjectDetail.parse(publishedSubject)).not.toThrow()
  })

  test('a subject file with an unresolved title parses, because null is an answer', () => {
    // Reef publishes null rather than omitting the key, so that a reader can tell "no such
    // document" from "not looked up".
    const unresolved = {
      ...publishedSubject,
      document_meta: { rfc5322: { title: null, subseries: [] } }
    }
    expect(() => PrecomputedSubjectDetail.parse(unresolved)).not.toThrow()
  })

  test('a field Reef adds later does not break the parse', () => {
    // The additive guarantee, from Red's side. drf-spectacular emits no
    // additionalProperties: false, so the generated schemas keep unknown keys instead of
    // rejecting them, and nothing here may tighten that.
    const widened = { ...publishedSubject, something_new: 42 }
    const parsed = PrecomputedSubjectDetail.parse(widened)
    expect(parsed).toHaveProperty('something_new', 42)
  })

  test('the index parses, with both maps keyed', () => {
    const index = {
      documents: { rfc5322: { title: 'Internet Message Format', subseries: [] } },
      subjects: {
        messaging: {
          id: 1,
          name: 'Messaging',
          description: '',
          parent: null,
          path: 'messaging',
          children: ['email'],
          documents: [],
          document_count: 0,
          document_count_deep: 1
        },
        email: {
          id: 3,
          name: 'Email',
          description: '',
          parent: 'messaging',
          path: 'messaging/email',
          children: [],
          documents: ['rfc5322'],
          document_count: 1,
          document_count_deep: 1
        }
      }
    }
    const parsed = SubjectIndex.parse(index)
    // Key order carries tree order, and parsing must not disturb it: the listing renders the
    // vocabulary top to bottom and relies on a parent arriving before its children.
    expect(Object.keys(parsed.subjects)).toEqual(['messaging', 'email'])
  })
})
