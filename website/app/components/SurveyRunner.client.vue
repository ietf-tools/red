<template>
  <div id="surveyjs">
    <SurveyComponent :model="model" />
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

<script setup lang="ts">
/**
 * Client-only because survey-vue3-ui ships a UMD build as its `main`, which Node cannot take named
 * exports from when the server build leaves it external, and because there is nothing for the
 * server to render: the definition is fetched from the browser.
 */
import { Model, type CompleteEvent } from 'survey-core'
import { DefaultDark, DefaultLight } from 'survey-core/themes'
import { SurveyComponent } from 'survey-vue3-ui'
import { z } from 'zod'

type SurveyData = Record<string, unknown>
type SaveOptions = Pick<CompleteEvent, 'showSaveInProgress' | 'showSaveError' | 'showSaveSuccess'>

type Props = {
  definition: unknown
  theme?: unknown
  save: (data: SurveyData) => Promise<void>
}

const { definition, theme, save } = defineProps<Props>()

const emit = defineEmits<{ saved: [] }>()

const colorMode = useColorMode()

// Not a ref of the Model itself: Vue would wrap SurveyJS's model in a deep reactive proxy.
const model = new Model(definition)
const saving = ref(false)
const retryable = ref(false)

// A survey's own theme (from the SurveyJS Theme Editor) carries only the colours a designer picked,
// so it's laid over a base that follows the site's colour mode.
const ThemeSchema = z.looseObject({
  cssVariables: z.record(z.string(), z.string()).optional(),
  header: z.looseObject({}).optional()
})

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
    header: { ...custom?.header, titlePositionX: 'center' },
    cssVariables: { ...base.cssVariables, ...custom?.cssVariables }
  })
}

// Held once the survey completes, because by then SurveyJS has left the last page and a retry has
// nothing else to resubmit.
let completed: { data: SurveyData; options: SaveOptions } | undefined

const attemptSave = async () => {
  if (!completed || saving.value) {
    return
  }
  const { data, options } = completed
  saving.value = true
  retryable.value = false
  options.showSaveInProgress()
  try {
    await save(data)
    options.showSaveSuccess()
    emit('saved')
  } catch (error) {
    console.error('Unable to save the survey response.', error)
    options.showSaveError("Your response couldn't be saved. Please try again.")
    retryable.value = true
  } finally {
    saving.value = false
  }
}

// The page shows its own thank-you once the save resolves. SurveyJS's default would otherwise
// show beside it, and the saving and save-error notifications render inside the completed page.
model.completedHtml = ''
applyTheme(model, theme, colorMode.value)
// onComplete rather than onCompleting, because only here has SurveyJS already cleared the
// answers to questions its conditions hid, which is the data a response stores. attemptSave()
// reports saving before its first await, or SurveyJS would follow a navigateToUrl straight away.
model.onComplete.add((sender, options) => {
  completed = { data: sender.data, options }
  void attemptSave()
})
watch(
  () => colorMode.value,
  (mode) => applyTheme(model, theme, mode)
)
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
    color: var(--sjs-font-surveytitle-color);
    box-shadow: none;
  }

  .sv-header__title .sv-string-viewer {
    color: var(--sjs-font-surveytitle-color);
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
