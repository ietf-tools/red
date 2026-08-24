<template>
  <DialogRoot v-model:open="openModel">
    <DialogPortal>
      <DialogOverlay class="bg-blue-900/50 fixed inset-0 z-110 overflow-y-scroll py-16">
        <DialogContent
          :aria-describedby="
            // The body holds controls rather than prose, so there is nothing for
            // DialogDescription to describe. Unsetting this is reka-ui's opt-out.
            undefined
          "
          class="mx-auto w-[90vw] max-w-[800px] relative rounded-md bg-white dark:bg-blue-900 px-5 pt-3 pb-5 z-[100]">
          <DialogTitle as="h1" class="text-xl font-bold py-2 pr-16">
            {{ modalTitle }}
          </DialogTitle>
          <div v-if="$slots.modalBody" class="w-full leading-6 pb-3 flex flex-col">
            <slot name="modalBody" />
          </div>
          <div class="flex justify-end mt-5 border-t-1 border-t-gray-300 dark:border-t-gray-600 pt-4">
            <DialogClose
              class="rounded cursor-pointer font-bold border-1 border-gray-200 px-3 py-1 focus:bg-gray-500/25 hover:bg-gray-500/25">
              Done
            </DialogClose>
          </div>
          <DialogClose
            class="absolute top-2 right-2 rounded cursor-pointer px-3 py-3 focus:bg-gray-500/25 hover:bg-gray-500/25">
            <GraphicsClose />
          </DialogClose>
        </DialogContent>
      </DialogOverlay>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
type Props = {
  modalTitle: string
}
defineProps<Props>()

// Controlled by the caller: the dialog is rendered outside the navs (see NavModals)
// and driven by the menu item's `modalOpenRef`.
const openModel = defineModel<boolean>('open', { required: true })
</script>
