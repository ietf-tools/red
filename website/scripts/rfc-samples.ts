/**
 * Shared RFC selection for the measurement scripts, so they all sample the same documents and a
 * structure that once caused a bug keeps being checked.
 *
 * Flags, in precedence order: `--rfcs=9000,9110`, `--complex` (default), `--from`/`--to`/`--stride`.
 */
import fs from 'node:fs'
import path from 'node:path'

type RfcSamples = {
  eligibleRange: {
    firstXml2Rfc: number
    defaultStride: number
  }
  complexLayouts: { rfc: number; note: string }[]
}

const samplesPath = path.resolve(import.meta.dirname, 'rfc-samples.json')

export const rfcSamples: RfcSamples = JSON.parse(fs.readFileSync(samplesPath, 'utf8'))

export const complexLayoutRfcs = (): number[] => rfcSamples.complexLayouts.map(({ rfc }) => rfc)

export const noteForRfc = (rfc: number): string =>
  rfcSamples.complexLayouts.find((entry) => entry.rfc === rfc)?.note ?? ''

/**
 * Highest RFC number currently published, from the homepage's Latest RFCs.
 *
 * Read rather than inferred: RFC numbers are not contiguous — 10000 is unissued while 10001 and
 * 10005 exist — so searching for the first missing number stops early and understates the range.
 * The homepage links are server-rendered, so this needs no browser.
 */
export const latestPublishedRfc = async (origin = 'https://www.rfc-editor.org'): Promise<number | null> => {
  try {
    const response = await fetch(origin, { redirect: 'follow' })
    const numbers = [...(await response.text()).matchAll(/\/info\/rfc(\d+)/g)].map((match) => Number(match[1]))
    return numbers.length > 0 ? Math.max(...numbers) : null
  } catch {
    return null
  }
}

const numberFlag = (argv: string[], name: string): number | undefined => {
  const raw = argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1]
  if (raw === undefined) {
    return undefined
  }
  const value = Number(raw)
  if (!Number.isFinite(value)) {
    throw Error(`--${name} must be a number, got ${JSON.stringify(raw)}`)
  }
  return value
}

export const rangeRfcs = ({ from, to, stride }: { from: number; to: number; stride: number }): number[] => {
  if (stride < 1) {
    throw Error(`--stride must be at least 1, got ${stride}`)
  }
  const rfcs: number[] = []
  for (let rfc = from; rfc <= to; rfc += stride) {
    rfcs.push(rfc)
  }
  return rfcs
}

/**
 * Resolves the flags to a list of RFC numbers, defaulting to the curated complex-layout set: it is
 * small enough to run often and covers the structures that have actually broken.
 */
export const selectRfcs = async (argv: string[] = process.argv): Promise<{ rfcs: number[]; selection: string }> => {
  const explicit = argv.find((arg) => arg.startsWith('--rfcs='))?.split('=')[1]
  if (explicit) {
    return { rfcs: explicit.split(',').map(Number), selection: `explicit (${explicit})` }
  }

  const from = numberFlag(argv, 'from')
  const to = numberFlag(argv, 'to')
  const stride = numberFlag(argv, 'stride')

  if (from !== undefined || to !== undefined || stride !== undefined) {
    const { firstXml2Rfc, defaultStride } = rfcSamples.eligibleRange
    // The upper bound is read from the homepage rather than stored, so a run can never silently
    // exclude documents published since the last time anyone updated a constant.
    const ceiling = to ?? (await latestPublishedRfc())
    if (ceiling === null) {
      throw Error('Could not read the latest RFC number from the homepage; pass --to explicitly')
    }
    const resolved = {
      from: from ?? firstXml2Rfc,
      to: ceiling,
      stride: stride ?? defaultStride
    }
    return {
      rfcs: rangeRfcs(resolved),
      selection: `range ${resolved.from}-${resolved.to} every ${resolved.stride}`
    }
  }

  const limit = numberFlag(argv, 'limit')
  const complex = complexLayoutRfcs()
  return {
    rfcs: limit === undefined ? complex : complex.slice(0, limit),
    selection: `complex layouts (${complex.length} documents)`
  }
}
