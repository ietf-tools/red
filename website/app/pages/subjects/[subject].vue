<template>
  <FeatureFlagWall feature-flag-key="oidc">
    <div class="min-h-[100vh]">
      <NuxtLayout name="default">
        <div class="container mx-auto pl-1 pr-3 pb-10">
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
            <Breadcrumbs :breadcrumb-items="breadcrumbItems" />

            <div class="search-container mx-auto">
              <Heading level="1" style-level="3" class="sr-only mt-4 mb-4 md:mx-2">
                {{ liveSubject.name }}
              </Heading>

              <p v-if="liveSubject.description" class="italic mt-0 md:mt-6 lg:mt-12 mb-5 md:mb-4 md:mx-2">
                {{ liveSubject.description }}
              </p>

              <div class="flex flex-col lg:flex-row lg:gap-5">
                <div class="lg:flex-3">
                  <nav aria-label="Subject" class="block mt-4 md:hidden">
                    <Heading level="2" style-level="4" class="mb-1">Within this page</Heading>
                    <ul class="list-disc ml-6 mb-4">
                      <li>
                        <a href="#subjects" :class="ANCHOR_COLOR_TAILWIND_STYLE"
                          >Subjects below {{ liveSubject.name }}</a
                        >
                      </li>
                      <li>
                        <a href="#rfcs" :class="ANCHOR_COLOR_TAILWIND_STYLE">RFCs within {{ liveSubject.name }}</a>
                      </li>
                    </ul>
                  </nav>

                  <div class="md:flex md:flex-row md:gap-2">
                    <div v-if="subjectSubtree.length > 0" class="flex-1 md:min-w-64">
                      <Heading id="subjects" level="2" style-level="5" class="md:mt-3 lg:mt-3 md:mx-2">
                        {{ liveSubject.name }} subjects:
                      </Heading>

                      <SubjectTreeList
                        :nodes="subjectSubtree"
                        density="compact"
                        :matches="NO_SUBJECT_MATCHES"
                        class="md:mx-2" />
                    </div>

                    <div class="w-full">
                      <div class="mt-6 md:mt-0 md:mr-2 flex flex-col md:flex-row gap-2 md:gap-0 justify-between">
                        <Heading
                          id="rfcs"
                          level="2"
                          style-level="1"
                          class="text-blue-900 dark:text-gray-100 md:ml-3 md:mb-2">
                          {{ liveSubject.name }} RFCs
                          <span class="text-gray-700 dark:text-gray-200">({{ documents.length }})</span>
                        </Heading>
                        <div class="flex items-center gap-2">
                          <div class="flex items-center gap-2">
                            <label :for="documentSortId" class="whitespace-nowrap">Sort by</label>
                            <select
                              :id="documentSortId"
                              v-model="documentSort"
                              :class="`py-2 pl-4 w-full min-w-0 max-w-44 text-base bg-white dark:bg-black dark:text-white border border-gray-400 rounded-xs cursor-pointer ${TAILWIND_SELECT_ARROW_PADDING_RIGHT}`">
                              <option v-for="option in DOCUMENT_SORT_OPTIONS" :key="option.value" :value="option.value">
                                {{ option.label }}
                              </option>
                            </select>
                          </div>
                          <Separator
                            orientation="vertical"
                            decorative
                            class="bg-gray-400 data-[orientation=vertical]:h-7 data-[orientation=vertical]:w-px" />
                          <SubjectDensity class="print:hidden" v-model="documentDensity" />
                        </div>
                      </div>

                      <ul
                        v-if="documents.length > 0"
                        class="md:mx-2 grid grid-cols-1 mt-3 gap-4"
                        :style="{ '--computed-heading-char-length': maxHeadingCharWidth }">
                        <li v-for="{ doc, label, title, infoPath, rfc } in documents" :key="doc" class="flex flex-col">
                          <!-- `rfc` is unset for a document_meta entry Red's index hasn't resolved yet (or,
                   defensively, one missing from document_meta entirely), so the row falls back to
                   a plain link rather than going without a title. -->
                          <RFCCardSearchItem v-if="rfc" :rfc="rfc" :density="documentDensity" class="h-full" />
                          <template v-else>
                            <Anchor :href="infoPath">{{ label }}</Anchor>
                            <span v-if="title"> — {{ title }}</span>
                          </template>
                        </li>
                      </ul>
                      <!-- A subject with nothing under it and nothing in it is waiting for documents; one whose
               subtree holds them is not empty, it is a heading, and saying it is empty would read as
               a fault. -->
                      <p v-else class="mt-6">
                        {{
                          subjectSubtree.length > 0
                            ? 'No RFCs are filed under this subject itself.'
                            : 'No RFCs carry this subject yet.'
                        }}
                      </p>
                    </div>
                  </div>
                </div>
                <div class="lg:flex-1">
                  <div class="bg-blue-25 px-5 py-4">
                    <Heading level="2"> Subscribe to {{ liveSubject.name }} </Heading>
                    <ReefSubscribeToSubjectTag :subject="liveSubject" />
                    <div class="mt-3 leading-[1.5] text-sm">
                      <p>Get notified when:</p>
                      <ul class="list-disc ml-5 mt-1">
                        <li class="mb-2">The RFC becomes updated and/or obsoleted by another RFC</li>
                        <li>The RFC's status is changed</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
import { computed, ref, useId } from 'vue'
import { DateTime } from 'luxon'
import type { BreadcrumbItem } from '~/components/BreadcrumbsTypes'
import { useUiSettingsStore } from '~/stores/ui-settings'
import { useRfcEditorHead } from '~/utilities/head'
import { isRetiredSubject, isSubjectAlias } from '~/utilities/reef'
import {
  fetchSubjectFile,
  type PrecomputedSubjectDetailOrRedirect,
  type SubjectBranchNode
} from '~/utilities/reef-precomputed'
import { documentMetaToRfcCommon } from '~/utilities/rfc-converters'
import { parseSeriesId } from '~/utilities/rfc'
import { calculateMaxHeadingCharWidth } from '~/utilities/rfc-title'
import type { SubjectMatch } from '~/utilities/subject-search'
import type { SubjectTreeNode } from '~/utilities/subject-tree'
import type { Density } from '~/utilities/typesense'
import {
  HOME_PATH,
  infoSeriesPathBuilder,
  SUBJECTS_PATH,
  subjectsPathBuilder,
  usePublicSiteUrlOrigin
} from '~/utilities/url'
import { ANCHOR_COLOR_TAILWIND_STYLE } from '~/utilities/theme'
import { TAILWIND_SELECT_ARROW_PADDING_RIGHT } from '~/utilities/html'

definePageMeta({
  layout: false,
  // One subject per mounted page, so /subjects/a/ → /subjects/b/ runs setup again and the retired
  // redirect below is reached on that navigation as well as on the first render.
  key: (route) => route.fullPath
})

const route = useRoute()

const publicSiteUrlOrigin = usePublicSiteUrlOrigin()

const slug = typeof route.params.subject === 'string' ? route.params.subject : ''

const canonicalPath = subjectsPathBuilder(slug)

if (
  // only compare route.path not route.fullPath as that will clobber ?search#id params
  route.path !== canonicalPath
) {
  await navigateTo({
    path: canonicalPath
  })
}

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

// Read synchronously in setup rather than watched, so a server render answers with the 404 itself
// rather than the 200 a client-side status change can no longer take back. The page still renders
// its own "Subject not found" alert in place — a plain createError({fatal: true}) would replace it
// with the app-wide error page instead.
if (isNotFound.value) {
  const event = useRequestEvent()
  if (event) setResponseStatus(event, 404)
}

// subject_meta.ancestors is already root-first, the same order the breadcrumb wants, so this only
// adds the path each one links to.
const ancestors = computed(() =>
  (liveSubject.value?.subject_meta.ancestors ?? []).map(({ slug, name }) => ({
    slug,
    name,
    path: subjectsPathBuilder(slug)
  }))
)

// subject_meta.descendants is already a real tree — each branch carries its own children, not just
// a slug — so this only adds the depth SubjectTreeList indents by, one level deeper per level of
// recursion.
const toSubjectTreeNode = (branch: SubjectBranchNode, depth: number): SubjectTreeNode => ({
  ...branch,
  depth,
  children: branch.children.map((child) => toSubjectTreeNode(child, depth + 1))
})

const subjectSubtree = computed((): SubjectTreeNode[] =>
  (liveSubject.value?.subject_meta.descendants ?? []).map((branch) => toSubjectTreeNode(branch, 1))
)

// No filter on this page, so nothing is ever a match — every description shows or hides by density
// alone, the same as an unfiltered index page.
const NO_SUBJECT_MATCHES = new Map<string, SubjectMatch>()

// Home, then this subject's ancestors outermost first, then this subject itself unlinked — the
// same shape every other page's breadcrumb trail takes, so this one only supplies the items.
const breadcrumbItems = computed((): BreadcrumbItem[] => [
  { url: HOME_PATH, label: 'Home' },
  { url: SUBJECTS_PATH, label: 'RFCs by Subject' },
  ...ancestors.value.map(({ name, path }) => ({ url: path, label: name })),
  ...(liveSubject.value ? [{ label: liveSubject.value.name }] : [])
])

type DocumentSort = 'published-desc' | 'published-asc' | 'number-asc' | 'number-desc'

const DOCUMENT_SORT_OPTIONS: { value: DocumentSort; label: string }[] = [
  { value: 'published-desc', label: 'Newest first' },
  { value: 'published-asc', label: 'Oldest first' },
  { value: 'number-asc', label: 'RFC number (ascending)' },
  { value: 'number-desc', label: 'RFC number (descending)' }
]

const documentSort = ref<DocumentSort>('published-desc')
const documentSortId = useId()

// A document whose metadata never resolved has no publication date to place it by, so it sorts
// after every dated document regardless of direction — the same rule `number` below follows for
// an identifier that didn't parse.
const comparePublished = (
  a: { rfc?: { published?: string } },
  b: { rfc?: { published?: string } },
  direction: 1 | -1
): number => {
  const aTime = a.rfc?.published ? DateTime.fromISO(a.rfc.published).toMillis() : undefined
  const bTime = b.rfc?.published ? DateTime.fromISO(b.rfc.published).toMillis() : undefined
  if (aTime === undefined || bTime === undefined) {
    return aTime === undefined && bTime === undefined ? 0 : aTime === undefined ? 1 : -1
  }
  return (aTime - bTime) * direction
}

const DOCUMENT_SORT_COMPARATORS: Record<
  DocumentSort,
  (a: { number: number; rfc?: { published?: string } }, b: { number: number; rfc?: { published?: string } }) => number
> = {
  'published-desc': (a, b) => comparePublished(a, b, -1),
  'published-asc': (a, b) => comparePublished(a, b, 1),
  'number-asc': (a, b) => a.number - b.number,
  'number-desc': (a, b) => b.number - a.number
}

// Reef names documents in the series this build has info pages for, so infoSeriesPathBuilder
// throwing means Reef has sent something outside that vocabulary. Left to throw: an identifier this
// page cannot link is a fault to fix at the source, not a row to quietly render as plain text.
//
// The title comes from `document_meta`, which the published file carries and the API does not:
// Reef stores no document metadata and resolves it from Red's own index when it writes the file.
// It is null for an identifier that index did not resolve, which is a real state rather than an
// error — the link is still the document, so the row renders without a title rather than not at
// all. `label` is the identifier as a reader writes it: "RFC 4686", not `rfc4686`.
const documents = computed(() => {
  const rows = (liveSubject.value?.documents ?? []).map((doc) => {
    const meta = liveSubject.value?.document_meta?.[doc]
    const seriesId = parseSeriesId(doc)
    return {
      doc,
      // Unresolved identifiers sort after every real number rather than reordering by parse
      // failure, which reads as arbitrary.
      number: seriesId?.number ?? Number.POSITIVE_INFINITY,
      label: seriesId ? `${seriesId.type.toUpperCase()} ${seriesId.number}` : doc,
      title: meta?.title ?? undefined,
      infoPath: infoSeriesPathBuilder(doc),
      rfc: meta ? documentMetaToRfcCommon(doc, meta) : undefined
    }
  })
  return rows.sort(DOCUMENT_SORT_COMPARATORS[documentSort.value])
})

// Reads through the store rather than holding its own copy, so the control shows the saved
// preference and every change is written back to localStorage. Same scale as search's own control,
// so the two toggles read as one idea.
const uiSettings = useUiSettingsStore()
const documentDensity = computed<Density>({
  get: () => uiSettings.subjectDocumentDensity,
  set: (density) => uiSettings.setSubjectDocumentDensity(density)
})

// RFCCardCompact sizes its heading column in characters, off `--computed-heading-char-length` set
// on an ancestor — see SearchResultList's own use of the same property for why.
const maxHeadingCharWidth = computed(() =>
  calculateMaxHeadingCharWidth(documents.value.flatMap(({ rfc }) => (rfc ? [rfc] : [])))
)

useRfcEditorHead({
  noIndex: true, // FIXME: upon release allow indexing
  title: liveSubject.value ? `RFCs about ${liveSubject.value.name}` : 'RFC subject',
  canonicalPath: `${publicSiteUrlOrigin}${canonicalPath}`,
  description:
    liveSubject.value?.description ??
    'Subjects such as networking, broadband, aerospace, authentication, cloud computing',
  contentType: 'article'
})
</script>
