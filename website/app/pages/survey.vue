<template>
  <div class="container mx-auto pb-10">
    <div v-if="load.status === 'loading'" class="mt-10 w-full text-center">
      <GraphicsLoading class="inline-block w-16 h-16" />
    </div>

    <div v-else-if="load.status === 'authRequired'" class="mt-10 w-full text-center">
      <Heading level="1" style-level="2">You need an account to take this survey</Heading>
      <LoginModalFeatureWall class="mt-6 mx-auto max-w-120" />
    </div>

    <Alert v-else-if="load.status === 'notFound'" level="1" variant="warning" heading="Survey not found">
      <p class="pt-2">This survey is not available. The link may be wrong, or the survey may have closed.</p>
    </Alert>

    <Alert v-else-if="load.status === 'failed'" level="1" variant="warning" heading="Error">
      <p class="pt-2">This survey could not be loaded. Please try again.</p>
    </Alert>

    <Alert v-else-if="submitted" level="1" variant="info" heading="Thank you">
      <p class="pt-2">Your response has been recorded.</p>
      <p v-if="returnToPath" class="pt-2">
        <Anchor :href="returnToPath" :class="ANCHOR_COLOR_TAILWIND_STYLE">Return to your previous page</Anchor>
      </p>
    </Alert>

    <template v-else>
      <div id="surveyjs">
        <SurveyComponent :model="load.model" />
      </div>
      <div v-if="retryable" class="mt-4 flex justify-center">
        <button
          type="button"
          class="cursor-pointer rounded bg-blue-900 dark:bg-blue-950 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          :disabled="saving"
          @click="attemptSave">
          Try again
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { until } from '@vueuse/core'
import { Model, type CompleteEvent } from 'survey-core'
import { z } from 'zod'
import { DefaultDark, DefaultLight } from 'survey-core/themes'
import { SurveyComponent } from 'survey-vue3-ui'
import { useRfcEditorHead } from '~/utilities/head'
import { createSurveyResponse, getSurveyDefinition, ReefError } from '~/utilities/reef'
import { ANCHOR_COLOR_TAILWIND_STYLE } from '~/utilities/theme'
import { SURVEY_PATH } from '~/utilities/url'

// the canonical path doesn't include the slug query param
// intentionally, because surveys shouldn't be indexed and
// they must be deleted so canonical has no use for us
const canonicalPath = SURVEY_PATH

const route = useRoute()

if (route.path !== canonicalPath) {
  await navigateTo({ path: canonicalPath, query: route.query })
}

// The page the reader was on when offered the survey. Only a site path is accepted, so the query
// can't send anyone to another site.
const MAX_RETURN_TO_LENGTH = 200
const returnToPath = computed(() => {
  const { returnTo } = route.query
  if (
    typeof returnTo !== 'string' ||
    !returnTo.startsWith('/') ||
    returnTo.startsWith('//') ||
    returnTo.includes('\\') ||
    returnTo.length > MAX_RETURN_TO_LENGTH
  ) {
    return undefined
  }
  return returnTo
})

type SurveyData = Record<string, unknown>
type SaveOptions = Pick<CompleteEvent, 'showSaveInProgress' | 'showSaveError' | 'showSaveSuccess'>

type Load =
  | { status: 'loading' }
  | { status: 'ready'; model: Model }
  | { status: 'authRequired' }
  | { status: 'notFound' }
  | { status: 'failed' }

// How long to wait for ~/utilities/oidc's session restore to settle before treating the reader as
// signed out, as ~/utilities/reef-surveys does.
const AUTH_CHECK_TIMEOUT_MS = 5_000

const authStore = useAuthStore()
const colorMode = useColorMode()

// Not a ref of the Model itself: Vue would wrap SurveyJS's model in a deep reactive proxy.
const load = shallowRef<Load>({ status: 'loading' })
const submitted = ref(false)
const saving = ref(false)
const retryable = ref(false)

// A survey's own theme (from the SurveyJS Theme Editor) carries only the colours a designer picked,
// so it's laid over a base that follows the site's colour mode.
const ThemeSchema = z.looseObject({ cssVariables: z.record(z.string(), z.string()).optional() })

// SurveyJS's Default themes are not enough on their own: the primary colour must
// follow the site's navy in light mode, but in dark mode navy is nearly the same
// darkness as SurveyJS's dark panels (about 1.5:1), so checked boxes, selected
// ratings, the progress bar, focus borders and the Next button would vanish. A
// light accent with dark text on it keeps them visible. Both come from the
// Tailwind CSS variables rather than copied hexes so the palette stays in sync.
const themeForMode = (mode: string) => {
  const dark = mode === 'dark'
  const base = dark ? DefaultDark : DefaultLight
  const blue950 = `var(--color-blue-950)`
  const primary = `var(--color-blue-${dark ? '100' : '900'})`
  const white = `#fff`
  const gray100 = `var(--color-gray-100)`
  const primaryText = dark ? 'var(--color-blue-975)' : 'var(--color-white)'
  // Both Default themes set secondary text at under half opacity and borders at
  // under a fifth, short of WCAG AA (4.5:1 for text, 3:1 for control outlines).
  // These opacities clear it (about 5.7:1 and 3.4:1). Text inputs, checkbox and
  // radio decorators, the boolean toggle, buttons and rating items have no CSS
  // border: their outline is the shadow, which both themes keep as a faint drop
  // shadow, so a 1px ring stands in for it. The *-reset variants stay as SurveyJS
  // defines them, since they only clear the shadow while the focus ring shows.
  const ink = (alpha: number) => `rgba(${dark ? '255, 255, 255' : '0, 0, 0'}, ${alpha})`
  return {
    ...base,
    cssVariables: {
      ...base.cssVariables,
      '--sjs-general-backcolor-dim': dark ? 'var(--color-blue-975)' : gray100,
      '--sjs-general-backcolor': dark ? '#111' : '#fff',
      '--sjs-general-forecolor-light': ink(dark ? 0.65 : 0.6),
      '--sjs-general-dim-forecolor-light': ink(dark ? 0.65 : 0.6),
      '--sjs-border-default': ink(dark ? 0.4 : 0.45),
      '--sjs-border-light': ink(dark ? 0.3 : 0.35),
      '--sjs-border-inside': ink(dark ? 0.3 : 0.45),
      '--sjs-shadow-small': `0px 0px 0px 1px ${ink(dark ? 0.3 : 0.35)}`,
      '--sjs-shadow-inner': `inset 0px 0px 0px 1px ${ink(dark ? 0.4 : 0.45)}`,
      '--sjs-primary-backcolor': primary,
      '--sjs-header-backcolor': dark ? blue950 : primary,
      '--sjs-font-surveytitle-color': dark ? white : primaryText,
      '--sjs-primary-backcolor-light': `color-mix(in srgb, ${primary} 10%, transparent)`,
      '--sjs-primary-backcolor-dark': `color-mix(in srgb, ${primary} 85%, black)`,
      '--sjs-primary-forecolor': primaryText,
      '--sjs-primary-forecolor-light': `color-mix(in srgb, ${primaryText} 25%, transparent)`,
      '--sjs-font-surveytitle-weight': '500'
    }
  }
}

const applyTheme = (model: Model, theme: unknown, mode: string) => {
  const base = themeForMode(mode)
  const { data: custom } = ThemeSchema.safeParse(theme)
  model.applyTheme({
    ...base,
    ...custom,
    cssVariables: { ...base.cssVariables, ...custom?.cssVariables }
  })
}

// Held once the survey completes, because by then SurveyJS has left the last page and a retry has
// nothing else to resubmit.
let completed: { slug: string; data: SurveyData; options: SaveOptions } | undefined

const attemptSave = async () => {
  if (!completed || saving.value) {
    return
  }
  const { slug, data, options } = completed
  saving.value = true
  retryable.value = false
  options.showSaveInProgress()
  try {
    await createSurveyResponse(slug, { data })
    options.showSaveSuccess()
    submitted.value = true
  } catch (error) {
    console.error('Unable to save the survey response.', error)
    options.showSaveError("Your response couldn't be saved. Please try again.")
    retryable.value = true
  } finally {
    saving.value = false
  }
}

// Bumped on each load so a slow answer for a survey the reader has already left can't replace the
// one on screen.
let loadToken = 0

const loadSurvey = async (slug: string) => {
  const token = (loadToken += 1)
  load.value = { status: 'loading' }
  submitted.value = false
  retryable.value = false
  completed = undefined

  if (slug === '') {
    load.value = { status: 'notFound' }
    return
  }

  // The definition of an authenticated-only survey is sent only with a token, so ask once the
  // session has been restored.
  await until(() => authStore.hasCheckedAuth).toBe(true, { timeout: AUTH_CHECK_TIMEOUT_MS })

  try {
    const { definition, theme } = await getSurveyDefinition(slug)
    if (token !== loadToken) {
      return
    }
    const model = new Model(definition)
    // The page shows its own thank-you once the save resolves. SurveyJS's default would otherwise
    // show beside it, and the saving and save-error notifications render inside the completed page.
    model.completedHtml = ''
    applyTheme(model, theme, colorMode.value)
    // onComplete rather than onCompleting, because only here has SurveyJS already cleared the
    // answers to questions its conditions hid, which is the data a response stores. attemptSave()
    // reports saving before its first await, or SurveyJS would follow a navigateToUrl straight away.
    model.onComplete.add((sender, options) => {
      completed = { slug, data: sender.data, options }
      void attemptSave()
    })
    watch(
      () => colorMode.value,
      (mode) => applyTheme(model, theme, mode)
    )
    load.value = { status: 'ready', model }
  } catch (error) {
    if (token !== loadToken) {
      return
    }
    // Reef answers 403 for an authenticated-only survey the caller can't have, which for a reader
    // who isn't signed in is the cue to offer signing in. For one who is, it's a plain refusal.
    if (error instanceof ReefError && error.status === 403 && !authStore.isAuthenticated) {
      load.value = { status: 'authRequired' }
    } else if (error instanceof ReefError && error.status === 404) {
      load.value = { status: 'notFound' }
    } else {
      console.error('Unable to load this survey.', error)
      load.value = { status: 'failed' }
    }
  }
}

// Read through a getter because /survey/?slug=a → ?slug=b changes the query without remounting.
// Reef is reached from the browser, so the server renders the loading state and the client takes it
// from there.
watch(
  () => route.query.slug,
  (slug) => {
    if (import.meta.client) {
      void loadSurvey(typeof slug === 'string' ? slug : '')
    }
  },
  { immediate: true }
)

useRfcEditorHead({
  title: 'Survey',
  noIndex: true,
  canonicalPath,
  description: 'Subscriptions, etc',
  contentType: 'website'
})
</script>

<style lang="postcss">
/** Note that this is postcss so we can use @nested-import */

#surveyjs {
  @nested-import "survey-core/survey-core.css";

  .sd-title {
    margin: 0 auto;
  }

  .sd-root-modern .sd-container-modern__title {
    background: var(--sjs-header-backcolor);
    color: white;
    box-shadow: none;
  }

  .sv-components-row {
    max-width: 500px;
    margin: 0 auto;
  }
}
</style>

<style>
/* The boolean thumb is the selected yes/no answer. SurveyJS gives it the same
   1px --sjs-shadow-small edge as every button and frame and exposes no variable
   of its own, so this draws its edge as a thicker ring in the theme's border
   colour. Read-only and preview thumbs draw their own edge and are left alone. */
#surveyjs .sd-boolean:not(.sd-boolean--readonly, .sd-boolean--preview) .sd-boolean__thumb {
  box-shadow: 0 0 0 2px var(--sjs-border-default);
}
</style>
