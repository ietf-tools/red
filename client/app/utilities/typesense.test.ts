// @vitest-environment nuxt
import { test, expect } from 'vitest'
import type { TypeSenseSearchItem } from './typesense'
import type { RfcCommon } from './rfc'
import { typeSenseSearchItemToRFCCommon } from './rfc-converters'

const exampleTypesenseResult = {
  results: [
    {
      facet_counts: [
        {
          counts: [
            {
              count: 1,
              highlighted: 'iesg - Internet Engineering Steering Group',
              value: 'iesg - Internet Engineering Steering Group'
            }
          ],
          field_name: 'area.full',
          sampled: false,
          stats: {
            total_values: 1
          }
        },
        {
          counts: [
            {
              count: 1,
              highlighted: 'Alexis Tamas',
              value: 'Alexis Tamas'
            },
            {
              count: 1,
              highlighted: 'Benjamin Phister',
              value: 'Benjamin Phister'
            },
            {
              count: 1,
              highlighted: 'Jean-Emmanuel Rodriguez',
              value: 'Jean-Emmanuel Rodriguez'
            }
          ],
          field_name: 'authors.name',
          sampled: false,
          stats: {
            total_values: 3
          }
        },
        {
          counts: [
            {
              count: 1,
              highlighted: 'art - Applications and Real-Time Area',
              value: 'art - Applications and Real-Time Area'
            }
          ],
          field_name: 'group.full',
          sampled: false,
          stats: {
            total_values: 1
          }
        },
        {
          counts: [
            {
              count: 1,
              highlighted: '1558461935',
              value: '1558461935'
            }
          ],
          field_name: 'publicationDate',
          sampled: false,
          stats: {
            avg: 1558461935.0,
            max: 1558461935.0,
            min: 1558461935.0,
            sum: 1558461935.0,
            total_values: 1
          }
        },
        {
          counts: [
            {
              count: 1,
              highlighted: 'Informational',
              value: 'Informational'
            }
          ],
          field_name: 'status.name',
          sampled: false,
          stats: {
            total_values: 1
          }
        },
        {
          counts: [
            {
              count: 1,
              highlighted: 'IETF',
              value: 'IETF'
            }
          ],
          field_name: 'stream',
          sampled: false,
          stats: {
            total_values: 1
          }
        }
      ],
      found: 1,
      hits: [
        {
          document: {
            abstract:
              "This document describes the 'leaptofrogans' Uniform Resource Identifier (URI) scheme, which enables applications to launch Frogans Player on a given Frogans site. Frogans is a medium for publishing content and services on the Internet, defined as a generic software layer on the Internet. Frogans Player is software that enables end users to browse Frogans sites.",
            adName: 'Alexey Melnikov',
            area: {
              acronym: 'iesg',
              full: 'iesg - Internet Engineering Steering Group',
              name: 'Internet Engineering Steering Group'
            },
            authors: [
              {
                affiliation: 'OP3FT',
                name: 'Alexis Tamas'
              },
              {
                affiliation: 'OP3FT',
                name: 'Benjamin Phister'
              },
              {
                affiliation: 'OP3FT',
                name: 'Jean-Emmanuel Rodriguez'
              }
            ],
            date: 1558461935,
            filename: 'rfc8589',
            group: {
              acronym: 'art',
              full: 'art - Applications and Real-Time Area',
              name: 'Applications and Real-Time Area'
            },
            id: 'doc-130400',
            keywords: [],
            pages: 9,
            publicationDate: 1558461935,
            ranking: 8589,
            rfc: '8589',
            rfcNumber: 8589,
            state: ['Published'],
            subseries: {
              bcp: '5',
              total: 10
            },
            status: {
              name: 'Best Current Practice', // this isn't a BCP, this is just test data
              slug: 'bcp'
            },
            stream: {
              slug: 'ietf',
              name: 'IETF'
            },
            title: "The 'leaptofrogans' URI Scheme",
            type: 'rfc'
          } satisfies TypeSenseSearchItem,
          highlight: {
            abstract: {
              matched_tokens: ['Frog'],
              snippet:
                'enables applications to launch <mark>Frog</mark>ans Player on a given'
            }
          },
          highlights: [
            {
              field: 'abstract',
              matched_tokens: ['Frog'],
              snippet:
                'enables applications to launch <mark>Frog</mark>ans Player on a given'
            }
          ],
          text_match: 578730089005449321,
          text_match_info: {
            best_field_score: '1108074561536',
            best_field_weight: 13,
            fields_matched: 1,
            num_tokens_dropped: 0,
            score: '578730089005449321',
            tokens_matched: 1,
            typo_prefix_score: 1
          }
        }
      ],
      out_of: 9586,
      page: 1,
      request_params: {
        collection_name: 'docs',
        first_q: 'frog',
        per_page: 10,
        q: 'frog'
      },
      search_cutoff: false,
      search_time_ms: 1
    },
    {
      facet_counts: [
        {
          counts: [
            {
              count: 1,
              highlighted: '1558461935',
              value: '1558461935'
            }
          ],
          field_name: 'publicationDate',
          sampled: false,
          stats: {
            avg: 1558461935.0,
            max: 1558461935.0,
            min: 1558461935.0,
            sum: 1558461935.0,
            total_values: 1
          }
        }
      ],
      found: 1,
      hits: [],
      out_of: 9586,
      page: 1,
      request_params: {
        collection_name: 'docs',
        first_q: 'frog',
        per_page: 0,
        q: 'frog'
      },
      search_cutoff: false,
      search_time_ms: 0
    }
  ]
} as const

test('typeSenseSearchItemToRFC', () => {
  expect(
    typeSenseSearchItemToRFCCommon(
      exampleTypesenseResult.results[0].hits[0].document
    )
  ).toEqual({
    number: 8589,
    abstract:
      "This document describes the 'leaptofrogans' Uniform Resource Identifier (URI) scheme, which enables applications to launch Frogans Player on a given Frogans site. Frogans is a medium for publishing content and services on the Internet, defined as a generic software layer on the Internet. Frogans Player is software that enables end users to browse Frogans sites.",
    area: {
      acronym: 'iesg',
      name: 'Internet Engineering Steering Group'
    },
    authors: [
      {
        name: 'Alexis Tamas',
        person: 0
      },
      {
        name: 'Benjamin Phister',
        person: 1
      },
      {
        name: 'Jean-Emmanuel Rodriguez',
        person: 2
      }
    ],
    formats: [],
    group: {
      acronym: 'art',
      name: 'Applications and Real-Time Area'
    },
    published: '2019-05-21T18:05:35.000Z',
    status: 'Best Current Practice',
    subseries: {
      type: 'bcp',
      number: 5,
      subseriesLength: 10
    },
    stream: {
      name: 'IETF',
      slug: 'ietf'
    },
    text: '',
    title: "The 'leaptofrogans' URI Scheme"
  } satisfies RfcCommon)
})
