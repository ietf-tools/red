// @ts-nocheck
import type * as __TypedOpenapi from './reef-api-zod.types.js'

import { z } from 'zod'

// <Schemas>
export type DocumentAreaOrGroup = __TypedOpenapi.Schemas.DocumentAreaOrGroup
export const DocumentAreaOrGroup = z.object({ acronym: z.string(), name: z.string() }).catchall(z.unknown())

export type DocumentIdentifier = __TypedOpenapi.Schemas.DocumentIdentifier
export const DocumentIdentifier = z.object({ type: z.string(), value: z.string() }).catchall(z.unknown())

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

export type FullDocumentMetadata = __TypedOpenapi.Schemas.FullDocumentMetadata
export const FullDocumentMetadata = z
  .object({
    title: z.string().nullable(),
    subseries: z.array(z.string()),
    status: z.string().nullable(),
    status_name: z.string().nullable(),
    stream: z.string().nullable(),
    stream_name: z.string().nullable(),
    obsoletes: z.array(z.number().int()),
    obsoleted_by: z.array(z.number().int()),
    updates: z.array(z.number().int()),
    updated_by: z.array(z.number().int()),
    authors: z.array(z.string()),
    published: z.string().nullable(),
    identifiers: z.array(DocumentIdentifier),
    area: DocumentAreaOrGroup.nullable(),
    group: DocumentAreaOrGroup.nullable(),
    keywords: z.array(z.string()),
    pages: z.number().int().nullable(),
    abstract: z.string().nullable()
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

export type VisibilityEnum = __TypedOpenapi.Schemas.VisibilityEnum
export const VisibilityEnum = z.enum(['open', 'authenticated'])

export type OpenSurvey = __TypedOpenapi.Schemas.OpenSurvey
export const OpenSurvey = z
  .object({
    id: z.number().int(),
    slug: z.string().max(100).regex(new RegExp('^[-a-zA-Z0-9_]+$')),
    title: z.string().max(255),
    description: z.string().optional(),
    url: z.string(),
    documents: z.array(z.string()).nullable(),
    visibility: VisibilityEnum.optional()
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

export type SubjectAncestor = __TypedOpenapi.Schemas.SubjectAncestor
export const SubjectAncestor = z
  .object({
    slug: z.string(),
    name: z.string(),
    description: z.string(),
    document_count: z.number().int(),
    document_count_deep: z.number().int()
  })
  .catchall(z.unknown())

export type SubjectBranchNode = __TypedOpenapi.Schemas.SubjectBranchNode
export const SubjectBranchNode = z.lazy(() =>
  z
    .object({
      slug: z.string(),
      name: z.string(),
      description: z.string(),
      document_count: z.number().int(),
      document_count_deep: z.number().int(),
      children: z.array(SubjectBranchNode)
    })
    .catchall(z.unknown())
)

export type SubjectMeta = __TypedOpenapi.Schemas.SubjectMeta
export const SubjectMeta = z
  .object({ ancestors: z.array(SubjectAncestor), descendants: z.array(SubjectBranchNode) })
  .catchall(z.unknown())

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
    document_meta: z.record(z.string(), FullDocumentMetadata),
    subject_meta: SubjectMeta
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
