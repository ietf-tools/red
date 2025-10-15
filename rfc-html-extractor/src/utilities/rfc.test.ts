// @vitest-environment node
import { test, expect } from 'vitest'
import { join, resolve } from 'node:path'
import { readFile, readdir } from 'node:fs/promises'
import { RfcJsonSchema } from '../../../client/app/utilities/rfc-validators.ts'

test(`Compare schema against files`, async () => {
  const baseDir = resolve(
    import.meta.dirname,
    '..',
    'old-rfc-editor.org',
    'rfc'
  )

  const files = await readdir(baseDir)

  for (const file of files) {
    const fileData = await readFile(join(baseDir, file), 'utf-8')
    const obj = JSON.parse(fileData)
    const { error } = RfcJsonSchema.safeParse(obj)
    expect(error).toBeUndefined()
  }
})
