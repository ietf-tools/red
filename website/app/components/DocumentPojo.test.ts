// @vitest-environment nuxt
//
// The icon in document pojos is drawn by OutsideLinkIcon, so it follows the same rule as every other link.
// https://github.com/ietf-tools/red/issues/369
import { afterEach, describe, expect, test } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import type { DocumentPojo } from '~/utilities/rfc-validators'
import DocumentPojoComponent from './DocumentPojo.vue'
import OutsideLinkIcon from './OutsideLinkIcon.vue'

enableAutoUnmount(afterEach)

const ICON = 'svg[aria-label="(open in new window)"]'

describe('DocumentPojo link icon', () => {
  const linkWithIcon = (href: string): DocumentPojo => [
    {
      type: 'Element',
      nodeName: 'Anchor',
      attributes: { href },
      children: [
        { type: 'Text', textContent: 'Link text' },
        { type: 'Element', nodeName: 'OutsideLinkIcon', attributes: { href }, children: [] }
      ]
    }
  ]

  test('a link outside the group has the icon', async () => {
    const wrapper = await mountSuspended(DocumentPojoComponent, {
      props: { value: linkWithIcon('https://doi.org/10.17487/RFC9000') }
    })
    expect(wrapper.get('a').attributes('target')).toBe('_blank')
    expect(wrapper.get('a').find(ICON).exists()).toBe(true)
  })

  test.each(['https://datatracker.ietf.org/wg/quic/about/', 'https://www.iab.org/', '/info/rfc9000/', ''])(
    'a link to %j has no icon',
    async (href) => {
      const wrapper = await mountSuspended(DocumentPojoComponent, { props: { value: linkWithIcon(href) } })
      expect(wrapper.find(ICON).exists()).toBe(false)
    }
  )
})

describe('OutsideLinkIcon', () => {
  test('keeps its own classes alongside any class it is given', async () => {
    const wrapper = await mountSuspended(OutsideLinkIcon, {
      props: { href: 'https://www.nist.gov/' },
      attrs: { class: 'absolute -mt-1' }
    })
    const classes = wrapper.get(ICON).classes()
    expect(classes).toEqual(expect.arrayContaining(['text-lg', 'ml-1', 'absolute', '-mt-1']))
  })
})
