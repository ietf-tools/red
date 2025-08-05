<template>
  <div>
    <SectionHeader>
      <Heading level="1" class="w-full mt-0 mb-4 pl-5 md:p-0 text-balance">
        RFC Index
      </Heading>
      <p class="leading-6 mb-2 pl-5 md:p-0 md:w-1/2">
        CREATED ON: {{ createdOn }}
      </p>
    </SectionHeader>
    <div class="container mx-auto mt-10">
      <p class="leading-6 mb-2 pl-5 md:p-0 md:w-1/2">
        <template v-if="props.rfcNumberLimit !== undefined">
          <template v-if="props.sort === 'ascending'">
            This page shows the first {{ props.rfcNumberLimit }} RFCs published.
            Click <A :href="RFC_INDEX_ALL_ASCENDING_PATH">Show All</A> to get
            the full list (ascending). RFCs are listed in this format:
          </template>
          <template v-else-if="props.sort === 'descending'">
            This page shows the last {{ props.rfcNumberLimit }} RFCs published.
            Click <A :href="RFC_INDEX_ALL_DESCENDING_PATH">Show All</A> to get
            the full list (descending). RFCs are listed in this format:
          </template>
        </template>
        <template v-else>
          <template v-if="props.sort === 'ascending'">
            This file contains entries for all RFCs in numeric order. RFC
            entries appear in this format:
          </template>
          <template v-else-if="props.sort === 'descending'">
            This file contains entries for all RFCs in reverse numeric order.
            RFC entries appear in this format:
          </template>
        </template>
      </p>
      <RFCIndexTable :rfc-rows="exampleRfcInformations" is-example />

      <p>For example:</p>
      <RFCIndexTable :rfc-rows="exampleRfcInformations" />

      <Heading level="2" class="mt-4 mb-2">Key to Entries</Heading>
      <ul class="list-disc ml-6">
        <li>#### is the RFC number.</li>
        <li>
          Following the number are the title, the author list, and the
          publication date.
        </li>
        <li>
          The format follows in parentheses. One or more of the following
          formats are listed: text (TXT), PostScript (PS), Portable Document
          Format (PDF), HTML, XML.
        </li>
        <li>"Obsoletes xxxx" refers to other RFCs that this one replaces.</li>
        <li>"Obsoleted-By xxxx" refers to RFCs that have replaced this one.</li>
        <li>
          "Updates xxxx" refers to other RFCs that this one merely updates but
          does not replace.
        </li>
        <li>
          "Updated-By xxxx" refers to RFCs that have updated but not replaced
          this one.
        </li>
        <li>
          "(Also zzz##)" gives pointer(s) to equivalent sub-series documents, if
          any. Here zzz is one of the sub-series designators STD, BCP, or FYI.
          In a few cases, the Also field points to an equivalent number in some
          other document series.
        </li>
        <li>
          The Status field gives the document's current status (see
          <A :href="infoRfcPathBuilder('RFC2026')">RFC 2026</A> and
          <A :href="infoRfcPathBuilder('RFC6410')">RFC 6410</A>).
        </li>
        <li>
          The Stream field gives the document's stream (see
          <A :href="infoRfcPathBuilder('RFC4844')">RFC 4844</A>), followed by
          Area and WG when relevant.
        </li>
        <li>The DOI field gives the Digital Object Identifier.</li>
      </ul>
      <p>
        See the <A :href="PUBLIC_SITE">RFC Editor Web page</A> for more
        information.
      </p>
      <Alert
        v-if="error"
        variant="warning"
        level="1"
        heading="Error loading RFCs"
      >
        {{ error }}
      </Alert>
      <Heading v-if="rfcs" level="2" style-level="1" class="mt-6 mb-3">
        RFC Index
      </Heading>
      <RFCIndexTable v-if="rfcs" :rfc-rows="rfcRows" />

      <template v-if="props.rfcNumberLimit !== undefined">
        <p class="pt-4">
          <template v-if="props.sort === 'ascending'">
            <A :href="RFC_INDEX_ALL_ASCENDING_PATH">Show All</A>
          </template>
          <template v-else-if="props.sort === 'descending'">
            <A :href="RFC_INDEX_ALL_DESCENDING_PATH">Show All</A>
          </template>
        </p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DateTime } from 'luxon'
import { getRedClient, getRFCs } from '~/utilities/redClientWrappers'
import { rfcToRfcIndexRow } from '~/utilities/rfc-index-html'
import {
  PUBLIC_SITE,
  RFC_INDEX_ALL_ASCENDING_PATH,
  RFC_INDEX_ALL_DESCENDING_PATH,
  infoRfcPathBuilder
} from '~/utilities/url'

type Props = {
  cacheKey: string
  sort: 'ascending' | 'descending'
  rfcNumberLimit?: number
}
const props = defineProps<Props>()

useSeoMeta({
  title:
    props.rfcNumberLimit === undefined ?
      props.sort === 'ascending' ?
        'RFC Index'
      : 'RFC Index (descending)'
    : props.sort === 'ascending' ? `RFC Index first ${props.rfcNumberLimit}`
    : `RFC Index last ${props.rfcNumberLimit}`
})

const createdOn = DateTime.now().toFormat('d LLLL yyyy')

const { data: rfcs, error } = await useAsyncData(
  props.cacheKey, // technically it's a de-duplication key but cacheKey is clearer usage / prop name imo
  () => {
    const apiClient = getRedClient()
    return getRFCs({
      apiClient,
      sort: props.sort,
      rfcNumberLimit: props.rfcNumberLimit,
      delayBetweenRequestsMs: 0
    })
  }
)
const rfcRows = computed(() => {
  if (!rfcs.value) return []
  return rfcs.value.map(rfcToRfcIndexRow)
})
const rfcInformation5234 = rfcRows.value?.find((rfc) => rfc.number === 5234)
const exampleRfcInformations = rfcInformation5234 ? [rfcInformation5234] : []
</script>
