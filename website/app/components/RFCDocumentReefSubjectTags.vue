<template>
  <div class="flex ml-2 mt-2 mb-2">
    <ul class="flex flex-col gap-4 reef:flex-row items-start pl-2 text-sm">
      <li v-for="subjectTag in props.reefSubjectTags" class="flex flex-col md:flex-row pr-2">
        <Anchor
          :href="subjectsPathBuilder(subjectTag.slug)"
          :class="[
            'relative bg-blue-25 dark:bg-blue-800 px-1.5 py-0.5 no-underline rounded-r border-y border-r border-blue-50 dark:border-blue-300 font-bold',
            'before:content-[\'\'] before:absolute before:inset-y-0 before:right-full before:w-3 before:bg-blue-50 dark:before:bg-blue-300 before:[clip-path:polygon(0_50%,100%_0,100%_100%)]',
            'after:content-[\'\'] after:absolute after:top-px after:bottom-px after:right-full after:w-2.5 after:bg-blue-25 dark:after:bg-blue-800 after:border-r after:border-blue-25 dark:after:border-blue-700 after:[clip-path:polygon(0_50%,100%_0,100%_100%)]',
            'text-blue-300 dark:text-white hover:text-blue-500 dark:hover:text-blue-100'
          ]">
          {{ subjectTag.title }}
        </Anchor>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { RfcCommon } from '~/utilities/rfc-validators'
import { subjectsPathBuilder } from '~/utilities/url'

type Props = {
  reefSubjectTags: Required<RfcCommon['reefSubjectTags']>
}

const props = defineProps<Props>()
</script>
