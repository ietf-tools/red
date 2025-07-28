import type { Toc as NuxtContentToc } from '@nuxt/content'
import type { InjectionKey } from 'vue'

type TocLink = {
  id: string
  title: string
}

type TocSection = {
  links?: TocLink[]
  sections?: TocSection[]
}

export type RfcEditorToc = {
  title: string
  sections: TocSection[]
}

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
