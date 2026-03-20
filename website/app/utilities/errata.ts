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

/**
 * Sorts errataItemForTab using DOM apis (this shouldn't run on the server)
 */
export const sortErrataItemForTab = (
  a: ErrataItemForTab,
  b: ErrataItemForTab
): number => {
  // Errata items refer to RFC content so the list should be sorted to match
  // the order of the RFC itself where possible.
  //
  // Sometimes this is not possible because the `section` is undefined.
  // Otherwise the `section` is a string with no formal constraints.
  //
  // The `domId` is derived from the `section` so further examples will use
  // the normalized `domId`. `domId` can have these kinds of values:
  //
  //   * `undefined`
  //   * "1" (referring to section 1)
  //   * "1.2.3" (referring to section 1.2.3)
  //   * "Table 2" (referring to Table 2)
  //
  // Although the section examples can compare "1" to "1.2.3" by extracting the
  // numbers in the string, this doesn't work for "Table 2" which could appear
  // anywhere in the RFC.
  //
  // Because of this our sorting strategy is to look for DOM elements and sort
  // by DOM position, and then fallback to extracting numbers in the string.
  //
  // If the domId is undefined it's sorted to the end.

  if (a.domId && b.domId) {
    if (!a.domTarget || !b.domTarget) {
      throw Error(
        '[sortErrataItemForTab] internal error, any domId should have an associated domTarget by now'
      )
    }
    // Because this JS runs in the browser we have visibility of the RFC in the DOM
    // so attempt to order by the DOM order so that (eg) Section 1 can be followed
    // by Table 1 and then Section 2
    if (
      // Although TS insists that compareDocumentPosition always exists
      // older browsers won't support it so we'll check first
      // maybe this can be removed in the future but it seems harmless
      a.domTarget.compareDocumentPosition
    ) {
      const order = a.domTarget.compareDocumentPosition(b.domTarget)
      console.log(' - Sorting by DOM returned ', order)
      if (
        order === Node.DOCUMENT_POSITION_PRECEDING ||
        order === Node.DOCUMENT_POSITION_CONTAINS
      ) {
        return 1
      } else if (
        order === Node.DOCUMENT_POSITION_FOLLOWING ||
        order === Node.DOCUMENT_POSITION_CONTAINED_BY
      ) {
        return -1
      } else if (order === 0) {
        return 0
      }
    }

    if (a.domId.startsWith('section') && b.domId.startsWith('section')) {
      const domIdSort = sortSectionIds(a.domId, b.domId)
      console.log('Sorting by domId', domIdSort)
    }

    if (a.domId.startsWith('section')) {
      return -1
    }

    if (b.domId.startsWith('section')) {
      return 1
    }
  }

  if (a.domId && !b.domId) {
    return -1
  }

  if (!a.domId && b.domId) {
    return 1
  }

  return 0
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

    if (!Number.isNaN(aNum) && Number.isNaN(bNum)) {
      return -1
    }
    if (Number.isNaN(aNum) && !Number.isNaN(bNum)) {
      return 1
    }
    if (Number.isNaN(aNum) && Number.isNaN(bNum)) {
      return 0
    }

    if (aNum === undefined && bNum !== undefined) {
      return -1
    }
    if (aNum !== undefined && bNum === undefined) {
      return 1
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
