/**
 * Intercepts the searchv2 page's Typesense `multi_search` calls with a frozen fixture, so its
 * e2e suite runs offline and doesn't depend on live staging data or schema staying put.
 *
 * The fixture is a real captured response, trimmed to a few hits and facet values. Its content
 * doesn't matter to the suite (no assertion checks specific titles or counts), only its shape:
 * enough hits to populate `#searchv2-hits-container`, and facet_counts for the attributes
 * RFCSearchFilters renders (status.name, group.name, area.acronym/full, stream.slug/name,
 * authors.name).
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { Page } from 'playwright-core'

const FIXTURE_PATH = fileURLToPath(new URL('../fixtures/typesense-search-response.json', import.meta.url))

/** Routes every `multi_search` request (search and search-for-facet-values alike) to the fixture. */
export const mockTypesenseSearch = async (page: Page): Promise<void> => {
  const body = await readFile(FIXTURE_PATH, 'utf8')
  await page.route('**/multi_search**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body })
  )
}
