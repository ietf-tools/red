<template>
  <div class="min-h-[100vh]">
    <NuxtLayout name="default">
      <div class="container mx-auto pl-5 pr-3 pb-10">
        <!-- A retired subject is on its way somewhere else, so it gets the same holding state as a
           load that hasn't finished rather than a flash of an error it isn't. -->
        <div v-if="subjectStatus === 'pending' || retiredSubject" class="mt-10 w-full text-center">
          <GraphicsLoading class="inline-block w-16 h-16" />
        </div>

        <template v-else-if="liveSubject">
          <Heading level="1" class="mt-10 mb-4">{{ liveSubject.name }}</Heading>
          <p v-if="liveSubject.description">{{ liveSubject.description }}</p>

          <ul v-if="documents.length > 0" class="flex flex-col gap-2 mt-6">
            <li v-for="{ doc, infoPath } in documents" :key="doc">
              <Anchor v-if="infoPath !== undefined" :href="infoPath">{{ doc }}</Anchor>
              <!-- An identifier this build has no page for: still listed, because it carries the
                 subject either way, just not as a link. -->
              <span v-else>{{ doc }}</span>
            </li>
          </ul>
          <p v-else class="mt-6">No RFCs carry this subject yet.</p>
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
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRfcEditorHead } from '~/utilities/head'
import { getSubject, isRetiredSubject, ReefError, type SubjectDetailOrRedirect } from '~/utilities/reef'
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

// Reef answering 404 is a plain answer about a subject that isn't there, not something going wrong,
// so it becomes `null` here and everything else is left to fail into `subjectError`.
const loadSubject = async (): Promise<SubjectDetailOrRedirect | null> => {
  try {
    return await getSubject(slug)
  } catch (error) {
    if (error instanceof ReefError && error.status === 404) {
      return null
    }
    throw error
  }
}

const { data: subject, status: subjectStatus, error: subjectError } = await useAsyncData(`subject:${slug}`, loadSubject)

// A subject that isn't there and a load that failed both arrive as an absent value — `null` from
// the handler above for the first, undefined for the second — so what tells them apart is
// subjectError rather than which kind of absence turned up.
const loadedSubject = computed(() => subject.value ?? undefined)

const retiredSubject = computed(() =>
  loadedSubject.value !== undefined && isRetiredSubject(loadedSubject.value) ? loadedSubject.value : undefined
)

const liveSubject = computed(() =>
  loadedSubject.value !== undefined && !isRetiredSubject(loadedSubject.value) ? loadedSubject.value : undefined
)

const isNotFound = computed(() => !subjectError.value && loadedSubject.value === undefined)

// A retired subject is not offered and should not be rendered as though it were current; its
// `merged_into` is there so that a link naming the old one still arrives somewhere. Awaited in
// setup rather than watched, so that a server render answers with the redirect itself.
if (retiredSubject.value !== undefined) {
  await navigateTo(subjectsPathBuilder(retiredSubject.value.merged_into), { redirectCode: 301, replace: true })
}

// A subject carries identifiers and nothing else, and it is free to carry one this build has no
// page for — infoSeriesPathBuilder throws on those, which shouldn't cost the rest of the list
// their links.
const documents = computed(() =>
  (liveSubject.value?.documents ?? []).map((doc) => {
    try {
      return { doc, infoPath: infoSeriesPathBuilder(doc) }
    } catch {
      return { doc, infoPath: undefined }
    }
  })
)

useRfcEditorHead({
  title: liveSubject.value ? `RFCs about ${liveSubject.value.name}` : 'RFC subject',
  canonicalPath: `${publicSiteUrlOrigin}${subjectsPathBuilder(slug)}`,
  description:
    liveSubject.value?.description ??
    'Subjects such as networking, broadband, aerospace, authentication, cloud computing',
  contentType: 'article'
})
</script>
