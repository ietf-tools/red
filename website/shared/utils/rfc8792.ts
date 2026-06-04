export const RFC8792_COPY_CLASS = 'has-copy-unfolded'
export const RFC8792_COPY_UNFOLDED_ATTR = 'data-rfc8792-copy-unfolded'
export const RFC8792_SOURCECODE_MARKERS_ATTR = 'data-sourcecode-markers'

type FoldingStrategy = 'single' | 'double'

type HeaderMatch = {
  strategy: FoldingStrategy
  index: number
}

const headers: { strategy: FoldingStrategy; text: string }[] = [
  { strategy: 'double', text: "NOTE: '\\\\' line wrapping per RFC 8792" },
  { strategy: 'single', text: "NOTE: '\\' line wrapping per RFC 8792" },
]

const normaliseLineEndings = (text: string): string =>
  text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

const codeBeginsPattern = /^<CODE BEGINS>(?: file "[^"]*")?$/
const codeFileLinePattern = /^ file "[^"]*"$/
const blankLinePattern = /^[ ]*$/

const findHeader = (lines: string[]): HeaderMatch | null => {
  for (const header of headers) {
    const firstLine = lines[0]
    const secondLine = lines[1]
    const thirdLine = lines[2]

    if (firstLine?.includes(header.text)) {
      return { strategy: header.strategy, index: 0 }
    }

    if (
      firstLine?.startsWith('<CODE BEGINS>') &&
      secondLine?.includes(header.text)
    ) {
      return { strategy: header.strategy, index: 1 }
    }

    if (
      firstLine?.startsWith('<CODE BEGINS>') &&
      secondLine?.startsWith(' file "') &&
      thirdLine?.includes(header.text)
    ) {
      return { strategy: header.strategy, index: 2 }
    }
  }

  return null
}

const getBodyLines = (lines: string[], header: HeaderMatch): string[] => {
  const body = lines.slice(header.index + 1)
  const firstBodyLine = body[0]

  if (firstBodyLine !== undefined && /^[ ]*$/.test(firstBodyLine)) {
    body.shift()
  }

  return body
}

const hasFoldedLines = (
  lines: string[],
  strategy: FoldingStrategy
): boolean => {
  for (let i = 0; i < lines.length - 1; i += 1) {
    const line = lines[i]
    const nextLine = lines[i + 1]

    if (!line?.endsWith('\\')) {
      continue
    }

    if (strategy === 'single') {
      return true
    }

    if (nextLine?.trimStart().startsWith('\\')) {
      return true
    }
  }

  return false
}

export const hasXml2RfcSourcecodeMarkers = (text: string): boolean => {
  const lines = normaliseLineEndings(text).split('\n')
  const firstLine = lines[0]
  const lastContentLine = lines.findLast((line) => !blankLinePattern.test(line))

  return Boolean(
    lines.length >= 2 &&
      firstLine !== undefined &&
      codeBeginsPattern.test(firstLine) &&
      lastContentLine === '<CODE ENDS>'
  )
}

export const stripXml2RfcSourcecodeMarkers = (text: string): string => {
  const lines = normaliseLineEndings(text).split('\n')
  const firstLine = lines[0]

  if (firstLine !== undefined && codeBeginsPattern.test(firstLine)) {
    lines.shift()
    const maybeFileLine = lines[0]

    if (
      maybeFileLine !== undefined &&
      codeFileLinePattern.test(maybeFileLine)
    ) {
      lines.shift()
    }
  }

  const codeEndsIndex = lines.findLastIndex((line) => !blankLinePattern.test(line))

  if (lines[codeEndsIndex] === '<CODE ENDS>') {
    lines.splice(codeEndsIndex, 1)
  }

  return lines.join('\n')
}

type Rfc8792CopyTextOptions = {
  stripSourcecodeMarkers?: boolean
}

export const getRfc8792CopyText = (
  text: string,
  options: Rfc8792CopyTextOptions = {}
): string | null => {
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
  const headerLine = lines[header.index]

  if (headerLine?.startsWith('<CODE BEGINS>')) {
    before.push('<CODE BEGINS>')
  }

  const folded = body.join('\n')
  const unwrapped =
    header.strategy === 'double' ?
      folded.replace(/\\\n[ ]*\\/g, '')
    : folded.replace(/\\\n[ ]*/g, '')

  const copyText =
    before.length > 0 ? `${before.join('\n')}\n${unwrapped}` : unwrapped

  return options.stripSourcecodeMarkers ?
      stripXml2RfcSourcecodeMarkers(copyText)
    : copyText
}
