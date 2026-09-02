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
  type RetiredSubject,
  type Subject,
  type SubjectDetail,
  type SubjectDetailOrRedirect
} from '../reef'

// In name order, which is the order Reef lists the vocabulary in and therefore the order the index
// is expected to render without sorting again.
export const subjectsFixture: Subject[] = [
  {
    id: 1,
    slug: 'authentication',
    name: 'Authentication',
    description: 'Proving who a party is, and what they are allowed to do.'
  },
  {
    id: 2,
    slug: 'networking',
    name: 'Networking',
    description: 'How packets get from one host to another.'
  },
  {
    id: 3,
    slug: 'routing',
    name: 'Routing',
    description: 'Choosing the path traffic takes across a network.'
  }
]

export const authenticationSubjectDetailFixture: SubjectDetail = {
  id: 1,
  slug: 'authentication',
  name: 'Authentication',
  description: 'Proving who a party is, and what they are allowed to do.',
  retired: false,
  // The last of these is an identifier no page is built for, which is the case the index renders as
  // plain text rather than a link.
  documents: ['rfc7519', 'rfc6749', 'draft-ietf-oauth-v2-1']
}

export const subjectDetailFixture: SubjectDetail = {
  id: 2,
  slug: 'networking',
  name: 'Networking',
  description: 'How packets get from one host to another.',
  retired: false,
  documents: ['rfc9110', 'bcp14', 'rfc791']
}

export const routingSubjectDetailFixture: SubjectDetail = {
  id: 3,
  slug: 'routing',
  name: 'Routing',
  description: 'Choosing the path traffic takes across a network.',
  retired: false,
  documents: ['rfc4271', 'rfc2328']
}

// A subject nothing carries yet. Curated by staff ahead of the documents that will sit under it, so
// this is an ordinary state rather than an error.
export const emptySubjectDetailFixture: SubjectDetail = {
  id: 4,
  slug: 'aerospace',
  name: 'Aerospace',
  description: 'Networking above the ground.',
  retired: false,
  documents: []
}

// The other shape /api/reef/subjects/{slug}/ answers with: no name, no description, no membership,
// only enough to send a link that names it to the subject it was folded into.
export const retiredSubjectFixture: RetiredSubject = {
  slug: 'packet-switching',
  retired: true,
  merged_into: 'networking'
}

// Every slug a fixtured Reef knows about. `aerospace` and `packet-switching` are deliberately not in
// subjectsFixture: nothing links to them, and reaching the empty and retired cases means typing the
// URL. Anything not here is a subject Reef has never heard of, which the caller turns into a 404.
const subjectDetailsBySlug: Record<string, SubjectDetailOrRedirect> = {
  authentication: authenticationSubjectDetailFixture,
  networking: subjectDetailFixture,
  routing: routingSubjectDetailFixture,
  aerospace: emptySubjectDetailFixture,
  'packet-switching': retiredSubjectFixture
}

export const subjectDetailFor = (slug: string): SubjectDetailOrRedirect | undefined => subjectDetailsBySlug[slug]

// What the `empty` scenario answers a detail request with: the subject is there and is nothing's
// subject yet. A retired one has no membership to empty, so it is left as it is.
export const emptied = (subject: SubjectDetailOrRedirect): SubjectDetailOrRedirect =>
  isRetiredSubject(subject) ? subject : { ...subject, documents: [] }
