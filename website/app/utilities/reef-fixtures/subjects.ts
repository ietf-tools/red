// Stand-in Reef answers for the /subjects/ pages, used both by the tests for those pages and, via
// ./index, by a dev server running with NUXT_PUBLIC_REEF_FIXTURES set. One set of answers for both,
// so what a page is developed against and what it is tested against cannot drift apart.
//
// Typed against the generated client rather than declared loosely, which is what makes these
// fixtures a check on the spec as well as data for the tests: resync reef_api.yaml into a shape
// these no longer satisfy and `npm run test:types` says so, instead of the tests passing against
// something Reef has stopped sending.
import {
  isRetiredSubject,
  isSubjectAlias,
  type RetiredSubject,
  type Subject,
  type SubjectAlias,
  type SubjectDetail,
  type SubjectDetailOrRedirect
} from '../reef'

// In tree order, which is the order Reef lists the vocabulary in: a parent before the subjects
// beneath it, siblings in name order.
//
// Deliberately deeper than the page draws. `json-web-tokens` sits at the deepest level rendered and
// `jwt-claims` one below it, so that the depth the tree is cut off at is a thing the tests can see
// rather than something only the real vocabulary would ever exercise.
export const subjectsFixture: Subject[] = [
  {
    id: 1,
    slug: 'networking',
    name: 'Networking',
    description: 'How packets get from one host to another.',
    parent: null,
    path: 'networking',
    document_count: 3,
    document_count_deep: 5
  },
  {
    id: 2,
    slug: 'routing',
    name: 'Routing',
    description: 'Choosing the path traffic takes across a network.',
    parent: 'networking',
    path: 'networking/routing',
    document_count: 2,
    document_count_deep: 2
  },
  {
    id: 3,
    slug: 'security',
    name: 'Security',
    description: 'Keeping a conversation private and its parties honest.',
    parent: null,
    path: 'security',
    document_count: 0,
    document_count_deep: 6
  },
  {
    id: 4,
    slug: 'authentication',
    name: 'Authentication',
    description: 'Proving who a party is, and what they are allowed to do.',
    parent: 'security',
    path: 'security/authentication',
    document_count: 3,
    document_count_deep: 6
  },
  {
    id: 5,
    slug: 'tokens',
    name: 'Tokens',
    description: 'Short-lived proofs of an authorisation already granted.',
    parent: 'authentication',
    path: 'security/authentication/tokens',
    document_count: 1,
    document_count_deep: 3
  },
  {
    id: 6,
    slug: 'json-web-tokens',
    name: 'JSON Web Tokens',
    description: 'Claims signed into a token a bearer can carry.',
    parent: 'tokens',
    path: 'security/authentication/tokens/json-web-tokens',
    document_count: 1,
    document_count_deep: 2
  },
  {
    id: 7,
    slug: 'jwt-claims',
    name: 'JWT claims',
    description: 'The registered names a token may assert.',
    parent: 'json-web-tokens',
    path: 'security/authentication/tokens/json-web-tokens/jwt-claims',
    document_count: 1,
    document_count_deep: 1
  }
]

export const authenticationSubjectDetailFixture: SubjectDetail = {
  id: 4,
  slug: 'authentication',
  name: 'Authentication',
  description: 'Proving who a party is, and what they are allowed to do.',
  parent: 'security',
  path: 'security/authentication',
  document_count: 3,
  document_count_deep: 6,
  retired: false,
  children: ['tokens'],
  aliases: ['authn'],
  documents: ['rfc7519', 'rfc6749', 'rfc9068']
}

export const subjectDetailFixture: SubjectDetail = {
  id: 1,
  slug: 'networking',
  name: 'Networking',
  description: 'How packets get from one host to another.',
  parent: null,
  path: 'networking',
  document_count: 3,
  document_count_deep: 5,
  retired: false,
  children: ['routing'],
  aliases: [],
  documents: ['rfc9110', 'bcp14', 'rfc791']
}

export const routingSubjectDetailFixture: SubjectDetail = {
  id: 2,
  slug: 'routing',
  name: 'Routing',
  description: 'Choosing the path traffic takes across a network.',
  parent: 'networking',
  path: 'networking/routing',
  document_count: 2,
  document_count_deep: 2,
  retired: false,
  children: [],
  aliases: [],
  documents: ['rfc4271', 'rfc2328']
}

// A subject nothing carries yet. Curated by staff ahead of the documents that will sit under it, so
// this is an ordinary state rather than an error.
export const emptySubjectDetailFixture: SubjectDetail = {
  id: 8,
  slug: 'aerospace',
  name: 'Aerospace',
  description: 'Networking above the ground.',
  parent: null,
  path: 'aerospace',
  document_count: 0,
  document_count_deep: 0,
  retired: false,
  children: [],
  aliases: [],
  documents: []
}

// The second shape /api/reef/subjects/{slug}/ answers with: no name, no description, no membership,
// only enough to send a link that names it to the subject it was folded into.
export const retiredSubjectFixture: RetiredSubject = {
  slug: 'packet-switching',
  retired: true,
  merged_into: 'networking'
}

// The third shape: another name for a subject that is still current, carrying only the slug to
// redirect to. Not the subject's own payload under a second address, so that a link naming it is
// canonicalised rather than quietly served.
export const subjectAliasFixture: SubjectAlias = {
  slug: 'authn',
  alias_of: 'authentication'
}

// Every slug a fixtured Reef knows about. `aerospace`, `packet-switching` and `authn` are
// deliberately not in subjectsFixture: nothing links to them, and reaching the empty, retired and
// alias cases means typing the URL. Anything not here is a subject Reef has never heard of, which
// the caller turns into a 404.
const subjectDetailsBySlug: Record<string, SubjectDetailOrRedirect> = {
  authentication: authenticationSubjectDetailFixture,
  networking: subjectDetailFixture,
  routing: routingSubjectDetailFixture,
  aerospace: emptySubjectDetailFixture,
  'packet-switching': retiredSubjectFixture,
  authn: subjectAliasFixture
}

export const subjectDetailFor = (slug: string): SubjectDetailOrRedirect | undefined => subjectDetailsBySlug[slug]

// What the `empty` scenario answers a detail request with: the subject is there and is nothing's
// subject yet. A redirect — retired or alias — has no membership to empty, so it is left as it is.
export const emptied = (subject: SubjectDetailOrRedirect): SubjectDetailOrRedirect =>
  isRetiredSubject(subject) || isSubjectAlias(subject) ? subject : { ...subject, documents: [] }
