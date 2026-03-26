<template>
  <details class="details-open-style -ml-1 open:bg-[rgba(30,30,30,0.07)] dark:open:bg-[rgba(255,255,255,0.1)] rounded">
    <summary
      class="flex justify-between hover:bg-[rgba(30,30,30,0.07)] focus:bg-[rgba(30,30,30,0.07)] dark:hover:bg-[rgba(255,255,255,0.1)] dark:focus:bg-[rgba(255,255,255,0.1)] rounded pl-1 pr-2 py-2 cursor-pointer"
    >
      <span class="font-bold">
        <GraphicsDiamond
          class="align-middle"
          color="yellow"
          size="10px"
        />
        {{ props.errataItemForTab.label }}
      </span>
    </summary>

    <div class="flex flex-col gap-2 px-2 pt-2 pb-4 mb-4 text-sm">
      <p v-if="props.errataItemForTab.domId">
        <a
          :href="`#${props.errataItemForTab.domId}`"
          :class="ANCHOR_TAILWIND_STYLE"
        >
          Scroll to {{ props.errataItemForTab.label }}
        </a>
      </p>
      <p>
        <span class="font-bold">Status:</span>
        {{ props.errataItemForTab.errata_status_code }}
      </p>
      <p>
        <span class="font-bold">Date Reported:</span>
        {{ props.errataItemForTab.submit_date }}
      </p>
      <div v-if="orig_text_nodes">
        <Heading
          level="4"
          style-level="6"
        >
          Original text:
        </Heading>
        <component :is="orig_text_nodes" />
      </div>
      <div v-if="correct_text_nodes">
        <Heading
          level="4"
          style-level="6"
        >
          Correct text:
        </Heading>
        <component :is="correct_text_nodes" />
      </div>
      <div v-if="notes_nodes">
        <Heading
          level="4"
          style-level="6"
        >
          Notes:
        </Heading>
        <component :is="notes_nodes" />
      </div>
      <p>
        <Anchor
          :href="useErrataUrlBuilder(props.errataItemForTab.errata_id)"
          :class="ANCHOR_TAILWIND_STYLE"
          :aria-label="`View errata report ${props.errataItemForTab.errata_id} on the IETF Errata site`"
        >
          View this report
          <Icon
            name="fluent:window-new-20-regular"
            class="text-lg align-middle ml-1"
          />
        </Anchor>
      </p>
    </div>
  </details>
</template>

<script setup lang="ts">
import { ANCHOR_TAILWIND_STYLE } from '~/utilities/theme'
import { preformattedTextToHtml } from '~/utilities/html'
import type { ErrataItemForTab } from '~/utilities/errata'
import { useErrataUrlBuilder } from '~/utilities/url'

type Props = {
  errataItemForTab: ErrataItemForTab
}

const props = defineProps<Props>()

const orig_text_nodes = computed(() =>
  props.errataItemForTab.orig_text ?
    preformattedTextToHtml(props.errataItemForTab.orig_text, true)
    : undefined
)

const correct_text_nodes = computed(() =>
  props.errataItemForTab.correct_text ?
    preformattedTextToHtml(props.errataItemForTab.correct_text, true)
    : undefined
)

const notes_nodes = computed(() =>
  props.errataItemForTab.notes ?
    preformattedTextToHtml(props.errataItemForTab.notes, true)
    : undefined
)
</script>

<style>
.details-open-style>summary::after {
  content: '+';
  font-weight: bold;
  display: inline-block;

  font-size: 1.2em;
  margin-top: -0.2em;
  /* vertically center the larger font-size */
}

.details-open-style[open]>summary::after {
  content: '-';
}
</style>
