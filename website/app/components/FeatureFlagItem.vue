<template>
  <div class="bg-gray-200 dark:bg-gray-700 px-4 py-3 rounded-md">
    <label class="text-md mt-4 mb-0 pb-0 font-bold cursor-pointer">
      <select
        v-if="Array.isArray(props.featureFlagUiRow.storageType)"
        v-model="featureFlagRef"
        class="border-1 border-gray-500 mr-1 align-middle accent-blue-500 dark:accent-black p-2"
        :aria-describedby="descriptionDomId">
        <option v-for="option in props.featureFlagUiRow.storageType" :key="option" :value="option">{{ option || '(none)' }}</option>
      </select>

      <input
        v-if="props.featureFlagUiRow.storageType === 'boolean'"
        type="checkbox"
        v-model="featureFlagRef"
        class="mr-1 size-6 align-middle accent-blue-500 dark:accent-black p-2"
        :aria-describedby="descriptionDomId" />
      "{{ props.featureFlagUiRow.title }}" enabled?
    </label>
    <p v-if="descriptionDomId" class="mt-2 pt-0 text-sm">
      {{ featureFlagUiRow.description }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useFeatureFlags, type FeatureFlagUIRow, type FeatureFlags } from '../utilities/feature-flags'

type Props = {
  featureFlagKey: keyof FeatureFlags
  featureFlagUiRow: FeatureFlagUIRow
}

const props = defineProps<Props>()

const featureFlags = useFeatureFlags()

const descriptionDomId = useId()

const featureFlagRef = computed({
  get: () => featureFlags?.value[props.featureFlagKey],
  set: (value) => {
    if (!featureFlags) {
      throw Error('Expected inject(featureFlagsKey) to be available')
    }
    featureFlags.value = {
      ...featureFlags.value,
      [props.featureFlagKey]: value
    }
  }
})
</script>
