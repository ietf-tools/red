<template>
  <div
    :class="{
      'container mx-auto': !featureFlags.narrowerRfcs || featureFlags.narrowerRfcs === 'narrow-left',
      'rfc-container mx-auto': featureFlags.narrowerRfcs === 'narrow-center'
    }">
    <div
      :class="[
        'flex flex-row-reverse body-layout-document lg:gap-5',
        {
          'rfc-container x-auto': featureFlags.narrowerRfcs === 'narrow-left'
        }
      ]">
      <div :class="['flex pl-3 hidden w-[var(--sidebar-width)] lg:block', props.sidebarClass]">
        <slot name="sidebar" />
      </div>
      <div class="flex-1">
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
