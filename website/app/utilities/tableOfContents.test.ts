// @vitest-environment nuxt
import { describe, test, expect } from 'vitest'
import { mergeAdjacentLinks } from './tableOfContents'
import type { TableOfContents } from './rfc-validators'

describe('mergeAdjacentLinks', () => {
  test('merges multiple links in a section into a single link using the first id', () => {
    const toc: TableOfContents = {
      title: 'RFC 9999',
      sections: [
        {
          links: [
            { id: 'section-1', title: '1.' },
            { id: 'section-1-title', title: 'Introduction' }
          ]
        }
      ]
    }

    expect(mergeAdjacentLinks(toc)).toEqual({
      title: 'RFC 9999',
      sections: [
        {
          links: [{ id: 'section-1', title: '1. Introduction' }]
        }
      ]
    })
  })

  test('joins more than two links in order, keeping the first id', () => {
    const toc: TableOfContents = {
      title: 'RFC 9999',
      sections: [
        {
          links: [
            { id: 'a', title: '2.' },
            { id: 'b', title: 'Terminology' },
            { id: 'c', title: 'and Conventions' }
          ]
        }
      ]
    }

    expect(mergeAdjacentLinks(toc)).toEqual({
      title: 'RFC 9999',
      sections: [
        {
          links: [{ id: 'a', title: '2. Terminology and Conventions' }]
        }
      ]
    })
  })

  test('leaves a single link unchanged', () => {
    const toc: TableOfContents = {
      title: 'RFC 9999',
      sections: [{ links: [{ id: 'only', title: '1. Introduction' }] }]
    }

    expect(mergeAdjacentLinks(toc)).toEqual({
      title: 'RFC 9999',
      sections: [{ links: [{ id: 'only', title: '1. Introduction' }] }]
    })
  })

  test('preserves an empty links array', () => {
    const toc: TableOfContents = {
      title: 'RFC 9999',
      sections: [{ links: [] }]
    }

    expect(mergeAdjacentLinks(toc)).toEqual({
      title: 'RFC 9999',
      sections: [{ links: [] }]
    })
  })

  test('leaves sections without links as undefined', () => {
    const toc: TableOfContents = {
      title: 'RFC 9999',
      sections: [{}]
    }

    expect(mergeAdjacentLinks(toc)).toEqual({
      title: 'RFC 9999',
      sections: [{ links: undefined }]
    })
  })

  test('processes each section independently', () => {
    const toc: TableOfContents = {
      title: 'RFC 9999',
      sections: [
        {
          links: [
            { id: 'one', title: '1.' },
            { id: 'one-title', title: 'First' }
          ]
        },
        {
          links: [
            { id: 'two', title: '2.' },
            { id: 'two-title', title: 'Second' }
          ]
        }
      ]
    }

    expect(mergeAdjacentLinks(toc)).toEqual({
      title: 'RFC 9999',
      sections: [{ links: [{ id: 'one', title: '1. First' }] }, { links: [{ id: 'two', title: '2. Second' }] }]
    })
  })

  test('does not mutate the input table of contents', () => {
    const toc: TableOfContents = {
      title: 'RFC 9999',
      sections: [
        {
          links: [
            { id: 'a', title: '1.' },
            { id: 'b', title: 'Intro' }
          ]
        }
      ]
    }

    mergeAdjacentLinks(toc)

    expect(toc.sections[0]?.links).toEqual([
      { id: 'a', title: '1.' },
      { id: 'b', title: 'Intro' }
    ])
  })
})
