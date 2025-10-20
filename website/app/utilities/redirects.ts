/**
  nuxt.config.ts can only handle basic redirects and more complex redirects need to be handled in middleware

  While Nuxt does support trailing `'**'` patterns (see https://github.com/nitrojs/nitro/pull/1976 ) these
  aren't expressive enough for our usecase which is to redirect /rfc/rfc*.json to /api/v1/rfc/rfc*.json
  where the * is a wildcard whose value gets included in the redirect. The nuxt.config.ts redirect wouldn't
  support wildcards when they're non-trailing, ie before the '.json' suffix.
  */
export const isMiddlewareRedirect = (redirectPattern: string): boolean =>
  redirectPattern.includes('*')
