<template>
  <DialogRoot v-model:open="isOpen">
    <DialogTrigger as-child>
      <button
        type="button"
        class="cursor-pointer flex justify-between w-full py-2 px-3 items-center border-1 border-gray-400 font-bold bg-white text-black dark:bg-black dark:text-white">
        Filter RFCs
      </button>
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay />

      <DialogContent
        class="fixed inset-0 z-60 bg-white text-black dark:bg-blue-950 dark:text-white h-full flex flex-col"
        :aria-describedby="undefined">
        <DialogClose aria-label="Close modal" class="absolute right-0 top-0 px-4 py-4">
          <GraphicsClose class="text-black dark:text-white" />
        </DialogClose>
        <DialogTitle as="h1" class="flex justify-between text-xl pl-5 pr-3 py-3 font-bold border-b-1 border-b-gray-400">
          Filter RFCs
        </DialogTitle>

        <VerticalScrollable v-if="isOpen" class="flex-1">
          <div class="flex flex-col mb-6 pt-4">
            <div class="pl-5">
              <SearchSortBy />
            </div>
            <fieldset class="ml-5 mr-5">
              <legend class="font-bold">Card Density</legend>
              <div class="flex items-center">
                <SearchDensity v-model="searchStore.density" />
              </div>
            </fieldset>
            <div class="ml-5 mb-1 pt-4">
              <SearchInRfcComments />
            </div>
            <div class="pr-5">
              <SearchFilter />
            </div>
          </div>
        </VerticalScrollable>
        <div class="flex items-center justify-between gap-2 py-2 px-5 border-t-1 border-b-gray-400">
          <SearchClear :after-click-fn="closeModal" />
          <button
            type="button"
            class="cursor-pointer flex-none font-bold bg-blue-600 text-white px-4 py-2"
            @click="isOpen = false">
            Show matching RFCs
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger
} from 'reka-ui'

const isOpen = ref(false)

const domId = useId()

const closeModal = () => (isOpen.value = false)

const searchStore = useSearchStore()
</script>
