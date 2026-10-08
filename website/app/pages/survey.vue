<template>
  <div class="min-h-[100vh]">
    <NuxtLayout name="default" has-sub-header>
      <div id="surveyjs" class="">
        <ClientOnly>
          <SurveyComponent :model="model" />
        </ClientOnly>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { Model } from 'survey-core'
import { DefaultDark, DefaultLight } from 'survey-core/themes'
import { SurveyComponent } from 'survey-vue3-ui'
import { useRfcEditorHead } from '~/utilities/head'
import { SURVEY_PATH } from '~/utilities/url'

// the canonical path doesn't include the slug query param
// intentionally, because surveys shouldn't be indexed and
// they must be deleted so canonical has no use for us
const canonicalPath = SURVEY_PATH

const route = useRoute()

if (route.path !== canonicalPath) {
  await navigateTo({ path: canonicalPath, query: { slug: route.query.slug } })
}

definePageMeta({
  layout: false
})

const model = new Model({
  title: 'Example survey',
  showQuestionNumbers: 'off',
  pages: [
    {
      name: 'page1',
      elements: [
        {
          type: 'text',
          name: 'name',
          title: 'What is your name?',
          isRequired: true
        },
        {
          type: 'radiogroup',
          name: 'role',
          title: 'Which best describes you?',
          choices: ['Author', 'Reader', 'Implementer', 'Other']
        },
        {
          type: 'rating',
          name: 'satisfaction',
          title: 'How satisfied are you with the RFC Editor website?',
          rateCount: 5,
          minRateDescription: 'Not satisfied',
          maxRateDescription: 'Very satisfied'
        },
        {
          type: 'comment',
          name: 'feedback',
          title: 'Any other feedback?'
        }
      ]
    }
  ]
})

const colorMode = useColorMode()

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

model.applyTheme(themeForMode(colorMode.value))
watch(
  () => colorMode.value,
  (mode) => model.applyTheme(themeForMode(mode))
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
