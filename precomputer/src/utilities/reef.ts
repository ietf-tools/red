// Reads the two files Reef's precomputer publishes to its own blob store: `stats.json` (every
// document with any rating, subscription or set membership) and `subjects.json` (the whole
// subject vocabulary, keyed by slug rather than by document). Each is downloaded and indexed by
// RFC identifier once per process, however many RFCs ask for it, since both are single files
// covering the whole series rather than per-document resources. Read directly from Reef's bucket
// via S3_REEF_* credentials (see ../utilities/s3.ts), not over HTTP: Red's own build never goes
// through Reef's serving path for its own bucket contents.
//
// Validated with the Zod schemas typed-openapi generates from ../../../website/reef_api.yaml,
// imported from there rather than duplicated: precomputer's Docker image already copies a
// hand-picked file or two out of website/ (see ../../Dockerfile), and adding the generated reef
// schema module to that list is less machinery than a second copy of the OpenAPI contract with
// its own generation step.
import { z } from 'zod'
import { DocumentStats, SubjectIndex } from '../../../website/generated/reef-api-zod.ts'
import type { RfcCommon, ReefRFCStats } from '../../../website/app/utilities/rfc-validators.ts'
import { getFromS3 } from './s3.ts'

type ReefSubjectTag = NonNullable<RfcCommon['reefSubjectTags']>[number]

const REEF_STATS_JSON_KEY = 'stats.json'
const REEF_SUBJECTS_JSON_KEY = 'subjects.json'

/**
 * The identifier Reef canonicalizes RFC numbers to, eg `rfc9110`. Mirrors website's
 * ~/utilities/reef-documents reefDocumentKey, reimplemented here because that file pulls in
 * Vue/Nuxt-only dependencies precomputer can't import.
 */
const reefDocId = (rfcNumber: number): string => `rfc${rfcNumber}`

/**
 * A file from Reef's bucket, parsed -- or `undefined` and logged, never thrown. Neither file is
 * required for a precomputer run to succeed: an RFC just publishes with no `reefStats` /
 * `reefSubjectTags`, the same as it would for a document Reef has no engagement or subject
 * assignment for, so a missing or malformed file degrades every RFC rather than failing the run.
 */
const readReefBucketJson = async <T>(key: string, schema: { parse: (value: unknown) => T }): Promise<T | undefined> => {
  let body: unknown
  try {
    const raw = await getFromS3('S3_REEF_BUCKET', key, 'default', `reef/${key}`)
    if (raw === null) {
      console.error(`[reef] ${key} is missing from the Reef bucket. Continuing with no reef data from it.`)
      return undefined
    }
    body = JSON.parse(String(raw))
  } catch (e) {
    console.error(`[reef] could not read ${key} from the Reef bucket. Continuing with no reef data from it.`, e)
    return undefined
  }
  try {
    return schema.parse(body)
  } catch (e) {
    console.error(
      `[reef] ${key} from the Reef bucket didn't match the expected shape. Continuing with no reef data from it.`,
      e
    )
    return undefined
  }
}

const toReefRFCStats = (stats: DocumentStats): ReefRFCStats => ({
  ratingAggregate: {
    average: stats.rating_average ?? undefined,
    count: stats.rating_count
  },
  subscriberCount: stats.subscriber_count,
  setCount: stats.set_count
})

type ReefStatsIndex = Record<string, DocumentStats>

let _reefStatsIndexPromise: Promise<ReefStatsIndex> | undefined

const getReefStatsIndex = (): Promise<ReefStatsIndex> => {
  if (!_reefStatsIndexPromise) {
    _reefStatsIndexPromise = readReefBucketJson(REEF_STATS_JSON_KEY, z.array(DocumentStats)).then((stats) => {
      const index: ReefStatsIndex = {}
      for (const stat of stats ?? []) {
        index[stat.doc] = stat
      }
      return index
    })
  }
  return _reefStatsIndexPromise
}

/** A document absent from `stats.json` has no rating, subscriber or set at all. */
export const getReefStats = async (rfcNumber: number): Promise<ReefRFCStats | undefined> => {
  const index = await getReefStatsIndex()
  const stats = index[reefDocId(rfcNumber)]
  return stats ? toReefRFCStats(stats) : undefined
}

type ReefSubjectTagsIndex = Record<string, ReefSubjectTag[]>

let _reefSubjectTagsIndexPromise: Promise<ReefSubjectTagsIndex> | undefined

const getReefSubjectTagsIndex = (): Promise<ReefSubjectTagsIndex> => {
  if (!_reefSubjectTagsIndexPromise) {
    _reefSubjectTagsIndexPromise = readReefBucketJson(REEF_SUBJECTS_JSON_KEY, SubjectIndex).then((subjectIndex) => {
      // subjects.json indexes documents per subject, not subjects per document, so a document's
      // tags have to be built by inverting every subject's `documents` list once.
      const index: ReefSubjectTagsIndex = {}
      for (const [slug, subject] of Object.entries(subjectIndex?.subjects ?? {})) {
        const tag: ReefSubjectTag = { slug, title: subject.name }
        for (const docId of subject.documents) {
          const tags = index[docId] ?? (index[docId] = [])
          tags.push(tag)
        }
      }
      return index
    })
  }
  return _reefSubjectTagsIndexPromise
}

/** A document absent from `subjects.json` isn't assigned any subject. */
export const getSubjects = async (rfcNumber: number): Promise<ReefSubjectTag[] | undefined> => {
  const index = await getReefSubjectTagsIndex()
  return index[reefDocId(rfcNumber)]
}
