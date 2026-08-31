import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { RFC_MINI_INDEX_SCHEMA_PATH, renderRfcMiniIndexJsonSchema } from './export-json-schema.ts'

/**
 * The committed schema is what Reef validates against, so it going stale means Reef
 * checks the published index against a shape Red no longer produces. Editing
 * RfcMiniSchema without running `npm run generate:schema` is the way that happens.
 */
test('the committed rfc-mini-index schema matches RfcMiniSchema', () => {
  const committed = readFileSync(RFC_MINI_INDEX_SCHEMA_PATH, 'utf8')
  // Parsed rather than compared as text: what matters is that the committed schema
  // describes the same shape, and a formatter rewriting the file should not fail this.
  expect(JSON.parse(committed)).toEqual(JSON.parse(renderRfcMiniIndexJsonSchema()))
})
