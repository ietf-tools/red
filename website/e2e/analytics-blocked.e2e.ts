/**
 * The e2e pages do not reach the analytics host, so a run neither sends real hits to production analytics
 * nor waits on the tracker.
 */
import { describe, expect, test } from 'vitest'
import { openHydratedPage, setupNuxtServer } from './utilities/setup'

describe('analytics in e2e pages', async () => {
  await setupNuxtServer()

  test('a page tries the analytics host and is stopped, so nothing reaches it', async () => {
    const page = await openHydratedPage('/')
    const reached: string[] = []
    const blocked: string[] = []
    page.on('response', (response) => {
      if (new URL(response.url()).hostname === 'analytics.ietf.org') reached.push(response.url())
    })
    page.on('requestfailed', (request) => {
      if (new URL(request.url()).hostname === 'analytics.ietf.org') blocked.push(request.url())
    })
    await page.reload({ waitUntil: 'load' })
    await page.waitForFunction(() => window.useNuxtApp?.().isHydrating === false)
    await page.close()

    expect(reached, 'responses from the analytics host').toEqual([])
    expect(blocked.length, 'requests to the analytics host that were stopped').toBeGreaterThan(0)
  }, 120_000)
})
