import type { z } from 'zod'
import type { Toc as NuxtContentToc } from '@nuxt/content'
import type { InjectionKey } from 'vue'
import type { TableOfContentsSchema } from './rfc-validators'

export type RfcEditorToc = z.infer<typeof TableOfContentsSchema>

export const nuxtContentTocToRfcEditorToc = (
  nuxtContentToc: NuxtContentToc
): RfcEditorToc => {
  return {
    title: nuxtContentToc.title,
    sections: nuxtContentToc.links.map((link) => ({
      links: [
        {
          id: link.id,
          title: link.text
        }
      ],
      sections: link.children?.map((child) => ({
        links: [
          {
            id: child.id,
            title: child.text
          }
        ]
      }))
    }))
  }
}

export const tocKey = Symbol() as InjectionKey<{
  showToc?: boolean
  toc?: RfcEditorToc
}>

export const closeModalAndScrollToId = Symbol() as InjectionKey<
  (id: string) => void
>
