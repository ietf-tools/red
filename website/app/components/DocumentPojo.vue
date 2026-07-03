<template>
  <Component :is="vnodes" />
</template>

<script setup lang="ts">
import { renderDocumentPojo, defaultRenderer } from '~/utilities/renderDocumentPojo'
import type { ElementRenderers } from '~/utilities/renderDocumentPojo'
import type { DocumentPojo } from '~/utilities/rfc-validators'
import { resolveGraphicsIcon } from '~/utilities/graphics-icon'
import { AMaybeRFCLink, GraphicsNewWindowIcon } from '#components'

type Props = {
  value: DocumentPojo
}

const props = defineProps<Props>()

const renderer: ElementRenderers = {
  Anchor: (node, childrenForVue) =>
    h(
      AMaybeRFCLink,
      // @ts-ignore
      node.attributes,
      () => childrenForVue
    ),
  // Content may reference icons by their (previously Iconify) name; resolve that
  // name to a local `components/Graphics/` SVG component. See `resolveGraphicsIcon`.
  Icon: (node, childrenForVue) => {
    const { name, ...attributes } = node.attributes
    const iconComponent = typeof name === 'string' ? resolveGraphicsIcon(name) : undefined
    if (!iconComponent) {
      console.warn(`[DocumentPojo] No Graphics icon is mapped for icon name ${JSON.stringify(name)}`)
      // @ts-ignore
      return h('span', attributes)
    }
    // @ts-ignore
    return h(iconComponent, attributes, () => childrenForVue)
  },
  GraphicsNewWindowIcon: () => h(GraphicsNewWindowIcon),
  ...defaultRenderer
}

const vnodes = computed(() => renderDocumentPojo(props.value, renderer))
</script>
