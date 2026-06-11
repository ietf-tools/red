declare module 'vue-instantsearch/vue3/es' {
  interface InstantSearchHelper {
    search(): void
  }

  interface InstantSearchInstance {
    helper: InstantSearchHelper
  }

  class AisInstantSearch extends Vue {
    instantSearchInstance: InstantSearchInstance
  }
  class AisSearchBox extends Vue {
    currentRefinement: string
  }
  class AisStats extends Vue {}
  class AisHits extends Vue {}
  class AisHitsPerPage extends Vue {}
  class AisPagination extends Vue {}
  class AisSortBy extends Vue {}
  class AisMenuSelect extends Vue {}
  class AisClearRefinements extends Vue {}
  class AisRangeInput extends Vue {}
  class AisRefinementList extends Vue {}
  class AisHighlight extends Vue {}
  class AisToggleRefinement extends Vue {}
}
