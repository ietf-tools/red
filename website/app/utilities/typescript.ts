// `string & {}` keeps the literal members from collapsing into `string`, so editors still suggest
// KnownValues while any string is accepted.
export type HintedString<KnownValues extends string> = (string & {}) | KnownValues

export const assertNever = (value: never) => {
  throw new Error('Unexpected value: ' + value)
}

export function assert(condition: unknown, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg ?? 'Assertion failed')
  }
}

export function assertIsString(val: unknown): asserts val is string {
  if (typeof val !== 'string') {
    throw new Error(`Not a string typeof=${typeof val} "${val}"`)
  }
}

export function assertIsNumber(val: unknown): asserts val is number {
  if (typeof val !== 'number') {
    throw new Error(`Not a number typeof=${typeof val} "${val}"`)
  }
  if (Number.isNaN(val)) {
    throw new Error(`Was a NaN typeof=${typeof val} "${val}"`)
  }
}

export function assertIsDefined<T>(val: T): asserts val is NonNullable<T> {
  if (val === undefined || val === null) {
    throw new Error('Expected "val" to be defined, but received undefined or null')
  }
}
