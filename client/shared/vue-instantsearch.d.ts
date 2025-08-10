declare module 'vue-instantsearch/vue3/es' {
  declare class AisInstantSearch extends Vue {
    instantSearchInstance: {
      helper: {
        search: function
      }
    }
  }
  declare class AisSearchBox extends Vue {}
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
