import { RfcBucketHtmlDocumentSchema } from '../../../client/app/utilities/rfc-validators.ts'
import type { RfcBucketHtmlDocument } from '../../../client/app/utilities/rfc-validators.ts'

/**
 * Serializing to JSON and parsing again ('roundTripped') can result in a different object structure
 * with missing keys, see
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#description
 * Eg, an object's key's value of `undefined` would have the object key removed by `JSON.stringify()`,
 * which could affect schema validation.
 * This is done to simulate how Red will parse JSON and validate against the schema.
 */
export const validateRfcBucketHtmlDocument = (
  doc: RfcBucketHtmlDocument
): void => {
  const responseRoundTrippedThroughJSON = JSON.parse(JSON.stringify(doc))

  const validationResult = RfcBucketHtmlDocumentSchema.safeParse(
    responseRoundTrippedThroughJSON
  )

  if (validationResult.error) {
    const errorTitle = `Failed to generate valid RfcBucketHtmlDocument due to validation error:`
    console.log(errorTitle, validationResult.error)
    throw Error(`${errorTitle}. See console for details.`)
  }
}
