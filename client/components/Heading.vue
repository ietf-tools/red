<template>
  <component
    :is="`h${props.level}`"
    :id="props.id"
    :class="[
      headingStyles[`h${styleLevel || level}`],
      props.class,
      'group'
    ]"
  >
    <GraphicsIETFMotif
      v-if="hasIcon"
      class="absolute ml-[-1.3em] -mt-4 print:hidden"
      width="75"
      height="55"
      :opacity="0.05"
    />
    <slot />
    <a
      v-if="props.id && hasInternalLink"
      :href="hasInternalLink ? `#${props.id}` : undefined"
      class="ml-1 opacity-0 transition-opacity no-underline group-hover:opacity-100 font-normal"
      title="Link to this heading"
      @click="hashClickHandler(`#${props.id}`)"
    >
      &para;
    </a>
  </component>
</template>

<script setup lang="ts">
import type { VueStyleClass } from '~/utilities/vue'
import { copyToClipboard } from '~/utilities/clipboard'
import type { HeadingLevel } from '~/utilities/html'

type Level = HeadingLevel

type Props = {
  /**
   * The heading level eg 1-6.
   */
  level: Level
  /**
   * By default the 'level' prop is also used for styling, but you can optionally override this
   * to have different styling to the actual HTML heading element.
   *
   * Eg `<h1>` element but with h3's styling.
   *
   * For accessibility reasons heading levels should be semantic per the page structure / hierarchy,
   * not necessarily based on font size.
   *
   * W3C: WCAG, WAI say:
   *    "Skipping heading ranks can be confusing and should be avoided where possible: Make sure
   *    that a `<h2>` is not followed directly by an `<h4>`, for example."
   *
   * See also
   *  * https://www.w3.org/TR/2012/NOTE-WCAG20-TECHS-20120103/G141
   *  * https://dequeuniversity.com/rules/axe/3.4/heading-order
   *  * https://dequeuniversity.com/rules/axe/3.0/page-has-heading-one
   */
  styleLevel?: Level
  class?: VueStyleClass
  hasIcon?: boolean
  /**
   * This Heading component can generate an HTML internal link id and link, eg
   *
   * 1.  `id="internal-link"` on the heading element, and;
   * 2.  `<a href="#internal-link">#</a>` in the heading.
   *
   * You can enable it with this prop.
   *
   * The DOM Id is derived from the text of the default `<slot />`. This text is reformatted into a
   * DOM Id (eg the text is kebab-cased to remove whitespace but check the code for specifics).
   */
  hasInternalLink?: boolean
  /** provide a custom id rather than deriving one from the innerText */
  id?: string
}

const headingStyles: Record<`h${Props['level']}`, string> = {
  /**
   * Do not add default margins/padding here. The headings are used in many different situations
   * that need different margins/padding.
   *
   * Instead pass in the `class` prop for margins/padding, or make a wrapper component that passes
   * in the `class`
   */
  h1: 'text-3xl lg:text-5xl font-bold',
  h2: 'text-2xl font-bold',
  h3: 'text-xl font-bold',
  h4: 'text-lg font-bold',
  h5: 'text-base font-bold',
  h6: 'text-base font-bold'
}

const props = defineProps<Props>()

const hashClickHandler = async (hash: string) => {
  const target = new URL(hash, location.toString())
  void (await copyToClipboard(target.toString()))
}
</script>
