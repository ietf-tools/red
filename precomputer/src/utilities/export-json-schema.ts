/**
 * Writes the published shape of `rfc-mini-index.json` out as a JSON Schema.
 *
 * Reef reads the published index to resolve RFC identifiers to titles, and is Python,
 * so it cannot share this repository's Zod definitions. JSON Schema is the interchange:
 * a standard both sides already have a library for, and one whose open-world default
 * gives exactly the asymmetry the two projects agreed on, since an added property
 * validates fine while a removed required one does not.
 *
 * The output is committed here and copied into Reef by hand, rather than uploaded to
 * the bucket, so that a change to the shape lands in a Reef pull request where somebody
 * reads it. The cost is that the copy in Reef can lag this one; the test beside this
 * file catches the other half of that, where this file lags RfcMiniSchema.
 *
 * Run: npm run generate:schema
 */
import { writeFileSync } from 'node:fs'
import { z } from 'zod'
import { RfcMiniIndexSchema } from '../../../website/app/utilities/rfc-validators.ts'

export const RFC_MINI_INDEX_SCHEMA_PATH = new URL('../../generated/rfc-mini-index.schema.json', import.meta.url)

/**
 * `io: 'input'` rather than the default `'output'`, and the difference matters. A Zod
 * object strips unknown keys, which `'output'` expresses as
 * `additionalProperties: false` — so an exported schema would reject the very additive
 * changes Red has promised Reef it may make, and adding a field here would break Reef
 * rather than pass unnoticed. `'input'` describes what the schema accepts instead, so
 * required fields stay required, types stay checked, and new keys are allowed through.
 */
export const renderRfcMiniIndexJsonSchema = (): string =>
  `${JSON.stringify(z.toJSONSchema(RfcMiniIndexSchema, { target: 'draft-2020-12', io: 'input' }), null, 2)}\n`

// Only write when run as a script, so that the test can import the renderer above
// without overwriting the committed file as a side effect.
if (import.meta.filename === process.argv[1]) {
  writeFileSync(RFC_MINI_INDEX_SCHEMA_PATH, renderRfcMiniIndexJsonSchema())
  console.log(`Wrote ${RFC_MINI_INDEX_SCHEMA_PATH.pathname}`)
}
