declare module 'vue-instantsearch/vue3/es' {
  interface InstantSearchHelper {
    search(): void
  }

  interface InstantSearchInstance {
    helper: InstantSearchHelper
  }

  declare class AisInstantSearch extends Vue {
    instantSearchInstance: InstantSearchInstance
  }
  declare class AisSearchBox extends Vue {
    currentRefinement: string
  }
  declare class AisStats extends Vue {}
  declare class AisHits extends Vue {}
  declare class AisHitsPerPage extends Vue {}
  declare class AisPagination extends Vue {}
  declare class AisSortBy extends Vue {}
  declare class AisMenuSelect extends Vue {}
  declare class AisClearRefinements extends Vue {}
  declare class AisRangeInput extends Vue {}
  declare class AisRefinementList extends Vue {}
  declare class AisHighlight extends Vue {}
  declare class AisToggleRefinement extends Vue {}
}
