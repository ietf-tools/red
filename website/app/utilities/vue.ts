export const getVNodeText = (vnode: unknown): string => {
  if (!vnode) {
    return ''
  }

  if (typeof vnode === 'string') {
    return vnode
  }

  if (Array.isArray(vnode)) {
    return vnode.map(getVNodeText).join('')
  }

  if (vnode && typeof vnode === 'object') {
    if ('children' in vnode) {
      const { children } = vnode
      if (typeof children === 'string') {
        return children
      } else if (typeof children === 'function') {
        return getVNodeText(children())
      } else if (
        children &&
        typeof children === 'object' &&
        'default' in children &&
        typeof children.default === 'function'
      ) {
        return getVNodeText(children.default())
      } else if (Array.isArray(children)) {
        return children
          .map((item) => getVNodeText(item as ReturnType<typeof h>))
          .join('')
      }
    } else {
      console.warn("Found object but don't know how to extract text from ", vnode)
    }
  } else {
    console.warn("Don't know how to extract text from ", vnode)
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
  | (string | Record<string, boolean | undefined>)[]
  | Record<string, boolean | undefined>

/**
 * https://stackoverflow.com/questions/55140448/what-is-the-type-for-an-event-in-vue-typescript-project
 */
export type VueClick = (event: Event) => void
