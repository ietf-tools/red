// @vitest-environment nuxt
//
// A link to the IETF community's sites stays in the tab and has no icon, and any other link opens a new tab and
// has the icon, so the two cannot disagree. https://github.com/ietf-tools/red/issues/369
import { afterEach, describe, expect, test } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import LinkWithIcon from './LinkWithIcon.vue'
import OutsideLinkIcon from './OutsideLinkIcon.vue'
import Anchor from './Anchor.vue'

enableAutoUnmount(afterEach)

const ICON = 'svg[aria-label="(open in new window)"]'

const renderLink = (href: string, props: { size?: 'default' | 'large' } = {}) =>
  mountSuspended(LinkWithIcon, {
    props: { href: href as `https://${string}`, ...props },
    slots: { default: 'Link text' }
  })

describe('LinkWithIcon', () => {
  test('a link outside the group opens a new tab and has the icon', async () => {
    const wrapper = await renderLink('https://www.nist.gov/')
    const link = wrapper.get('a')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener')
    expect(link.find(ICON).exists()).toBe(true)
  })

  test.each(['https://www.ietf.org/', 'https://datatracker.ietf.org/wg/', 'https://errata.rfc-editor.org/'])(
    'a link to %s stays in the tab and has no icon, but is still kept from controlling this page',
    async (href) => {
      const wrapper = await renderLink(href)
      const link = wrapper.get('a')
      expect(link.attributes('target')).toBeUndefined()
      expect(link.attributes('rel')).toBe('noopener')
      expect(link.find(ICON).exists()).toBe(false)
    }
  )

  test('a path on this site stays in the tab and has no icon', async () => {
    const wrapper = await renderLink('/authors/rfc-independent-submissions/')
    const link = wrapper.get('a')
    expect(link.attributes('target')).toBeUndefined()
    expect(link.attributes('rel')).toBeUndefined()
    expect(link.find(ICON).exists()).toBe(false)
  })

  test('a lookalike host is outside the group', async () => {
    const wrapper = await renderLink('https://www.ietf.org@example.com/')
    expect(wrapper.get('a').attributes('target')).toBe('_blank')
    expect(wrapper.find(ICON).exists()).toBe(true)
  })

  test('the icon comes after the text, inside the link', async () => {
    const wrapper = await renderLink('https://www.nist.gov/')
    const link = wrapper.get('a')
    expect(link.text()).toBe('Link text')
    expect(link.element.lastElementChild?.matches(ICON)).toBe(true)
  })

  test('the large size is for links beside underlined text', async () => {
    const regular = await renderLink('https://www.nist.gov/')
    const large = await renderLink('https://www.nist.gov/', { size: 'large' })
    expect(regular.get(ICON).classes()).toContain('text-lg')
    expect(large.get(ICON).classes()).toContain('text-xl')
    expect(large.get(ICON).classes()).not.toContain('text-lg')
  })

  test('other attributes reach the link', async () => {
    const wrapper = await mountSuspended(LinkWithIcon, {
      props: { href: 'https://www.nist.gov/', class: 'underline', 'data-example': 'yes' },
      slots: { default: 'Link text' }
    })
    expect(wrapper.get('a').classes()).toContain('underline')
    expect(wrapper.get('a').attributes('data-example')).toBe('yes')
  })
})

describe('OutsideLinkIcon', () => {
  test.each([
    ['https://www.nist.gov/', true],
    ['https://www.ietf.org/', false],
    ['/info/rfc9000/', false],
    ['mailto:rfc-editor@rfc-editor.org', false]
  ])('for %s the icon is shown: %s', async (href, shown) => {
    const wrapper = await mountSuspended(OutsideLinkIcon, { props: { href } })
    expect(wrapper.find(ICON).exists()).toBe(shown)
  })

  test('a link with no href opens a new tab, so has the icon', async () => {
    const wrapper = await mountSuspended(OutsideLinkIcon, { props: {} })
    expect(wrapper.find(ICON).exists()).toBe(true)
  })
})

describe('Anchor', () => {
  test('a link with no href opens a new tab, as before', async () => {
    const wrapper = await mountSuspended(Anchor, { props: {}, slots: { default: 'Link text' } })
    expect(wrapper.get('a').attributes('target')).toBe('_blank')
    expect(wrapper.get('a').attributes('rel')).toBe('noopener')
  })
})
