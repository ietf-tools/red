import type { InjectionKey } from 'vue'
import type { TableOfContents, TocSectionType } from './rfc-validators'

type Links = NonNullable<TocSectionType['links']>

export const tocKey = Symbol() as InjectionKey<{
  showToc: boolean
  toc?: TableOfContents
}>

export const closeModalAndScrollToId = Symbol() as InjectionKey<(id: string) => void>

/**
 * The original 'Compact HTML' has multiple links per line,
 * but we want to merge them and just use the first link.
 */
export const mergeAdjacentLinks = (tableOfContents: TableOfContents): TableOfContents => {
  const processSection = (section: TocSectionType): TocSectionType => {
    return {
      ...section,
      links: section.links
        ? section.links.reduce((acc, link): Links => {
            const firstLink = acc[0]
            if (!firstLink) {
              return [link]
            }
            return [
              {
                id: firstLink.id,
                title: `${firstLink.title} ${link.title}`
              }
            ]
          }, [] as Links)
        : undefined
    }
  }

  return {
    ...tableOfContents,
    sections: tableOfContents.sections.map(processSection)
  }
}
