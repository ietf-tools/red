import type { OidcUser } from '~/utilities/oidc'

const present = (value: string | undefined): string | undefined => (value?.trim() ? value : undefined)

// The nickname is preferred because it is the short form the person chose, and a full name can be long
// enough to wrap the menu onto several lines. The identity provider may send an empty string rather
// than omit a claim it has no value for.
export const userDisplayName = (user: OidcUser | undefined): string => {
  const { nickname, name, preferredUsername } = user ?? {}
  return present(nickname) ?? present(name) ?? present(preferredUsername) ?? 'Account'
}
