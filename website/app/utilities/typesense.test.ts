// @vitest-environment nuxt
import { test, expect } from 'vitest'
import type { TypeSenseSearchItem } from './typesense'
import type { RfcCommon } from './rfc'
import { typeSenseSearchItemToRFCCommon } from './rfc-converters'

// Note that the actual response format is deeper. This is just the bit we care about
const exampleTypesenseResults: TypeSenseSearchItem[] = [
  {
    abstract:
      'This document specifies an attribute for a statement of possession of a private key by a certificate subject. As part of X.509 certificate enrollment, a Certification Authority (CA) typically demands proof that the subject possesses the private key that corresponds to the to-be-certified public key. In some cases, a CA might accept a signed statement from the certificate subject. For example, when a certificate subject needs separate certificates for signature and key establishment, a statement that can be validated with the previously issued signature certificate for the same subject might be adequate for subsequent issuance of the key establishment certificate.',
    adName: 'Deb Cooley',
    area: {
      acronym: 'sec',
      full: 'sec - Security Area',
      name: 'Security Area'
    },
    authors: [
      {
        affiliation: 'Vigil Security, LLC',
        name: 'Russ Housley'
      }
    ],
    date: 1760326845,
    filename: 'rfc9883',
    flags: {
      obsoleted: false,
      updated: false
    },
    group: {
      acronym: 'lamps',
      full: 'lamps - Limited Additional Mechanisms for PKIX and SMIME',
      name: 'Limited Additional Mechanisms for PKIX and SMIME'
    },
    id: 'doc-150050',
    keywords: [],
    pages: 17,
    publicationDate: 1760326845,
    ranking: 9883,
    rfc: '9883',
    rfcNumber: 9883,
    state: ['Published'],
    status: {
      name: 'Proposed Standard',
      slug: 'ps'
    },
    stream: {
      name: 'IETF',
      slug: 'ietf'
    },
    subseries: {},
    title: 'An Attribute for Statement of Possession of a Private Key',
    type: 'rfc'
  },
  {
    abstract:
      'This document specifies additions and amendments to RFCs 7292 and 8018. It also obsoletes the RFC 9579. It defines a way to use the Password-Based Message Authentication Code 1 (PBMAC1), defined in RFC 8018, inside the PKCS #12 syntax. The purpose of this specification is to permit the use of more modern Password-Based Key Derivation Functions (PBKDFs) and allow for regulatory compliance.',
    adName: 'Deb Cooley',
    area: {
      acronym: 'sec',
      full: 'sec - Security Area',
      name: 'Security Area'
    },
    authors: [
      {
        affiliation: 'Red Hat, Inc.',
        name: 'Alicja Kario'
      }
    ],
    date: 1758225385,
    filename: 'rfc9879',
    flags: {
      obsoleted: false,
      updated: false
    },
    group: {
      acronym: 'lamps',
      full: 'lamps - Limited Additional Mechanisms for PKIX and SMIME',
      name: 'Limited Additional Mechanisms for PKIX and SMIME'
    },
    id: 'doc-149630',
    keywords: [],
    pages: 16,
    publicationDate: 1758225385,
    ranking: 9879,
    rfc: '9879',
    rfcNumber: 9879,
    state: ['Published'],
    status: {
      name: 'Informational',
      slug: 'inf'
    },
    stream: {
      name: 'IETF',
      slug: 'ietf'
    },
    subseries: {},
    title:
      'Use of Password-Based Message Authentication Code 1 (PBMAC1) in PKCS #12 Syntax',
    type: 'rfc'
  },
  {
    abstract:
      'This document defines a new Registration Data Access Protocol (RDAP) extension, "geofeed1", for indicating that an RDAP server hosts geofeed URLs for its IP network objects. It also defines a new media type and a new link relation type for the associated link objects included in responses.',
    adName: 'Orie Steele',
    area: {
      acronym: 'art',
      full: 'art - Applications and Real-Time Area',
      name: 'Applications and Real-Time Area'
    },
    authors: [
      {
        affiliation: 'ARIN',
        name: 'Jasdip Singh'
      },
      {
        affiliation: 'APNIC',
        name: 'Tom Harrison'
      }
    ],
    date: 1760326217,
    filename: 'rfc9877',
    flags: {
      obsoleted: false,
      updated: false
    },
    group: {
      acronym: 'regext',
      full: 'regext - Registration Protocols Extensions',
      name: 'Registration Protocols Extensions'
    },
    id: 'doc-150049',
    keywords: [],
    pages: 11,
    publicationDate: 1760326217,
    ranking: 9877,
    rfc: '9877',
    rfcNumber: 9877,
    state: ['Published'],
    status: {
      name: 'Proposed Standard',
      slug: 'ps'
    },
    stream: {
      name: 'IETF',
      slug: 'ietf'
    },
    subseries: {},
    title:
      'Registration Data Access Protocol (RDAP) Extension for Geofeed Data',
    type: 'rfc'
  },

  {
    abstract:
      'The Extensible Provisioning Protocol (EPP) includes commands for clients to delete domain and host objects, both of which are used to publish information in the Domain Name System (DNS). EPP also includes guidance for deletions that is intended to avoid DNS resolution disruptions and maintain data consistency. However, operational relationships between objects can make that guidance difficult to implement. Some EPP clients have developed operational practices to delete those objects that have unintended impacts on DNS resolution and security. This document describes best current practices and proposes new potential practices to delete domain and host objects that reduce the risk of DNS resolution failure and maintain client-server data consistency.',
    adName: 'Orie Steele',
    area: {
      acronym: 'art',
      full: 'art - Applications and Real-Time Area',
      name: 'Applications and Real-Time Area'
    },
    authors: [
      {
        affiliation: 'Verisign Labs',
        name: 'Scott Hollenbeck'
      },
      {
        affiliation: 'Verisign',
        name: 'William Carroll'
      },
      {
        affiliation: 'Stanford University',
        name: 'Gautam Akiwate'
      }
    ],
    date: 1759111094,
    filename: 'rfc9874',
    flags: {
      obsoleted: false,
      updated: false
    },
    group: {
      acronym: 'regext',
      full: 'regext - Registration Protocols Extensions',
      name: 'Registration Protocols Extensions'
    },
    id: 'doc-149757',
    keywords: [],
    pages: 18,
    publicationDate: 1759111094,
    ranking: 9874,
    rfc: '9874',
    rfcNumber: 9874,
    state: ['Published'],
    status: {
      name: 'Best Current Practice',
      slug: 'bcp'
    },
    stream: {
      name: 'IETF',
      slug: 'ietf'
    },
    subseries: {
      acronym: 'bcp',
      number: 244,
      total: 1
    },
    title:
      'Best Practices for Deletion of Domain and Host Objects in the Extensible Provisioning Protocol (EPP)',
    type: 'rfc'
  },
  {
    abstract:
      'The Extensible Provisioning Protocol (EPP) does not inherently support internationalized email addresses because the specifications for these addresses did not exist when EPP was developed. This document describes a command-response extension that adds support for associating an additional email address with an EPP contact object. That additional email address can be either an internationalized email address or an ASCII-only address.',
    adName: 'Orie Steele',
    area: {
      acronym: 'art',
      full: 'art - Applications and Real-Time Area',
      name: 'Applications and Real-Time Area'
    },
    authors: [
      {
        affiliation: '',
        name: 'Dmitry Belyavsky'
      },
      {
        affiliation: 'VeriSign, Inc.',
        name: 'James Gould'
      },
      {
        affiliation: 'Verisign Labs',
        name: 'Scott Hollenbeck'
      }
    ],
    date: 1760299630,
    filename: 'rfc9873',
    flags: {
      obsoleted: false,
      updated: false
    },
    group: {
      acronym: 'regext',
      full: 'regext - Registration Protocols Extensions',
      name: 'Registration Protocols Extensions'
    },
    id: 'doc-150047',
    keywords: [],
    pages: 22,
    publicationDate: 1760299630,
    ranking: 9873,
    rfc: '9873',
    rfcNumber: 9873,
    state: ['Published'],
    status: {
      name: 'Proposed Standard',
      slug: 'ps'
    },
    stream: {
      name: 'IETF',
      slug: 'ietf'
    },
    subseries: {},
    title:
      'Additional Email Address Extension for the Extensible Provisioning Protocol (EPP)',
    type: 'rfc'
  },
  {
    abstract:
      'On networks providing IPv4-IPv6 translation (RFC 7915), hosts and other endpoints need to know the IPv6 prefix(es) used for translation (the NAT64 prefix (RFC 6052)). This document provides guidelines for NAT64 prefix discovery, specifically recommending obtaining the NAT64 prefix from the Router Advertisement option (RFC 8781) when available.',
    adName: 'Mohamed Boucadair',
    area: {
      acronym: 'ops',
      full: 'ops - Operations and Management Area',
      name: 'Operations and Management Area'
    },
    authors: [
      {
        affiliation: 'Energy Sciences Network',
        name: 'Nick Buraglio'
      },
      {
        affiliation: '',
        name: 'Tommy Jensen'
      },
      {
        affiliation: 'Google',
        name: 'Jen Linkova'
      }
    ],
    date: 1759290312,
    filename: 'rfc9872',
    flags: {
      obsoleted: false,
      updated: false
    },
    group: {
      acronym: 'v6ops',
      full: 'v6ops - IPv6 Operations',
      name: 'IPv6 Operations'
    },
    id: 'doc-149813',
    keywords: [],
    pages: 10,
    publicationDate: 1759290312,
    ranking: 9872,
    rfc: '9872',
    rfcNumber: 9872,
    state: ['Published'],
    status: {
      name: 'Informational',
      slug: 'inf'
    },
    stream: {
      name: 'IETF',
      slug: 'ietf'
    },
    subseries: {},
    title:
      'Recommendations for Discovering IPv6 Prefix Used for IPv6 Address Synthesis',
    type: 'rfc'
  },
  {
    abstract:
      'This document specifies new IP Flow Information Export (IPFIX) Information Elements for UDP Options.',
    adName: 'Mahesh Jethanandani',
    area: {
      acronym: 'ops',
      full: 'ops - Operations and Management Area',
      name: 'Operations and Management Area'
    },
    authors: [
      {
        affiliation: 'Orange',
        name: 'Mohamed Boucadair'
      },
      {
        affiliation: 'Nokia',
        name: 'Tirumaleswar Reddy.K'
      }
    ],
    date: 1759879492,
    filename: 'rfc9870',
    flags: {
      obsoleted: false,
      updated: false
    },
    group: {
      acronym: 'opsawg',
      full: 'opsawg - Operations and Management Area Working Group',
      name: 'Operations and Management Area Working Group'
    },
    id: 'doc-149922',
    keywords: [],
    pages: 12,
    publicationDate: 1759879492,
    ranking: 9870,
    rfc: '9870',
    rfcNumber: 9870,
    state: ['Published'],
    status: {
      name: 'Proposed Standard',
      slug: 'ps'
    },
    stream: {
      name: 'IETF',
      slug: 'ietf'
    },
    subseries: {},
    title:
      'Export of UDP Options Information in IP Flow Information Export (IPFIX)',
    type: 'rfc'
  },

  {
    abstract:
      'This document specifies how a UDP Options sender implements Datagram Packetization Layer Path MTU Discovery (DPLPMTUD) as a robust method for Path MTU Discovery (PMTUD). This method uses the UDP Options packetization layer. It allows an application to discover the largest size of datagram that can be sent across a network path. It also provides a way to allow the application to periodically verify the current Maximum Packet Size (MPS) supported by a path and to update this when required.',
    adName: 'Gorry Fairhurst',
    area: {
      acronym: 'wit',
      full: 'wit - Web and Internet Transport',
      name: 'Web and Internet Transport'
    },
    authors: [
      {
        affiliation: 'University of Aberdeen',
        name: 'Gorry Fairhurst'
      },
      {
        affiliation: 'University of Aberdeen',
        name: 'Tom Jones'
      }
    ],
    date: 1759879491,
    filename: 'rfc9869',
    flags: {
      obsoleted: false,
      updated: false
    },
    group: {
      acronym: 'tsvwg',
      full: 'tsvwg - Transport and Services Working Group',
      name: 'Transport and Services Working Group'
    },
    id: 'doc-149921',
    keywords: [],
    pages: 13,
    publicationDate: 1759879491,
    ranking: 9869,
    rfc: '9869',
    rfcNumber: 9869,
    state: ['Published'],
    status: {
      name: 'Proposed Standard',
      slug: 'ps'
    },
    stream: {
      name: 'IETF',
      slug: 'ietf'
    },
    subseries: {},
    title:
      'Datagram Packetization Layer Path MTU Discovery (DPLPMTUD) for UDP Options',
    type: 'rfc'
  },
  {
    abstract:
      'Transport protocols are extended through the use of transport header options. This document updates RFC 768 (UDP) by indicating the location, syntax, and semantics for UDP transport layer options within the surplus area after the end of the UDP user data but before the end of the IP datagram.',
    adName: 'Zaheduzzaman Sarker',
    area: {
      acronym: 'wit',
      full: 'wit - Web and Internet Transport',
      name: 'Web and Internet Transport'
    },
    authors: [
      {
        affiliation: 'Independent Consultant',
        name: 'Dr. Joseph D. Touch'
      },
      {
        affiliation: 'Unaffiliated',
        name: 'C. M. Heard'
      }
    ],
    date: 1759879490,
    filename: 'rfc9868',
    flags: {
      obsoleted: false,
      updated: false
    },
    group: {
      acronym: 'tsvwg',
      full: 'tsvwg - Transport and Services Working Group',
      name: 'Transport and Services Working Group'
    },
    id: 'doc-149920',
    keywords: [],
    pages: 51,
    publicationDate: 1759879490,
    ranking: 9868,
    rfc: '9868',
    rfcNumber: 9868,
    state: ['Published'],
    status: {
      name: 'Proposed Standard',
      slug: 'ps'
    },
    stream: {
      name: 'IETF',
      slug: 'ietf'
    },
    subseries: {},
    title: 'Transport Options for UDP',
    type: 'rfc'
  },
  {
    abstract:
      'By and large, correct operation of a network running the Routing Protocol for Low-Power and Lossy Networks (RPL) requires border routers to be up. In many applications, it is beneficial for the nodes to detect a failure of a border router as soon as possible to trigger fallback actions. This document specifies the Root Node Failure Detector (RNFD), an extension to RPL that expedites detection of border router crashes by having nodes collaboratively monitor the status of a given border router. The extension introduces an additional state at each node, a new type of RPL Control Message Option for synchronizing this state among different nodes, and the coordination algorithm itself.',
    adName: 'John Scudder',
    area: {
      acronym: 'rtg',
      full: 'rtg - Routing Area',
      name: 'Routing Area'
    },
    authors: [
      {
        affiliation: 'University of Warsaw',
        name: 'Konrad Iwanicki'
      }
    ],
    date: 1759880908,
    filename: 'rfc9866',
    flags: {
      obsoleted: false,
      updated: false
    },
    group: {
      acronym: 'roll',
      full: 'roll - Routing Over Low power and Lossy networks',
      name: 'Routing Over Low power and Lossy networks'
    },
    id: 'doc-149923',
    keywords: [],
    pages: 22,
    publicationDate: 1759880908,
    ranking: 9866,
    rfc: '9866',
    rfcNumber: 9866,
    state: ['Published'],
    status: {
      name: 'Proposed Standard',
      slug: 'ps'
    },
    stream: {
      name: 'IETF',
      slug: 'ietf'
    },
    subseries: {},
    title:
      'Root Node Failure Detector (RNFD): Fast Detection of Border Router Crashes in the Routing Protocol for Low-Power and Lossy Networks (RPL)',
    type: 'rfc'
  }
]

test('typeSenseSearchItemToRFC', () => {
  const firstResult = exampleTypesenseResults[0]
  if (firstResult === undefined) {
    throw Error(`Expected firstResult to be present`)
  }
  expect(typeSenseSearchItemToRFCCommon(firstResult)).toEqual({
    abstract:
      'This document specifies an attribute for a statement of possession of a private key by a certificate subject. As part of X.509 certificate enrollment, a Certification Authority (CA) typically demands proof that the subject possesses the private key that corresponds to the to-be-certified public key. In some cases, a CA might accept a signed statement from the certificate subject. For example, when a certificate subject needs separate certificates for signature and key establishment, a statement that can be validated with the previously issued signature certificate for the same subject might be adequate for subsequent issuance of the key establishment certificate.',
    area: {
      acronym: 'sec',
      name: 'Security Area'
    },
    authors: [
      {
        name: 'Russ Housley',
        person: 0
      }
    ],
    formats: [],
    group: {
      acronym: 'lamps',
      name: 'Limited Additional Mechanisms for PKIX and SMIME'
    },
    number: 9883,
    published: '2025-10-13T03:40:45.000Z',
    status: {
      name: 'standards track',
      slug: 'standard'
    },
    stream: {
      name: 'IETF',
      slug: 'IETF'
    },
    subseries: undefined,
    text: '',
    title: 'An Attribute for Statement of Possession of a Private Key'
  } satisfies RfcCommon)
})
