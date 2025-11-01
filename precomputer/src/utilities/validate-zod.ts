import { z } from 'zod'

const Schema = z.literal('')

/**
 * Serializing to JSON and parsing again ('roundTripped') can result in a different object structure
 * with missing keys, see
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#description
 * Eg, an object's key's value of `undefined` would have the object key removed by `JSON.stringify()`,
 * which could affect schema validation.
 * This is done to simulate how Red will parse JSON and validate against the schema.
 */
export const validateDocument = (
  doc: unknown,
  schema: z.ZodObject<any>
): void => {
  const responseRoundTrippedThroughJSON = JSON.parse(JSON.stringify(doc))

  const validationResult = schema
    .strict() // use strict mode.. disallow additional keys
    .safeParse(responseRoundTrippedThroughJSON)

  if (validationResult.error) {
    const errorTitle = `Failed to generate valid document due to validation error:`
    console.log(errorTitle, validationResult.error)
    throw Error(`${errorTitle}. See console for details.`)
  }
}
