import { NuxtLink } from '#components'
import { parseSeriesId } from './rfc'
import type { RfcCommon } from './rfc-validators'
import { NONBREAKING_SPACE } from './strings'
import { infoSeriesPathBuilder } from './url'

/**
 * Formats a string of 'RFCnumber' with non-bold/bold text with an NBSP between
 * Returns h() Component for rendering
 */
export const formatTitleAsVNode = (
  rfcId: string,
  hasTrailingColon?: boolean
): VNode => {
  const parts = parseSeriesId(rfcId)

  if (parts === undefined) {
    return h('span')
  }

  return h('span', [
    h('span', { class: 'font-normal' }, parts.type.toUpperCase()),
    NONBREAKING_SPACE,
    h('span', { class: 'font-semibold' }, parts.number),
    hasTrailingColon ? ':' : undefined
  ])
}

export const hasSubseries = (rfc: RfcCommon) =>
  Boolean(rfc.subseries && rfc.subseries.length > 0)

export const formatSubseriesAsVNode = (
  rfc: RfcCommon,
  hasTrailingColon: boolean
): VNode => {
  const { subseries } = rfc
  if (!subseries || subseries.length === 0) {
    return h('span')
  }

  return h(
    'span',
    subseries
      .map((subseries) =>
        h(
          NuxtLink,
          {
            to: infoSeriesPathBuilder(
              `${subseries.type.toLowerCase()}${subseries.number}`
            ),
            class:
              'relative z-50 no-underline hover:underline focus:underline py-3 rounded text-gray-800 dark:text-gray-300',
            title: `f${subseries.type.toUpperCase()} ${subseries.number} contains RFC ${rfc.number}`
          },
          () => {
            const title = formatTitleAsVNode(
              `${subseries.type}${subseries.number}`,
              hasTrailingColon
            )
            return title
          }
        )
      )
      .reduce(
        // when there are multiple subseries add commas betweens
        (acc, item, index, arr) => {
          acc.push(item)
          if (index < arr.length - 1) {
            acc.push(h('span', ', '))
          }
          return acc
        },
        [] as VNode[]
      )
  )
}
