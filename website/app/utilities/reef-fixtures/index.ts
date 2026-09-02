// Stand-in Reef answers for local dev, so the Personalisation pages can be worked on with no Reef
// running and without an Authentik round trip for the signed-in-only operations.
//
// `npm run dev:fixtures` is the dev server with these on; the scenario is NUXT_PUBLIC_REEF_FIXTURES,
// which that script defaults to `on` and takes from the environment when it is already set.
//
// Reached from exactly one place — reefFetch in ~/utilities/reef, behind `import.meta.dev` and the
// NUXT_PUBLIC_REEF_FIXTURES runtime flag. Intercepting there rather than swapping the per-operation
// functions out at their call sites is what makes this reach every operation in the spec, including
// the ones a page never calls directly because ~/stores/reef calls them for it.
//
// The answers themselves live one file per area (./subjects and so on) and are shared with the tests
// for the pages that read them, so dev and the test suite cannot end up developed against different
// Reefs.
import { emptied, subjectDetailFor, subjectsFixture } from './subjects'

// What NUXT_PUBLIC_REEF_FIXTURES selects. `on` is the populated vocabulary; the rest are the states
// the pages branch on and that a populated, instantly-resolved fixture never reaches on its own —
// the empty vocabulary, the loading spinner, the error alert.
export type FixtureScenario = 'on' | 'empty' | 'slow' | 'error'

// How long `slow` holds an answer back. Long enough to read a spinner and to catch a component that
// renders before its data arrives; short enough to click through a few pages.
const SLOW_ANSWER_MS = 1500

// What a fixtured path answers with. An error is described rather than thrown so that this file has
// no reason to import ReefError from ~/utilities/reef, which is the module that imports this one:
// reefFetch owns the one copy of how a Reef failure is built, and it stays that way.
export type FixtureResult =
  | { outcome: 'answer'; body: unknown }
  | { outcome: 'error'; status: number; statusText: string; body: unknown }

const answer = (body: unknown): FixtureResult => ({ outcome: 'answer', body })

// Reef reports a missing subject the way it reports any missing object, and the /subjects/<slug>/
// page has a branch for exactly this, so an unknown slug has to arrive as a 404 rather than as a
// fall-through to the real Reef.
const notFound = (): FixtureResult => ({
  outcome: 'error',
  status: 404,
  statusText: 'Not Found',
  body: { detail: 'No Subject matches the given query.' }
})

const scenarioFailure = (): FixtureResult => ({
  outcome: 'error',
  status: 500,
  statusText: 'Internal Server Error',
  body: { detail: 'Fixture scenario "error": every fixtured path fails.' }
})

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

// Operations addressed by a fixed path. Anything parameterised is matched below instead, because a
// path carrying a slug or an id is not a key.
const fixedPaths: Record<string, (scenario: FixtureScenario) => FixtureResult> = {
  'GET /api/reef/subjects/': (scenario) => answer(scenario === 'empty' ? [] : subjectsFixture)
}

const SUBJECT_DETAIL_PATH = /^\/api\/reef\/subjects\/([^/]+)\/$/

const matchPath = (method: string, path: string, scenario: FixtureScenario): FixtureResult | undefined => {
  const fixed = fixedPaths[`${method} ${path}`]
  if (fixed !== undefined) {
    return fixed(scenario)
  }

  const subjectDetail = SUBJECT_DETAIL_PATH.exec(path)
  if (method === 'GET' && subjectDetail !== null) {
    // Reef canonicalises the slug it was asked for; a fixture only has to survive a slug that
    // arrived percent-encoded.
    const subject = subjectDetailFor(decodeURIComponent(subjectDetail[1] ?? ''))
    if (subject === undefined) {
      return notFound()
    }
    return answer(scenario === 'empty' ? emptied(subject) : subject)
  }

  return undefined
}

// Keyed by the scenario names rather than listed, so that adding a member to FixtureScenario without
// adding it here fails to type-check instead of silently becoming an unrecognised value.
const SCENARIOS: Record<FixtureScenario, true> = { on: true, empty: true, slow: true, error: true }

const isScenario = (value: string): value is FixtureScenario => Object.hasOwn(SCENARIOS, value)

// Anything truthy that isn't a scenario name means "fixtures on, populated" — `=1` and `=true` are
// what a flag gets set to by reflex, and a value that was meant to be a scenario and wasn't spelled
// like one is worth saying out loud rather than silently reading as `on`.
const readScenario = (configured: string): FixtureScenario => {
  if (isScenario(configured)) {
    return configured
  }
  if (configured !== '1' && configured !== 'true') {
    console.warn(
      `[reef-fixtures] NUXT_PUBLIC_REEF_FIXTURES="${configured}" is not one of ${Object.keys(SCENARIOS).join(', ')}; using "on".`
    )
  }
  return 'on'
}

// The stand-in answer for one request, or undefined when nothing here covers it — which reefFetch
// treats as a reason to go to the real Reef, so a path with no fixture yet is visibly missing rather
// than quietly empty.
export const fixtureFor = async (
  configured: string,
  method: string,
  path: string
): Promise<FixtureResult | undefined> => {
  const scenario = readScenario(configured)
  const result = matchPath(method, path, scenario)

  if (result === undefined) {
    return undefined
  }

  if (scenario === 'slow') {
    await delay(SLOW_ANSWER_MS)
  }

  return scenario === 'error' ? scenarioFailure() : result
}
