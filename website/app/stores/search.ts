import type { Density } from "~/utilities/typesense"

export const useSearchStore = defineStore('searchStore', {
  state: () => ({
    density: 'full' as Density,
    isSubseries: false,
    searchContents: false,
    subseriesLabel: '',
    subseriesHref: ''
  }),
  persist: {
    pick: ['density', 'searchContents']
  }
})