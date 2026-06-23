<template>
  <div
    :class="[
      'body-layout-document w-full justify-between lg:gap-5',
      {
        'container mx-auto': !featureFlags.narrowerRfcs || featureFlags.narrowerRfcs === 'narrow-left',
        'rfc-container mx-auto': featureFlags.narrowerRfcs === 'narrow-center'
      }
    ]">
    <div
      :class="[
        'flex flex-row-reverse',
        {
          'rfc-container x-auto': featureFlags.narrowerRfcs === 'narrow-left'
        }
      ]">
      <div :class="['flex py-3 pl-3 hidden w-[var(--sidebar-width)] lg:block', props.sidebarClass]">
        <slot name="sidebar" />
      </div>
      <div class="flex-auto">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFeatureFlags } from '~/utilities/feature-flags'

type Props = {
  sidebarClass?: string
}

const props = defineProps<Props>()

const featureFlags = useFeatureFlags()
</script>

<style>
.body-layout-document {
  container-type: inline-size; /** enabling CQI units in RFC layout */
}
</style>
