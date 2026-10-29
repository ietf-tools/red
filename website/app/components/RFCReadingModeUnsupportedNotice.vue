<template>
  <p class="text-sm text-gray-800 dark:text-gray-200">
    {{ description.title }}. {{ description.description }}
    <Anchor v-if="description.link" :href="description.link.href" class="underline">
      {{ description.link.label }}
      <GraphicsNewWindowIcon class="text-xl -mt-2 align-middle" />
    </Anchor>
  </p>
</template>

<script setup lang="ts">
import { describeReadingError } from '~/utilities/reading-mode/reading-error'

// Shown in the settings panel in place of controls that could not do anything. The RFC page itself
// reports this in a modal, from the same description.
const description = describeReadingError({ kind: 'unsupported' })
</script>
