import type { Slot } from 'vue'

export const getVNodeText = (
  obj: VNode | VNode[] | Slot | string | undefined | null
): string => {
  if (!obj) {
    return ''
  }

  if (typeof obj === 'string') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(getVNodeText).join('')
  }

  if ('children' in obj) {
    const { children } = obj
    if (typeof children === 'string') {
      return children
    } else if (Array.isArray(children)) {
      return children
        .map((item) => getVNodeText(item as ReturnType<typeof h>))
        .join('')
    }
  }

  return ''
}

/**
 * Vue's `class=""` attribute can take strings, arrays, objects, arrays of objects, etc
 * but the typing is just `any`. Use this for `class` props.
 *
 * Named VueStyleClass rather than VueClass to distinguish from class-based components
 **/
export type VueStyleClass =
  | string
  | (string | boolean)[]
  | Record<string, boolean | undefined>

/**
 * https://stackoverflow.com/questions/55140448/what-is-the-type-for-an-event-in-vue-typescript-project
 */
export type VueClick = (event: Event) => void
