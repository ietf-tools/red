import { uniq } from 'es-toolkit'
import { assertIsString } from './typescript.ts'

export const LINEBREAK = '\n'

const COLONSLASHSLASH = '://'

/**
 * Will split string as often as possible (at certain chars)
 * while also splitting at a maxChunkLength
 **/
export const chunkString = (str: string, maxChunkLength: number): string[] => {
  const chunks = []
  let out = str
  const protocolIndex = out.indexOf(COLONSLASHSLASH)
  if (protocolIndex !== -1) {
    chunks.push(out.substring(0, protocolIndex + COLONSLASHSLASH.length))
    out = out.substring(protocolIndex + COLONSLASHSLASH.length)
  }
  // Separators we break *before*, so the separator starts the next chunk
  // (URL-style, e.g. `.com`, `/path`). Note `_` is handled separately below.
  const breakBeforeIndexes = getAllIndexes(
    out,
    // match any char that we can insert a word break at
    /[@\\\/:&\-=\(\)\.\?%]+/g
  )
  // Underscores: break *after* the underscore run so a wrapped line never
  // starts with `_` (see ietf-tools/red#424 — people don't expect a break
  // there, and a leading underscore reads as unnatural). The break point is
  // the index immediately past the run.
  const breakAfterUnderscoreIndexes = Array.from(out.matchAll(/_+/g)).map((match) => match.index + match[0].length)
  const camelCaseIndexes = getAllIndexes(
    out,
    // match camelCase
    /[a-z][A-Z]/g
  ).map(
    // adjust index to be middle of camelCase
    (index) => index + 1
  )
  const breakIndexes = uniq([...breakBeforeIndexes, ...breakAfterUnderscoreIndexes, ...camelCaseIndexes]).filter(
    // don't split on 0
    (index) => index !== 0
  )
  breakIndexes.sort((a, b) => a - b)

  chunks.push(
    ...breakIndexes.map((strIndex, arrIndex) => {
      if (arrIndex === 0) {
        return out.substring(0, strIndex)
      }
      return out.substring(breakIndexes[arrIndex - 1], strIndex)
    })
  )
  if (breakIndexes.length > 0) {
    const lastIndex = breakIndexes[breakIndexes.length - 1]
    chunks.push(out.substring(lastIndex))
  } else {
    chunks.push(out)
  }
  return chunks.flatMap((chunk) => {
    if (chunk.length > maxChunkLength) {
      return chunkStringAtLengths(chunk, maxChunkLength)
    }
    return chunk
  })
}

export const chunkStringAtLengths = (str: string, size: number): string[] => {
  const numChunks = Math.ceil(str.length / size)
  const chunks: string[] = Array.from({ length: numChunks })
  for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = str.substring(o, o + size)
  }
  chunks.forEach((chunk) => assertIsString(chunk))
  return chunks
}

export const escapeRegExp = (s: string): string =>
  'escape' in RegExp && typeof RegExp.escape === 'function'
    ? RegExp.escape(s)
    : s.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')

export const getAllIndexes = (str: string, pattern: RegExp): number[] => {
  const matches = Array.from(str.matchAll(pattern))
  return matches.map((match) => match.index)
}
