# precomputer

Precomputes API responses for the website by uploading files to a blob store, because:

- generating some API responses takes minutes, so we can't do it on the fly in Nuxt
- we can improve resilence/performance by precomputing API responses

The precomputer imports Zod schemas from the website so that they can share a definition.
