/**
 * This file is responsible for extracting/generating all links from markdown.
 */
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import { camelCase } from 'lodash-es'
import { defineNuxtModule, useLogger } from 'nuxt/kit'
import redirects from '../redirects.json'

const __dirname = import.meta.dirname
const clientPath = path.resolve(__dirname, '..')

const generatedAllRedirectPaths = path.resolve(
  clientPath,
  'generated',
  'report-of-all-redirects.ts'
)

const generatedFileWarningHeader = `// Generated file by ${path.basename(import.meta.filename)} DO NOT EDIT\n`

type Logger = ReturnType<typeof useLogger>

const regenerateRedirectLinks = async (logger?: Logger) => {
  // Extracts redirects links so we can test them against type ValidHrefs
  await fsPromises.writeFile(
    generatedAllRedirectPaths,
    `${generatedFileWarningHeader}// Compares redirect destinations against type ValidHrefs\nimport type { ValidHrefs } from '../utilities/url'\n\n${redirects.redirects
      .map(([_fromPath, toPathOrUrl], index) => {
        return `const _${camelCase(toPathOrUrl)}${index + 1}: ValidHrefs = ${JSON.stringify(toPathOrUrl)} // if there is a TS error fix redirects.json or ValidHrefs`
      })
      .join('\n')}`
  )

  logger?.info(` - regenerated ${path.basename(generatedAllRedirectPaths)}`)
}

export default defineNuxtModule({
  setup(options, nuxt) {
    const logger = useLogger('generate-redirect-links', {
      level: options.quiet ? 0 : 3
    })

    nuxt.hook('builder:watch', async (_event, watcherPath) => {
      if (
        // If watcherPath is about a file just updated by one of our modules
        // then we don't want to do anything
        // otherwise we could be stuck in a loop
        watcherPath.includes('generated/') ||
        watcherPath.includes('shared/')
      ) {
        return
      }

      logger.info(
        `Regenerating redirect links because "${watcherPath}" changed`
      )

      await regenerateRedirectLinks(logger)
    })
  }
})

// Create the file(s) initially on Nuxt load so there aren't import errors on CI
await regenerateRedirectLinks()
