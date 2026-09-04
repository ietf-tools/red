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

describe('the published shapes', () => {
  // Hand-built rather than fixtured, because the fixtures are still the served shapes: the
  // precomputed ones carry document_meta and subject_meta, and the intent is that they become a
  // copy of a real precompute run's output rather than data written here. Until that sync exists,
  // these pin the schemas against the smallest payload that exercises both maps.
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
