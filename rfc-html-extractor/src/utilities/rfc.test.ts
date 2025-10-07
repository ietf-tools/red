// @vitest-environment node
import { test, expect } from 'vitest'
import { join, resolve } from 'node:path'
import { readFile, readdir } from 'node:fs/promises'
import { RfcJsonSchema } from '../../../client/app/utilities/rfc-validators.ts'

test(`Compare schema against `, async () => {
  const baseDir = resolve(import.meta.dirname, '..', 'old-rfc-editor.org', 'rfc')

  console.log(baseDir)
  const files = await readdir(baseDir)
  const set = new Set()
  for (const file of files) {
    const fileData = await readFile(join(baseDir, file), 'utf-8')
    const obj = JSON.parse(fileData)
    const { data, error } = RfcJsonSchema.safeParse(obj)
    expect(error).toBeUndefined()
  }
})
