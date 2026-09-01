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

        <ul v-else-if="subjects && subjects.length > 0" class="flex flex-col gap-4 mt-4">
          <li v-for="{ slug, name, description } in subjects" :key="slug">
            <Anchor :href="subjectsPathBuilder(slug)">{{ name }}</Anchor>
            <p v-if="description">{{ description }}</p>
          </li>
        </ul>

        <!-- The vocabulary is curated by staff, so an empty one is a stage it passes through rather
           than a sign that anything is wrong. -->
        <p v-else class="mt-4">No subjects have been published yet.</p>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { useRfcEditorHead } from '~/utilities/head'
import { getSubjects } from '~/utilities/reef'
import { SUBJECTS_PATH, subjectsPathBuilder, usePublicSiteUrlOrigin } from '~/utilities/url'

definePageMeta({
  layout: false
})

const publicSiteUrlOrigin = usePublicSiteUrlOrigin()

// Reef lists the vocabulary in name order and it is small enough to arrive whole, so there is
// nothing to sort or page through here.
const { data: subjects, status: subjectsStatus, error: subjectsError } = await useAsyncData(() => getSubjects())

useRfcEditorHead({
  title: 'RFCs organised by subject',
  canonicalPath: `${publicSiteUrlOrigin}${SUBJECTS_PATH}`,
  description: 'Subjects such as networking, broadband, aerospace, authentication, cloud computing',
  contentType: 'article'
})
</script>
