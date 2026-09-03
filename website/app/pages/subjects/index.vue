<template>
  <FeatureFlagWall feature-flag-key="oidc">
    <div class="min-h-[100vh]">
      <NuxtLayout name="default">
        <div class="container mx-auto pl-5 pr-3 pb-10">
          <Heading level="1" class="mt-10 mb-4">RFCs by subject</Heading>

          <div v-if="subjectsStatus === 'pending'" class="mt-10 w-full text-center">
            <GraphicsLoading class="inline-block w-16 h-16" />
          </div>

          <Alert v-else-if="subjectsError" level="2" variant="warning" heading="Error">
            <p class="pt-2">The list of subjects could not be loaded. Please try again.</p>
          </Alert>

          <template v-else-if="subjectCount > 0">
            <div class="mt-2 mb-6 print:hidden">
              <SubjectFilter
                v-model="filterQuery"
                :match-count="filteredSubjects.length"
                :total-count="subjectCount"
                :context-count="contextCount" />
            </div>

            <template v-if="filteredSubjects.length > 0">
              <nav aria-labelledby="subjects-toc-label" id="toc">
                <p id="subjects-toc-label" class="sr-only">Table of Contents:</p>
                <ul class="inline mb-6">
                  <!-- Letters with no subjects are muted but stay legible rather than going merely faint.
                     They are content, not an inactive control, so nothing exempts them from the full text
                     contrast requirement, and the chip background is what distinguishes a link from a
                     dead letter anyway. Nor are they hidden from assistive technology: aria-hidden would
                     not help with contrast, which is about what is on screen, and it would drop the one
                     thing they say, which is that the letter has nothing under it. Rendered as text
                     rather than links they are already passed over by anyone browsing the page by link. -->
                  <li
                    :class="[
                      'inline-flex items-center justify-center w-8 h-8 uppercase mr-2 mb-2 border-1',
                      {
                        'text-gray-600 dark:text-gray-400': subjectGroup.items.length === 0,
                        'bg-white dark:bg-gray-800': subjectGroup.items.length > 0
                      }
                    ]"
                    v-for="subjectGroup in subjectsByGroupWithBlanks"
                    :key="subjectGroup.id">
                    <a
                      v-if="subjectGroup.items.length > 0"
                      :href="`#${subjectGroup.id}`"
                      class="no-underline w-full h-full flex items-center justify-center">
                      {{ subjectGroup.title }}
                    </a>
                    <template v-else>{{ subjectGroup.title }}</template>
                  </li>
                </ul>
              </nav>
              <div class="mt-0 flex justify-end print:hidden">
                <SubjectDensity v-model="subjectDensity" />
              </div>
              <dl class="mt-2">
                <template v-for="subjectGroup in subjectsByGroup" :key="subjectGroup.id">
                  <dt
                    :id="subjectGroup.id"
                    class="mb-0 bg-white dark:bg-gray-800 text-blue-950 dark:text-white text-2xl font-bold py-8 px-8">
                    <GraphicsIETFMotif
                      class="absolute -ml-4 -mt-4 print:hidden"
                      :width="55"
                      :height="55"
                      :opacity="0.05" />
                    {{ subjectGroup.title }}
                  </dt>
                  <dd class="mt-0">
                    <div class="bg-white dark:bg-gray-800 px-8 pb-8">
                      <SubjectTreeList :nodes="subjectGroup.items" :density="subjectDensity" :matches="matchesBySlug" />
                    </div>
                    <a
                      href="#toc"
                      :class="[ANCHOR_COLOR_TAILWIND_STYLE, 'inline-flex gap-1 items-center px-1 py-5 text-sm']">
                      <GraphicsArrowUp />
                      Back to top</a
                    >
                  </dd>
                </template>
              </dl>
            </template>

            <!-- Named rather than a bare "nothing found", because the filter is what emptied the page
               and the reader needs to see which word did it. The box above still holds the query and
               its clear button, so there is a way back from here. The table of contents and the
               density control go with the list they describe, rather than standing over nothing. -->
            <p v-else class="mt-2 bg-white dark:bg-gray-800 px-8 py-8">No subjects match “{{ filterQuery }}”.</p>
          </template>

          <!-- The vocabulary is curated by staff, so an empty one is a stage it passes through rather
             than a sign that anything is wrong. -->
          <p v-else class="mt-4">No subjects have been published yet.</p>
        </div>
      </NuxtLayout>
    </div>
  </FeatureFlagWall>
</template>

<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { groupBy } from 'es-toolkit'
import { useUiSettingsStore, type SubjectDensity } from '~/stores/ui-settings'
import { useRfcEditorHead } from '~/utilities/head'
import { getSubjects } from '~/utilities/reef'
import { matchSubjects, type SubjectMatch } from '~/utilities/subject-search'
import { isRenderableSubject, subjectTreeOfMatches, type SubjectNode } from '~/utilities/subject-tree'
import { ANCHOR_COLOR_TAILWIND_STYLE } from '~/utilities/theme'
import { SUBJECTS_PATH, SUBJECTS_QUERY_PARAM, usePublicSiteUrlOrigin } from '~/utilities/url'

definePageMeta({
  layout: false
})

const publicSiteUrlOrigin = usePublicSiteUrlOrigin()

// Reads through the store rather than holding its own copy, so the control shows the saved
// preference and every change is written back to localStorage.
const uiSettings = useUiSettingsStore()
const subjectDensity = computed<SubjectDensity>({
  get: () => uiSettings.subjectDensity,
  set: (density) => uiSettings.setSubjectDensity(density)
})

// Reef lists the vocabulary in tree order and it is small enough to arrive whole, so the hierarchy
// is built from this one answer and there is nothing to page through here.
const { data: subjects, status: subjectsStatus, error: subjectsError } = await useAsyncData(() => getSubjects())

// The vocabulary can nest deeper than the tree is drawn to, and a subject this page will not draw
// is not one to count or to filter over either — otherwise a query matching only a subject too deep
// to render announces matches and then shows an empty page.
const renderableSubjects = computed(() => (subjects.value ?? []).filter(isRenderableSubject))

const subjectCount = computed(() => renderableSubjects.value.length)

const route = useRoute()

// The filter lives in the URL so that a filtered view can be linked and stepped back out of. It is
// read on the browser's side of the render only: the worker strips the query string from anything
// it fetches from Nuxt, so a server render never sees the param even when the address bar carries
// it. Reading it up front would therefore have the server draw the whole vocabulary and the client
// hydrate a narrowed one over the top of it, which is a mismatch rather than a filter.
const queryFromRoute = (): string => {
  const param = route.query[SUBJECTS_QUERY_PARAM]
  return (Array.isArray(param) ? param[0] : param) ?? ''
}

const filterQuery = ref('')

onMounted(() => {
  filterQuery.value = queryFromRoute()
})

// Back, forward, and anything else that changes the param without going through the box.
watch(queryFromRoute, (query) => {
  filterQuery.value = query
})

const URL_WRITE_DEBOUNCE_MS = 300

// Only the URL waits. Filtering itself happens on the keystroke, because the vocabulary is small
// enough to search between one letter and the next and a list that lags the caret reads as broken.
// Replaced rather than pushed so that typing a word leaves one entry behind instead of one a letter.
watchDebounced(
  filterQuery,
  (query) => {
    // A query that came from the URL is already in it. Writing it back would be a navigation that
    // changes nothing, and on arrival that is every filtered link.
    if (query === queryFromRoute()) return
    void navigateTo(
      { path: SUBJECTS_PATH, query: query.length > 0 ? { [SUBJECTS_QUERY_PARAM]: query } : {} },
      { replace: true }
    )
  },
  { debounce: URL_WRITE_DEBOUNCE_MS }
)

// What the reader is told about, and what the empty state is decided by: the subjects that actually
// matched. The ancestors drawn around them below are context rather than matches, so they are not
// here and are not counted.
const subjectMatches = computed(() => matchSubjects(renderableSubjects.value, filterQuery.value))

const filteredSubjects = computed(() => subjectMatches.value.map(({ subject }) => subject))

// Keyed by slug for the list to look a row up by, and empty while nothing has been typed: an
// unfiltered page has no matches to mark and no context to distinguish them from.
const matchesBySlug = computed(() => {
  if (!isFiltering.value) return new Map<string, SubjectMatch>()
  return new Map(subjectMatches.value.map((match) => [match.subject.slug, match]))
})

const isFiltering = computed(() => filterQuery.value.trim().length > 0)

// A match four levels down is drawn under the subjects it belongs to, so the tree carries the
// ancestors of every match as well as the matches themselves.
const subjectTree = computed(() => subjectTreeOfMatches(renderableSubjects.value, filteredSubjects.value))

// The rows that are on the page without having been asked for. Counted off the tree rather than
// worked out again, so it cannot disagree with what was drawn.
const contextCount = computed(() => {
  if (!isFiltering.value) return 0
  const drawn = (nodes: SubjectNode[]): number => nodes.reduce((total, node) => total + 1 + drawn(node.children), 0)
  return drawn(subjectTree.value) - filteredSubjects.value.length
})

type SubjectGroup = {
  id: string
  title: string
  items: SubjectNode[]
}

const GROUP_NUM = '_subject_group_number'
const GROUP_MISC = '_subject_group_miscellaneous'
const ALPHABET = [...'abcdefghijklmnopqrstuvwxyz']
const formatIdToTitle = (id: string) => id.toUpperCase()

// Only the top of the tree is grouped by letter. A subject further down is found under the subject
// it belongs to, which is the whole point of the hierarchy: filing it by its own initial as well
// would list it twice and say that where it sits does not matter.
const subjectsByGroup = computed((): SubjectGroup[] => {
  const groupAlphabetically = (a: SubjectNode): string => {
    const firstNonWhitespaceChar = a.name.trim().substring(0, 1).toLowerCase()
    if (firstNonWhitespaceChar.match(/\d+/)) {
      return GROUP_NUM
    }
    if (firstNonWhitespaceChar.match(/\p{L}+/u)) {
      return firstNonWhitespaceChar
    }
    return GROUP_MISC
  }
  const groupObj = groupBy(subjectTree.value, groupAlphabetically)
  const groupArr = Object.entries(groupObj)
  const subjectGroups = groupArr.map(([key, value]): SubjectGroup => {
    return {
      id: key,
      title: formatIdToTitle(key),
      items: value
    }
  })

  return subjectGroups
})

const subjectsByGroupWithBlanks = computed((): SubjectGroup[] => {
  const groupsById = groupBy(subjectsByGroup.value, ({ id }) => id)
  const letterGroups = ALPHABET.map(
    (letter): SubjectGroup => groupsById[letter]?.[0] ?? { id: letter, title: formatIdToTitle(letter), items: [] }
  )
  const otherGroups = subjectsByGroup.value.filter(({ id }) => !ALPHABET.includes(id))

  return [...letterGroups, ...otherGroups]
})

useRfcEditorHead({
  noIndex: true, // FIXME: upon release allow indexing
  title: 'RFCs organised by subject',
  canonicalPath: `${publicSiteUrlOrigin}${SUBJECTS_PATH}`,
  description: 'Subjects such as networking, broadband, aerospace, authentication, cloud computing',
  contentType: 'article'
})
</script>
