import { join } from 'node:path'
import { readFile, readdir } from 'node:fs/promises'
import { RfcJsonSchema } from '../../client/app/utilities/rfc-validators.ts'

const baseDir = `${import.meta.dirname}/tmp`

const main = async () => {
  console.log(baseDir)
  const files = await readdir(baseDir)
  const set = new Set()
  for (const file of files) {
    const fileData = await readFile(join(baseDir, file), 'utf-8')
    const obj = JSON.parse(fileData)
    const { data, error } = RfcJsonSchema.safeParse(obj)
    if (error) {
      console.error(file, error)
    }
  }
}

main()
