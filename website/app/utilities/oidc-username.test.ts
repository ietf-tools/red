import { describe, expect, test } from 'vitest'
import { userDisplayName } from './oidc-username'

const user = { sub: 'abc' }

describe('userDisplayName', () => {
  test('uses the nickname when there is one', () => {
    expect(userDisplayName({ ...user, nickname: 'Mike', name: 'Michael Example', preferredUsername: 'mex' })).toBe(
      'Mike'
    )
  })

  test('falls back to the name without a nickname', () => {
    expect(userDisplayName({ ...user, name: 'Michael Example', preferredUsername: 'mex' })).toBe('Michael Example')
  })

  test('falls back to the username without a nickname or name', () => {
    expect(userDisplayName({ ...user, preferredUsername: 'mex' })).toBe('mex')
  })

  test.each(['', '   '])('treats a nickname of %j as absent', (nickname) => {
    expect(userDisplayName({ ...user, nickname, name: 'Michael Example' })).toBe('Michael Example')
  })

  test('is "Account" when nothing is known', () => {
    expect(userDisplayName(user)).toBe('Account')
    expect(userDisplayName(undefined)).toBe('Account')
  })
})
