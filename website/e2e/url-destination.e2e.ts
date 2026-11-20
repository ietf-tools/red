/**
 * How links on the markdown pages are presented: to the IETF community's sites they stay in the tab and have no
 * icon, and anywhere else they open a new tab and have the icon. https://github.com/ietf-tools/red/issues/369
 */
import { describe, expect, test } from 'vitest'
import type { Locator } from 'playwright-core'
import { openHydratedPage, setupNuxtServer } from './utilities/setup'

const ICON = 'svg[aria-label="(open in new window)"]'

type Presentation = { target: string | null; rel: string | null; hasIcon: boolean }

const presentation = async (link: Locator): Promise<Presentation> => ({
  target: await link.getAttribute('target'),
  rel: await link.getAttribute('rel'),
  hasIcon: (await link.locator(ICON).count()) > 0
})

describe('markdown page links', async () => {
  await setupNuxtServer()

  test('links to the IETF community stay in the tab with no icon, others open a new tab with the icon, and all keep noopener', async () => {
    const page = await openHydratedPage('/authors/rfc-style-guide/')

    const group = page.locator(
      'main a[href="https://www.ietf.org/about/groups/iesg/statements/on-inclusive-language/"]'
    )
    const outside = page.locator('main a[href="https://www.merriam-webster.com/"]')
    await group.waitFor({ state: 'attached' })
    await outside.waitFor({ state: 'attached' })

    const groupLink = await presentation(group)
    const outsideLink = await presentation(outside)
    await page.close()

    expect(groupLink, 'a link to ietf.org').toEqual({ target: null, rel: 'noopener', hasIcon: false })
    expect(outsideLink, 'a link to a site outside the group').toEqual({
      target: '_blank',
      rel: 'noopener',
      hasIcon: true
    })
  }, 120_000)

  test('the links on the page the issue was reported on have no icon and stay in the tab', async () => {
    const page = await openHydratedPage('/authors/rfc-how-to/')

    const links = page.locator('main a[href^="https://"]')
    await links.first().waitFor({ state: 'attached' })
    const all = await links.all()
    const presentations = await Promise.all(
      all.map(async (link) => ({ href: await link.getAttribute('href'), ...(await presentation(link)) }))
    )
    await page.close()

    expect(presentations.length, 'expected links to other sites on the page').toBeGreaterThan(0)
    expect(presentations.filter(({ target, hasIcon }) => target !== null || hasIcon)).toEqual([])
  }, 120_000)

  test('in every tab of an RFC page a link has the icon exactly when it opens a new tab', async () => {
    const page = await openHydratedPage('/info/rfc9000/')

    const tabs = page.getByRole('tab')
    await tabs.first().waitFor({ state: 'attached' })
    const mismatches: { tab: string; href: string | null; target: string | null; hasIcon: boolean }[] = []
    let linksChecked = 0

    for (const tab of await tabs.all()) {
      const tabName = ((await tab.innerText()) ?? '').trim()
      await tab.click()
      const panel = page.locator('[role="tabpanel"][data-state="active"]')
      await panel.waitFor({ state: 'visible' })
      for (const link of await panel.locator('a[href^="http"]').all()) {
        linksChecked++
        const { target, hasIcon } = await presentation(link)
        if ((target === '_blank') !== hasIcon) {
          mismatches.push({ tab: tabName, href: await link.getAttribute('href'), target, hasIcon })
        }
      }
    }
    await page.close()

    expect(linksChecked, 'expected links in the tabs').toBeGreaterThan(10)
    expect(mismatches).toEqual([])
  }, 120_000)

  test.each(['/', '/info/rfc9000/', '/authors/rfc-style-guide/'])(
    'every link to another site on %s keeps noopener, including links written by hand',
    async (route) => {
      const page = await openHydratedPage(route)

      for (const tab of await page.getByRole('tab').all()) {
        await tab.click()
      }
      const missing = await page.evaluate(() =>
        [...document.querySelectorAll('a[href^="http"]')]
          .filter((a) => !(a.getAttribute('rel') ?? '').split(/\s+/).includes('noopener'))
          // The text of an RFC is the RFC Editor's own markup, which is not part of this rule
          .filter((a) => !a.closest('#rfc-document, [data-rfc-body]'))
          .map((a) => `${(a.textContent ?? '').trim().slice(0, 40)} -> ${a.getAttribute('href')}`)
      )
      await page.close()

      expect(missing).toEqual([])
    },
    120_000
  )
})
