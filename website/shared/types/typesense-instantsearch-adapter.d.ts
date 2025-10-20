declare module 'typesense-instantsearch-adapter/src/TypesenseInstantsearchAdapter.js' {
    export default class SearchAdaptor {
        constructor(args: {
            server: {
                apiKey: string
                nodes: {
                    host: string
                    port: number
                protocol: 'https'
                    path: string
                }[]
                cacheSearchResultsForSeconds: number
            }
            additionalSearchParameters?: {
                preset: string
            }
        }): void
        searchClient: unknown
        configuration: {
            additionalSearchParameters: {
                preset: string
            }
        }
    }
}
