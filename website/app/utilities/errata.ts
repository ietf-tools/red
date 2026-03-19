import type { ErrataItem } from './rfc-validators'

export type ErrataItemForTab = ErrataItem & {
  label: string
  domId?: string
  domTarget?: HTMLElement
}

export const errataItemToErrataItemForTab = (
  errataItem: ErrataItem
): ErrataItemForTab => {
  let domId: ErrataItemForTab['domId'] = undefined
  const { section } = errataItem
  if (section) {
    // the domId is a guess -- it's not guaranteed to exist in the document
    // but there will be a runtime check onMounted() to verify and remove
    // domIds that don't exist.
    domId = section
      .trim()
      // rfc3261 has errataItem.section value of 'In Section 25.1: '
      .replace(/^in section/i, '')
      .replace(/^section/i, '')
      .trim()
      .replace(/:$/, '')
      .trim()
  }

  let label: ErrataItemForTab['label'] = `${errataItem.errata_id}`

  if (domId) {
    label = domId
    // although the normalized section removed any unnecessary 'section'-like prefix
    // there can be values like 'Table 2' (see rfc3261) that we should use as-is.
    // We'll detect these by looking for alphabet chars that remain in the string.
    // The section-specific links won't have these anymore as the string will look
    // like "2" or "3.2.1" and not have alphabet chars.
    if (!domId.match(/[a-z]/i)) {
      label = `Section ${domId}`
      domId = `section-${domId}`
    }
  }

  return {
    ...errataItem,
    domId,
    label
  }
}

export const sortSectionIds = (a: string, b: string): number => {
  const aNums = a
    .replace(/[^0-9.]/gi, '')
    .split('.')
    .map((numStr) => parseFloat(numStr))
  const bNums = b
    .replace(/[^0-9.]/gi, '')
    .split('.')
    .map((numStr) => parseFloat(numStr))

  const numberOfRoundsOfChecks = Math.max(aNums.length, bNums.length)

  for (let i = 0; i < numberOfRoundsOfChecks; i++) {
    const aNum = aNums[i]
    const bNum = bNums[i]

    if (Number.isNaN(aNum) || Number.isNaN(bNum)) {
      return 0
    }
    if (aNum === undefined && bNum !== undefined) {
      return 1
    }
    if (aNum !== undefined && bNum === undefined) {
      return -1
    }
    if (aNum === undefined || bNum === undefined) {
      return 0
    }
    if (aNum < bNum) {
      return -1
    }
    if (aNum > bNum) {
      return 1
    }
    if (aNum === bNum) {
      // because they're equal at this index we should check the next level of the index
      // so we'll do nothing and let the for loop continue
    } else {
      console.error('Internal error sortSectionIds', a, b)
      throw Error("Internal error. This shouldn't happen")
    }
  }

  return 0
}
