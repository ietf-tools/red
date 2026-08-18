<template>
  <DialogRoot v-model:open="isOpen">
    <div class="text-center -mb-7">
      <DialogTrigger
        :class="[
          'font-bold px-2 py-1 rounded cursor-pointer',
          {
            'bg-blue-600 text-white': props.hasSolidButton,
            'bg-white text-blue-600 border-1 border-blue-600': !props.hasSolidButton
          }
        ]">
        Create a new Set
      </DialogTrigger>
    </div>
    <DialogPortal>
      <!-- Above the "Add to set" dialog's own overlay and content, so the two read as a stack
         rather than as one dialog with something drawn over it. -->
      <DialogOverlay class="bg-black/10 backdrop-blur-xs fixed inset-0 z-110" />
      <DialogContent
        :class="[
          'fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] z-115',
          'focus:outline-none rounded-md shadow-3xl',
          'bg-white dark:bg-gray-800',
          'px-4 pt-3 pb-1'
        ]">
        <DialogTitle class="text-lg font-semibold text-center pb-3">Create set</DialogTitle>

        <DialogDescription class="text-sm">RFC {{ props.rfcNumber }} will be added to the new set.</DialogDescription>

        <!-- A real form, so Enter submits and the browser's own required/maxlength handling
           applies before anything is sent. -->
        <form class="flex flex-col gap-3 pt-3 pb-2" @submit.prevent="onSubmit">
          <div class="flex flex-col gap-1">
            <label :for="titleDomId" class="font-bold">Title</label>
            <input
              :id="titleDomId"
              v-model="newSetTitle"
              type="text"
              required
              :maxlength="SET_TITLE_MAX_LENGTH"
              :disabled="isCreating"
              :aria-describedby="createError === undefined ? undefined : errorDomId"
              class="border-1 border-gray-400 dark:border-gray-500 rounded px-2 py-1 bg-white dark:bg-gray-900" />
          </div>

          <div class="flex flex-col gap-1">
            <label :for="descriptionDomId" class="font-bold">
              Description <span class="font-normal text-gray-700 dark:text-gray-300">(optional)</span>
            </label>
            <textarea
              :id="descriptionDomId"
              v-model="newSetDescription"
              rows="2"
              :disabled="isCreating"
              class="border-1 border-gray-400 dark:border-gray-500 rounded px-2 py-1 bg-white dark:bg-gray-900" />
          </div>

          <!-- Private is the default because publishing is the owner's choice, as the visibility
             field's own description in the API spec puts it — so it's opted into rather than out
             of. -->
          <RadioGroupRoot v-model="newSetVisibility" :aria-labelledby="visibilityDomId" class="flex flex-col">
            <span :id="visibilityDomId" class="font-bold pb-1">Visibility</span>
            <RadioGroupItem
              v-for="option in VISIBILITY_OPTIONS"
              :key="option.value"
              :value="option.value"
              :disabled="isCreating"
              class="flex items-start gap-2 cursor-pointer w-full text-left py-1">
              <span
                class="inline-flex shrink-0 items-center justify-center w-[20px] h-[20px] mt-0.5 border-1 rounded-full border-current/60">
                <RadioGroupIndicator>
                  <GraphicsCheckmark class="block w-[14px] h-[14px]" />
                </RadioGroupIndicator>
              </span>
              <span>{{ option.label }}</span>
            </RadioGroupItem>
          </RadioGroupRoot>

          <!-- role="alert" so the failure is announced: the dialog stays put and the only thing
             that changed is this line appearing. -->
          <p v-if="createError !== undefined" :id="errorDomId" role="alert" class="text-red-700 dark:text-red-400">
            {{ createError }}
          </p>

          <div class="flex justify-end gap-2 pb-2">
            <DialogClose
              :class="[
                'px-3 py-1 rounded-md',
                'text-blue-800 font-bold border-1 border-blue-600 dark:border-blue-900',
                'cursor-pointer'
              ]">
              Cancel
            </DialogClose>
            <button
              type="submit"
              :disabled="isCreating"
              class="font-bold bg-blue-600 text-white px-3 py-2 rounded cursor-pointer disabled:opacity-60 disabled:cursor-default">
              {{ isCreating ? 'Creating…' : 'Create set' }}
            </button>
          </div>
        </form>

        <DialogClose class="absolute top-2 right-2 px-2 py-2 cursor-pointer" aria-label="Close">
          <GraphicsClose />
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
/**
 * The "create set" dialog, opened from inside the "Add to set" dialog (RFCDocumentSets).
 *
 * A dialog of its own rather than a second page of that one. Creating a set is a detour from
 * picking one, and it's the reader's own list underneath that tells them the detour worked — a new
 * row, already ticked. Swapping the outer dialog's contents hid exactly that. Reka stacks the two:
 * Escape closes this one first, and focus returns to the trigger.
 *
 * The half-filled form is the one piece of state around this feature that isn't the parent's: it
 * means nothing to anyone until it's submitted, and nothing outside this dialog can act on it. The
 * creating itself isn't done here — `createSet` comes in from RFCDocumentReef's useUserSets, which
 * is where the rest of the Reef work for sets lives.
 */
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
  RadioGroupIndicator,
  RadioGroupItem,
  RadioGroupRoot
} from 'reka-ui'
import type { DocumentSetVisibility } from '~/utilities/reef'
import { SET_TITLE_MAX_LENGTH, type CreateSetOutcome, type NewSet } from '~/utilities/reef-sets'

type Props = {
  // Named in the description, because a set created from here starts out holding this RFC and the
  // reader should be told that before they fill anything in.
  rfcNumber: number
  hasSolidButton?: boolean
  // A function rather than an emit because the form needs the outcome back: a failure is reported
  // in the form, beside the field that caused it, rather than announced from somewhere else.
  createSet: (newSet: NewSet) => Promise<CreateSetOutcome>
}

const props = defineProps<Props>()

// Controlled, because a successful creation has to close this dialog from script — every other way
// out of it is a DialogClose the reader presses.
const isOpen = ref(false)

const VISIBILITY_OPTIONS: { value: DocumentSetVisibility; label: string }[] = [
  { value: 'private', label: 'Private — only you can see this set' },
  { value: 'public', label: 'Public — anyone can see this set' }
]

const titleDomId = useId()
const descriptionDomId = useId()
const visibilityDomId = useId()
const errorDomId = useId()

const newSetTitle = ref('')
const newSetDescription = ref('')
const newSetVisibility = ref<DocumentSetVisibility>('private')
const isCreating = ref(false)
const createError = ref<string>()

// Every opening starts a fresh form. The only ways out of this dialog without creating anything —
// Cancel, the close button, Escape — are all the reader discarding what they typed, so bringing it
// back next time, along with a message about an attempt they walked away from, would be keeping
// something they'd already dropped. Reka unmounts the content on close, so this is the one place
// the fields need clearing.
watch(isOpen, (isNowOpen) => {
  if (!isNowOpen) {
    return
  }
  newSetTitle.value = ''
  newSetDescription.value = ''
  newSetVisibility.value = 'private'
  createError.value = undefined
})

const onSubmit = async () => {
  // The submit button is disabled while a creation is open, but Enter in a text field would still
  // submit the form.
  if (isCreating.value) {
    return
  }

  // `required` on the input already stops an empty title, but not one that's only spaces.
  if (newSetTitle.value.trim() === '') {
    createError.value = 'A set needs a title.'
    return
  }

  isCreating.value = true
  createError.value = undefined
  const outcome = await props.createSet({
    title: newSetTitle.value,
    description: newSetDescription.value,
    visibility: newSetVisibility.value
  })
  isCreating.value = false

  if (!outcome.ok) {
    createError.value = outcome.message
    return
  }

  // Closing reveals the list underneath, where the new set is already a row and already ticked —
  // which is the confirmation, so there's nothing further to report. The fields are left as they
  // are; the watcher above clears them the next time this opens.
  isOpen.value = false
}
</script>
