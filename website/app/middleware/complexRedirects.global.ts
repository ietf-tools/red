import { escapeRegExp } from 'lodash-es'
import redirects from '../../redirects.json'
import { isMiddlewareRedirect } from '~/utilities/redirects'
import { assertIsDefined, assertIsString } from '~/utilities/typescript'

const middlewareRedirects = redirects.redirects
  .filter((redirect) => {
    assertIsString(redirect[0])
    return isMiddlewareRedirect(redirect[0])
  })
  .map((redirect): [RegExp, string] => {
    // Convert wildcard '*' patterns into a regex for matching routes
    // eg ["/rfc/rfc*.json", "/api/v1/rfc/rfc$1.json"]
    // becomes [new RegExp('^/rfc/rfc(.*?)\.json$'), '/api/v1/rfc/rfc$1.json']

    const escapedPattern = escapeRegExp(redirect[0])

    // Convert `*` to a regex pattern
    const regexForPath = escapedPattern.replaceAll(
      '\\*', // we need to match the escaped '*' as '\\*'
      '(.*?)'
    )
    const regex = new RegExp(`^${regexForPath}$`)
    assertIsString(redirect[1])
    return [regex, redirect[1]]
  })

export default defineNuxtRouteMiddleware((to, _from) => {
  for (let i = 0; i < middlewareRedirects.length; i++) {
    const middlewareRedirect = middlewareRedirects[i]
    assertIsDefined(middlewareRedirect)
    const isMatch = middlewareRedirect[0].test(to.fullPath)
    if (isMatch) {
      const newPath = to.fullPath.replace(
        middlewareRedirect[0],
        middlewareRedirect[1]
      )
      return navigateTo(newPath)
    }
  }
})
