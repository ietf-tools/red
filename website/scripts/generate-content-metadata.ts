import { z } from 'zod'
import path from 'node:path'
import fs from 'node:fs'
import { simpleGit } from 'simple-git'
import { globby } from 'globby'

const __dirname = import.meta.dirname
const clientPath = path.resolve(__dirname, '..')
const contentPath = path.resolve(clientPath, 'content')
const contentMetadataPath = path.join(clientPath, 'generated', 'content-metadata.json')

// Changing this schema? Be sure to copy changes to MarkdownPage.vue
const ContentMetadataSchema = z.record(
  /**
   * path within content directory
   */
  z.string(),
  z
    .object({
      /**
       * timestamp ISO 8601
       */
      mtime: z.string()
    })
    .optional()
)
type ContentMetadata = z.infer<typeof ContentMetadataSchema>

const regenerateContentMetadata = async () => {
  const contentMarkdownPaths = await globby(path.join(contentPath, '**/*.md'))

  const git = simpleGit()

  const markdownMetadataArray = await Promise.all(
    contentMarkdownPaths.map(
      (contentMarkdownPath) =>
        new Promise<ContentMetadata>((resolve) => {
          ;(async () => {
            const relativePath = contentMarkdownPath.substring(contentPath.length).replace(/\.md$/, '/')

            try {
              const gitLog = await git.log({
                file: contentMarkdownPath,
                maxCount: 1,
                strictDate: true
              })

              if (gitLog.latest?.date) {
                resolve({
                  [relativePath]: { mtime: gitLog.latest?.date }
                })
              } else {
                console.warn(
                  `Unable to extract latest Git log time from path ${contentMarkdownPath}. Was it commited to Git?`
                )
                resolve({ [relativePath]: undefined })
              }
            } catch (e: unknown) {
              console.error(e)
              resolve({ [relativePath]: undefined })
            }
          })()
        })
    )
  )

  const _contentMetadata = Object.assign({}, ...markdownMetadataArray)
  // Verify shape of data before saving it
  const contentMetadata = ContentMetadataSchema.parse(_contentMetadata)

  // TODO: order the keys in the JSON to make diffs clearer

  console.log(JSON.stringify(contentMetadata, null, 2))

  fs.writeFileSync(contentMetadataPath, JSON.stringify(contentMetadata, null, 2))
}

// Create the file initially on Nuxt load so there aren't import errors on CI
regenerateContentMetadata()
