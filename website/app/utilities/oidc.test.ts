import { describe, expect, test } from 'vitest'
import { parseOidcUser } from './oidc'

describe('parseOidcUser', () => {
  test('maps a full profile, renaming preferred_username', () => {
    const { data } = parseOidcUser({
      sub: 'abc',
      name: 'Michael Example',
      nickname: 'Mike',
      preferred_username: 'mex',
      email: 'mike@example.org',
      picture: 'https://example.org/mike.png',
      iss: 'https://account.example.org/'
    })
    expect(data).toEqual({
      sub: 'abc',
      name: 'Michael Example',
      nickname: 'Mike',
      preferredUsername: 'mex',
      email: 'mike@example.org',
      picture: 'https://example.org/mike.png'
    })
  })

  test('accepts a profile that has only a sub', () => {
    expect(parseOidcUser({ sub: 'abc' }).data).toEqual({ sub: 'abc' })
  })

  test.each([42, ['Mike'], { first: 'Mike' }, null, true])('drops a nickname of %j and keeps the rest', (nickname) => {
    expect(parseOidcUser({ sub: 'abc', name: 'Michael Example', nickname }).data).toMatchObject({
      sub: 'abc',
      name: 'Michael Example',
      nickname: undefined
    })
  })

  test.each([{}, { sub: '' }, { sub: 42 }, { sub: null }, null, undefined, 'abc'])(
    'is not a user when the profile is %j',
    (profile) => {
      const { data, error } = parseOidcUser(profile)
      expect(data).toBeUndefined()
      expect(error).toBeDefined()
    }
  )
})
