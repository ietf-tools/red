<template>
  <div
    :class="[
      'mx-auto pb-10',
      {
        container: load.status !== 'ready'
      }
    ]">
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

    <SurveyRunner
      v-else
      :key="load.slug"
      :definition="load.definition"
      :theme="load.theme"
      :save="load.save"
      @saved="submitted = true" />
  </div>
</template>

<script setup lang="ts">
import { until } from '@vueuse/core'
import { useRfcEditorHead } from '~/utilities/head'
import { createSurveyResponse, getSurveyDefinition, ReefError, type SurveyDefinition } from '~/utilities/reef'
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

type Load =
  | { status: 'loading' }
  | {
      status: 'ready'
      slug: string
      definition: SurveyDefinition['definition']
      theme: unknown
      save: (data: Record<string, unknown>) => Promise<void>
    }
  | { status: 'authRequired' }
  | { status: 'notFound' }
  | { status: 'failed' }

// How long to wait for ~/utilities/oidc's session restore to settle before treating the reader as
// signed out, as ~/utilities/reef-surveys does.
const AUTH_CHECK_TIMEOUT_MS = 5_000

const authStore = useAuthStore()

const load = shallowRef<Load>({ status: 'loading' })
const submitted = ref(false)

// Bumped on each load so a slow answer for a survey the reader has already left can't replace the
// one on screen.
let loadToken = 0

const loadSurvey = async (slug: string) => {
  const token = (loadToken += 1)
  load.value = { status: 'loading' }
  submitted.value = false

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
    load.value = {
      status: 'ready',
      slug,
      definition,
      theme,
      save: async (data) => {
        await createSurveyResponse(slug, { data })
      }
    }
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
