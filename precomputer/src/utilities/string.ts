import { uniq } from 'es-toolkit'
import { assertIsString } from './typescript.ts'

export const LINEBREAK = '\n'

const COLONSLASHSLASH = '://'

/** Length excluding a trailing separator, which is a break opportunity rather than part of the run. */
const unbreakableLength = (chunk: string): number => chunk.replace(/[-_]+$/, '').length

const HAS_LETTER = /[A-Za-z]/
const HYPHENS = /^-+$/
const SLASHES = /^\/+$/

/**
 * Splits a string at every point it is reasonable to break, and additionally every
 * `maxChunkLength` characters within a run that offers no break of its own.
 *
 * `minChunkLength` suppresses breaks that would strand a fragment shorter than it — see
 * `mergeShortChunks`.
 **/
export const chunkString = (str: string, maxChunkLength: number, minChunkLength: number): string[] => {
  const chunks = []
  let out = str
  const protocolIndex = out.indexOf(COLONSLASHSLASH)
  if (protocolIndex !== -1) {
    chunks.push(out.substring(0, protocolIndex + COLONSLASHSLASH.length))
    out = out.substring(protocolIndex + COLONSLASHSLASH.length)
  }
  // A wrapped line may not begin with a separator (ietf-tools/red#424), so hyphens end their
  // chunk. A slash joining two ordinary words — `and/or`, `request/response` — is not a break
  // point at all, while a slash inside a machine string is; only the surrounding text tells them
  // apart.
  const separatorRuns = Array.from(out.matchAll(/[@\\\/:&\-=\(\)\.\?%]+/g))
  const slashesJoinWords = out.split('/').length > 1 && out.split('/').every(isWordlike)

  const breakBeforeIndexes: number[] = []
  const breakAfterIndexes: number[] = []
  separatorRuns.forEach((run) => {
    const separator = run[0]
    if (HYPHENS.test(separator)) {
      breakAfterIndexes.push(run.index + separator.length)
      return
    }
    if (SLASHES.test(separator) && slashesJoinWords) {
      return
    }
    breakBeforeIndexes.push(run.index)
  })

  breakAfterIndexes.push(...Array.from(out.matchAll(/_+/g)).map((match) => match.index + match[0].length))
  const camelCaseIndexes = getAllIndexes(out, /[a-z][A-Z]/g).map((index) => index + 1)
  // A break at the end would emit a trailing empty chunk.
  const breakIndexes = uniq([...breakBeforeIndexes, ...breakAfterIndexes, ...camelCaseIndexes]).filter(
    (index) => index > 0 && index < out.length
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
  const sized = chunks.flatMap((chunk) => {
    if (unbreakableLength(chunk) > maxChunkLength && !isWordlike(chunk)) {
      return chunkStringAtLengths(chunk, maxChunkLength)
    }
    return chunk
  })

  return mergeShortChunks(sized, minChunkLength)
}

/**
 * Folds any chunk shorter than `minChunkLength` into its neighbour, so no line is left holding a
 * lone `.` or a single letter. Merges backwards only: the text is unchanged and only the number of
 * break opportunities falls.
 */
export const mergeShortChunks = (chunks: string[], minChunkLength: number): string[] =>
  chunks.reduce<string[]>((merged, chunk) => {
    const previous = merged[merged.length - 1]
    // An underscore is an explicit boundary, so a short segment after one is part of a name
    // rather than a stranded fragment. It must carry a letter: RFC 9000 has table cells of a bare
    // `___1`, where the underscores are a footnote marker.
    const namedSegment = HAS_LETTER.test(chunk) && (previous ?? '').endsWith('_')
    const stranded = chunk.length < minChunkLength && !namedSegment
    if (previous !== undefined && (stranded || previous.length < minChunkLength)) {
      merged[merged.length - 1] = `${previous}${chunk}`
      return merged
    }
    merged.push(chunk)
    return merged
  }, [])

/** Longer than any word readers would expect to see whole; beyond this it is machine data. */
const LONGEST_PLAUSIBLE_WORD = 20

/** Whether a run reads as a word, and so must never be subdivided at a fixed length. */
const isWordlike = (str: string): boolean => {
  // Attached punctuation and separators come off either side, since which side a separator lands
  // on is a placement decision. Digits never do: that is what keeps `10.7551/mitpress` and
  // `draft-ietf-quic-manageability-11` out. Nor does a trailing underscore, so `connection_id`
  // keeps offering a break at it.
  const core = str.replace(/^["'“”‘’([<\-/.:@_]+/, '').replace(/["'“”‘’)\]>,.;:!?¶\-\/]+$/, '')

  // One internal separator is a prose compound (`client-initiated`, `and/or`); three make an
  // identifier (`Most-Significant-Bit-Oracles`).
  return core.length > 0 && core.length <= LONGEST_PLAUSIBLE_WORD && /^[A-Za-z]+(['\-\/][A-Za-z]+)?$/.test(core)
}

/**
 * Splits a run into pieces of at most `size`, distributed evenly so no piece is left holding only
 * the remainder: a 17-character run at size 16 gives 9 + 8 rather than 16 + 1.
 */
export const chunkStringAtLengths = (str: string, size: number): string[] => {
  const numChunks = Math.ceil(str.length / size)
  const evenSize = Math.ceil(str.length / numChunks)
  const chunks: string[] = Array.from({ length: numChunks })
  for (let i = 0, o = 0; i < numChunks; ++i, o += evenSize) {
    chunks[i] = str.substring(o, o + evenSize)
  }
  chunks.forEach((chunk) => assertIsString(chunk))
  return chunks.filter((chunk) => chunk.length > 0)
}

export const escapeRegExp = (s: string): string =>
  'escape' in RegExp && typeof RegExp.escape === 'function'
    ? RegExp.escape(s)
    : s.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')

export const getAllIndexes = (str: string, pattern: RegExp): number[] => {
  const matches = Array.from(str.matchAll(pattern))
  return matches.map((match) => match.index)
}
