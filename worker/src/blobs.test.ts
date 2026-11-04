// @vitest-environment node
import { expect, test, vi } from 'vitest'
import type { IRequest } from 'itty-router'
import { blobsRfc } from './blobs'

const fakeObject = () =>
  ({
    httpEtag: '"abc"',
    body: 'pdf-bytes',
    writeHttpMetadata: () => {}
  }) as unknown as R2ObjectBody

const makeRequest = (path: string) => {
  const req = new Request(`https://www.rfc-editor.org${path}`) as IRequest
  req.normalizedPath = path
  return req
}

const makeEnv = (keys: string[], redKeys: string[] = []) => {
  const get = vi.fn(async (key: string) => (keys.includes(key) ? fakeObject() : null))
  const redGet = vi.fn(async (key: string) => (redKeys.includes(key) ? fakeObject() : null))
  return { env: { RFC_BUCKET: { get }, RED_BUCKET: { get: redGet } } as unknown as Env, get, redGet }
}

test('serves /rfc/pdfrfc/rfcN.txt.pdf from rfc-txt-pdf/ in the RED bucket', async () => {
  const { env, redGet } = makeEnv([], ['rfc-txt-pdf/rfc5492.txt.pdf'])
  const res = await blobsRfc(makeRequest('/rfc/pdfrfc/rfc5492.txt.pdf'), env)
  expect(redGet).toHaveBeenCalledWith('rfc-txt-pdf/rfc5492.txt.pdf')
  expect(res?.status).toBe(200)
  expect(res?.headers.get('Content-Type')).toBe('application/pdf')
  expect(res?.headers.get('Cache-Control')).toBe('public, max-age=86400')
  expect(res?.headers.get('Link')).toContain('/info/rfc5492/')
})

test('does not serve the txt pdf from the RFC bucket', async () => {
  const { env } = makeEnv(['rfc-txt-pdf/rfc5492.txt.pdf'])
  const res = await blobsRfc(makeRequest('/rfc/pdfrfc/rfc5492.txt.pdf'), env)
  expect(res?.status).toBe(404)
})

test('404s when the txt pdf is not in the bucket', async () => {
  const { env } = makeEnv([])
  const res = await blobsRfc(makeRequest('/rfc/pdfrfc/rfc5492.txt.pdf'), env)
  expect(res?.status).toBe(404)
})

test('redirects leading zeros before looking in the bucket', async () => {
  const { env, get, redGet } = makeEnv([])
  const res = await blobsRfc(makeRequest('/rfc/pdfrfc/rfc0100.txt.pdf'), env)
  expect(res?.status).toBe(302)
  expect(res?.headers.get('Location')).toBe('https://www.rfc-editor.org/rfc/pdfrfc/rfc100.txt.pdf')
  expect(get).not.toHaveBeenCalled()
  expect(redGet).not.toHaveBeenCalled()
})

test.each(['/rfc/pdfrfc/../rfc5492.txt.pdf', '/rfc/pdfrfc/sub/rfc5492.txt.pdf', '/rfc/pdfrfc/other.txt.pdf'])(
  'does not look up %s in the txt pdf prefix',
  async (path) => {
    const { env, redGet } = makeEnv([], ['rfc-txt-pdf/rfc5492.txt.pdf'])
    const res = await blobsRfc(makeRequest(path), env)
    expect(res?.status).toBe(404)
    expect(redGet).not.toHaveBeenCalledWith(expect.stringMatching(/^rfc-txt-pdf\/.*\/|\.\./))
  }
)

test('plain /rfc/rfcN.pdf still comes from pdf/', async () => {
  const { env, get } = makeEnv(['pdf/rfc5492.pdf'])
  const res = await blobsRfc(makeRequest('/rfc/rfc5492.pdf'), env)
  expect(get).toHaveBeenCalledWith('pdf/rfc5492.pdf')
  expect(res?.status).toBe(200)
})
