// @vitest-environment node
import { describe, test, expect } from 'vitest'
import { formatAuthorsPerStyleGuide } from './authors.ts'
import { testMockAllRfcs } from '../utilities/rfcs-test-data.ts'

test('formatAuthorsPerStyleGuide: no authors', async () => {
  const result = formatAuthorsPerStyleGuide([])
  expect(result).toMatch('')
})

describe('formatAuthorsPerStyleGuide', () => {
  test.each([
    {
      name: 'single author',
      input: testMockAllRfcs.find((rfc) => rfc.number === 1048),
      expected: 'Prindeville, P.'
    },
    {
      name: 'two authors',
      input: testMockAllRfcs.find((rfc) => rfc.number === 9804),
      expected: 'Rivest, R. and D. 3rd' // the code attempts to remove middle names, but that can't be done reliably which results in odd behaviour like this
    },
    {
      name: 'three+ authors',
      input: testMockAllRfcs.find((rfc) => rfc.number === 9003),
      expected: 'Snijders, J., Heitz, J., Scudder, J., and A. Azimov'
    },
    {
      name: 'single author w/ editor',
      forceEditor: true,
      input: testMockAllRfcs.find((rfc) => rfc.number === 1048),
      expected: 'Prindeville, P., Ed.'
    },
    {
      name: 'two authors w/ editor',
      forceEditor: true,
      input: testMockAllRfcs.find((rfc) => rfc.number === 9804),
      expected: 'Rivest, R., Ed. and D. 3rd, Ed.'
    },
    {
      name: 'three+ authors w/ editor',
      forceEditor: true,
      input: testMockAllRfcs.find((rfc) => rfc.number === 9003),
      expected: 'Snijders, J., Ed., Heitz, J., Ed., Scudder, J., Ed., and A. Azimov, Ed.'
    }
  ])('$name', ({ input, forceEditor, expected }) => {
    if (input === undefined) {
      throw Error(`Couldn't find RFC in mock data`)
    }
    const authorsToTest = forceEditor
      ? input.authors.map((author) => ({
          ...author,
          is_editor: true
        }))
      : input.authors

    expect(formatAuthorsPerStyleGuide(authorsToTest)).toMatch(expected)
  })
})
