<template>
  <div class="min-h-screen">
    <NuxtLayout name="default">
      <div class="container mx-auto pb-10">
        <template v-if="setLoad.status === 'ready'">
          <Heading level="1" style-level="2" class="text-left mt-10 mb-4 pl-5"> Set: {{ setLoad.set.title }} </Heading>
          <div class="pl-5 flex flex-col gap-4">
            <p v-if="setLoad.set.description">{{ setLoad.set.description }}</p>
            <ul v-if="documents.length > 0" class="flex flex-col gap-2">
              <li v-for="{ doc, infoPath } in documents" :key="doc">
                <Anchor v-if="infoPath !== undefined" :href="infoPath">
                  <component :is="formatTitleAsVNode(doc)" />
                </Anchor>
                <!-- An identifier this build has no page for: still listed, since it's a member of
                   the set either way, just not as a link. -->
                <span v-else>{{ doc }}</span>
              </li>
            </ul>
            <p v-else>This set is empty.</p>
          </div>
        </template>

        <!-- Reef is reached from the browser, so there's nothing to render until the client has
           asked. This is also what's on screen while the OIDC session restores, which the load
           waits for. -->
        <div v-else-if="setLoad.status === 'loading'" class="mt-10 w-full text-center">
          <GraphicsLoading class="inline-block w-16 h-16" />
        </div>

        <!-- 404 is the one answer Reef gives for a set the caller can't have, whether it never
           existed, was deleted, was taken down, or is someone else's private set — so this is
           worded to cover all of them rather than claim which. -->
        <Alert v-else-if="setLoad.status === 'notFound'" level="1" variant="warning" heading="Set not found">
          <p class="pt-2">
            No set found (404). The link may be wrong, or the set may have been deleted or may not be public.
          </p>
        </Alert>

        <Alert v-else level="1" variant="warning" heading="Error">
          <p class="pt-2">This set could not be loaded. Please try again.</p>
        </Alert>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRfcEditorHead } from '~/utilities/head'
import { setDocuments, useSet } from '~/utilities/reef-sets'
import { formatTitleAsVNode } from '~/utilities/rfc-title'

definePageMeta({
  layout: false
})

const route = useRoute()

// Read through a getter rather than once, because /set?id=a → /set?id=b is a query change on the
// same route and this page is not remounted for it.
//
// A query string can carry the same key more than once, or with no value at all, so anything but a
// single string is treated as no id — as is `/set` on its own. All of them end at the same place a
// junk id does: nothing this can look up, which the page reports as a set it couldn't find.
const setLoad = useSet(() => {
  const { id } = route.query
  return typeof id === 'string' ? id : ''
})

const documents = computed(() => (setLoad.value.status === 'ready' ? setDocuments(setLoad.value.set) : []))

useRfcEditorHead({
  title: 'RFC Set',
  canonicalPath: false,
  noIndex: true,
  description: 'A public set',
  contentType: 'article'
})
</script>
