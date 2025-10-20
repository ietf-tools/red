import { uniq } from 'lodash-es'

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
  const nonWordChars = getAllIndexes(
    out,
    // match any char that we can insert a word break at
    /[@\\\/:&_\-=\(\)\.\?%]+/g
  )
  const camelCaseIndexes = getAllIndexes(
    out,
    // match camelCase
    /[a-z][A-Z]/g
  ).map(
    // adjust index to be middle of camelCase
    (index) => index + 1
  )
  const breakIndexes = uniq([...nonWordChars, ...camelCaseIndexes]).filter(
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

export const chunkStringAtLengths = (str: string, size: number) => {
  const numChunks = Math.ceil(str.length / size)
  const chunks = new Array(numChunks)
  for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = str.substr(o, size)
  }
  return chunks
}

export const getAllIndexes = (str: string, pattern: RegExp): number[] => {
  const matches = Array.from(str.matchAll(pattern))
  return matches.map((match) => match.index)
}
