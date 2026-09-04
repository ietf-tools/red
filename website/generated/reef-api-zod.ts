// @ts-nocheck
import type * as __TypedOpenapi from './reef-api-zod.types.js'

import { z } from 'zod'

// <Schemas>
export type DocumentMetadata = __TypedOpenapi.Schemas.DocumentMetadata
export const DocumentMetadata = z
  .object({ title: z.string().nullable(), subseries: z.array(z.string()) })
  .catchall(z.unknown())

export type DocumentSetEntry = __TypedOpenapi.Schemas.DocumentSetEntry
export const DocumentSetEntry = z
  .object({ doc: z.string(), rank: z.number().int(), added_at: z.iso.datetime() })
  .catchall(z.unknown())

export type DocumentSet = __TypedOpenapi.Schemas.DocumentSet
export const DocumentSet = z
  .object({
    id: z.uuid(),
    title: z.string().max(200),
    description: z.string().optional(),
    documents: z.array(DocumentSetEntry),
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime()
  })
  .catchall(z.unknown())

export type DocumentSetOrder = __TypedOpenapi.Schemas.DocumentSetOrder
export const DocumentSetOrder = z.object({ documents: z.array(z.string()) }).catchall(z.unknown())

export type DocumentStats = __TypedOpenapi.Schemas.DocumentStats
export const DocumentStats = z
  .object({
    doc: z.string(),
    rating_average: z.number().nullable(),
    rating_count: z.number().int(),
    subscriber_count: z.number().int(),
    set_count: z.number().int()
  })
  .catchall(z.unknown())

export type KindEnum = __TypedOpenapi.Schemas.KindEnum
export const KindEnum = z.enum(['new_rfc', 'by_status', 'obsoleted', 'rfc', 'set', 'subject'])

export type MyDocument = __TypedOpenapi.Schemas.MyDocument
export const MyDocument = z
  .object({
    doc: z.string(),
    your_rating: z.number().int().nullable(),
    your_subscription_id: z.number().int().nullable(),
    your_set_ids: z.array(z.uuid())
  })
  .catchall(z.unknown())

export type MyDocumentSet = __TypedOpenapi.Schemas.MyDocumentSet
export const MyDocumentSet = z
  .object({
    id: z.uuid(),
    title: z.string(),
    description: z.string(),
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime()
  })
  .catchall(z.unknown())

export type MyDocuments = __TypedOpenapi.Schemas.MyDocuments
export const MyDocuments = z
  .object({ sets: z.array(MyDocumentSet), documents: z.array(MyDocument) })
  .catchall(z.unknown())

export type OpenSurvey = __TypedOpenapi.Schemas.OpenSurvey
export const OpenSurvey = z
  .object({
    id: z.number().int(),
    slug: z.string().max(100).regex(new RegExp('^[-a-zA-Z0-9_]+$')),
    title: z.string().max(255),
    description: z.string().optional(),
    url: z.string(),
    documents: z.array(z.string()).nullable()
  })
  .catchall(z.unknown())

export type PatchedDocumentSet = __TypedOpenapi.Schemas.PatchedDocumentSet
export const PatchedDocumentSet = z
  .object({
    id: z.uuid(),
    title: z.string().max(200),
    description: z.string(),
    documents: z.array(DocumentSetEntry),
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime()
  })
  .partial()
  .catchall(z.unknown())

export type StatusEnum = __TypedOpenapi.Schemas.StatusEnum
export const StatusEnum = z.enum(['draft', 'published', 'closed'])

export type VisibilityEnum = __TypedOpenapi.Schemas.VisibilityEnum
export const VisibilityEnum = z.enum(['open', 'authenticated'])

export type PatchedSurvey = __TypedOpenapi.Schemas.PatchedSurvey
export const PatchedSurvey = z
  .object({
    id: z.number().int(),
    slug: z.string().max(100).regex(new RegExp('^[-a-zA-Z0-9_]+$')),
    title: z.string().max(255),
    description: z.string(),
    definition: z.unknown(),
    theme: z.null(),
    status: StatusEnum,
    visibility: VisibilityEnum,
    audience: z.null(),
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime()
  })
  .partial()
  .catchall(z.unknown())

export type PopularEntry = __TypedOpenapi.Schemas.PopularEntry
export const PopularEntry = z
  .object({ rfc: z.string().max(32), rank: z.number().int().min(0).max(2147483647).optional() })
  .catchall(z.unknown())

export type SubjectMetadata = __TypedOpenapi.Schemas.SubjectMetadata
export const SubjectMetadata = z.object({ name: z.string() }).catchall(z.unknown())

export type PrecomputedSubjectDetail = __TypedOpenapi.Schemas.PrecomputedSubjectDetail
export const PrecomputedSubjectDetail = z
  .object({
    id: z.number().int(),
    slug: z.string().regex(new RegExp('^[-a-zA-Z0-9_]+$')),
    name: z.string(),
    description: z.string(),
    parent: z.string().nullable(),
    path: z.string(),
    document_count: z.number().int(),
    document_count_deep: z.number().int(),
    retired: z.boolean(),
    children: z.array(z.string()),
    aliases: z.array(z.string()),
    documents: z.array(z.string()),
    document_meta: z.record(z.string(), DocumentMetadata),
    subject_meta: z.record(z.string(), SubjectMetadata)
  })
  .catchall(z.unknown())

export type RetiredSubject = __TypedOpenapi.Schemas.RetiredSubject
export const RetiredSubject = z
  .object({ slug: z.string().regex(new RegExp('^[-a-zA-Z0-9_]+$')), retired: z.boolean(), merged_into: z.string() })
  .catchall(z.unknown())

export type SubjectAlias = __TypedOpenapi.Schemas.SubjectAlias
export const SubjectAlias = z
  .object({ slug: z.string().regex(new RegExp('^[-a-zA-Z0-9_]+$')), alias_of: z.string() })
  .catchall(z.unknown())

export type PrecomputedSubjectDetailOrRedirect = __TypedOpenapi.Schemas.PrecomputedSubjectDetailOrRedirect
export const PrecomputedSubjectDetailOrRedirect = z
  .union([PrecomputedSubjectDetail, RetiredSubject, SubjectAlias])
  .refine(
    (data) =>
      [
        PrecomputedSubjectDetail.safeParse(data).success,
        RetiredSubject.safeParse(data).success,
        SubjectAlias.safeParse(data).success
      ].filter(Boolean).length === 1,
    { message: 'oneOf' }
  )

export type RatingAggregate = __TypedOpenapi.Schemas.RatingAggregate
export const RatingAggregate = z
  .object({
    rfc: z.string(),
    average: z.number().nullable(),
    count: z.number().int(),
    your_rating: z.number().int().nullable()
  })
  .catchall(z.unknown())

export type RatingWrite = __TypedOpenapi.Schemas.RatingWrite
export const RatingWrite = z.object({ value: z.number().int().min(1).max(5) }).catchall(z.unknown())

export type ResponseCreate = __TypedOpenapi.Schemas.ResponseCreate
export const ResponseCreate = z.object({ data: z.unknown(), meta: z.unknown() }).partial().catchall(z.unknown())

export type Subject = __TypedOpenapi.Schemas.Subject
export const Subject = z
  .object({
    id: z.number().int(),
    slug: z.string().regex(new RegExp('^[-a-zA-Z0-9_]+$')),
    name: z.string(),
    description: z.string(),
    parent: z.string().nullable(),
    path: z.string(),
    document_count: z.number().int(),
    document_count_deep: z.number().int()
  })
  .catchall(z.unknown())

export type SubjectDetail = __TypedOpenapi.Schemas.SubjectDetail
export const SubjectDetail = z
  .object({
    id: z.number().int(),
    slug: z.string().regex(new RegExp('^[-a-zA-Z0-9_]+$')),
    name: z.string(),
    description: z.string(),
    parent: z.string().nullable(),
    path: z.string(),
    document_count: z.number().int(),
    document_count_deep: z.number().int(),
    retired: z.boolean(),
    children: z.array(z.string()),
    aliases: z.array(z.string()),
    documents: z.array(z.string())
  })
  .catchall(z.unknown())

export type SubjectDetailOrRedirect = __TypedOpenapi.Schemas.SubjectDetailOrRedirect
export const SubjectDetailOrRedirect = z
  .union([SubjectDetail, RetiredSubject, SubjectAlias])
  .refine(
    (data) =>
      [
        SubjectDetail.safeParse(data).success,
        RetiredSubject.safeParse(data).success,
        SubjectAlias.safeParse(data).success
      ].filter(Boolean).length === 1,
    { message: 'oneOf' }
  )

export type SubjectIndexEntry = __TypedOpenapi.Schemas.SubjectIndexEntry
export const SubjectIndexEntry = z
  .object({
    id: z.number().int(),
    name: z.string(),
    description: z.string(),
    parent: z.string().nullable(),
    path: z.string(),
    children: z.array(z.string()),
    documents: z.array(z.string()),
    document_count: z.number().int(),
    document_count_deep: z.number().int()
  })
  .catchall(z.unknown())

export type SubjectIndex = __TypedOpenapi.Schemas.SubjectIndex
export const SubjectIndex = z
  .object({ documents: z.record(z.string(), DocumentMetadata), subjects: z.record(z.string(), SubjectIndexEntry) })
  .catchall(z.unknown())

export type Subscription = __TypedOpenapi.Schemas.Subscription
export const Subscription = z
  .object({
    id: z.number().int(),
    kind: KindEnum,
    params: z.unknown().optional(),
    set: z.uuid().nullable().optional(),
    subject: z.number().int().nullable().optional(),
    created_at: z.iso.datetime()
  })
  .catchall(z.unknown())

export type Survey = __TypedOpenapi.Schemas.Survey
export const Survey = z
  .object({
    id: z.number().int(),
    slug: z.string().max(100).regex(new RegExp('^[-a-zA-Z0-9_]+$')),
    title: z.string().max(255),
    description: z.string().optional(),
    definition: z.unknown().optional(),
    theme: z.null().optional(),
    status: StatusEnum.optional(),
    visibility: VisibilityEnum.optional(),
    audience: z.null().optional(),
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime()
  })
  .catchall(z.unknown())

export type SurveyDefinition = __TypedOpenapi.Schemas.SurveyDefinition
export const SurveyDefinition = z
  .object({
    slug: z.string().max(100).regex(new RegExp('^[-a-zA-Z0-9_]+$')),
    title: z.string().max(255),
    description: z.string().optional(),
    definition: z.unknown().optional(),
    theme: z.null().optional(),
    visibility: VisibilityEnum.optional()
  })
  .catchall(z.unknown())

// </Schemas>

// <Endpoints>
export type get_Me_documents_retrieve = __TypedOpenapi.Endpoints.get_Me_documents_retrieve
export const get_Me_documents_retrieve = {
  method: z.literal('GET'),
  path: z.literal('/api/reef/me/documents/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: {
    query: z
      .object({ doc: z.array(z.string()) })
      .partial()
      .strict()
      .optional()
  },
  responses: { 200: MyDocuments }
}

export type get_Popularity_list = __TypedOpenapi.Endpoints.get_Popularity_list
export const get_Popularity_list = {
  method: z.literal('GET'),
  path: z.literal('/api/reef/popularity/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: z.never(),
  responses: { 200: z.array(PopularEntry) }
}

export type get_Precomputed_subject_index_retrieve = __TypedOpenapi.Endpoints.get_Precomputed_subject_index_retrieve
export const get_Precomputed_subject_index_retrieve = {
  method: z.literal('GET'),
  path: z.literal('/api/reef/precomputed/subjects/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: z.never(),
  responses: { 200: SubjectIndex }
}

export type get_Precomputed_subject_detail_retrieve = __TypedOpenapi.Endpoints.get_Precomputed_subject_detail_retrieve
export const get_Precomputed_subject_detail_retrieve = {
  method: z.literal('GET'),
  path: z.literal('/api/reef/precomputed/subjects/{slug}/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: { path: z.object({ slug: z.string() }).strict() },
  responses: { 200: PrecomputedSubjectDetailOrRedirect }
}

export type get_Ratings_retrieve = __TypedOpenapi.Endpoints.get_Ratings_retrieve
export const get_Ratings_retrieve = {
  method: z.literal('GET'),
  path: z.literal('/api/reef/ratings/{rfc}/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: { path: z.object({ rfc: z.string() }).strict() },
  responses: { 200: RatingAggregate }
}

export type put_Ratings_update = __TypedOpenapi.Endpoints.put_Ratings_update
export const put_Ratings_update = {
  method: z.literal('PUT'),
  path: z.literal('/api/reef/ratings/{rfc}/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: { path: z.object({ rfc: z.string() }).strict(), body: RatingWrite },
  responses: { 200: RatingAggregate }
}

export type delete_Ratings_destroy = __TypedOpenapi.Endpoints.delete_Ratings_destroy
export const delete_Ratings_destroy = {
  method: z.literal('DELETE'),
  path: z.literal('/api/reef/ratings/{rfc}/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: { path: z.object({ rfc: z.string() }).strict() },
  responses: { 200: RatingAggregate }
}

export type get_Schema_retrieve = __TypedOpenapi.Endpoints.get_Schema_retrieve
export const get_Schema_retrieve = {
  method: z.literal('GET'),
  path: z.literal('/api/reef/schema/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: {
    query: z
      .object({
        format: z.enum(['json', 'yaml']),
        lang: z.enum([
          'af',
          'ar',
          'ar-dz',
          'ast',
          'az',
          'be',
          'bg',
          'bn',
          'br',
          'bs',
          'ca',
          'ckb',
          'cs',
          'cy',
          'da',
          'de',
          'dsb',
          'el',
          'en',
          'en-au',
          'en-gb',
          'eo',
          'es',
          'es-ar',
          'es-co',
          'es-mx',
          'es-ni',
          'es-ve',
          'et',
          'eu',
          'fa',
          'fi',
          'fr',
          'fy',
          'ga',
          'gd',
          'gl',
          'he',
          'hi',
          'hr',
          'hsb',
          'hu',
          'hy',
          'ia',
          'id',
          'ig',
          'io',
          'is',
          'it',
          'ja',
          'ka',
          'kab',
          'kk',
          'km',
          'kn',
          'ko',
          'ky',
          'lb',
          'lt',
          'lv',
          'mk',
          'ml',
          'mn',
          'mr',
          'ms',
          'my',
          'nb',
          'ne',
          'nl',
          'nn',
          'os',
          'pa',
          'pl',
          'pt',
          'pt-br',
          'ro',
          'ru',
          'sk',
          'sl',
          'sq',
          'sr',
          'sr-latn',
          'sv',
          'sw',
          'ta',
          'te',
          'tg',
          'th',
          'tk',
          'tr',
          'tt',
          'udm',
          'ug',
          'uk',
          'ur',
          'uz',
          'vi',
          'zh-hans',
          'zh-hant'
        ])
      })
      .partial()
      .strict()
      .optional()
  },
  responses: { 200: z.union([z.record(z.string(), z.unknown()), z.record(z.string(), z.unknown())]) }
}

export type get_Sets_list = __TypedOpenapi.Endpoints.get_Sets_list
export const get_Sets_list = {
  method: z.literal('GET'),
  path: z.literal('/api/reef/sets/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: z.never(),
  responses: { 200: z.array(DocumentSet) }
}

export type post_Sets_create = __TypedOpenapi.Endpoints.post_Sets_create
export const post_Sets_create = {
  method: z.literal('POST'),
  path: z.literal('/api/reef/sets/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: { body: DocumentSet },
  responses: { 201: DocumentSet }
}

export type get_Sets_retrieve = __TypedOpenapi.Endpoints.get_Sets_retrieve
export const get_Sets_retrieve = {
  method: z.literal('GET'),
  path: z.literal('/api/reef/sets/{id}/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: { path: z.object({ id: z.uuid() }).strict() },
  responses: { 200: DocumentSet }
}

export type put_Sets_update = __TypedOpenapi.Endpoints.put_Sets_update
export const put_Sets_update = {
  method: z.literal('PUT'),
  path: z.literal('/api/reef/sets/{id}/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: { path: z.object({ id: z.uuid() }).strict(), body: DocumentSet },
  responses: { 200: DocumentSet }
}

export type patch_Sets_partial_update = __TypedOpenapi.Endpoints.patch_Sets_partial_update
export const patch_Sets_partial_update = {
  method: z.literal('PATCH'),
  path: z.literal('/api/reef/sets/{id}/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: { path: z.object({ id: z.uuid() }).strict(), body: PatchedDocumentSet },
  responses: { 200: DocumentSet }
}

export type delete_Sets_destroy = __TypedOpenapi.Endpoints.delete_Sets_destroy
export const delete_Sets_destroy = {
  method: z.literal('DELETE'),
  path: z.literal('/api/reef/sets/{id}/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: { path: z.object({ id: z.uuid() }).strict() },
  responses: { 204: z.unknown() }
}

export type put_Sets_documents_update = __TypedOpenapi.Endpoints.put_Sets_documents_update
export const put_Sets_documents_update = {
  method: z.literal('PUT'),
  path: z.literal('/api/reef/sets/{id}/documents/{doc}/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: { path: z.object({ doc: z.string(), id: z.uuid() }).strict() },
  responses: { 200: DocumentSet, 201: DocumentSet }
}

export type delete_Sets_documents_destroy = __TypedOpenapi.Endpoints.delete_Sets_documents_destroy
export const delete_Sets_documents_destroy = {
  method: z.literal('DELETE'),
  path: z.literal('/api/reef/sets/{id}/documents/{doc}/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: { path: z.object({ doc: z.string(), id: z.uuid() }).strict() },
  responses: { 204: z.unknown() }
}

export type put_Sets_order_update = __TypedOpenapi.Endpoints.put_Sets_order_update
export const put_Sets_order_update = {
  method: z.literal('PUT'),
  path: z.literal('/api/reef/sets/{id}/order/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: { path: z.object({ id: z.uuid() }).strict(), body: DocumentSetOrder },
  responses: { 200: DocumentSet }
}

export type get_Stats_list = __TypedOpenapi.Endpoints.get_Stats_list
export const get_Stats_list = {
  method: z.literal('GET'),
  path: z.literal('/api/reef/stats/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: {
    query: z
      .object({ doc: z.array(z.string()), set: z.uuid() })
      .partial()
      .strict()
      .optional()
  },
  responses: { 200: z.array(DocumentStats) }
}

export type get_Subjects_list = __TypedOpenapi.Endpoints.get_Subjects_list
export const get_Subjects_list = {
  method: z.literal('GET'),
  path: z.literal('/api/reef/subjects/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: { query: z.object({ doc: z.string() }).partial().strict().optional() },
  responses: { 200: z.array(Subject) }
}

export type get_Subjects_retrieve = __TypedOpenapi.Endpoints.get_Subjects_retrieve
export const get_Subjects_retrieve = {
  method: z.literal('GET'),
  path: z.literal('/api/reef/subjects/{slug}/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: { path: z.object({ slug: z.string() }).strict() },
  responses: { 200: SubjectDetailOrRedirect }
}

export type get_Subscriptions_list = __TypedOpenapi.Endpoints.get_Subscriptions_list
export const get_Subscriptions_list = {
  method: z.literal('GET'),
  path: z.literal('/api/reef/subscriptions/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: z.never(),
  responses: { 200: z.array(Subscription) }
}

export type post_Subscriptions_create = __TypedOpenapi.Endpoints.post_Subscriptions_create
export const post_Subscriptions_create = {
  method: z.literal('POST'),
  path: z.literal('/api/reef/subscriptions/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: { body: Subscription },
  responses: { 201: Subscription }
}

export type delete_Subscriptions_destroy = __TypedOpenapi.Endpoints.delete_Subscriptions_destroy
export const delete_Subscriptions_destroy = {
  method: z.literal('DELETE'),
  path: z.literal('/api/reef/subscriptions/{id}/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: { path: z.object({ id: z.coerce.number().int() }).strict() },
  responses: { 204: z.unknown() }
}

export type get_Surveys_list = __TypedOpenapi.Endpoints.get_Surveys_list
export const get_Surveys_list = {
  method: z.literal('GET'),
  path: z.literal('/api/reef/surveys/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: z.never(),
  responses: { 200: z.array(Survey) }
}

export type post_Surveys_create = __TypedOpenapi.Endpoints.post_Surveys_create
export const post_Surveys_create = {
  method: z.literal('POST'),
  path: z.literal('/api/reef/surveys/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: { body: Survey },
  responses: { 201: Survey }
}

export type get_Surveys_retrieve = __TypedOpenapi.Endpoints.get_Surveys_retrieve
export const get_Surveys_retrieve = {
  method: z.literal('GET'),
  path: z.literal('/api/reef/surveys/{id}/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: { path: z.object({ id: z.coerce.number().int() }).strict() },
  responses: { 200: Survey }
}

export type put_Surveys_update = __TypedOpenapi.Endpoints.put_Surveys_update
export const put_Surveys_update = {
  method: z.literal('PUT'),
  path: z.literal('/api/reef/surveys/{id}/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: { path: z.object({ id: z.coerce.number().int() }).strict(), body: Survey },
  responses: { 200: Survey }
}

export type patch_Surveys_partial_update = __TypedOpenapi.Endpoints.patch_Surveys_partial_update
export const patch_Surveys_partial_update = {
  method: z.literal('PATCH'),
  path: z.literal('/api/reef/surveys/{id}/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: { path: z.object({ id: z.coerce.number().int() }).strict(), body: PatchedSurvey },
  responses: { 200: Survey }
}

export type delete_Surveys_destroy = __TypedOpenapi.Endpoints.delete_Surveys_destroy
export const delete_Surveys_destroy = {
  method: z.literal('DELETE'),
  path: z.literal('/api/reef/surveys/{id}/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: { path: z.object({ id: z.coerce.number().int() }).strict() },
  responses: { 204: z.unknown() }
}

export type get_Surveys_results_retrieve = __TypedOpenapi.Endpoints.get_Surveys_results_retrieve
export const get_Surveys_results_retrieve = {
  method: z.literal('GET'),
  path: z.literal('/api/reef/surveys/{id}/results/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: { path: z.object({ id: z.coerce.number().int() }).strict() },
  responses: { 200: z.record(z.string(), z.unknown()) }
}

export type get_Surveys_definition_retrieve = __TypedOpenapi.Endpoints.get_Surveys_definition_retrieve
export const get_Surveys_definition_retrieve = {
  method: z.literal('GET'),
  path: z.literal('/api/reef/surveys/{slug}/definition/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: { path: z.object({ slug: z.string() }).strict() },
  responses: { 200: SurveyDefinition }
}

export type post_Surveys_responses_create = __TypedOpenapi.Endpoints.post_Surveys_responses_create
export const post_Surveys_responses_create = {
  method: z.literal('POST'),
  path: z.literal('/api/reef/surveys/{slug}/responses/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: { path: z.object({ slug: z.string() }).strict(), body: ResponseCreate },
  responses: { 201: ResponseCreate }
}

export type get_Surveys_open_list = __TypedOpenapi.Endpoints.get_Surveys_open_list
export const get_Surveys_open_list = {
  method: z.literal('GET'),
  path: z.literal('/api/reef/surveys/open/'),
  requestFormat: z.literal('json'),
  responseFormat: z.literal('json'),
  parameters: z.never(),
  responses: { 200: z.array(OpenSurvey) }
}

// </Endpoints>

// <EndpointByMethod>
export const EndpointByMethod = {
  get: {
    '/api/reef/me/documents/': get_Me_documents_retrieve,
    '/api/reef/popularity/': get_Popularity_list,
    '/api/reef/precomputed/subjects/': get_Precomputed_subject_index_retrieve,
    '/api/reef/precomputed/subjects/{slug}/': get_Precomputed_subject_detail_retrieve,
    '/api/reef/ratings/{rfc}/': get_Ratings_retrieve,
    '/api/reef/schema/': get_Schema_retrieve,
    '/api/reef/sets/': get_Sets_list,
    '/api/reef/sets/{id}/': get_Sets_retrieve,
    '/api/reef/stats/': get_Stats_list,
    '/api/reef/subjects/': get_Subjects_list,
    '/api/reef/subjects/{slug}/': get_Subjects_retrieve,
    '/api/reef/subscriptions/': get_Subscriptions_list,
    '/api/reef/surveys/': get_Surveys_list,
    '/api/reef/surveys/{id}/': get_Surveys_retrieve,
    '/api/reef/surveys/{id}/results/': get_Surveys_results_retrieve,
    '/api/reef/surveys/{slug}/definition/': get_Surveys_definition_retrieve,
    '/api/reef/surveys/open/': get_Surveys_open_list
  },
  put: {
    '/api/reef/ratings/{rfc}/': put_Ratings_update,
    '/api/reef/sets/{id}/': put_Sets_update,
    '/api/reef/sets/{id}/documents/{doc}/': put_Sets_documents_update,
    '/api/reef/sets/{id}/order/': put_Sets_order_update,
    '/api/reef/surveys/{id}/': put_Surveys_update
  },
  delete: {
    '/api/reef/ratings/{rfc}/': delete_Ratings_destroy,
    '/api/reef/sets/{id}/': delete_Sets_destroy,
    '/api/reef/sets/{id}/documents/{doc}/': delete_Sets_documents_destroy,
    '/api/reef/subscriptions/{id}/': delete_Subscriptions_destroy,
    '/api/reef/surveys/{id}/': delete_Surveys_destroy
  },
  post: {
    '/api/reef/sets/': post_Sets_create,
    '/api/reef/subscriptions/': post_Subscriptions_create,
    '/api/reef/surveys/': post_Surveys_create,
    '/api/reef/surveys/{slug}/responses/': post_Surveys_responses_create
  },
  patch: {
    '/api/reef/sets/{id}/': patch_Sets_partial_update,
    '/api/reef/surveys/{id}/': patch_Surveys_partial_update
  }
} satisfies {
  [M in keyof __TypedOpenapi.EndpointByMethod]: { [P in keyof __TypedOpenapi.EndpointByMethod[M]]: unknown }
}
export type EndpointByMethod = __TypedOpenapi.EndpointByMethod
// </EndpointByMethod>

// <EndpointByMethod.Shorthands>
export type GetEndpoints = EndpointByMethod['get']
export type PutEndpoints = EndpointByMethod['put']
export type DeleteEndpoints = EndpointByMethod['delete']
export type PostEndpoints = EndpointByMethod['post']
export type PatchEndpoints = EndpointByMethod['patch']
// </EndpointByMethod.Shorthands>

// <ApiClientTypes>
export type EndpointParameters = {
  body?: unknown
  query?: unknown
  header?: unknown
  path?: unknown
  cookie?: unknown
}

export type MutationMethod = 'post' | 'put' | 'patch' | 'delete'
export type Method = 'get' | 'head' | 'options' | 'trace' | MutationMethod

export type RequestFormat = 'json' | 'form-data' | 'form-url' | 'binary' | 'text'
export type ResponseFormat = 'json' | 'sse'
export type SecurityRequirements = readonly (readonly string[])[]

// <EndpointRequestFormats>
/** Non-json request body encodings; missing entries default to `"json"`. */
export const endpointRequestFormats = {} as Partial<{
  [M in keyof EndpointByMethod]: Partial<{ [P in keyof EndpointByMethod[M]]: RequestFormat }>
}>
// </EndpointRequestFormats>

// <EndpointParameterStyles>
export type ParameterSerialization = { style: string; explode: boolean; allowReserved: boolean }
export type EndpointParameterStyles = Partial<
  Record<'query' | 'path' | 'header' | 'cookie', Record<string, ParameterSerialization>>
>
/** OpenAPI parameter styles used by the built-in encoders. */
export const endpointParameterStyles = {
  get: {
    '/api/reef/me/documents/': { query: { doc: { style: 'form', explode: true, allowReserved: false } } },
    '/api/reef/precomputed/subjects/{slug}/': {
      path: { slug: { style: 'simple', explode: false, allowReserved: false } }
    },
    '/api/reef/ratings/{rfc}/': { path: { rfc: { style: 'simple', explode: false, allowReserved: false } } },
    '/api/reef/schema/': {
      query: {
        format: { style: 'form', explode: true, allowReserved: false },
        lang: { style: 'form', explode: true, allowReserved: false }
      }
    },
    '/api/reef/sets/{id}/': { path: { id: { style: 'simple', explode: false, allowReserved: false } } },
    '/api/reef/stats/': {
      query: {
        doc: { style: 'form', explode: true, allowReserved: false },
        set: { style: 'form', explode: true, allowReserved: false }
      }
    },
    '/api/reef/subjects/': { query: { doc: { style: 'form', explode: true, allowReserved: false } } },
    '/api/reef/subjects/{slug}/': { path: { slug: { style: 'simple', explode: false, allowReserved: false } } },
    '/api/reef/surveys/{id}/': { path: { id: { style: 'simple', explode: false, allowReserved: false } } },
    '/api/reef/surveys/{id}/results/': { path: { id: { style: 'simple', explode: false, allowReserved: false } } },
    '/api/reef/surveys/{slug}/definition/': {
      path: { slug: { style: 'simple', explode: false, allowReserved: false } }
    }
  },
  put: {
    '/api/reef/ratings/{rfc}/': { path: { rfc: { style: 'simple', explode: false, allowReserved: false } } },
    '/api/reef/sets/{id}/': { path: { id: { style: 'simple', explode: false, allowReserved: false } } },
    '/api/reef/sets/{id}/documents/{doc}/': {
      path: {
        doc: { style: 'simple', explode: false, allowReserved: false },
        id: { style: 'simple', explode: false, allowReserved: false }
      }
    },
    '/api/reef/sets/{id}/order/': { path: { id: { style: 'simple', explode: false, allowReserved: false } } },
    '/api/reef/surveys/{id}/': { path: { id: { style: 'simple', explode: false, allowReserved: false } } }
  },
  delete: {
    '/api/reef/ratings/{rfc}/': { path: { rfc: { style: 'simple', explode: false, allowReserved: false } } },
    '/api/reef/sets/{id}/': { path: { id: { style: 'simple', explode: false, allowReserved: false } } },
    '/api/reef/sets/{id}/documents/{doc}/': {
      path: {
        doc: { style: 'simple', explode: false, allowReserved: false },
        id: { style: 'simple', explode: false, allowReserved: false }
      }
    },
    '/api/reef/subscriptions/{id}/': { path: { id: { style: 'simple', explode: false, allowReserved: false } } },
    '/api/reef/surveys/{id}/': { path: { id: { style: 'simple', explode: false, allowReserved: false } } }
  },
  patch: {
    '/api/reef/sets/{id}/': { path: { id: { style: 'simple', explode: false, allowReserved: false } } },
    '/api/reef/surveys/{id}/': { path: { id: { style: 'simple', explode: false, allowReserved: false } } }
  },
  post: {
    '/api/reef/surveys/{slug}/responses/': { path: { slug: { style: 'simple', explode: false, allowReserved: false } } }
  }
} as Partial<Record<string, Partial<Record<string, EndpointParameterStyles>>>>
// </EndpointParameterStyles>

// <EndpointResponseFormats>
/** Non-json response body modes; missing entries default to `"json"`. SSE skips JSON parse + output validation. */
export const endpointResponseFormats = {} as Partial<{
  [M in keyof EndpointByMethod]: Partial<{ [P in keyof EndpointByMethod[M]]: ResponseFormat }>
}>
// </EndpointResponseFormats>

// <EndpointSecurityRequirements>
/** OpenAPI security requirements applied when an endpoint has no explicit entry. */
export const defaultSecurityRequirements = [['BearerAuth'], ['cookieAuth']] as SecurityRequirements
/** Endpoint-specific security requirements that differ from the default. */
export const endpointSecurityRequirements = {
  get: {
    '/api/reef/popularity/': [['BearerAuth'], ['cookieAuth'], []],
    '/api/reef/precomputed/subjects/': [['BearerAuth'], ['cookieAuth'], []],
    '/api/reef/precomputed/subjects/{slug}/': [['BearerAuth'], ['cookieAuth'], []],
    '/api/reef/ratings/{rfc}/': [['BearerAuth'], ['cookieAuth'], []],
    '/api/reef/schema/': [['BearerAuth'], ['cookieAuth'], []],
    '/api/reef/sets/{id}/': [['BearerAuth'], ['cookieAuth'], []],
    '/api/reef/stats/': [['BearerAuth'], ['cookieAuth'], []],
    '/api/reef/subjects/': [['BearerAuth'], ['cookieAuth'], []],
    '/api/reef/subjects/{slug}/': [['BearerAuth'], ['cookieAuth'], []],
    '/api/reef/surveys/{slug}/definition/': [['BearerAuth'], ['cookieAuth'], []],
    '/api/reef/surveys/open/': [['BearerAuth'], ['cookieAuth'], []]
  },
  post: { '/api/reef/surveys/{slug}/responses/': [['BearerAuth'], ['cookieAuth'], []] }
} as Partial<{ [M in keyof EndpointByMethod]: Partial<{ [P in keyof EndpointByMethod[M]]: SecurityRequirements }> }>
// </EndpointSecurityRequirements>

export type DefaultEndpoint = {
  parameters?: EndpointParameters | undefined
  responses?: Record<string, unknown>
  responseHeaders?: Record<string, unknown>
}

export type Endpoint<TConfig extends DefaultEndpoint = DefaultEndpoint> = {
  operationId: string
  method: Method
  path: string
  requestFormat: RequestFormat
  responseFormat: ResponseFormat
  parameters?: TConfig['parameters']
  meta: {
    alias: string
    hasParameters: boolean
    areParametersRequired: boolean
  }
  responses?: TConfig['responses']
  responseHeaders?: TConfig['responseHeaders']
}

/**
 * Minimal response surface used by ApiClient — avoids depending on the DOM `Response`
 * global (helpful for Node without DOM lib). Structural typing accepts fetch Response.
 */
export interface FetcherResponse {
  ok: boolean
  status: number
  statusText: string
  headers: {
    get(name: string): string | null
    getSetCookie?: () => string[]
  }
  /** Present on fetch Response; used for SSE / streaming bodies. */
  body?: ReadableStream<Uint8Array> | null
  json(): Promise<unknown>
  text(): Promise<string>
  arrayBuffer(): Promise<ArrayBuffer>
  clone(): FetcherResponse
}

export interface Fetcher {
  decodePathParams?: (path: string, pathParams: unknown, styles?: Record<string, ParameterSerialization>) => string
  encodeSearchParams?: (
    searchParams: unknown,
    styles?: Record<string, ParameterSerialization>
  ) => URLSearchParams | undefined
  /** Merge cookie params into request headers (default: Cookie header). */
  encodeCookies?: (cookies: unknown, headers: Headers) => void
  //
  fetch: (input: {
    method: Method
    url: URL
    urlSearchParams?: URLSearchParams | undefined
    parameters?: EndpointParameters | undefined
    path: string
    /** How to encode `parameters.body` (from OpenAPI requestBody content type). */
    requestFormat: RequestFormat
    /** OpenAPI parameter serialization metadata for the current endpoint. */
    parameterStyles?: EndpointParameterStyles
    /** OpenAPI security requirements for this operation. Empty means no credentials are required. */
    security?: SecurityRequirements
    overrides?: RequestInit
    throwOnStatusError?: boolean
  }) => Promise<FetcherResponse>
  parseResponseData?: (response: FetcherResponse) => Promise<unknown>
}

export const successStatusCodes = [
  200, 201, 202, 203, 204, 205, 206, 207, 208, 226, 300, 301, 302, 303, 304, 305, 306, 307, 308
] as const
export type SuccessStatusCode = (typeof successStatusCodes)[number]

export const errorStatusCodes = [
  400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 421, 422, 423, 424,
  425, 426, 428, 429, 431, 451, 500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511
] as const
export type ErrorStatusCode = (typeof errorStatusCodes)[number]

// Taken from https://github.com/unjs/fetchdts/blob/ec4eaeab5d287116171fc1efd61f4a1ad34e4609/src/fetch.ts#L3
export interface TypedHeaders<TypedHeaderValues = unknown> extends Omit<
  Headers,
  'append' | 'delete' | 'get' | 'getSetCookie' | 'has' | 'set' | 'forEach'
> {
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/append) */
  append: <Name extends Extract<keyof TypedHeaderValues, string> | (string & {})>(
    name: Name,
    value: Lowercase<Name> extends keyof TypedHeaderValues ? TypedHeaderValues[Lowercase<Name>] : string
  ) => void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/delete) */
  delete: <Name extends Extract<keyof TypedHeaderValues, string> | (string & {})>(name: Name) => void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/get) */
  get: <Name extends Extract<keyof TypedHeaderValues, string> | (string & {})>(
    name: Name
  ) => (Lowercase<Name> extends keyof TypedHeaderValues ? TypedHeaderValues[Lowercase<Name>] : string) | null
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/getSetCookie) */
  getSetCookie: () => string[]
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/has) */
  has: <Name extends Extract<keyof TypedHeaderValues, string> | (string & {})>(name: Name) => boolean
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/set) */
  set: <Name extends Extract<keyof TypedHeaderValues, string> | (string & {})>(
    name: Name,
    value: Lowercase<Name> extends keyof TypedHeaderValues ? TypedHeaderValues[Lowercase<Name>] : string
  ) => void
  forEach: (
    callbackfn: (
      value: TypedHeaderValues[keyof TypedHeaderValues] | (string & {}),
      key: Extract<keyof TypedHeaderValues, string> | (string & {}),
      parent: TypedHeaders<TypedHeaderValues>
    ) => void,
    thisArg?: unknown
  ) => void
}

/** @see https://developer.mozilla.org/en-US/docs/Web/API/Response */
export interface TypedSuccessResponse<TSuccess, TStatusCode, THeaders> extends Omit<
  FetcherResponse,
  'ok' | 'status' | 'json' | 'headers'
> {
  ok: true
  status: TStatusCode
  headers: never extends THeaders ? FetcherResponse['headers'] : TypedHeaders<THeaders>
  data: TSuccess
  /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Response/json) */
  json: () => Promise<TSuccess>
}

/** @see https://developer.mozilla.org/en-US/docs/Web/API/Response */
export interface TypedErrorResponse<TData, TStatusCode, THeaders> extends Omit<
  FetcherResponse,
  'ok' | 'status' | 'json' | 'headers'
> {
  ok: false
  status: TStatusCode
  headers: never extends THeaders ? FetcherResponse['headers'] : TypedHeaders<THeaders>
  data: TData
  /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Response/json) */
  json: () => Promise<TData>
}

type StatusCodeFromKey<TKey> = TKey extends `${infer TStatusCode extends number}`
  ? TStatusCode
  : TKey extends number
    ? TKey
    : never

export type TypedApiResponse<TAllResponses = {}, THeaders = {}> = {
  [K in keyof TAllResponses]: StatusCodeFromKey<K> extends infer TStatusCode extends number
    ? TStatusCode extends SuccessStatusCode
      ? TypedSuccessResponse<TAllResponses[K], TStatusCode, K extends keyof THeaders ? THeaders[K] : never>
      : TypedErrorResponse<TAllResponses[K], TStatusCode, K extends keyof THeaders ? THeaders[K] : never>
    : never
}[keyof TAllResponses]

type __TypedOpenapiSchema<TOutput, TInput = TOutput> = {
  readonly __typedOpenapiOutput: TOutput
  readonly __typedOpenapiInput: TInput
}
type OptionalUndefinedKeys<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K]
} & {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>
}
export type InferSchemaValue<T> = T extends string | number | boolean | bigint | symbol | null | undefined
  ? T
  : T extends __TypedOpenapiSchema<infer O>
    ? O
    : T extends z.ZodType
      ? z.infer<T>
      : T extends (...args: never[]) => unknown
        ? T
        : T extends object
          ? { [K in keyof T]: InferSchemaValue<T[K]> }
          : T
type InferSchemaInputRaw<T> = T extends string | number | boolean | bigint | symbol | null | undefined
  ? T
  : T extends __TypedOpenapiSchema<infer _O, infer I>
    ? I
    : T extends z.ZodType
      ? z.input<T>
      : T extends (...args: never[]) => unknown
        ? T
        : T extends object
          ? { [K in keyof T]: InferSchemaInputRaw<T[K]> }
          : T
type InferSchemaInput<T> = OptionalUndefinedKeys<InferSchemaInputRaw<T>>

export type SafeApiResponse<TEndpoint> = TEndpoint extends { responses: infer TResponses }
  ? TResponses extends Record<string | number, unknown>
    ? TypedApiResponse<
        InferSchemaValue<TResponses>,
        TEndpoint extends { responseHeaders: infer THeaders } ? InferSchemaValue<THeaders> : never
      >
    : never
  : never

export type InferResponseByStatus<TEndpoint, TStatusCode> = Extract<SafeApiResponse<TEndpoint>, { status: TStatusCode }>

/**
 * Success-body payload — InferSchemaValue only on success statuses.
 * Filter with extends {} like the old Extract { data: {} } so unknown bodies (e.g. 304) drop out.
 */
export type InferSuccessData<TEndpoint> = TEndpoint extends { responses: infer TResponses }
  ? {
      [K in keyof TResponses]: StatusCodeFromKey<K> extends infer TStatusCode extends number
        ? TStatusCode extends SuccessStatusCode
          ? Extract<InferSchemaValue<TResponses[K]>, {}>
          : never
        : never
    }[keyof TResponses]
  : never

type RequiredKeys<T> = {
  [P in keyof T]-?: undefined extends T[P] ? never : P
}[keyof T]

type MaybeOptionalArg<T> = RequiredKeys<T> extends never ? [config?: T] : [config: T]
type NotNever<T> = [T] extends [never] ? false : true

export type ApiQueryOptions = {
  /** Override whether a generated TanStack Query consumes TanStack Query's AbortSignal. */
  consumeQuerySignal?: boolean
}

/** Call options merged onto inferred endpoint parameters. */
type ApiRequestOptions = {
  overrides?: RequestInit
  queryOptions?: ApiQueryOptions
  withResponse?: boolean
  throwOnStatusError?: boolean
  validate?: ValidateSide
}

/** Parameter bag for an endpoint + request options. */
export type ApiCallParams<TEndpoint> = TEndpoint extends { parameters: infer UParams }
  ? NotNever<InferSchemaInput<UParams>> extends true
    ? InferSchemaInput<UParams> & ApiRequestOptions
    : ApiRequestOptions
  : ApiRequestOptions

/** Resolve response type from withResponse flag on the call config. */
export type ApiCallResult<TEndpoint, TParams> = TParams extends { withResponse: true }
  ? SafeApiResponse<TEndpoint>
  : InferSuccessData<TEndpoint>

export type ValidateSide = 'none' | 'input' | 'output' | 'both'
export type OnValidate = (ctx: {
  side: 'input' | 'output'
  method: string
  path: string
  schema: unknown
  value: unknown
}) => unknown | Promise<unknown>

// </ApiClientTypes>

// <TypedStatusError>
export class TypedStatusError<TData = unknown> extends Error {
  response: TypedErrorResponse<TData, ErrorStatusCode, unknown>
  status: number
  constructor(response: TypedErrorResponse<TData, ErrorStatusCode, unknown>) {
    super(`HTTP ${response.status}: ${response.statusText}`)
    this.name = 'TypedStatusError'
    this.response = response
    this.status = response.status
  }
}
// </TypedStatusError>

// <ValidateHelpers>
const defaultParse = (schema: unknown, value: unknown): unknown => {
  return (schema as { parse: (v: unknown) => unknown }).parse(value)
}

const runValidate = async (ctx: {
  side: 'input' | 'output'
  method: string
  path: string
  schema: unknown
  value: unknown
  onValidate?: OnValidate
}): Promise<unknown> => {
  if (ctx.onValidate) return ctx.onValidate(ctx)
  return defaultParse(ctx.schema, ctx.value)
}
// </ValidateHelpers>

// <ApiClient>
export class ApiClient {
  baseUrl: string = ''
  successStatusCodes = successStatusCodes
  errorStatusCodes = errorStatusCodes
  validate: ValidateSide = 'both'
  onValidate?: OnValidate

  constructor(
    public fetcher: Fetcher,
    options?: { validate?: ValidateSide; onValidate?: OnValidate }
  ) {
    if (options?.validate !== undefined) this.validate = options.validate
    if (options?.onValidate) this.onValidate = options.onValidate
  }

  setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl
    return this
  }

  setValidate(validate: ValidateSide) {
    this.validate = validate
    return this
  }

  setOnValidate(onValidate: OnValidate | undefined) {
    if (onValidate === undefined) {
      delete this.onValidate
    } else {
      this.onValidate = onValidate
    }
    return this
  }

  /**
   * Replace path parameters in URL
   * Supports both OpenAPI format {param} and Express format :param
   */
  defaultDecodePathParams = (url: string, params: unknown, styles?: Record<string, ParameterSerialization>): string => {
    const record = (params ?? {}) as Record<string, unknown>
    const encode = (value: unknown) => encodeURIComponent(String(value))
    const serialize = (key: string, value: unknown): string => {
      const parameterStyle = styles?.[key]
      const style = parameterStyle?.style ?? 'simple'
      const explode = parameterStyle?.explode ?? false
      if (style === 'label') {
        if (Array.isArray(value))
          return (
            '.' +
            value
              .filter((item) => item != null)
              .map(encode)
              .join(explode ? '.' : ',')
          )
        if (value && typeof value === 'object') {
          const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) => item != null)
          return (
            '.' +
            (explode
              ? entries.map(([name, item]) => encode(name) + '=' + encode(item)).join('.')
              : entries.flatMap(([name, item]) => [encode(name), encode(item)]).join(','))
          )
        }
        return '.' + encode(value)
      }
      if (style === 'matrix') {
        if (Array.isArray(value))
          return explode
            ? value
                .filter((item) => item != null)
                .map((item) => ';' + key + '=' + encode(item))
                .join('')
            : ';' +
                key +
                '=' +
                value
                  .filter((item) => item != null)
                  .map(encode)
                  .join(',')
        if (value && typeof value === 'object') {
          const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) => item != null)
          return explode
            ? entries.map(([name, item]) => ';' + encode(name) + '=' + encode(item)).join('')
            : ';' + key + '=' + entries.flatMap(([name, item]) => [encode(name), encode(item)]).join(',')
        }
        return ';' + key + '=' + encode(value)
      }
      if (Array.isArray(value))
        return value
          .filter((item) => item != null)
          .map(encode)
          .join(',')
      if (value && typeof value === 'object') {
        return Object.entries(value as Record<string, unknown>)
          .filter(([, item]) => item != null)
          .map(([name, item]) => (explode ? encode(name) + '=' + encode(item) : [encode(name), encode(item)]))
          .flat()
          .join(',')
      }
      return encode(value)
    }
    return url
      .replace(/{([^}]+)}/g, (_, key: string) => (record[key] != null ? serialize(key, record[key]) : `{${key}}`))
      .replace(/:([a-zA-Z0-9_]+)/g, (_, key: string) => (record[key] != null ? serialize(key, record[key]) : `:${key}`))
  }

  /** Uses URLSearchParams, skips null/undefined values */
  defaultEncodeSearchParams = (
    queryParams: unknown,
    styles?: Record<string, ParameterSerialization>
  ): URLSearchParams | undefined => {
    if (!queryParams || typeof queryParams !== 'object') return

    const searchParams = new URLSearchParams()
    const rawEntries: Array<{ key: string; value: string; allowReserved: boolean }> = []
    const append = (key: string, value: unknown, allowReserved = false) => {
      const stringValue = String(value)
      searchParams.append(key, stringValue)
      rawEntries.push({ key, value: stringValue, allowReserved })
    }
    const encodeQueryComponent = (value: string, allowReserved: boolean) => {
      const encoded = encodeURIComponent(value)
      return allowReserved
        ? encoded.replace(/%3A|%2F|%3F|%40|%21|%24|%26|%27|%28|%29|%2A|%2B|%2C|%3B|%3D|%5B|%5D/gi, (part) =>
            decodeURIComponent(part)
          )
        : encoded
    }
    Object.defineProperty(searchParams, 'toString', {
      value: () =>
        rawEntries
          .map(
            ({ key, value, allowReserved }) =>
              `${encodeQueryComponent(key, false)}=${encodeQueryComponent(value, allowReserved)}`
          )
          .join('&')
    })
    Object.entries(queryParams as Record<string, unknown>).forEach(([key, value]) => {
      if (value != null) {
        // Skip null/undefined values
        const parameterStyle = styles?.[key]
        const style = parameterStyle?.style ?? 'form'
        const explode = parameterStyle?.explode ?? true
        const allowReserved = parameterStyle?.allowReserved === true
        if (Array.isArray(value)) {
          if (style === 'spaceDelimited')
            append(
              key,
              value
                .filter((item) => item != null)
                .map(String)
                .join(' '),
              allowReserved
            )
          else if (style === 'pipeDelimited')
            append(
              key,
              value
                .filter((item) => item != null)
                .map(String)
                .join('|'),
              allowReserved
            )
          else if (explode) value.forEach((val) => val != null && append(key, val, allowReserved))
          else
            append(
              key,
              value
                .filter((item) => item != null)
                .map(String)
                .join(','),
              allowReserved
            )
        } else if (typeof value === 'object') {
          const entries = Object.entries(value as Record<string, unknown>).filter(
            ([, nestedValue]) => nestedValue != null
          )
          if (style === 'deepObject') {
            for (const [nestedKey, nestedValue] of entries) {
              if (Array.isArray(nestedValue))
                nestedValue.forEach((item) => item != null && append(`${key}[${nestedKey}]`, item, allowReserved))
              else append(`${key}[${nestedKey}]`, nestedValue, allowReserved)
            }
          } else if (explode) {
            for (const [nestedKey, nestedValue] of entries) {
              if (Array.isArray(nestedValue))
                nestedValue.forEach((item) => item != null && append(nestedKey, item, allowReserved))
              else append(nestedKey, nestedValue, allowReserved)
            }
          } else {
            append(
              key,
              entries
                .flatMap(([nestedKey, nestedValue]) => [
                  nestedKey,
                  ...(Array.isArray(nestedValue) ? nestedValue : [nestedValue])
                ])
                .map(String)
                .join(','),
              allowReserved
            )
          }
        } else {
          append(key, value, allowReserved)
        }
      }
    })

    return searchParams
  }

  /** Append cookie params as a Cookie header (or merge into existing). */
  defaultEncodeCookies = (cookies: unknown, headers: Headers): void => {
    if (!cookies || typeof cookies !== 'object') return
    const parts = Object.entries(cookies as Record<string, unknown>)
      .filter(([, value]) => value != null)
      .map(([key, value]) => `${key}=${String(value)}`)
    if (!parts.length) return
    const existing = headers.get('cookie')
    headers.set('cookie', existing ? `${existing}; ${parts.join('; ')}` : parts.join('; '))
  }

  defaultParseResponseData = async (response: FetcherResponse): Promise<unknown> => {
    const contentType = response.headers.get('content-type') ?? ''
    const normalizedContentType = contentType.toLowerCase()
    if (normalizedContentType.includes('text/event-stream')) {
      return response.body ?? null
    }
    if (normalizedContentType.startsWith('text/')) {
      return await response.text()
    }

    if (normalizedContentType.startsWith('application/octet-stream')) {
      return new Blob([await response.arrayBuffer()])
    }

    if (
      normalizedContentType.includes('application/json') ||
      (normalizedContentType.includes('application/') && normalizedContentType.includes('json')) ||
      normalizedContentType === '*/*'
    ) {
      try {
        return await response.json()
      } catch {
        return undefined
      }
    }

    return
  }

  // <ApiClient.get>
  get<Path extends keyof GetEndpoints, TEndpoint extends GetEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<
      TEndpoint extends { parameters: infer UParams }
        ? NotNever<InferSchemaInput<UParams>> extends true
          ? InferSchemaInput<UParams> & {
              overrides?: RequestInit
              queryOptions?: ApiQueryOptions
              withResponse: true
              throwOnStatusError?: boolean
              validate?: ValidateSide
            }
          : {
              overrides?: RequestInit
              queryOptions?: ApiQueryOptions
              withResponse: true
              throwOnStatusError?: boolean
              validate?: ValidateSide
            }
        : {
            overrides?: RequestInit
            queryOptions?: ApiQueryOptions
            withResponse: true
            throwOnStatusError?: boolean
            validate?: ValidateSide
          }
    >
  ): Promise<SafeApiResponse<TEndpoint>>

  get<Path extends keyof GetEndpoints, TEndpoint extends GetEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<
      TEndpoint extends { parameters: infer UParams }
        ? NotNever<InferSchemaInput<UParams>> extends true
          ? InferSchemaInput<UParams> & {
              overrides?: RequestInit
              queryOptions?: ApiQueryOptions
              withResponse?: false
              throwOnStatusError?: boolean
              validate?: ValidateSide
            }
          : {
              overrides?: RequestInit
              queryOptions?: ApiQueryOptions
              withResponse?: false
              throwOnStatusError?: boolean
              validate?: ValidateSide
            }
        : {
            overrides?: RequestInit
            queryOptions?: ApiQueryOptions
            withResponse?: false
            throwOnStatusError?: boolean
            validate?: ValidateSide
          }
    >
  ): Promise<InferSuccessData<TEndpoint>>

  get<Path extends keyof GetEndpoints>(path: Path, ...params: [config?: unknown]): Promise<unknown> {
    return this.request('get', path, params[0] as never) as Promise<unknown>
  }
  // </ApiClient.get>

  // <ApiClient.put>
  put<Path extends keyof PutEndpoints, TEndpoint extends PutEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<
      TEndpoint extends { parameters: infer UParams }
        ? NotNever<InferSchemaInput<UParams>> extends true
          ? InferSchemaInput<UParams> & {
              overrides?: RequestInit
              queryOptions?: ApiQueryOptions
              withResponse: true
              throwOnStatusError?: boolean
              validate?: ValidateSide
            }
          : {
              overrides?: RequestInit
              queryOptions?: ApiQueryOptions
              withResponse: true
              throwOnStatusError?: boolean
              validate?: ValidateSide
            }
        : {
            overrides?: RequestInit
            queryOptions?: ApiQueryOptions
            withResponse: true
            throwOnStatusError?: boolean
            validate?: ValidateSide
          }
    >
  ): Promise<SafeApiResponse<TEndpoint>>

  put<Path extends keyof PutEndpoints, TEndpoint extends PutEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<
      TEndpoint extends { parameters: infer UParams }
        ? NotNever<InferSchemaInput<UParams>> extends true
          ? InferSchemaInput<UParams> & {
              overrides?: RequestInit
              queryOptions?: ApiQueryOptions
              withResponse?: false
              throwOnStatusError?: boolean
              validate?: ValidateSide
            }
          : {
              overrides?: RequestInit
              queryOptions?: ApiQueryOptions
              withResponse?: false
              throwOnStatusError?: boolean
              validate?: ValidateSide
            }
        : {
            overrides?: RequestInit
            queryOptions?: ApiQueryOptions
            withResponse?: false
            throwOnStatusError?: boolean
            validate?: ValidateSide
          }
    >
  ): Promise<InferSuccessData<TEndpoint>>

  put<Path extends keyof PutEndpoints>(path: Path, ...params: [config?: unknown]): Promise<unknown> {
    return this.request('put', path, params[0] as never) as Promise<unknown>
  }
  // </ApiClient.put>

  // <ApiClient.delete>
  delete<Path extends keyof DeleteEndpoints, TEndpoint extends DeleteEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<
      TEndpoint extends { parameters: infer UParams }
        ? NotNever<InferSchemaInput<UParams>> extends true
          ? InferSchemaInput<UParams> & {
              overrides?: RequestInit
              queryOptions?: ApiQueryOptions
              withResponse: true
              throwOnStatusError?: boolean
              validate?: ValidateSide
            }
          : {
              overrides?: RequestInit
              queryOptions?: ApiQueryOptions
              withResponse: true
              throwOnStatusError?: boolean
              validate?: ValidateSide
            }
        : {
            overrides?: RequestInit
            queryOptions?: ApiQueryOptions
            withResponse: true
            throwOnStatusError?: boolean
            validate?: ValidateSide
          }
    >
  ): Promise<SafeApiResponse<TEndpoint>>

  delete<Path extends keyof DeleteEndpoints, TEndpoint extends DeleteEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<
      TEndpoint extends { parameters: infer UParams }
        ? NotNever<InferSchemaInput<UParams>> extends true
          ? InferSchemaInput<UParams> & {
              overrides?: RequestInit
              queryOptions?: ApiQueryOptions
              withResponse?: false
              throwOnStatusError?: boolean
              validate?: ValidateSide
            }
          : {
              overrides?: RequestInit
              queryOptions?: ApiQueryOptions
              withResponse?: false
              throwOnStatusError?: boolean
              validate?: ValidateSide
            }
        : {
            overrides?: RequestInit
            queryOptions?: ApiQueryOptions
            withResponse?: false
            throwOnStatusError?: boolean
            validate?: ValidateSide
          }
    >
  ): Promise<InferSuccessData<TEndpoint>>

  delete<Path extends keyof DeleteEndpoints>(path: Path, ...params: [config?: unknown]): Promise<unknown> {
    return this.request('delete', path, params[0] as never) as Promise<unknown>
  }
  // </ApiClient.delete>

  // <ApiClient.post>
  post<Path extends keyof PostEndpoints, TEndpoint extends PostEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<
      TEndpoint extends { parameters: infer UParams }
        ? NotNever<InferSchemaInput<UParams>> extends true
          ? InferSchemaInput<UParams> & {
              overrides?: RequestInit
              queryOptions?: ApiQueryOptions
              withResponse: true
              throwOnStatusError?: boolean
              validate?: ValidateSide
            }
          : {
              overrides?: RequestInit
              queryOptions?: ApiQueryOptions
              withResponse: true
              throwOnStatusError?: boolean
              validate?: ValidateSide
            }
        : {
            overrides?: RequestInit
            queryOptions?: ApiQueryOptions
            withResponse: true
            throwOnStatusError?: boolean
            validate?: ValidateSide
          }
    >
  ): Promise<SafeApiResponse<TEndpoint>>

  post<Path extends keyof PostEndpoints, TEndpoint extends PostEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<
      TEndpoint extends { parameters: infer UParams }
        ? NotNever<InferSchemaInput<UParams>> extends true
          ? InferSchemaInput<UParams> & {
              overrides?: RequestInit
              queryOptions?: ApiQueryOptions
              withResponse?: false
              throwOnStatusError?: boolean
              validate?: ValidateSide
            }
          : {
              overrides?: RequestInit
              queryOptions?: ApiQueryOptions
              withResponse?: false
              throwOnStatusError?: boolean
              validate?: ValidateSide
            }
        : {
            overrides?: RequestInit
            queryOptions?: ApiQueryOptions
            withResponse?: false
            throwOnStatusError?: boolean
            validate?: ValidateSide
          }
    >
  ): Promise<InferSuccessData<TEndpoint>>

  post<Path extends keyof PostEndpoints>(path: Path, ...params: [config?: unknown]): Promise<unknown> {
    return this.request('post', path, params[0] as never) as Promise<unknown>
  }
  // </ApiClient.post>

  // <ApiClient.patch>
  patch<Path extends keyof PatchEndpoints, TEndpoint extends PatchEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<
      TEndpoint extends { parameters: infer UParams }
        ? NotNever<InferSchemaInput<UParams>> extends true
          ? InferSchemaInput<UParams> & {
              overrides?: RequestInit
              queryOptions?: ApiQueryOptions
              withResponse: true
              throwOnStatusError?: boolean
              validate?: ValidateSide
            }
          : {
              overrides?: RequestInit
              queryOptions?: ApiQueryOptions
              withResponse: true
              throwOnStatusError?: boolean
              validate?: ValidateSide
            }
        : {
            overrides?: RequestInit
            queryOptions?: ApiQueryOptions
            withResponse: true
            throwOnStatusError?: boolean
            validate?: ValidateSide
          }
    >
  ): Promise<SafeApiResponse<TEndpoint>>

  patch<Path extends keyof PatchEndpoints, TEndpoint extends PatchEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<
      TEndpoint extends { parameters: infer UParams }
        ? NotNever<InferSchemaInput<UParams>> extends true
          ? InferSchemaInput<UParams> & {
              overrides?: RequestInit
              queryOptions?: ApiQueryOptions
              withResponse?: false
              throwOnStatusError?: boolean
              validate?: ValidateSide
            }
          : {
              overrides?: RequestInit
              queryOptions?: ApiQueryOptions
              withResponse?: false
              throwOnStatusError?: boolean
              validate?: ValidateSide
            }
        : {
            overrides?: RequestInit
            queryOptions?: ApiQueryOptions
            withResponse?: false
            throwOnStatusError?: boolean
            validate?: ValidateSide
          }
    >
  ): Promise<InferSuccessData<TEndpoint>>

  patch<Path extends keyof PatchEndpoints>(path: Path, ...params: [config?: unknown]): Promise<unknown> {
    return this.request('patch', path, params[0] as never) as Promise<unknown>
  }
  // </ApiClient.patch>

  // <ApiClient.request>
  /**
   * Generic request method with full type-safety for any endpoint
   */
  request<
    TMethod extends keyof EndpointByMethod,
    TPath extends keyof EndpointByMethod[TMethod],
    TEndpoint extends EndpointByMethod[TMethod][TPath]
  >(
    method: TMethod,
    path: TPath,
    ...params: MaybeOptionalArg<
      TEndpoint extends { parameters: infer UParams }
        ? NotNever<InferSchemaInput<UParams>> extends true
          ? InferSchemaInput<UParams> & {
              overrides?: RequestInit
              queryOptions?: ApiQueryOptions
              withResponse: true
              throwOnStatusError?: boolean
              validate?: ValidateSide
            }
          : {
              overrides?: RequestInit
              queryOptions?: ApiQueryOptions
              withResponse: true
              throwOnStatusError?: boolean
              validate?: ValidateSide
            }
        : {
            overrides?: RequestInit
            queryOptions?: ApiQueryOptions
            withResponse: true
            throwOnStatusError?: boolean
            validate?: ValidateSide
          }
    >
  ): Promise<SafeApiResponse<TEndpoint>>

  request<
    TMethod extends keyof EndpointByMethod,
    TPath extends keyof EndpointByMethod[TMethod],
    TEndpoint extends EndpointByMethod[TMethod][TPath]
  >(
    method: TMethod,
    path: TPath,
    ...params: MaybeOptionalArg<
      TEndpoint extends { parameters: infer UParams }
        ? NotNever<InferSchemaInput<UParams>> extends true
          ? InferSchemaInput<UParams> & {
              overrides?: RequestInit
              queryOptions?: ApiQueryOptions
              withResponse?: false
              throwOnStatusError?: boolean
              validate?: ValidateSide
            }
          : {
              overrides?: RequestInit
              queryOptions?: ApiQueryOptions
              withResponse?: false
              throwOnStatusError?: boolean
              validate?: ValidateSide
            }
        : {
            overrides?: RequestInit
            queryOptions?: ApiQueryOptions
            withResponse?: false
            throwOnStatusError?: boolean
            validate?: ValidateSide
          }
    >
  ): Promise<InferSuccessData<TEndpoint>>

  request<
    TMethod extends keyof EndpointByMethod,
    TPath extends keyof EndpointByMethod[TMethod],
    TEndpoint extends EndpointByMethod[TMethod][TPath]
  >(method: TMethod, path: TPath, ...params: [config?: unknown]): Promise<unknown> {
    return (async () => {
      const requestParams = params[0] as
        | (EndpointParameters & {
            overrides?: RequestInit
            queryOptions?: ApiQueryOptions
            withResponse?: boolean
            throwOnStatusError?: boolean
            validate?: ValidateSide
          })
        | undefined
      const withResponse = requestParams?.withResponse
      const throwOnStatusError = requestParams?.throwOnStatusError ?? (withResponse ? false : true)
      let overrides = requestParams?.overrides
      const validateSide: ValidateSide = requestParams?.validate ?? this.validate

      const parametersToSend: EndpointParameters = {}
      if (requestParams?.body !== undefined) parametersToSend.body = requestParams.body
      if (requestParams?.query !== undefined) parametersToSend.query = requestParams.query
      if (requestParams?.header !== undefined) parametersToSend.header = requestParams.header
      if (requestParams?.path !== undefined) parametersToSend.path = requestParams.path
      if (requestParams?.cookie !== undefined) parametersToSend.cookie = requestParams.cookie

      type RuntimeEndpoint = {
        parameters?: Partial<Record<'body' | 'query' | 'header' | 'path' | 'cookie', unknown>>
        responses?: Record<string, unknown>
      }
      const endpointSchema = EndpointByMethod[method][path] as RuntimeEndpoint
      const shouldValidateInput = validateSide === 'input' || validateSide === 'both'
      if (shouldValidateInput && endpointSchema.parameters) {
        const paramSchema = endpointSchema.parameters
        for (const key of ['body', 'query', 'header', 'path', 'cookie'] as const) {
          const schema = paramSchema[key]
          const value = parametersToSend[key]
          if (schema !== undefined && value !== undefined) {
            parametersToSend[key] = await runValidate({
              side: 'input',
              method: String(method),
              path: String(path),
              schema,
              value,
              ...(this.onValidate ? { onValidate: this.onValidate } : {})
            })
          }
        }
      }

      const resolvedPath = (this.fetcher.decodePathParams ?? this.defaultDecodePathParams)(
        this.baseUrl + (path as string),
        parametersToSend.path ?? {},
        endpointParameterStyles[method]?.[path]?.path
      )
      const url = new URL(resolvedPath)
      const urlSearchParams = (this.fetcher.encodeSearchParams ?? this.defaultEncodeSearchParams)(
        parametersToSend.query,
        endpointParameterStyles[method]?.[path]?.query
      )

      if (parametersToSend.cookie) {
        const headers = new Headers((overrides as RequestInit | undefined)?.headers)
        ;(this.fetcher.encodeCookies ?? this.defaultEncodeCookies)(parametersToSend.cookie, headers)
        overrides = { ...overrides, headers }
      }

      const parameterStyles = endpointParameterStyles[method]?.[path as string]
      const response = await this.fetcher.fetch({
        method: method,
        path: path as string,
        url,
        ...(urlSearchParams ? { urlSearchParams } : {}),
        ...(Object.keys(parametersToSend).length ? { parameters: parametersToSend } : {}),
        requestFormat: endpointRequestFormats[method]?.[path] ?? 'json',
        ...(parameterStyles ? { parameterStyles } : {}),
        security: endpointSecurityRequirements[method]?.[path] ?? defaultSecurityRequirements,
        ...(overrides ? { overrides } : {}),
        throwOnStatusError
      })
      const responseFormat = endpointResponseFormats[method]?.[path] ?? 'json'
      let data =
        responseFormat === 'sse'
          ? (response.body ?? null)
          : await (this.fetcher.parseResponseData ?? this.defaultParseResponseData)(response)
      const shouldValidateOutput = validateSide === 'output' || validateSide === 'both'
      if (
        shouldValidateOutput &&
        responseFormat !== 'sse' &&
        (response.ok || !(errorStatusCodes as readonly number[]).includes(response.status)) &&
        endpointSchema?.responses
      ) {
        const responseSchema =
          endpointSchema.responses[String(response.status)] ??
          endpointSchema.responses[String(Math.floor(response.status / 100)) + 'xx'] ??
          endpointSchema.responses[String(Math.floor(response.status / 100)) + 'XX'] ??
          endpointSchema.responses['default']
        if (responseSchema) {
          data = await runValidate({
            side: 'output',
            method: String(method),
            path: String(path),
            schema: responseSchema,
            value: data,
            ...(this.onValidate ? { onValidate: this.onValidate } : {})
          })
        }
      }
      const typedResponse = Object.assign(response, {
        data: data,
        json: () => Promise.resolve(data)
      }) as SafeApiResponse<TEndpoint>

      if (throwOnStatusError && (errorStatusCodes as readonly number[]).includes(response.status)) {
        throw new TypedStatusError(typedResponse as TypedErrorResponse<unknown, ErrorStatusCode, unknown>)
      }

      return withResponse ? typedResponse : data
    })()
  }
  // </ApiClient.request>
}

export function createApiClient(
  fetcher: Fetcher,
  baseUrl?: string,
  options?: { validate?: ValidateSide; onValidate?: OnValidate }
) {
  return new ApiClient(fetcher, options).setBaseUrl(baseUrl ?? '')
}

/**
 Example usage:
 const api = createApiClient((method, url, params) =>
   fetch(url, { method, body: JSON.stringify(params) }).then((res) => res.json()),
 );
 api.get("/users").then((users) => console.log(users));
 api.post("/users", { body: { name: "John" } }).then((user) => console.log(user));
 api.put("/users/:id", { path: { id: 1 }, body: { name: "John" } }).then((user) => console.log(user));

 // With error handling
 const result = await api.get("/users/{id}", { path: { id: "123" }, withResponse: true });
 if (result.ok) {
   // Access data directly
   const user = result.data;
   console.log(user);

   // Or use the json() method for compatibility
   const userFromJson = await result.json();
   console.log(userFromJson);
 } else {
   const error = result.data;
   console.error(`Error ${result.status}:`, error);
 }
*/

// </ApiClient>
