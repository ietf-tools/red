<template>
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
            <SubjectFilter v-model="filterQuery" :match-count="filteredSubjects.length" :total-count="subjectCount" />
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
                    class="absolute ml-[-0.6em] -mt-4 print:hidden"
                    :width="55"
                    :height="55"
                    :opacity="0.05" />
                  {{ subjectGroup.title }}
                </dt>
                <dd>
                  <ul class="bg-white dark:bg-gray-800 px-8 pb-8">
                    <li v-for="{ slug, name, description } in subjectGroup.items" :key="slug">
                      <Anchor :href="subjectsPathBuilder(slug)" :class="ANCHOR_COLOR_TAILWIND_STYLE">{{ name }}</Anchor>
                      <p v-if="description && subjectDensity === 'full'" class="inline">: {{ description }}</p>
                    </li>
                  </ul>
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
</template>

<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { groupBy } from 'es-toolkit'
import { useUiSettingsStore, type SubjectDensity } from '~/stores/ui-settings'
import { useRfcEditorHead } from '~/utilities/head'
import { getSubjects, type Subject } from '~/utilities/reef'
import { filterSubjects } from '~/utilities/subject-search'
import { ANCHOR_COLOR_TAILWIND_STYLE } from '~/utilities/theme'
import { SUBJECTS_PATH, SUBJECTS_QUERY_PARAM, subjectsPathBuilder, usePublicSiteUrlOrigin } from '~/utilities/url'

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

// Reef lists the vocabulary in name order and it is small enough to arrive whole, so there is
// nothing to sort or page through here.
const { data: subjects, status: subjectsStatus, error: subjectsError } = await useAsyncData(() => getSubjects())

const subjectCount = computed(() => subjects.value?.length ?? 0)

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

const filteredSubjects = computed(() => filterSubjects(subjects.value ?? [], filterQuery.value))

type SubjectGroup = {
  id: string
  title: string
  items: Subject[]
}

const GROUP_NUM = '_subject_group_number'
const GROUP_MISC = '_subject_group_miscellaneous'
const ALPHABET = [...'abcdefghijklmnopqrstuvwxyz']
const formatIdToTitle = (id: string) => id.toUpperCase()

const subjectsByGroup = computed((): SubjectGroup[] => {
  const groupAlphabetically = (a: Subject): string => {
    const firstNonWhitespaceChar = a.name.trim().substring(0, 1).toLowerCase()
    if (firstNonWhitespaceChar.match(/\d+/)) {
      return GROUP_NUM
    }
    if (firstNonWhitespaceChar.match(/\p{L}+/u)) {
      return firstNonWhitespaceChar
    }
    return GROUP_MISC
  }
  const groupObj = groupBy(filteredSubjects.value, groupAlphabetically)
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
