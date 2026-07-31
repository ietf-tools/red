/**
 * TypeSense helpers that carry no browser dependency.
 *
 * Separate from `typesense.ts` because that module reaches for `window`/`document`, and these
 * helpers are needed by `url.ts` and `url-searchv2.ts`, which are reachable from the Nitro
 * server build — whose tsconfig project has no DOM lib. Same reason `typesense-status.ts` is
 * split out.
 */

/**
 * TypeSense wants spaces encoded as '+' char not '%20'.
 */
export const typeSenseEncodeUriComponent = (uriComponent: string) =>
  encodeURIComponent(uriComponent).replace(/%20/g, '+')
