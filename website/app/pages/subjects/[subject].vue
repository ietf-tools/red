<template>
  <FeatureFlagWall feature-flag-key="oidc">
    <div class="min-h-[100vh]">
      <NuxtLayout name="default">
        <div class="container mx-auto pl-5 pr-3 pb-10">
          <!-- A retired subject and an alias are both on their way somewhere else, so they get the
             same holding state as a load that hasn't finished rather than a flash of an error they
             aren't. -->
          <div v-if="subjectStatus === 'pending' || redirectTo" class="mt-10 w-full text-center">
            <GraphicsLoading class="inline-block w-16 h-16" />
          </div>

          <template v-else-if="liveSubject">
            <!-- Where this subject sits. The published file names this subject's ancestors and
               children in `subject_meta`, so the breadcrumb reads "Applications" rather than
               `applications` without the page having to read the whole vocabulary for one word. -->
            <nav v-if="ancestors.length > 0" aria-label="Breadcrumb" class="mt-10">
              <ol class="flex flex-wrap items-center gap-2">
                <li v-for="{ slug, name, path } in ancestors" :key="slug" class="flex items-center gap-2">
                  <Anchor :href="path">{{ name }}</Anchor>
                  <span aria-hidden="true">›</span>
                </li>
              </ol>
            </nav>

            <Heading level="1" :class="ancestors.length > 0 ? 'mt-4 mb-4' : 'mt-10 mb-4'">{{
              liveSubject.name
            }}</Heading>
            <p v-if="liveSubject.description">{{ liveSubject.description }}</p>

            <template v-if="children.length > 0">
              <Heading level="2" class="mt-8 mb-2">Subjects within this one</Heading>
              <ul class="flex flex-col gap-2">
                <li v-for="{ slug, name, path } in children" :key="slug">
                  <Anchor :href="path">{{ name }}</Anchor>
                </li>
              </ul>
            </template>

            <Heading v-if="children.length > 0" level="2" class="mt-8 mb-2">RFCs in this subject</Heading>
            <ul v-if="documents.length > 0" class="flex flex-col gap-2 mt-6">
              <li v-for="{ doc, label, title, infoPath } in documents" :key="doc">
                <Anchor :href="infoPath">{{ label }}</Anchor>
                <span v-if="title"> — {{ title }}</span>
              </li>
            </ul>
            <!-- A subject with nothing under it and nothing in it is waiting for documents; one whose
               subtree holds them is not empty, it is a heading, and saying it is empty would read as
               a fault. -->
            <p v-else class="mt-6">
              {{
                children.length > 0 ? 'No RFCs are filed under this subject itself.' : 'No RFCs carry this subject yet.'
              }}
            </p>

            <!-- The list above is what this subject holds, not what its subtree does, so the wider
               figure is said in words rather than left to look like a miscount. -->
            <p v-if="deeperDocumentCount > 0" class="mt-4">
              {{ deeperDocumentCount }} further {{ deeperDocumentCount === 1 ? 'RFC is' : 'RFCs are' }} filed under the
              subjects within this one.
            </p>
          </template>

          <Alert v-else-if="isNotFound" level="1" variant="warning" heading="Subject not found">
            <p class="pt-2">No subject found (404). The link may be wrong, or the subject may have been removed.</p>
          </Alert>

          <Alert v-else level="1" variant="warning" heading="Error">
            <p class="pt-2">This subject could not be loaded. Please try again.</p>
          </Alert>
        </div>
      </NuxtLayout>
    </div>
  </FeatureFlagWall>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRfcEditorHead } from '~/utilities/head'
import { isRetiredSubject, isSubjectAlias } from '~/utilities/reef'
import { fetchSubjectFile, type PrecomputedSubjectDetailOrRedirect } from '~/utilities/reef-precomputed'
import { parseSeriesId } from '~/utilities/rfc'
import { ancestorSlugsOf } from '~/utilities/subject-tree'
import { infoSeriesPathBuilder, subjectsPathBuilder, usePublicSiteUrlOrigin } from '~/utilities/url'

definePageMeta({
  layout: false,
  // One subject per mounted page, so /subjects/a/ → /subjects/b/ runs setup again and the retired
  // redirect below is reached on that navigation as well as on the first render.
  key: (route) => route.fullPath
})

const route = useRoute()
const publicSiteUrlOrigin = usePublicSiteUrlOrigin()

const slug = typeof route.params.subject === 'string' ? route.params.subject : ''

// The published file rather than Reef's API: this page is server-rendered, and a server render
// reads the store and never calls Reef. A key that is not there is a plain answer about a subject
// that isn't there, so it becomes `null`; everything else is left to fail into `subjectError`.
const loadSubject = async (): Promise<PrecomputedSubjectDetailOrRedirect | null> =>
  (await fetchSubjectFile(slug)) ?? null

const { data: subject, status: subjectStatus, error: subjectError } = await useAsyncData(`subject:${slug}`, loadSubject)

// A subject that isn't there and a load that failed both arrive as an absent value — `null` from
// the handler above for the first, undefined for the second — so what tells them apart is
// subjectError rather than which kind of absence turned up.
const loadedSubject = computed(() => subject.value ?? undefined)

// The two shapes that are not a subject but a way to reach one: a retired subject names what it was
// folded into, an alias names the subject it is another word for. Neither is rendered — a retired
// subject is no longer offered, and serving a subject under its alias would publish it at two
// addresses with nothing saying which is canonical — so both become the same redirect.
const redirectTo = computed(() => {
  const subject = loadedSubject.value
  if (subject === undefined) return undefined
  if (isRetiredSubject(subject)) return subject.merged_into
  if (isSubjectAlias(subject)) return subject.alias_of
  return undefined
})

const liveSubject = computed(() => {
  const subject = loadedSubject.value
  return subject !== undefined && !isRetiredSubject(subject) && !isSubjectAlias(subject) ? subject : undefined
})

const isNotFound = computed(() => !subjectError.value && loadedSubject.value === undefined)

// Awaited in setup rather than watched, so that a server render answers with the redirect itself.
if (redirectTo.value !== undefined) {
  await navigateTo(subjectsPathBuilder(redirectTo.value), { redirectCode: 301, replace: true })
}

// Outermost first, and without this subject itself: `path` ends in the slug of the subject it
// describes, which is the heading rather than a link back to here.
// `subject_meta` names every subject this file mentions, so both lists below read their curated
// name out of it. The slug is the fallback rather than an error: a name that is missing is a file
// written before the map existed, and a breadcrumb of slugs is worse than a breadcrumb but better
// than a page that will not render.
const nameFor = (slug: string): string => liveSubject.value?.subject_meta?.[slug]?.name ?? slug

const linkTo = (slug: string) => ({ slug, name: nameFor(slug), path: subjectsPathBuilder(slug) })

const ancestors = computed(() => (liveSubject.value ? ancestorSlugsOf(liveSubject.value) : []).map(linkTo))

const children = computed(() => (liveSubject.value?.children ?? []).map(linkTo))

// What the list of documents on this page does not cover. Reef counts the subtree deduplicated, so
// this is a count of further documents rather than of further assignments.
const deeperDocumentCount = computed(() => {
  const subject = liveSubject.value
  return subject === undefined ? 0 : subject.document_count_deep - subject.document_count
})

// Reef names documents in the series this build has info pages for, so infoSeriesPathBuilder
// throwing means Reef has sent something outside that vocabulary. Left to throw: an identifier this
// page cannot link is a fault to fix at the source, not a row to quietly render as plain text.
//
// The title comes from `document_meta`, which the published file carries and the API does not:
// Reef stores no document metadata and resolves it from Red's own index when it writes the file.
// It is null for an identifier that index did not resolve, which is a real state rather than an
// error — the link is still the document, so the row renders without a title rather than not at
// all. `label` is the identifier as a reader writes it: "RFC 4686", not `rfc4686`.
const documents = computed(() =>
  (liveSubject.value?.documents ?? []).map((doc) => {
    const seriesId = parseSeriesId(doc)
    return {
      doc,
      label: seriesId ? `${seriesId.type.toUpperCase()} ${seriesId.number}` : doc,
      title: liveSubject.value?.document_meta?.[doc]?.title ?? undefined,
      infoPath: infoSeriesPathBuilder(doc)
    }
  })
)

useRfcEditorHead({
  noIndex: true, // FIXME: upon release allow indexing
  title: liveSubject.value ? `RFCs about ${liveSubject.value.name}` : 'RFC subject',
  canonicalPath: `${publicSiteUrlOrigin}${subjectsPathBuilder(slug)}`,
  description:
    liveSubject.value?.description ??
    'Subjects such as networking, broadband, aerospace, authentication, cloud computing',
  contentType: 'article'
})
</script>
