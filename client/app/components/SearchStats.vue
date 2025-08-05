<template>
  <ais-stats>
    <template #default="{ nbHits, processingTimeMS }">
      <div class="text-base text-slate-500 dark:text-slate-400 font-normal w-max ml-5">
        <span class="font-semibold text-blue-900 dark:text-sky-100">
          {{ nbHits.toLocaleString('en', { useGrouping: true }) }}
        </span>
        {{ SPACE }}
        <span v-if="nbHits === 1">result</span>
        <span v-else>results</span>

        in
        <span class="font-semibold text-blue-900 dark:text-sky-100">
          {{
            Math.max(
              /**
               * Ensure we don't say it took '0ms'
               * because that sounds instantaneous
               * and instead ensure it says it took
               * at least some time
               **/
              1,
              processingTimeMS
            )
          }}
          <abbr title="milliseconds" class="no-underline">ms</abbr>
        </span>
      </div>
    </template>
  </ais-stats>
</template>

<script setup lang="ts">
import { AisStats } from 'vue-instantsearch/vue3/es'
import { SPACE } from '~/utilities/strings'
</script>
