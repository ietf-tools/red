// @vitest-environment nuxt
//
// Every link to another site keeps noopener, whether or not it opens a new tab.
import { afterEach, describe, expect, test } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import RFCRouterLink from './RFCRouterLink.vue'

enableAutoUnmount(afterEach)

describe('RFCRouterLink outside link', () => {
  test.each(['https://www.nist.gov/', 'https://datatracker.ietf.org/wg/quic'])('%s keeps noopener', async (href) => {
    const wrapper = await mountSuspended(RFCRouterLink, { props: { href }, slots: { default: 'Link text' } })
    expect(wrapper.get('a').attributes('rel')).toBe('noopener')
  })
})
