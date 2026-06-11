import { base64url } from 'rfc4648'
import * as cookie from 'cookie'
import type { IRequest } from 'itty-router'

interface OidcEnv extends Env {
  OIDC_CLIENT_ID: string
  OIDC_CLIENT_SECRET: string
}

interface JwkKey extends JsonWebKey {
  kid: string
}

interface JwtHeader {
  kid: string
  [key: string]: unknown
}

interface JwtPayload {
  exp: number
  [key: string]: unknown
}

interface DecodedJwt {
  header: JwtHeader
  payload: JwtPayload
  signature: Uint8Array
}

interface VerifyResult {
  isValid: boolean
  isExpired?: boolean
  expiration?: number
}

interface ExchangeResult extends VerifyResult {
  token: string
}

function authorize(env: OidcEnv, state: string, scope: string[]): Response {
  return Response.redirect(
    `${env.OIDC_CLIENT_AUTHORIZATION_ENDPOINT}?response_type=code&client_id=${env.OIDC_CLIENT_ID}&redirect_uri=${env.OIDC_CLIENT_REDIRECT_URI}&scope=${scope.join('%20')}&state=${state}`,
    302
  )
}

async function exchange(env: OidcEnv, code: string): Promise<ExchangeResult | null> {
  const res = await fetch(env.OIDC_CLIENT_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.OIDC_CLIENT_ID,
      client_secret: env.OIDC_CLIENT_SECRET,
      code,
      redirect_uri: env.OIDC_CLIENT_REDIRECT_URI
    })
  }).then((res) => res.json() as Promise<{ id_token?: string }>)

  if (res?.id_token && res.id_token.indexOf('.') > 0) {
    const verifyResult = await verify(env, res.id_token)
    return verifyResult.isValid ? { ...verifyResult, token: res.id_token } : null
  }
  return null
}

function decodeJWT(token: string): DecodedJwt {
  const parts = token.split('.')
  return {
    header: JSON.parse(new TextDecoder().decode(base64url.parse(parts[0], { loose: true }))) as JwtHeader,
    payload: JSON.parse(new TextDecoder().decode(base64url.parse(parts[1], { loose: true }))) as JwtPayload,
    signature: base64url.parse(parts[2], { loose: true })
  }
}

export async function verify(env: OidcEnv, token: string): Promise<VerifyResult> {
  const jwks = await fetch(env.OIDC_CLIENT_KEYS_ENDPOINT, {
    cf: {
      cacheTtl: 86400,
      cacheEverything: true
    }
  }).then((res) => res.json() as Promise<{ keys: JwkKey[] }>)

  const jwt = decodeJWT(token)
  const keyData = jwks.keys.find((k) => k.kid === jwt.header.kid)
  if (!keyData) {
    return { isValid: false }
  }

  const key = await crypto.subtle.importKey('jwk', keyData, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, [
    'verify'
  ])

  const jwsSigningInput = token.split('.').slice(0, 2).join('.')
  const isValid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    jwt.signature,
    new TextEncoder().encode(jwsSigningInput)
  )
  return {
    isValid,
    isExpired: Math.floor(Date.now() / 1000) >= jwt.payload.exp,
    expiration: jwt.payload.exp
  }
}

export async function login(req: IRequest, env: OidcEnv): Promise<Response> {
  const state = crypto.randomUUID()
  const returnPath = typeof req.query?.p === 'string' ? req.query.p : 'none'
  await env.KV_STATE.put(`state-${state}`, returnPath, { expirationTtl: 120 })
  return authorize(env, state, ['openid', 'email', 'roles'])
}

export async function callback(req: IRequest, env: OidcEnv): Promise<Response> {
  try {
    const code = typeof req.query?.code === 'string' ? req.query.code : undefined
    const state = typeof req.query?.state === 'string' ? req.query.state : undefined

    if (!code) {
      return new Response('Failed to authenticate', { status: 401 })
    }

    const savedState = state ? await env.KV_STATE.get(`state-${state}`) : null
    if (!savedState) {
      return new Response('Invalid Authentication Response', { status: 401 })
    }

    const result = await exchange(env, code)
    if (!result) {
      return new Response('Invalid Token', { status: 401 })
    }

    const response = new Response(null, { status: 302, headers: new Headers() })
    response.headers.append('Location', savedState !== 'none' ? savedState : '/')
    response.headers.set(
      'Set-Cookie',
      cookie.serialize('jwt', result.token, {
        httpOnly: true,
        secure: true,
        path: '/',
        maxAge: (result.expiration ?? 0) - Math.floor(Date.now() / 1000)
      })
    )

    return response
  } catch (err) {
    console.error(err)
    return new Response(null, { status: 500 })
  }
}
