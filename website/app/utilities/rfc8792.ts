/**
 * Code contributed by Filip Skokan (Panva https://github.com/panva )
 * https://github.com/ietf-tools/red/pull/404
 */

import { escapeRegExp } from 'es-toolkit'

type FoldingStrategy = 'single' | 'double'

type HeaderMatch = {
  strategy: FoldingStrategy
  index: number
}

const headers: { strategy: FoldingStrategy; text: string }[] = [
  { strategy: 'double', text: "NOTE: '\\\\' line wrapping per RFC 8792" },
  { strategy: 'single', text: "NOTE: '\\' line wrapping per RFC 8792" }
]

const CODE_BEGINS = '<CODE BEGINS>'
const CODE_ENDS = '<CODE ENDS>'
const FOLD_MARKER = '\\'
const FILE_ATTR_PREFIX = ' file "'

/** Normalises CRLF and bare CR to LF so all line-splitting operates on `\n`. */
const normaliseLineEndings = (text: string): string => text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

const blankLinePattern = /^[ ]*$/

/**
 * Patterns that depend on `escapeRegExp` are built lazily and memoised rather than at
 * module-evaluation time. Calling the imported `escapeRegExp` during module init makes
 * the module order-sensitive and can throw `Cannot access 'escapeRegExp' before
 * initialization` (a TDZ error) when imports are evaluated in a circular order.
 */
const buildPatterns = () => ({
  codeBegins: new RegExp(`^${escapeRegExp(CODE_BEGINS)}(?:${escapeRegExp(FILE_ATTR_PREFIX)}[^"]*")?$`),
  codeFileLine: new RegExp(`^${escapeRegExp(FILE_ATTR_PREFIX)}[^"]*"$`),
  foldedContinuation: new RegExp(`^[ ]*${escapeRegExp(FOLD_MARKER)}`),
  doubleUnfold: new RegExp(`${escapeRegExp(FOLD_MARKER)}\n[ ]*${escapeRegExp(FOLD_MARKER)}`, 'g'),
  singleUnfold: new RegExp(`${escapeRegExp(FOLD_MARKER)}\n[ ]*`, 'g')
})

let cachedPatterns: ReturnType<typeof buildPatterns> | null = null
const patterns = (): ReturnType<typeof buildPatterns> => (cachedPatterns ??= buildPatterns())

/**
 * Locates the RFC 8792 folding-strategy header comment within the first three lines.
 * The header may appear alone on line 0, or after a `<CODE BEGINS>` line (with an
 * optional ` file "…"` line between them), matching the placement rules in RFC 8792 §5.
 * Returns the strategy and the zero-based index of the header line, or null if absent.
 */
const findHeader = (lines: string[]): HeaderMatch | null => {
  const { codeBegins, codeFileLine } = patterns()

  for (const header of headers) {
    const firstLine = lines[0]
    const secondLine = lines[1]
    const thirdLine = lines[2]

    if (firstLine?.includes(header.text)) {
      return { strategy: header.strategy, index: 0 }
    }

    if (firstLine !== undefined && codeBegins.test(firstLine) && secondLine?.includes(header.text)) {
      return { strategy: header.strategy, index: 1 }
    }

    if (
      firstLine !== undefined &&
      codeBegins.test(firstLine) &&
      secondLine !== undefined &&
      codeFileLine.test(secondLine) &&
      thirdLine?.includes(header.text)
    ) {
      return { strategy: header.strategy, index: 2 }
    }
  }

  return null
}

/**
 * Returns the content lines that follow the header, stripping the single blank
 * separator line that RFC 8792 §5 places between the header comment and the code.
 */
const getBodyLines = (lines: string[], header: HeaderMatch): string[] => {
  const body = lines.slice(header.index + 1)
  const firstBodyLine = body[0]

  if (firstBodyLine !== undefined && blankLinePattern.test(firstBodyLine)) {
    body.shift()
  }

  return body
}

/**
 * Returns true if any line in `lines` uses the RFC 8792 folding marker for the given strategy.
 * Single strategy: any line ending with `\` is a fold point.
 * Double strategy: a line ending with `\` is only a fold point when the next line
 * also starts with `\` (after zero or more ASCII space characters — tabs are not leading whitespace per RFC 8792).
 */
const hasFoldedLines = (lines: string[], strategy: FoldingStrategy): boolean => {
  for (let i = 0; i < lines.length - 1; i += 1) {
    const line = lines[i]
    const nextLine = lines[i + 1]

    if (!line?.endsWith(FOLD_MARKER)) {
      continue
    }

    if (strategy === 'single') {
      return true
    }

    if (nextLine !== undefined && patterns().foldedContinuation.test(nextLine)) {
      return true
    }
  }

  return false
}

/**
 * Returns true if `text` is wrapped in xml2rfc `<CODE BEGINS>`/`<CODE ENDS>` markers,
 * indicating the block originated from an RFC sourcecode element.
 * The `<CODE BEGINS>` line may optionally carry a ` file "…"` attribute.
 */
export const hasXml2RfcSourcecodeMarkers = (text: string): boolean => {
  const lines = normaliseLineEndings(text).split('\n')
  const firstLine = lines[0]
  const lastContentLine = lines.findLast((line) => !blankLinePattern.test(line))

  return Boolean(
    lines.length >= 2 &&
    firstLine !== undefined &&
    patterns().codeBegins.test(firstLine) &&
    lastContentLine === CODE_ENDS
  )
}

/**
 * Removes `<CODE BEGINS>` (and optional ` file "…"` line) from the top and
 * `<CODE ENDS>` from the bottom of `text`, leaving only the enclosed code.
 */
export const stripXml2RfcSourcecodeMarkers = (text: string): string => {
  const { codeBegins, codeFileLine } = patterns()
  const lines = normaliseLineEndings(text).split('\n')
  const firstLine = lines[0]

  if (firstLine !== undefined && codeBegins.test(firstLine)) {
    lines.shift()
    const maybeFileLine = lines[0]

    if (maybeFileLine !== undefined && codeFileLine.test(maybeFileLine)) {
      lines.shift()
    }
  }

  const codeEndsIndex = lines.findLastIndex((line) => !blankLinePattern.test(line))

  if (lines[codeEndsIndex] === CODE_ENDS) {
    lines.splice(codeEndsIndex, 1)
  }

  return lines.join('\n')
}

type Rfc8792CopyTextOptions = {
  stripSourcecodeMarkers?: boolean
}

/**
 * Given a text block that may contain RFC 8792 line-folded content, returns the
 * unfolded text suitable for copying to a clipboard, or null if the block contains
 * no RFC 8792 header or no actual fold markers.
 *
 * Unfolding rules by strategy:
 * - `single`: removes the trailing `\` and the leading whitespace of the continuation line.
 * - `double`: removes the trailing `\`, the leading `\` of the continuation line, and
 *   any whitespace between them.
 *
 * If `options.stripSourcecodeMarkers` is true, `<CODE BEGINS>`/`<CODE ENDS>` wrappers
 * are removed from the result before returning.
 */
export const getRfc8792CopyText = (text: string, options: Rfc8792CopyTextOptions = {}): string | null => {
  const lines = normaliseLineEndings(text).split('\n')
  const header = findHeader(lines)

  if (!header) {
    return null
  }

  const body = getBodyLines(lines, header)

  if (!hasFoldedLines(body, header.strategy)) {
    return null
  }

  const before = lines.slice(0, header.index)

  const { doubleUnfold, singleUnfold } = patterns()
  const folded = body.join('\n')
  const unwrapped = header.strategy === 'double' ? folded.replace(doubleUnfold, '') : folded.replace(singleUnfold, '')

  const copyText = before.length > 0 ? `${before.join('\n')}\n${unwrapped}` : unwrapped

  return options.stripSourcecodeMarkers ? stripXml2RfcSourcecodeMarkers(copyText) : copyText
}
