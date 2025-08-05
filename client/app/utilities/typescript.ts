// See https://stackoverflow.com/questions/61047551/typescript-union-of-string-and-string-literals
export type HintedString<KnownValues extends string> =
  | (string & {})
  | KnownValues

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
