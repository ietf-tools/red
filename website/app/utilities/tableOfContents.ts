import type { z } from 'zod'
import type { InjectionKey } from 'vue'
import type { TableOfContentsSchema } from './rfc-validators'

export type RfcEditorToc = z.infer<typeof TableOfContentsSchema>

export const tocKey = Symbol() as InjectionKey<{
  showToc: boolean
  toc?: RfcEditorToc
}>

export const closeModalAndScrollToId = Symbol() as InjectionKey<(id: string) => void>
