export const assertNever = (value: never) => {
  throw new Error('Unexpected value: ' + value)
}

export function assertIsString(val: unknown, errorMessage: string): asserts val is string {
  if (typeof val !== 'string') {
    throw new Error(`Not a string typeof=${typeof val}. ${errorMessage}`)
  }
}

export function assertIsDefined<T>(val: T): asserts val is NonNullable<T> {
  if (val === undefined || val === null) {
    throw new Error(
      'Expected "val" to be defined, but received undefined or null'
    )
  }
}
