<template>
  <details
    class="details-open-style -ml-1 open:bg-gray-200 dark:open:bg-gray-800 rounded"
  >
    <summary
      class="flex justify-between hover:bg-gray-200 focus:bg-gray-200 dark:hover:bg-gray-700 dark:focus:bg-gray-700 rounded pl-1 pr-2 py-2 cursor-pointer"
    >
      <span class="font-bold">
        <GraphicsDiamond class="align-middle" color="yellow" size="10px" />
        Section
        {{ props.errataItem.section }}
      </span>
    </summary>

    <div class="flex flex-col gap-2 px-2 pb-4 mb-4 text-sm">
      <p>
        <a v-if="hashLink" :href="hashLink">
          Scroll to Section {{ props.errataItem.section }}
        </a>
      </p>
      <p>
        <span class="font-bold">Status:</span>
        {{ props.errataItem.errata_status_code }}
      </p>
      <p>
        <span class="font-bold">Date Reported:</span>
        {{ props.errataItem.submit_date }}
      </p>
      <p v-if="props.errataItem.submitter_name">
        <span class="font-bold">Reported By:</span>
        {{ props.errataItem.submitter_name }}
      </p>
      <div v-if="orig_text_nodes">
        <Heading level="4" style-level="6">Original text:</Heading>
        <component :is="orig_text_nodes" />
      </div>
      <div v-if="correct_text_nodes">
        <Heading level="4" style-level="6">Correct text:</Heading>
        <component :is="correct_text_nodes" />
      </div>
      <div v-if="notes_nodes">
        <Heading level="4" style-level="6">Notes:</Heading>
        <component :is="notes_nodes" />
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
import { preformattedTextToHtml } from '~/utilities/html'
import type { ErrataItem } from '~/utilities/rfc-validators'

type Props = {
  errataItem: ErrataItem
}

const props = defineProps<Props>()

const orig_text_nodes = computed(() =>
  props.errataItem.orig_text ?
    preformattedTextToHtml(props.errataItem.orig_text)
  : undefined
)

const correct_text_nodes = computed(() =>
  props.errataItem.correct_text ?
    preformattedTextToHtml(props.errataItem.correct_text)
  : undefined
)

const notes_nodes = computed(() =>
  props.errataItem.notes ?
    preformattedTextToHtml(props.errataItem.notes)
  : undefined
)

const hashLink = ref<string | undefined>()

onMounted(() => {
  if (!props.errataItem.section) {
    return
  }
  const maybeDomId = `section-${props.errataItem.section}`
  const target = document.getElementById(maybeDomId)
  if (!target) {
    console.warn("Couldn't find errata section link of ", maybeDomId)
    return
  }
  hashLink.value = `#${maybeDomId}`
})
</script>

<style>
.details-open-style > summary::after {
  content: '+';
  font-weight: bold;
  display: inline-block;

  font-size: 1.2em;
  margin-top: -0.2em; /* vertically center the larger font-size */
}

.details-open-style[open] > summary::after {
  content: '-';
}
</style>
