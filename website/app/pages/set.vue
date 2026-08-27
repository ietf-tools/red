<template>
  <div class="min-h-screen">
    <NuxtLayout name="default">
      <div class="container mx-auto pb-10">
        <template v-if="setLoad.status === 'ready'">
          <p class="pt-16 ml-4 italic">This set was created by a community member.</p>
          <Heading level="1" class="text-left mt-10 mb-4 pl-5">
            Community Set: {{ JSON.stringify(setLoad.set.title) }}
          </Heading>

          <div class="pl-5 flex flex-col gap-4">
            <p v-if="setLoad.set.description">{{ JSON.stringify(setLoad.set.description) }}</p>
            <ul v-if="rows.length > 0" class="grid grid-cols-1 mt-3 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <li v-for="{ doc, infoPath, rfc } in rows" :key="doc" class="flex flex-col">
                <!-- The card, once this document's rfc-common has arrived. Everything below is what
                   stands in until it has, and stays for a document there's never going to be a card
                   for, so a row is never missing while the set is read. -->
                <RFCCard v-if="rfc" :rfc="rfc" heading-level="2" />
                <Anchor v-else-if="infoPath !== undefined" :href="infoPath">
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
import { computed, ref, watch } from 'vue'
import { useRfcEditorHead } from '~/utilities/head'
import { useReefDocuments } from '~/utilities/reef-documents'
import { setDocuments, useSet } from '~/utilities/reef-sets'
import { parseSeriesId, RFC_TYPE_RFC, type RfcCommon } from '~/utilities/rfc'
import { formatTitleAsVNode } from '~/utilities/rfc-title'
import { RfcCommonSchema } from '~/utilities/rfc-validators'
import { rfcCommonPathBuilder } from '~/utilities/url'

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

// --- The cards ----------------------------------------------------------------------------
//
// A set holds identifiers and nothing else, so a card per member means a request per member for
// its rfc-common. That's loaded here rather than by the cards themselves, because only the page
// knows how many of them there are and a large set would otherwise ask the browser for all of
// them at once.

// How many of those requests are allowed to be in flight together.
const CONCURRENT_REQUESTS = 8

// What has arrived so far, keyed by the identifier the set holds.
const rfcs = ref<Record<string, RfcCommon>>({})

// rfcCommonPathBuilder takes only the number out of an identifier, so asking it for `bcp14` would
// fetch RFC 14. Anything that isn't an RFC — or that doesn't parse at all — is left without a card.
const rfcNumber = (doc: string): number | undefined => {
  const seriesId = parseSeriesId(doc)
  return seriesId?.type === RFC_TYPE_RFC ? seriesId.number : undefined
}

const loadRfcCommon = async (doc: string): Promise<RfcCommon | undefined> => {
  try {
    const response = await fetch(rfcCommonPathBuilder(doc), { credentials: 'same-origin' })
    if (!response.ok) {
      throw Error(`Response was ${response.status}`)
    }
    return RfcCommonSchema.parse(await response.json())
  } catch (error) {
    // One member that can't be loaded shouldn't cost the rest of the set their cards, so this is
    // reported here and the row keeps the link it had before.
    console.error(`Unable to load ${doc} for this set.`, error)
    return undefined
  }
}

// Bumped each time a different set is loaded, so answers for the set the reader has just navigated
// away from can't land on the one they're looking at now.
let loadToken = 0

const loadRfcs = async (docs: string[]): Promise<void> => {
  const token = (loadToken += 1)
  rfcs.value = {}

  // CONCURRENT_REQUESTS workers taking from one queue, rather than a Promise.all over every
  // member: a set is free to hold hundreds, and the point is that only that many are ever asked
  // for at once, whichever of them is slow.
  const queue = docs.filter((doc) => rfcNumber(doc) !== undefined)

  await Promise.all(
    Array.from({ length: CONCURRENT_REQUESTS }, async () => {
      let doc = queue.shift()
      while (doc !== undefined && token === loadToken) {
        const rfc = await loadRfcCommon(doc)
        if (rfc !== undefined && token === loadToken) {
          rfcs.value[doc] = rfc
        }
        doc = queue.shift()
      }
    })
  )
}

// `documents` is empty until the set is ready, and changes again on /set?id=a → /set?id=b, which
// this page isn't remounted for.
watch(
  documents,
  (docs) => {
    void loadRfcs(docs.map(({ doc }) => doc))
  },
  { immediate: true }
)

// This reader's own answers for every member in one call, which is what the subscribe and set
// buttons on each card read. Declared here rather than in the cards for the same reason as the
// rfc-common loads above: a card that asked for its own would make a request per member.
useReefDocuments(() => documents.value.flatMap(({ doc }) => rfcNumber(doc) ?? []))

// One row per member document, in the set's own order: its card once there is one, and the
// identifier and /info/ path the list shows until then.
const rows = computed(() => documents.value.map(({ doc, infoPath }) => ({ doc, infoPath, rfc: rfcs.value[doc] })))

useRfcEditorHead({
  title: 'RFC Set',
  canonicalPath: false,
  noIndex: true,
  description: 'A public set',
  contentType: 'article'
})
</script>
