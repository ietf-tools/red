// Stand-in Reef answers for the /subjects/ pages, so those tests run with no Reef behind them.
//
// Typed against the generated client rather than declared loosely, which is what makes these
// fixtures a check on the spec as well as data for the tests: resync reef_api.yaml into a shape
// these no longer satisfy and `npm run test:types` says so, instead of the tests passing against
// something Reef has stopped sending.
import type { RetiredSubject, Subject, SubjectDetail } from '../reef'

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

export const subjectDetailFixture: SubjectDetail = {
  id: 2,
  slug: 'networking',
  name: 'Networking',
  description: 'How packets get from one host to another.',
  retired: false,
  documents: ['rfc9110', 'bcp14', 'rfc791']
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
