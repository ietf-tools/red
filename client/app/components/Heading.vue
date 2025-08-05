<template>
  <component
    :is="`h${props.level}`"
    :id="
      // we always make an id. hasInternalLink only affects whether to show a '#' link
      props.id ?? getAnchorId($slots.default)
      "
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
      v-if="hasInternalLink"
      :href="hasInternalLink ?
        `#${props.id ?? getAnchorId($slots.default)}`
        : undefined
        "
      class="ml-1 opacity-0 transition-opacity no-underline group-hover:opacity-100 font-normal"
      title="Link to this heading"
      @click="hashClickHandler(`#${getAnchorId($slots.default)}`)"
    >
      &para;
    </a>
  </component>
</template>

<script setup lang="ts">
import type { Slot } from 'vue'
import type { VueStyleClass } from '~/utilities/vue'
import { getVNodeText } from '~/utilities/vue'
import { textToAnchorId } from '~/utilities/url'
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

type VueDefaultSlotType =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Slot<any> | undefined // this type is from Vue itself ie $slots.default in the template, it's not an intentional use of `any`.

/**
 * Derives an DOM Id from the text of the default <slot />.
 * A DOM Id is a string with no whitespace and adhering to other DOM Id rules.
 *
 * This calculation is done in the render rather than as a Vue `setup`-phase computed() property because accessing
 * the content of the slot outside the render would trigger this Vue warning:
 *
 *   "Slot invoked outside of the render function
 *    this will not track dependencies used in the slot.
 *    Invoke the slot function inside the render function instead."
 *
 * An article on the general problem: https://zelig880.com/how-to-fix-slot-invoked-outside-of-the-render-function-in-vue-3
 *
 */
const getAnchorId = (defaultSlot: VueDefaultSlotType): string | undefined => {
  const defaultSlotValue = defaultSlot ? defaultSlot() : []
  const slotText = getVNodeText(defaultSlotValue)
  const anchorId = textToAnchorId(slotText)
  return anchorId
}

const hashClickHandler = async (hash: string) => {
  const target = new URL(hash, location.toString())
  void (await copyToClipboard(target.toString()))
}
</script>
