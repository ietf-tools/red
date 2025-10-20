<template>
  <ToggleGroupRoot
    :model-value="value"
    type="single"
    class="flex bg-white border border-gray-400 dark:bg-black dark:border-white shadow-sm rounded-xs"
    @update:model-value="ensureSelectedValue"
  >
    <ToggleGroupItem
      value="full"
      title="Full Display"
      aria-label="Full Display"
      :class="toggleGroupItemClasses"
    >
      <Icon
        name="f7:rectangle-grid-1x2-fill"
        class="w-[15px] h-[15px]"
      />
    </ToggleGroupItem>
    <ToggleGroupItem
      value="dense"
      title="Dense Display"
      aria-label="Dense Display"
      :class="toggleGroupItemClasses"
      class="border-x"
    >
      <Icon
        name="fa-solid:th-list"
        class="w-[15px] h-[15px]"
      />
    </ToggleGroupItem>
    <ToggleGroupItem
      value="compact"
      title="Compact Display"
      aria-label="Compact Display"
      :class="toggleGroupItemClasses"
    >
      <Icon
        name="vaadin:list"
        class="w-[15px] h-[15px]"
      />
    </ToggleGroupItem>
  </ToggleGroupRoot>
</template>

<script lang="ts" setup>
import { ToggleGroupItem, ToggleGroupRoot, type AcceptableValue } from 'reka-ui'

const value = defineModel<string>()

const toggleGroupItemClasses = 'hover:bg-gray-100 dark:hover:bg-gray-800 text-sky-950 dark:text-white data-[state=on]:bg-gray-200 dark:data-[state=on]:bg-gray-700 flex h-[36px] w-[36px] items-center justify-center bg-white dark:bg-black first:rounded-l-xs last:rounded-r-xs cursor-pointer'

function ensureSelectedValue(val: AcceptableValue) {
  if (val && typeof val === 'string') {
    value.value = val
  }
}
</script>